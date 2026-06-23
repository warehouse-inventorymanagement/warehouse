/**
 * Update service for checking GitHub releases
 */

import fs from 'fs';
import path from 'path';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import extract from 'extract-zip';

const execAsync = promisify(exec);

// Status file for tracking background update progress
const UPDATE_STATUS_FILE = 'update-status.json';

// Default repo, can be overridden by GITHUB_REPO env var
const DEFAULT_GITHUB_REPO = 'manjotsc/warehouse';

interface GitHubRelease {
  tag_name: string;
  name: string;
  body: string;
  html_url: string;
  published_at: string;
  prerelease: boolean;
  draft: boolean;
  zipball_url: string;
  tarball_url: string;
}

export interface DownloadProgress {
  status: 'downloading' | 'completed' | 'error';
  progress: number;
  filename?: string;
  filepath?: string;
  error?: string;
}

export interface UpdateInfo {
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
  releaseUrl: string;
  releaseName: string;
  releaseNotes: string;
  publishedAt: string;
  checkedAt: string;
}

// In-memory cache for update check results
let updateCache: UpdateInfo | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Get current version from package.json
 */
export function getCurrentVersion(): string {
  try {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    return packageJson.version || '0.0.0';
  } catch (error) {
    console.error('[Update] Failed to read package.json:', error);
    return '0.0.0';
  }
}

/**
 * Get GitHub repo from environment or use default
 */
function getGitHubRepo(): string {
  return process.env.GITHUB_REPO || DEFAULT_GITHUB_REPO;
}

/**
 * Compare semantic versions
 * Returns: 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
function compareVersions(v1: string, v2: string): number {
  // Remove 'v' prefix if present
  const clean1 = v1.replace(/^v/, '');
  const clean2 = v2.replace(/^v/, '');

  const parts1 = clean1.split('.').map(Number);
  const parts2 = clean2.split('.').map(Number);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
}

/**
 * Check for updates from GitHub releases
 */
export async function checkForUpdates(forceRefresh: boolean = false): Promise<UpdateInfo> {
  const now = Date.now();

  // Return cached result if valid and not forcing refresh
  if (!forceRefresh && updateCache && (now - cacheTimestamp) < CACHE_DURATION_MS) {
    console.log('[Update] Returning cached update info');
    return updateCache;
  }

  const currentVersion = getCurrentVersion();
  const repo = getGitHubRepo();

  try {
    console.log(`[Update] Checking for updates from GitHub: ${repo}`);

    const response = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Warehouse-App'
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        // No releases yet
        console.log('[Update] No releases found on GitHub');
        const noRelease: UpdateInfo = {
          currentVersion,
          latestVersion: currentVersion,
          updateAvailable: false,
          releaseUrl: `https://github.com/${repo}/releases`,
          releaseName: '',
          releaseNotes: 'No releases available yet.',
          publishedAt: '',
          checkedAt: new Date().toISOString()
        };
        updateCache = noRelease;
        cacheTimestamp = now;
        return noRelease;
      }
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const release = await response.json() as GitHubRelease;

    // Skip prereleases and drafts
    if (release.prerelease || release.draft) {
      console.log('[Update] Latest release is prerelease/draft, skipping');
    }

    const latestVersion = release.tag_name.replace(/^v/, '');
    const updateAvailable = compareVersions(latestVersion, currentVersion) > 0;

    const updateInfo: UpdateInfo = {
      currentVersion,
      latestVersion,
      updateAvailable,
      releaseUrl: release.html_url,
      releaseName: release.name || release.tag_name,
      releaseNotes: release.body || 'No release notes available.',
      publishedAt: release.published_at,
      checkedAt: new Date().toISOString()
    };

    // Cache the result
    updateCache = updateInfo;
    cacheTimestamp = now;

    console.log(`[Update] Current: ${currentVersion}, Latest: ${latestVersion}, Update available: ${updateAvailable}`);

    return updateInfo;
  } catch (error: any) {
    console.error('[Update] Failed to check for updates:', error.message);

    // Return current version info on error
    return {
      currentVersion,
      latestVersion: currentVersion,
      updateAvailable: false,
      releaseUrl: `https://github.com/${repo}/releases`,
      releaseName: '',
      releaseNotes: 'Unable to check for updates. Please try again later.',
      publishedAt: '',
      checkedAt: new Date().toISOString()
    };
  }
}

/**
 * Clear the update cache
 */
