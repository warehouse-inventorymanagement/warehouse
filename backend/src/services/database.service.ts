/**
 * Database service for info, backup, and restore operations
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import extract from 'extract-zip';
import prisma from '../lib/prisma.js';

// Runs a command with an argument array (no shell) to prevent injection.
function spawnAsync(cmd: string, args: string[], options: { env: NodeJS.ProcessEnv }): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { ...options, stdio: 'pipe' });
    const stderr: Buffer[] = [];
    proc.stderr?.on('data', (d) => stderr.push(d));
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited ${code}: ${Buffer.concat(stderr).toString().slice(0, 500)}`));
    });
    proc.on('error', reject);
  });
}

export interface DatabaseInfo {
  type: string;
  version: string;
  host: string;
  port: number;
  database: string;
  size: string;
  tableCount: number;
  connectionStatus: 'connected' | 'disconnected';
  uptime?: string;
  lastBackup?: Date | null;
  imageCount: number;
  imageTotalSize: string;
  auditLogCount: number;
  itemHistoryCount: number;
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export interface BackupInfo {
  id: string;
  filename: string;
  size: number;
  createdAt: Date;
  includesUploads: boolean;
}

/**
 * Parse DATABASE_URL to extract connection details
 */
function parseDatabaseUrl(): { host: string; port: number; database: string; user: string; password: string } {
  const url = process.env.DATABASE_URL || '';
  // Format: postgresql://user:password@host:port/database
  const match = url.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);

  if (match) {
    return {
      user: match[1],
      password: match[2],
      host: match[3],
      port: parseInt(match[4], 10),
      database: match[5].split('?')[0], // Remove query params
    };
  }

  return {
    user: 'postgres',
    password: '',
    host: 'localhost',
    port: 5432,
    database: 'warehouse',
  };
}

/**
 * Get database information
 */
