import { useState, useRef, useEffect, useCallback } from 'react';
import { settingsApi } from '../../services/api';
import toast from 'react-hot-toast';
import {
  CommandLineIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  TrashIcon,
  ChevronDownIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';

export default function LogsSettings() {
  // Logs state
  const [backendLogs, setBackendLogs] = useState<any[]>([]);
  const [logStats, setLogStats] = useState<any>(null);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logLevelFilter, setLogLevelFilter] = useState<string>('all');
  const [logSourceFilter, setLogSourceFilter] = useState<string>('all');
  const [logSearch, setLogSearch] = useState('');
  const [autoRefreshLogs, setAutoRefreshLogs] = useState(false);
  const logsPollInterval = useRef<NodeJS.Timeout | null>(null);
  const [nginxAccessLog, setNginxAccessLog] = useState('');
  const [nginxErrorLog, setNginxErrorLog] = useState('');
  const [savingNginxConfig, setSavingNginxConfig] = useState(false);
  const [showNginxConfig, setShowNginxConfig] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const levelFilter = logLevelFilter === 'all' ? undefined : logLevelFilter;
      const sourceFilter = logSourceFilter === 'all' ? undefined : logSourceFilter;
      const response = await settingsApi.getLogs({
        limit: 500,
        level: levelFilter,
        source: sourceFilter,
        search: logSearch || undefined,
      });
      setBackendLogs(response.data.data.logs || []);
      setLogStats(response.data.data.stats || null);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLogsLoading(false);
    }
  }, [logLevelFilter, logSourceFilter, logSearch]);

  const handleClearLogs = async () => {
    try {
      await settingsApi.clearLogs();
      setBackendLogs([]);
      toast.success('Logs cleared');
    } catch (error) {
      toast.error('Failed to clear logs');
    }
  };

  const fetchNginxConfig = async () => {
    try {
      const response = await settingsApi.getNginxLogConfig();
      setNginxAccessLog(response.data.data['nginx.accessLog'] || '');
      setNginxErrorLog(response.data.data['nginx.errorLog'] || '');
    } catch (error) {
      console.error('Failed to fetch nginx config:', error);
    }
  };

  const handleSaveNginxConfig = async () => {
    setSavingNginxConfig(true);
    try {
      await settingsApi.updateNginxLogConfig({
        accessLog: nginxAccessLog,
        errorLog: nginxErrorLog
      });
      toast.success('Nginx log configuration saved');
      fetchLogs();
    } catch (error) {
      toast.error('Failed to save nginx config');
    } finally {
      setSavingNginxConfig(false);
    }
  };

  // Fetch logs on mount
  useEffect(() => {
    fetchLogs();
    fetchNginxConfig();
  }, [fetchLogs]);

  // Auto-refresh cleanup
  useEffect(() => {
    return () => {
      if (logsPollInterval.current) {
        clearInterval(logsPollInterval.current);
        logsPollInterval.current = null;
      }
    };
  }, []);

  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg" style={{ backgroundColor: 'color-mix(in srgb, #6366f1 20%, transparent)' }}>
          <CommandLineIcon className="w-6 h-6" style={{ color: '#6366f1' }} />
        </div>
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Server Logs</h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>View logs from backend, frontend, SMTP, LDAP, and nginx</p>
        </div>
      </div>

      {/* Source Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {[
          { value: 'all', label: 'All', color: '#6366f1' },
          { value: 'backend', label: 'Backend', color: '#3b82f6' },
          { value: 'frontend', label: 'Frontend', color: '#8b5cf6' },
          { value: 'smtp', label: 'SMTP', color: '#10b981' },
          { value: 'ldap', label: 'LDAP', color: '#f59e0b' },
          { value: 'nginx', label: 'Nginx', color: '#ec4899' },
        ].map((source) => (
          <button
            key={source.value}
            onClick={() => setLogSourceFilter(source.value)}
            className="px-3 py-1.5 text-sm font-medium rounded-lg transition-all"
            style={{
              backgroundColor: logSourceFilter === source.value
                ? `color-mix(in srgb, ${source.color} 20%, transparent)`
                : 'var(--bg-secondary)',
              color: logSourceFilter === source.value ? source.color : 'var(--text-secondary)',
              border: logSourceFilter === source.value ? `1px solid ${source.color}` : '1px solid transparent',
            }}
          >
            {source.label}
            {logStats?.bySource && source.value !== 'all' && (
              <span className="ml-1.5 text-xs opacity-70">
                ({logStats.bySource[source.value] || 0})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Log Controls */}
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <label className="text-sm" style={{ color: 'var(--text-secondary)' }}>Level:</label>
          <select
            value={logLevelFilter}
            onChange={(e) => setLogLevelFilter(e.target.value)}
            className="input py-1 px-2 text-sm w-28"
          >
            <option value="all">All</option>
            <option value="error">Error</option>
            <option value="warn">Warning</option>
            <option value="info">Info</option>
            <option value="debug">Debug</option>
          </select>
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-48">
          <MagnifyingGlassIcon className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
          <input
            type="text"
            value={logSearch}
            onChange={(e) => setLogSearch(e.target.value)}
            placeholder="Search logs..."
            className="input py-1 px-2 text-sm flex-1"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
            <input
              type="checkbox"
              checked={autoRefreshLogs}
              onChange={(e) => {
                setAutoRefreshLogs(e.target.checked);
                if (e.target.checked) {
                  fetchLogs();
                  logsPollInterval.current = setInterval(fetchLogs, 5000);
                } else if (logsPollInterval.current) {
                  clearInterval(logsPollInterval.current);
                  logsPollInterval.current = null;
                }
              }}
              className="rounded"
            />
            Auto-refresh
          </label>
        </div>
        <button
          onClick={fetchLogs}
          disabled={logsLoading}
          className="btn btn-secondary py-1 px-3 text-sm flex items-center gap-2"
        >
          <ArrowPathIcon className={`w-4 h-4 ${logsLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
        <button
          onClick={handleClearLogs}
          className="btn py-1 px-3 text-sm flex items-center gap-2"
          style={{ backgroundColor: 'color-mix(in srgb, #ef4444 20%, transparent)', color: '#ef4444' }}
        >
          <TrashIcon className="w-4 h-4" />
          Clear
        </button>
      </div>

      {/* Log Stats */}
      {logStats && (
        <div className="flex flex-wrap gap-4 mb-4 text-sm">
          <span style={{ color: 'var(--text-secondary)' }}>
            Total: <span style={{ color: 'var(--text-primary)' }}>{logStats.total}</span>
          </span>
          <span className="border-l pl-4" style={{ borderColor: 'var(--bg-tertiary)', color: '#ef4444' }}>
            Errors: {logStats.byLevel?.error || 0}
          </span>
          <span style={{ color: '#f59e0b' }}>
            Warnings: {logStats.byLevel?.warn || 0}
          </span>
          <span style={{ color: '#3b82f6' }}>
            Info: {logStats.byLevel?.info || 0}
          </span>
          <span style={{ color: '#6b7280' }}>
            Debug: {logStats.byLevel?.debug || 0}
          </span>
        </div>
      )}

      {/* Log Viewer */}
      <div
        className="rounded-lg border overflow-auto font-mono text-xs"
        style={{
          backgroundColor: '#0d1117',
          borderColor: 'var(--bg-tertiary)',
          height: '500px'
        }}
      >
        {logsLoading && backendLogs.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <ArrowPathIcon className="w-6 h-6 animate-spin" style={{ color: 'var(--text-secondary)' }} />
          </div>
        ) : backendLogs.length === 0 ? (
          <div className="flex items-center justify-center h-full" style={{ color: 'var(--text-secondary)' }}>
            No logs available. Click Refresh to load logs.
          </div>
        ) : (
          <div className="p-3 space-y-0.5">
            {backendLogs.map((log, index) => {
              const levelColors: Record<string, string> = {
                error: '#ef4444',
                warn: '#f59e0b',
                info: '#3b82f6',
                debug: '#6b7280'
              };
              const sourceColors: Record<string, string> = {
                backend: '#3b82f6',
                frontend: '#8b5cf6',
                smtp: '#10b981',
                ldap: '#f59e0b',
                nginx: '#ec4899'
              };
              const levelColor = levelColors[log.level] || '#6b7280';
              const sourceColor = sourceColors[log.source] || '#6b7280';
              const timestamp = new Date(log.timestamp).toLocaleString();
              return (
                <div key={log.id || index} className="flex gap-2 hover:bg-white/5 px-1 rounded items-start">
                  <span style={{ color: '#6b7280' }} className="flex-shrink-0">{timestamp}</span>
                  <span
                    className="uppercase font-semibold w-12 flex-shrink-0"
                    style={{ color: levelColor }}
                  >
                    {log.level}
                  </span>
                  <span
                    className="text-xs px-1.5 py-0.5 rounded flex-shrink-0"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${sourceColor} 20%, transparent)`,
                      color: sourceColor
                    }}
                  >
                    {log.source}
                  </span>
                  <span style={{ color: '#e6edf3' }} className="break-all">{log.message}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Nginx Log Configuration */}
      <div className="mt-4">
        <button
          onClick={() => setShowNginxConfig(!showNginxConfig)}
          className="flex items-center gap-2 text-sm font-medium w-full p-3 rounded-lg transition-colors"
          style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
        >
          <Cog6ToothIcon className="w-5 h-5" style={{ color: '#ec4899' }} />
          <span>Nginx Log Configuration</span>
          <ChevronDownIcon
            className={`w-4 h-4 ml-auto transition-transform ${showNginxConfig ? 'rotate-180' : ''}`}
            style={{ color: 'var(--text-secondary)' }}
          />
        </button>
        {showNginxConfig && (
          <div className="mt-2 p-4 rounded-lg border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--bg-tertiary)' }}>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              Configure paths to nginx log files to include them in the log viewer. The backend process needs read permission on these files.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                  Access Log Path
                </label>
                <input
                  type="text"
                  value={nginxAccessLog}
                  onChange={(e) => setNginxAccessLog(e.target.value)}
                  placeholder="/var/log/nginx/access.log"
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                  Error Log Path
                </label>
                <input
                  type="text"
                  value={nginxErrorLog}
                  onChange={(e) => setNginxErrorLog(e.target.value)}
                  placeholder="/var/log/nginx/error.log"
                  className="input w-full"
                />
              </div>
              <button
                onClick={handleSaveNginxConfig}
                disabled={savingNginxConfig}
                className="btn btn-primary flex items-center gap-2"
              >
                {savingNginxConfig ? (
                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                ) : null}
                Save Configuration
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="mt-4 p-4 rounded-lg border" style={{ backgroundColor: 'color-mix(in srgb, #6366f1 10%, transparent)', borderColor: 'color-mix(in srgb, #6366f1 20%, transparent)' }}>
        <div className="flex items-start gap-3">
          <CommandLineIcon className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#6366f1' }} />
          <div className="text-sm" style={{ color: '#6366f1' }}>
            <p>Logs from all sources (backend, frontend, SMTP, LDAP, nginx) are stored in memory and will be cleared on server restart. Maximum 1000 entries are kept.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
