import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { settingsApi, itemsApi } from '../../services/api';
import {
  CircleStackIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';

export default function DatabaseSettings() {
  const [databaseInfo, setDatabaseInfo] = useState<any>(null);
  const [backups, setBackups] = useState<any[]>([]);
  const [databaseLoading, setDatabaseLoading] = useState(false);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [restoringBackup, setRestoringBackup] = useState(false);

  const [auditRetentionDays, setAuditRetentionDays] = useState('365');
  const [historyRetentionCount, setHistoryRetentionCount] = useState('50');
  const [savingRetention, setSavingRetention] = useState(false);
  const [runningCleanup, setRunningCleanup] = useState(false);

  const [includeUploadsInBackup, setIncludeUploadsInBackup] = useState(true);
  const [includeEnvInBackup, setIncludeEnvInBackup] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [selectedRestoreFile, setSelectedRestoreFile] = useState<File | null>(null);
  const restoreFileInputRef = useRef<HTMLInputElement>(null);

  const [importHistory, setImportHistory] = useState<any[]>([]);
  const [loadingImports, setLoadingImports] = useState(false);

  useEffect(() => {
    fetchDatabaseInfo();
    setLoadingImports(true);
    itemsApi.getImportHistory().then(res => {
      setImportHistory(res.data.data || []);
    }).catch(() => {}).finally(() => setLoadingImports(false));
  }, []);

  const fetchDatabaseInfo = async () => {
    setDatabaseLoading(true);
    try {
      const [infoResponse, backupsResponse] = await Promise.all([
        settingsApi.getDatabaseInfo(),
        settingsApi.getBackupList(),
      ]);
      setDatabaseInfo(infoResponse.data.data);
      setBackups(backupsResponse.data.data || []);
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Failed to fetch database info';
      console.error('[Database] Error:', errorMsg, error);
      toast.error(errorMsg);
    } finally {
      setDatabaseLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    setCreatingBackup(true);
    try {
      const response = await settingsApi.createBackup(includeUploadsInBackup, includeEnvInBackup);
      toast.success('Backup created successfully');
      const backupsResponse = await settingsApi.getBackupList();
      setBackups(backupsResponse.data.data || []);
      const filename = response.data.data.filename;
      downloadBackupFile(filename);
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Failed to create backup';
      console.error('[Database] Backup error:', errorMsg, error);
      toast.error(errorMsg);
    } finally {
      setCreatingBackup(false);
    }
  };

  const downloadBackupFile = async (filename: string) => {
    try {
      const response = await settingsApi.downloadBackup(filename);
      const blob = new Blob([response.data], { type: 'application/zip' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Failed to download backup';
      console.error('[Database] Download error:', errorMsg, error);
      toast.error(errorMsg);
    }
  };

  const handleDeleteBackup = async (filename: string) => {
    try {
      await settingsApi.deleteBackup(filename);
      toast.success('Backup deleted');
      setBackups(backups.filter(b => b.filename !== filename));
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Failed to delete backup';
      console.error('[Database] Delete error:', errorMsg, error);
      toast.error(errorMsg);
    }
  };

  const handleRestoreBackup = async () => {
    if (!selectedRestoreFile) return;
    setRestoringBackup(true);
    try {
      await settingsApi.restoreBackup(selectedRestoreFile, true);
      toast.success('Backup restored successfully. Please refresh the page.');
      setShowRestoreConfirm(false);
      setSelectedRestoreFile(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to restore backup');
    } finally {
      setRestoringBackup(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleSaveRetention = async () => {
    const auditDays = parseInt(auditRetentionDays, 10);
    const historyCount = parseInt(historyRetentionCount, 10);

    if (isNaN(auditDays) || auditDays < 0) {
      toast.error('Audit retention days must be 0 or a positive number');
      return;
    }
    if (isNaN(historyCount) || historyCount < 0) {
      toast.error('History retention count must be 0 or a positive number');
      return;
    }

    setSavingRetention(true);
    try {
      await settingsApi.update({
        'audit.retentionDays': String(auditDays),
        'item.historyRetentionCount': String(historyCount),
      });
      toast.success('Data retention settings saved');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save retention settings');
    } finally {
      setSavingRetention(false);
    }
  };

  const handleRunCleanup = async () => {
    setRunningCleanup(true);
    try {
      const response = await settingsApi.triggerRetentionCleanup();
      const { auditDeleted, historyDeleted } = response.data.data;
      toast.success(`Cleanup complete: ${auditDeleted} audit logs and ${historyDeleted} item history entries deleted`);
      fetchDatabaseInfo();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to run cleanup');
    } finally {
      setRunningCleanup(false);
    }
  };


  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg" style={{ backgroundColor: 'color-mix(in srgb, #14b8a6 20%, transparent)' }}>
          <CircleStackIcon className="w-6 h-6" style={{ color: '#14b8a6' }} />
        </div>
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Database Management</h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>View database info, create and restore backups</p>
        </div>
        <div className="ml-auto">
          <button
            onClick={fetchDatabaseInfo}
            disabled={databaseLoading}
            className="btn btn-secondary py-1 px-3 text-sm flex items-center gap-2"
          >
            <ArrowPathIcon className={`w-4 h-4 ${databaseLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Database Info */}
        <div>
          <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Database Information</h3>
          {databaseInfo ? (
            <div className="space-y-4">
              {/* Main info row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                  <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Type</p>
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{databaseInfo.type || 'PostgreSQL'}</p>
                </div>
                <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                  <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Version</p>
                  <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{databaseInfo.version || 'Unknown'}</p>
                </div>
                <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                  <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Database Name</p>
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{databaseInfo.database || 'N/A'}</p>
                </div>
                <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                  <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Status</p>
                  <p className="font-medium flex items-center gap-1.5" style={{ color: databaseInfo.connectionStatus === 'connected' ? '#22c55e' : '#ef4444' }}>
                    <span className={`w-2 h-2 rounded-full ${databaseInfo.connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    {databaseInfo.connectionStatus === 'connected' ? 'Connected' : 'Disconnected'}
                  </p>
                </div>
              </div>
              {/* Secondary info row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                  <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Host</p>
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{databaseInfo.host || 'localhost'}:{databaseInfo.port || 5432}</p>
                </div>
                <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                  <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Size</p>
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{databaseInfo.size || 'Unknown'}</p>
                </div>
                <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                  <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Tables</p>
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{databaseInfo.tableCount || 0}</p>
                </div>
                <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                  <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Uptime</p>
                  <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{databaseInfo.uptime || 'Unknown'}</p>
                </div>
              </div>
              {/* Image statistics row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                  <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Images</p>
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{databaseInfo.imageCount?.toLocaleString() || 0}</p>
                </div>
                <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                  <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Image Storage</p>
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{databaseInfo.imageTotalSize || '0 Bytes'}</p>
                </div>
                <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                  <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Audit Logs</p>
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{databaseInfo.auditLogCount?.toLocaleString() || 0}</p>
                </div>
                <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                  <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Item History</p>
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{databaseInfo.itemHistoryCount?.toLocaleString() || 0}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-lg text-center" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
              Click Refresh to load database information
            </div>
          )}
        </div>

        {/* Data Retention */}
        <div>
          <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Data Retention</h3>
          <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
            Configure automatic cleanup of old records. Set to 0 to disable (keep forever). Cleanup runs daily.
          </p>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <label className="text-sm w-56 flex-shrink-0" style={{ color: 'var(--text-primary)' }}>
                Audit log retention (days)
              </label>
              <input
                type="number"
                min="0"
                value={auditRetentionDays}
                onChange={(e) => setAuditRetentionDays(e.target.value)}
                className="input w-28"
                placeholder="365"
              />
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {auditRetentionDays === '0' ? 'Disabled (keep forever)' : `Delete logs older than ${auditRetentionDays} days`}
              </span>
            </div>

            <div className="flex items-center gap-4">
              <label className="text-sm w-56 flex-shrink-0" style={{ color: 'var(--text-primary)' }}>
                Item history entries (per item)
              </label>
              <input
                type="number"
                min="0"
                value={historyRetentionCount}
                onChange={(e) => setHistoryRetentionCount(e.target.value)}
                className="input w-28"
                placeholder="50"
              />
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {historyRetentionCount === '0' ? 'Disabled (keep forever)' : `Keep last ${historyRetentionCount} entries per item`}
              </span>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleSaveRetention}
                disabled={savingRetention}
                className="btn btn-primary py-2 px-4 flex items-center gap-2"
              >
                {savingRetention && <ArrowPathIcon className="w-4 h-4 animate-spin" />}
                {savingRetention ? 'Saving...' : 'Save Retention Settings'}
              </button>
              <button
                onClick={handleRunCleanup}
                disabled={runningCleanup}
                className="btn btn-secondary py-2 px-4 flex items-center gap-2"
              >
                {runningCleanup && <ArrowPathIcon className="w-4 h-4 animate-spin" />}
                {runningCleanup ? 'Running...' : 'Run Cleanup Now'}
              </button>
            </div>
          </div>
        </div>

        {/* Create Backup */}
        <div>
          <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Create Backup</h3>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
              <input
                type="checkbox"
                checked={includeUploadsInBackup}
                onChange={(e) => setIncludeUploadsInBackup(e.target.checked)}
                className="rounded"
              />
              Include uploaded files (images, documents)
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
              <input
                type="checkbox"
                checked={includeEnvInBackup}
                onChange={(e) => setIncludeEnvInBackup(e.target.checked)}
                className="rounded"
              />
              Include server config (secrets, keys)
            </label>
            <button
              onClick={handleCreateBackup}
              disabled={creatingBackup}
              className="btn btn-primary py-2 px-4 flex items-center gap-2"
            >
              {creatingBackup ? (
                <ArrowPathIcon className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowDownTrayIcon className="w-4 h-4" />
              )}
              {creatingBackup ? 'Creating...' : 'Create Backup'}
            </button>
          </div>
        </div>

        {/* Existing Backups */}
        <div>
          <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Existing Backups</h3>
          {backups.length > 0 ? (
            <div className="border rounded-lg overflow-hidden" style={{ borderColor: 'var(--bg-tertiary)' }}>
              <table className="w-full">
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-secondary)' }}>
                    <th className="text-left px-4 py-2 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Filename</th>
                    <th className="text-left px-4 py-2 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Size</th>
                    <th className="text-left px-4 py-2 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Created</th>
                    <th className="text-right px-4 py-2 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {backups.map((backup) => (
                    <tr key={backup.filename} className="border-t" style={{ borderColor: 'var(--bg-tertiary)' }}>
                      <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-primary)' }}>
                        <div className="flex items-center gap-2">
                          <DocumentTextIcon className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                          {backup.filename}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {formatBytes(backup.size)}
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {new Date(backup.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => downloadBackupFile(backup.filename)}
                            className="btn py-1 px-2 text-xs flex items-center gap-1"
                            style={{ backgroundColor: 'color-mix(in srgb, #3b82f6 20%, transparent)', color: '#3b82f6' }}
                          >
                            <ArrowDownTrayIcon className="w-3 h-3" />
                            Download
                          </button>
                          <button
                            onClick={() => handleDeleteBackup(backup.filename)}
                            className="btn py-1 px-2 text-xs flex items-center gap-1"
                            style={{ backgroundColor: 'color-mix(in srgb, #ef4444 20%, transparent)', color: '#ef4444' }}
                          >
                            <TrashIcon className="w-3 h-3" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-4 rounded-lg text-center text-sm" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
              No backups found
            </div>
          )}
        </div>

        {/* Restore Backup */}
        <div>
          <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Restore from Backup</h3>
          <div className="flex items-center gap-4">
            <input
              type="file"
              ref={restoreFileInputRef}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setSelectedRestoreFile(file);
                  setShowRestoreConfirm(true);
                }
              }}
              accept=".zip"
              className="hidden"
            />
            <button
              onClick={() => restoreFileInputRef.current?.click()}
              disabled={restoringBackup}
              className="btn py-2 px-4 flex items-center gap-2"
              style={{ backgroundColor: 'color-mix(in srgb, #f59e0b 20%, transparent)', color: '#f59e0b' }}
            >
              <ArrowUpTrayIcon className="w-4 h-4" />
              Upload Backup File
            </button>
          </div>
        </div>

        {/* Warning Box */}
        <div className="p-4 rounded-lg border" style={{ backgroundColor: 'color-mix(in srgb, #f59e0b 10%, transparent)', borderColor: 'color-mix(in srgb, #f59e0b 20%, transparent)' }}>
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#f59e0b' }} />
            <div className="text-sm" style={{ color: '#f59e0b' }}>
              <p className="font-medium mb-1">Backup & Restore Information</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Backups include database (users, groups, settings, items, etc.) and optionally uploaded files</li>
                <li>Server config includes JWT secrets, encryption keys - required for full restore to new server</li>
                <li>Restoring a backup will overwrite the current database, files, and optionally server config</li>
                <li>If server config is restored, a server restart is required</li>
                <li>Always create a backup before restoring to prevent data loss</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Restore Confirmation Modal */}
      {showRestoreConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="card p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg" style={{ backgroundColor: 'color-mix(in srgb, #ef4444 20%, transparent)' }}>
                <ExclamationTriangleIcon className="w-6 h-6" style={{ color: '#ef4444' }} />
              </div>
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Confirm Restore</h3>
            </div>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              Are you sure you want to restore from <strong>{selectedRestoreFile?.name}</strong>?
              This will overwrite the current database and uploaded files. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRestoreConfirm(false);
                  setSelectedRestoreFile(null);
                  if (restoreFileInputRef.current) {
                    restoreFileInputRef.current.value = '';
                  }
                }}
                className="btn btn-secondary py-2 px-4"
                disabled={restoringBackup}
              >
                Cancel
              </button>
              <button
                onClick={handleRestoreBackup}
                disabled={restoringBackup}
                className="btn py-2 px-4 flex items-center gap-2"
                style={{ backgroundColor: '#ef4444', color: 'white' }}
              >
                {restoringBackup ? (
                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowUpTrayIcon className="w-4 h-4" />
                )}
                {restoringBackup ? 'Restoring...' : 'Restore Backup'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import History */}
      <div className="mt-6 pt-6 border-t" style={{ borderColor: 'var(--bg-tertiary)' }}>
        <h3 className="text-md font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <ArrowDownTrayIcon className="w-5 h-5" style={{ color: '#14b8a6' }} />
          Import History
        </h3>
        {loadingImports ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--accent)' }} />
          </div>
        ) : importHistory.length === 0 ? (
          <p className="text-sm py-4" style={{ color: 'var(--text-secondary)' }}>No imports yet.</p>
        ) : (
          <div className="space-y-2">
            {importHistory.map((imp: any) => (
              <div key={imp.id} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {imp.filename || 'CSV Import'}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {imp.itemCount} items • by {imp.user?.fullName || imp.user?.username || 'Unknown'} • {new Date(imp.createdAt).toLocaleString()}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${imp.status === 'completed' ? 'text-green-400' : imp.status === 'failed' ? 'text-red-400' : 'text-yellow-400'}`}
                  style={{ backgroundColor: imp.status === 'completed' ? 'rgba(34,197,94,0.15)' : imp.status === 'failed' ? 'rgba(239,68,68,0.15)' : 'rgba(234,179,8,0.15)' }}>
                  {imp.status || 'completed'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