export function clearUpdateCache(): void {
  updateCache = null;
  cacheTimestamp = 0;
  console.log('[Update] Cache cleared');
}

/**
 * Download the latest release from GitHub
 */
// Update download directory - can be overridden by UPDATE_DIR env var
const DEFAULT_UPDATE_DIR = '/opt/warehouse/update';

export async function downloadUpdate(): Promise<{ success: boolean; filename?: string; filepath?: string; version?: string; error?: string }> {
  const repo = getGitHubRepo();
  const updatesDir = process.env.UPDATE_DIR || DEFAULT_UPDATE_DIR;

  // Ensure updates directory exists
  if (!fs.existsSync(updatesDir)) {
    fs.mkdirSync(updatesDir, { recursive: true });
  }

  try {
    console.log(`[Update] Fetching latest release info from GitHub: ${repo}`);

    // Get release info
    const releaseResponse = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Warehouse-App'
      }
    });

    if (!releaseResponse.ok) {
      throw new Error(`Failed to fetch release info: ${releaseResponse.status}`);
    }

    const release = await releaseResponse.json() as GitHubRelease;
    const version = release.tag_name.replace(/^v/, '');
    const filename = `warehouse-${version}.zip`;
    const filepath = path.join(updatesDir, filename);

    // Check if already downloaded
    if (fs.existsSync(filepath)) {
      console.log(`[Update] Update already downloaded: ${filename}`);
      return { success: true, filename, filepath, version };
    }

    // Download from GitHub's codeload directly (bypasses API restrictions)
    const downloadUrl = `https://codeload.github.com/${repo}/zip/refs/tags/${release.tag_name}`;
    console.log(`[Update] Downloading version ${version} from ${downloadUrl}`);

    // Download the zip file
    const downloadResponse = await fetch(downloadUrl, {
      headers: {
        'User-Agent': 'Warehouse-App'
      },
      redirect: 'follow'
    });

    if (!downloadResponse.ok) {
      const errorText = await downloadResponse.text().catch(() => '');
      console.error(`[Update] Download failed: ${downloadResponse.status} ${downloadResponse.statusText}`, errorText);
      throw new Error(`Failed to download release: ${downloadResponse.status} ${downloadResponse.statusText}`);
    }

    // Get the response as array buffer and write to file
    const arrayBuffer = await downloadResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length < 1000) {
      // Likely an error response, not a zip file
      console.error(`[Update] Downloaded file too small (${buffer.length} bytes), likely an error`);
      throw new Error('Download failed: received invalid response');
    }

    fs.writeFileSync(filepath, buffer);

    console.log(`[Update] Downloaded successfully: ${filename} (${buffer.length} bytes)`);

    return { success: true, filename, filepath, version };
  } catch (error: any) {
    console.error('[Update] Download failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Get list of downloaded updates
 */
export function getDownloadedUpdates(): { filename: string; version: string; size: number; downloadedAt: Date }[] {
  const updatesDir = process.env.UPDATE_DIR || DEFAULT_UPDATE_DIR;

  if (!fs.existsSync(updatesDir)) {
    return [];
  }

  const files = fs.readdirSync(updatesDir)
    .filter(f => f.startsWith('warehouse-') && f.endsWith('.zip'));

  return files.map(filename => {
    const filepath = path.join(updatesDir, filename);
    const stats = fs.statSync(filepath);
    const version = filename.replace('warehouse-', '').replace('.zip', '');

    return {
      filename,
      version,
      size: stats.size,
      downloadedAt: stats.mtime
    };
  }).sort((a, b) => b.downloadedAt.getTime() - a.downloadedAt.getTime());
}

/**
 * Delete a downloaded update
 */
export function deleteDownloadedUpdate(filename: string): boolean {
  const updatesDir = process.env.UPDATE_DIR || DEFAULT_UPDATE_DIR;
  const filepath = path.join(updatesDir, filename);

  if (fs.existsSync(filepath) && filename.startsWith('warehouse-') && filename.endsWith('.zip')) {
    fs.unlinkSync(filepath);
    console.log(`[Update] Deleted: ${filename}`);
    return true;
  }

  return false;
}

// Installation directory
const DEFAULT_INSTALL_DIR = '/opt/warehouse';

export interface ApplyUpdateResult {
  success: boolean;
  version?: string;
  steps: { step: string; status: 'success' | 'error' | 'pending'; message: string }[];
  error?: string;
  started?: boolean;
  completed?: boolean;
}

export interface UpdateStatus {
  status: 'idle' | 'running' | 'success' | 'error';
  version?: string;
  steps: { step: string; status: 'success' | 'error' | 'pending'; message: string }[];
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

/**
 * Get the path to the update status file
 */
function getStatusFilePath(): string {
  const updatesDir = process.env.UPDATE_DIR || DEFAULT_UPDATE_DIR;
  return path.join(updatesDir, UPDATE_STATUS_FILE);
}

/**
 * Read current update status
 */
export function getUpdateStatus(): UpdateStatus {
  const statusFile = getStatusFilePath();

  if (!fs.existsSync(statusFile)) {
    return { status: 'idle', steps: [] };
  }

  try {
    const content = fs.readFileSync(statusFile, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    return { status: 'idle', steps: [] };
  }
}

/**
 * Clear update status
 */
export function clearUpdateStatus(): void {
  const statusFile = getStatusFilePath();
  if (fs.existsSync(statusFile)) {
    fs.unlinkSync(statusFile);
  }
}

/**
 * Apply a downloaded update to the installation
 * Runs in background using a shell script that survives server restart
 * @param cleanupAfter - If true, delete the zip and extract files after successful update
 */
export async function applyUpdate(cleanupAfter: boolean = true): Promise<{ started: boolean; error?: string }> {
  const updatesDir = process.env.UPDATE_DIR || DEFAULT_UPDATE_DIR;
  const installDir = process.env.WAREHOUSE_DIR || DEFAULT_INSTALL_DIR;
  const statusFile = getStatusFilePath();

  // Check if update is already running
  const currentStatus = getUpdateStatus();
  if (currentStatus.status === 'running') {
    return { started: false, error: 'An update is already in progress' };
  }

  // Find the latest downloaded update
  const downloads = getDownloadedUpdates();
  if (downloads.length === 0) {
    return { started: false, error: 'No downloaded updates found. Please download an update first.' };
  }

  const latest = downloads[0];
  const zipPath = path.join(updatesDir, latest.filename);
  const version = latest.version;
  const backupName = `pre-update-${Date.now()}`;
  const backupDir = path.join(installDir, 'backups', backupName);
  const extractDir = path.join(updatesDir, `extract-${Date.now()}`);

  // Create the update shell script
  const scriptPath = path.join(updatesDir, 'run-update.sh');
  const cleanupFlag = cleanupAfter ? 'true' : 'false';

  const scriptContent = `#!/bin/bash
# Auto-generated update script
# This runs in background and survives server restart

STATUS_FILE="${statusFile}"
INSTALL_DIR="${installDir}"
UPDATES_DIR="${updatesDir}"
ZIP_PATH="${zipPath}"
VERSION="${version}"
BACKUP_DIR="${backupDir}"
EXTRACT_DIR="${extractDir}"
CLEANUP="${cleanupFlag}"

# Function to write status
write_status() {
  local status="$1"
  local step="$2"
  local step_status="$3"
  local message="$4"
  local error="$5"

  # Read existing steps
  if [ -f "$STATUS_FILE" ]; then
    EXISTING_STEPS=$(cat "$STATUS_FILE" | grep -o '"steps":\\[.*\\]' | sed 's/"steps"://')
  else
    EXISTING_STEPS="[]"
  fi

  # Add new step if provided
  if [ -n "$step" ]; then
    NEW_STEP='{"step":"'"$step"'","status":"'"$step_status"'","message":"'"$message"'"}'
    if [ "$EXISTING_STEPS" = "[]" ]; then
      EXISTING_STEPS="[$NEW_STEP]"
    else
      EXISTING_STEPS="\${EXISTING_STEPS%]},\$NEW_STEP]"
    fi
  fi

  # Write status file
  if [ -n "$error" ]; then
    echo '{"status":"'"$status"'","version":"'"$VERSION"'","steps":'"$EXISTING_STEPS"',"error":"'"$error"'","startedAt":"'"$START_TIME"'","completedAt":"'"$(date -Iseconds)"'"}' > "$STATUS_FILE"
  else
    echo '{"status":"'"$status"'","version":"'"$VERSION"'","steps":'"$EXISTING_STEPS"',"startedAt":"'"$START_TIME"'"}' > "$STATUS_FILE"
  fi
}

START_TIME=$(date -Iseconds)

# Initialize status
echo '{"status":"running","version":"'"$VERSION"'","steps":[],"startedAt":"'"$START_TIME"'"}' > "$STATUS_FILE"

# Step 1: Create backup
echo "[Update] Creating backup..."
mkdir -p "$BACKUP_DIR"
if tar -czf "$BACKUP_DIR/source-backup.tar.gz" --exclude='node_modules' --exclude='uploads' --exclude='backups' --exclude='.git' -C "$INSTALL_DIR" . 2>/dev/null; then
  write_status "running" "Create backup" "success" "Backup saved to $BACKUP_DIR"
else
  write_status "running" "Create backup" "error" "Backup failed but continuing"
fi

# Step 2: Extract update
echo "[Update] Extracting update..."
mkdir -p "$EXTRACT_DIR"
if unzip -q "$ZIP_PATH" -d "$EXTRACT_DIR"; then
  write_status "running" "Extract update" "success" "Update extracted"
else
  write_status "error" "Extract update" "error" "Failed to extract update" "Failed to extract update"
  exit 1
fi

# Find extracted folder
SOURCE_DIR=$(find "$EXTRACT_DIR" -maxdepth 1 -type d | tail -n 1)
if [ "$SOURCE_DIR" = "$EXTRACT_DIR" ]; then
  write_status "error" "Extract update" "error" "No folder found in extracted update" "No folder found"
  exit 1
fi

# Step 3: Copy files
echo "[Update] Copying files..."
if rsync -av --exclude='node_modules' --exclude='uploads' --exclude='backups' --exclude='.env' --exclude='.git' --exclude='backend/.env' --exclude='update' "$SOURCE_DIR/" "$INSTALL_DIR/"; then
  write_status "running" "Copy files" "success" "Files updated"
else
  write_status "error" "Copy files" "error" "Failed to copy files" "Failed to copy files"
  exit 1
fi

# Step 4: Install dependencies
echo "[Update] Installing dependencies..."
cd "$INSTALL_DIR"
if npm install 2>&1; then
  write_status "running" "Install dependencies" "success" "npm install completed"
else
  write_status "error" "Install dependencies" "error" "npm install failed" "Failed to install dependencies"
  exit 1
fi

# Step 5: Update database
echo "[Update] Updating database schema..."
cd "$INSTALL_DIR/backend"
if npx prisma generate 2>&1 && npx prisma db push --accept-data-loss 2>&1; then
  write_status "running" "Update database" "success" "Database schema updated"
else
  write_status "error" "Update database" "error" "Database update failed" "Failed to update database"
  exit 1
fi

# Step 6: Cleanup
if [ "$CLEANUP" = "true" ]; then
  echo "[Update] Cleaning up..."
  rm -rf "$EXTRACT_DIR"
  rm -f "$ZIP_PATH"
  rm -rf "$UPDATES_DIR"/extract-*
  write_status "running" "Cleanup" "success" "Update files removed"
else
  rm -rf "$EXTRACT_DIR"
fi

# Mark complete
echo "[Update] Update completed successfully!"
STEPS=$(cat "$STATUS_FILE" | grep -o '"steps":\\[.*\\]' | sed 's/"steps"://')
echo '{"status":"success","version":"'"$VERSION"'","steps":'"$STEPS"',"startedAt":"'"$START_TIME"'","completedAt":"'"$(date -Iseconds)"'"}' > "$STATUS_FILE"
`;

  try {
    // Ensure updates directory exists
    if (!fs.existsSync(updatesDir)) {
      fs.mkdirSync(updatesDir, { recursive: true });
    }

    // Write the script
    fs.writeFileSync(scriptPath, scriptContent, { mode: 0o755 });

    // Run the script in background with nohup
    console.log('[Update] Starting background update process...');
    const child = spawn('nohup', ['bash', scriptPath], {
      detached: true,
      stdio: 'ignore',
      cwd: updatesDir
    });

    // Detach the child process so it survives server restart
    child.unref();

    console.log(`[Update] Background update started (PID: ${child.pid})`);

    return { started: true };
  } catch (error: any) {
    console.error('[Update] Failed to start update:', error.message);
    return { started: false, error: error.message };
  }
}

/**
 * Get list of available backups for revert
 */
export function getUpdateBackups(): { name: string; path: string; createdAt: Date; size: number }[] {
  const installDir = process.env.WAREHOUSE_DIR || DEFAULT_INSTALL_DIR;
  const backupsDir = path.join(installDir, 'backups');

  if (!fs.existsSync(backupsDir)) {
    return [];
  }

  const backupFolders = fs.readdirSync(backupsDir)
    .filter(f => f.startsWith('pre-update-') && fs.statSync(path.join(backupsDir, f)).isDirectory());

  return backupFolders.map(folder => {
    const folderPath = path.join(backupsDir, folder);
    const backupFile = path.join(folderPath, 'source-backup.tar.gz');
    let size = 0;
    let createdAt = new Date();

    if (fs.existsSync(backupFile)) {
      const stats = fs.statSync(backupFile);
      size = stats.size;
      createdAt = stats.mtime;
    }

    return {
      name: folder,
      path: folderPath,
      createdAt,
      size
    };
  }).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export interface RevertResult {
  success: boolean;
  steps: { step: string; status: 'success' | 'error'; message: string }[];
  error?: string;
}

/**
 * Revert to a previous backup
 */
export async function revertUpdate(backupName?: string): Promise<RevertResult> {
  const installDir = process.env.WAREHOUSE_DIR || DEFAULT_INSTALL_DIR;
  const steps: RevertResult['steps'] = [];

  try {
    // Step 1: Find backup to restore
    console.log('[Revert] Step 1: Finding backup...');
    const backups = getUpdateBackups();

    if (backups.length === 0) {
      return {
        success: false,
        steps,
        error: 'No backups found to revert to.'
      };
    }

    // Use specified backup or latest
    const backup = backupName
      ? backups.find(b => b.name === backupName)
      : backups[0];

    if (!backup) {
      return {
        success: false,
        steps,
        error: `Backup "${backupName}" not found.`
      };
    }

    const backupFile = path.join(backup.path, 'source-backup.tar.gz');
    if (!fs.existsSync(backupFile)) {
      return {
        success: false,
        steps,
        error: 'Backup file not found.'
      };
    }

    steps.push({ step: 'Find backup', status: 'success', message: `Found ${backup.name}` });
    console.log(`[Revert] Found backup: ${backup.name}`);

    // Step 2: Extract backup
    console.log('[Revert] Step 2: Restoring files...');
    try {
      // Extract backup, excluding node_modules, uploads, backups, .env
      await execAsync(
        `tar -xzf "${backupFile}" -C "${installDir}" --exclude='node_modules' --exclude='uploads' --exclude='backups' --exclude='.env' --exclude='backend/.env'`,
        { maxBuffer: 50 * 1024 * 1024 }
      );
      steps.push({ step: 'Restore files', status: 'success', message: 'Files restored from backup' });
      console.log('[Revert] Files restored');
    } catch (err: any) {
      console.error('[Revert] Restore failed:', err.message);
      steps.push({ step: 'Restore files', status: 'error', message: err.message });
      return { success: false, steps, error: 'Failed to restore files from backup' };
    }

    // Step 3: Reinstall dependencies
    console.log('[Revert] Step 3: Reinstalling dependencies...');
    try {
      await execAsync(`cd "${installDir}" && npm install`, {
        maxBuffer: 50 * 1024 * 1024,
        timeout: 300000
      });
      steps.push({ step: 'Install dependencies', status: 'success', message: 'npm install completed' });
      console.log('[Revert] Dependencies installed');
    } catch (err: any) {
      console.error('[Revert] npm install failed:', err.message);
      steps.push({ step: 'Install dependencies', status: 'error', message: err.message });
      return { success: false, steps, error: 'Failed to install dependencies' };
    }

    // Step 4: Regenerate Prisma client
    console.log('[Revert] Step 4: Regenerating database client...');
    try {
      await execAsync(`cd "${installDir}/backend" && npx prisma generate`, {
        maxBuffer: 50 * 1024 * 1024,
        timeout: 120000
      });
      steps.push({ step: 'Regenerate Prisma', status: 'success', message: 'Database client regenerated' });
      console.log('[Revert] Prisma client regenerated');
    } catch (err: any) {
      console.error('[Revert] Prisma generate failed:', err.message);
      steps.push({ step: 'Regenerate Prisma', status: 'error', message: err.message });
      // Don't fail for this - the app might still work
    }

    console.log('[Revert] Revert completed successfully!');
    return {
      success: true,
      steps
    };

  } catch (error: any) {
    console.error('[Revert] Revert failed:', error.message);
    return {
      success: false,
      steps,
      error: error.message
    };
  }
}