export async function getDatabaseInfo(): Promise<DatabaseInfo> {
  const connInfo = parseDatabaseUrl();

  try {
    // Get PostgreSQL version
    const versionResult = await prisma.$queryRaw<[{ version: string }]>`SELECT version()`;
    const version = versionResult[0]?.version || 'Unknown';

    // Get database size
    const sizeResult = await prisma.$queryRaw<[{ size: string }]>`
      SELECT pg_size_pretty(pg_database_size(current_database())) as size
    `;
    const size = sizeResult[0]?.size || 'Unknown';

    // Get table count
    const tableCountResult = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `;
    const tableCount = Number(tableCountResult[0]?.count || 0);

    // Get server uptime (cast to text to avoid Prisma interval parsing issues)
    const uptimeResult = await prisma.$queryRaw<[{ uptime: string }]>`
      SELECT date_trunc('second', current_timestamp - pg_postmaster_start_time())::text as uptime
    `;
    const uptime = uptimeResult[0]?.uptime || 'Unknown';

    // Get last backup time from settings
    const lastBackupSetting = await prisma.setting.findUnique({
      where: { key: 'database.lastBackup' }
    });

    // Get image statistics
    const imageCount = await prisma.itemImage.count();
    const imageSizeResult = await prisma.itemImage.aggregate({
      _sum: { size: true }
    });
    const imageTotalSize = formatBytes(imageSizeResult._sum.size || 0);

    // Get audit log and item history counts
    const auditLogCount = await prisma.auditLog.count();
    const itemHistoryCount = await prisma.itemHistory.count();

    return {
      type: 'PostgreSQL',
      version: version.split(',')[0] || version, // Get just the version string
      host: connInfo.host,
      port: connInfo.port,
      database: connInfo.database,
      size,
      tableCount,
      connectionStatus: 'connected',
      uptime: String(uptime),
      lastBackup: lastBackupSetting ? new Date(lastBackupSetting.value) : null,
      imageCount,
      imageTotalSize,
      auditLogCount,
      itemHistoryCount,
    };
  } catch (error) {
    console.error('[Database] Failed to get database info:', error);
    return {
      type: 'PostgreSQL',
      version: 'Unknown',
      host: connInfo.host,
      port: connInfo.port,
      database: connInfo.database,
      size: 'Unknown',
      tableCount: 0,
      connectionStatus: 'disconnected',
      lastBackup: null,
      imageCount: 0,
      imageTotalSize: '0 Bytes',
      auditLogCount: 0,
      itemHistoryCount: 0,
    };
  }
}

/**
 * Create a database backup
 */
export async function createBackup(includeUploads: boolean = true, includeEnvConfig: boolean = false): Promise<{ filepath: string; filename: string }> {
  const connInfo = parseDatabaseUrl();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(process.cwd(), 'backups');
  const tempDir = path.join(backupDir, `temp-${timestamp}`);

  // Ensure backup directory exists
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const sqlFilePath = path.join(tempDir, 'database.sql');
  const zipFilename = `warehouse-backup-${timestamp}.zip`;
  const zipFilePath = path.join(backupDir, zipFilename);

  try {
    // Create database dump using pg_dump
    // Cross-platform: set PGPASSWORD environment variable
    // --clean: adds DROP statements before CREATE (required for restore to work)
    // --if-exists: prevents errors if objects don't exist during restore
    const env = { ...process.env, PGPASSWORD: connInfo.password };

    console.log('[Database] Creating database dump...');
    await spawnAsync('pg_dump', [
      '-h', connInfo.host,
      '-p', String(connInfo.port),
      '-U', connInfo.user,
      '-d', connInfo.database,
      '-F', 'p', '--clean', '--if-exists',
      '-f', sqlFilePath
    ], { env });
    console.log('[Database] Database dump created');

    // Create zip archive
    const output = fs.createWriteStream(zipFilePath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    return new Promise((resolve, reject) => {
      output.on('close', async () => {
        // Cleanup temp directory
        fs.rmSync(tempDir, { recursive: true, force: true });

        // Update last backup time
        await prisma.setting.upsert({
          where: { key: 'database.lastBackup' },
          update: { value: new Date().toISOString() },
          create: { key: 'database.lastBackup', value: new Date().toISOString() },
        });

        console.log(`[Database] Backup created: ${zipFilename} (${archive.pointer()} bytes)`);
        resolve({ filepath: zipFilePath, filename: zipFilename });
      });

      output.on('error', reject);
      archive.on('error', reject);

      archive.pipe(output);

      // Add database dump
      archive.file(sqlFilePath, { name: 'database.sql' });

      // Add uploads directory if requested
      if (includeUploads) {
        const uploadsDir = process.env.UPLOAD_DIR || './uploads';
        if (fs.existsSync(uploadsDir)) {
          archive.directory(uploadsDir, 'uploads');
          console.log('[Database] Including uploads directory in backup');
        }
      }

      // Add .env config file if requested
      if (includeEnvConfig) {
        const envPath = path.join(process.cwd(), '.env');
        if (fs.existsSync(envPath)) {
          archive.file(envPath, { name: 'env-config.txt' });
          console.log('[Database] Including environment config in backup');
        }
      }

      // Add backup metadata
      const metadata = {
        version: '1.0',
        createdAt: new Date().toISOString(),
        includeUploads,
        includeEnvConfig,
        database: connInfo.database,
      };
      archive.append(JSON.stringify(metadata, null, 2), { name: 'backup-metadata.json' });

      archive.finalize();
    });
  } catch (error) {
    // Cleanup on error
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    throw error;
  }
}

/**
 * Restore database from backup
 */
export async function restoreBackup(zipFilePath: string): Promise<{ success: boolean; message: string }> {
  const connInfo = parseDatabaseUrl();
  const tempDir = path.join(process.cwd(), 'backups', `restore-${Date.now()}`);

  try {
    // Extract zip
    console.log('[Database] Extracting backup archive...');
    await extract(zipFilePath, { dir: tempDir });

    // Check for metadata
    const metadataPath = path.join(tempDir, 'backup-metadata.json');
    if (!fs.existsSync(metadataPath)) {
      throw new Error('Invalid backup file: missing metadata');
    }

    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
    console.log('[Database] Backup metadata:', metadata);

    // Check for database dump
    const sqlFilePath = path.join(tempDir, 'database.sql');
    if (!fs.existsSync(sqlFilePath)) {
      throw new Error('Invalid backup file: missing database.sql');
    }

    // Restore database
    console.log('[Database] Restoring database...');

    // Cross-platform: set PGPASSWORD environment variable
    const env = { ...process.env, PGPASSWORD: connInfo.password };
    await spawnAsync('psql', [
      '-h', connInfo.host,
      '-p', String(connInfo.port),
      '-U', connInfo.user,
      '-d', connInfo.database,
      '-f', sqlFilePath
    ], { env });
    console.log('[Database] Database restored');

    // Restore uploads if included
    const uploadsBackupDir = path.join(tempDir, 'uploads');
    if (fs.existsSync(uploadsBackupDir)) {
      const uploadsDir = process.env.UPLOAD_DIR || './uploads';

      // Clear existing uploads
      if (fs.existsSync(uploadsDir)) {
        fs.rmSync(uploadsDir, { recursive: true, force: true });
      }

      // Copy restored uploads
      fs.cpSync(uploadsBackupDir, uploadsDir, { recursive: true });
      console.log('[Database] Uploads restored');
    }

    // Restore env config if included
    const envBackupPath = path.join(tempDir, 'env-config.txt');
    const envRestored = fs.existsSync(envBackupPath);
    if (envRestored) {
      const envPath = path.join(process.cwd(), '.env');
      fs.copyFileSync(envBackupPath, envPath);
      console.log('[Database] Environment config restored (restart required)');
    }

    // Cleanup
    fs.rmSync(tempDir, { recursive: true, force: true });

    return {
      success: true,
      message: envRestored
        ? 'Backup restored successfully. Server restart required for env changes.'
        : 'Backup restored successfully'
    };
  } catch (error: any) {
    // Cleanup on error
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }

    console.error('[Database] Restore failed:', error);
    return { success: false, message: error.message || 'Restore failed' };
  }
}

/**
 * Get list of available backups
 */
export function getBackupList(): BackupInfo[] {
  const backupDir = path.join(process.cwd(), 'backups');

  if (!fs.existsSync(backupDir)) {
    return [];
  }

  const files = fs.readdirSync(backupDir)
    .filter(f => f.startsWith('warehouse-backup-') && f.endsWith('.zip'));

  return files.map(filename => {
    const filepath = path.join(backupDir, filename);
    const stats = fs.statSync(filepath);

    return {
      id: filename.replace('.zip', ''),
      filename,
      size: stats.size,
      createdAt: stats.mtime,
      includesUploads: true, // Assume all backups include uploads
    };
  }).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/**
 * Delete a backup file
 */
export function deleteBackup(filename: string): boolean {
  const filepath = path.join(process.cwd(), 'backups', filename);

  if (fs.existsSync(filepath) && filename.startsWith('warehouse-backup-')) {
    fs.unlinkSync(filepath);
    return true;
  }

  return false;
}

/**
 * Get backup file path
 */
export function getBackupPath(filename: string): string | null {
  const filepath = path.join(process.cwd(), 'backups', filename);

  if (fs.existsSync(filepath) && filename.startsWith('warehouse-backup-')) {
    return filepath;
  }

  return null;
}
