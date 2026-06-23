import { useState, useEffect } from 'react';
import { auditApi, usersApi, settingsApi } from '../services/api';
import {
  ClockIcon,
  FunnelIcon,
  InformationCircleIcon,
  PlusCircleIcon,
  PencilSquareIcon,
  TrashIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowRightOnRectangleIcon,
  ExclamationTriangleIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import type { AuditLog, User, Pagination } from '../types';

const ACTION_ICONS: Record<string, typeof PlusCircleIcon> = {
  CREATE: PlusCircleIcon,
  UPDATE: PencilSquareIcon,
  DELETE: TrashIcon,
  LOGIN_SUCCESS: ArrowRightOnRectangleIcon,
  LOGIN_FAILED: ExclamationTriangleIcon,
};

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'text-green-600 bg-green-50 dark:bg-green-500/10 dark:text-green-400',
  UPDATE: 'text-primary bg-primary/10',
  DELETE: 'text-red-600 bg-red-50 dark:bg-red-500/10 dark:text-red-400',
  LOGIN_SUCCESS: 'text-blue-600 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-400',
  LOGIN_FAILED: 'text-orange-600 bg-orange-50 dark:bg-orange-500/10 dark:text-orange-400',
};

const ENTITY_LABELS: Record<string, string> = {
  item: 'Item',
  category: 'Category',
  location: 'Location',
  tag: 'Tag',
  user: 'User',
  role: 'Role',
  group: 'Group',
  auth: 'Authentication',
  icon: 'Icon',
  template: 'Template',
};

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [retentionDays, setRetentionDays] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);

  // Audit settings
  const [auditSettings, setAuditSettings] = useState<Record<string, string>>({});
  const showCol = (col: string) => auditSettings[`audit.columns.${col}`] !== 'false';
  const itemsPerPage = parseInt(auditSettings['audit.display.itemsPerPage'] || '50', 10);
  const exportEnabled = auditSettings['audit.export.enabled'] !== 'false';

  // Filters
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [userId, setUserId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    settingsApi.getAll().then((res) => {
      const data = res.data.data;
      const settings: Record<string, string> = {};
      Object.entries(data).forEach(([key, value]) => {
        if (key.startsWith('audit.')) settings[key] = value;
      });
      setAuditSettings(settings);

      const days = parseInt(data['audit.retentionDays'] || '365', 10);
      if (days > 0) setRetentionDays(days);
    }).catch(() => {});

    fetchUsers();
  }, []);

  // Fetch logs once settings are loaded (so itemsPerPage is correct)
  useEffect(() => {
    fetchLogs();
  }, [auditSettings]);

  const fetchLogs = async (page = 1) => {
    setLoading(true);
    try {
      const response = await auditApi.getAll({
        page,
        limit: itemsPerPage,
        entityType: entityType || undefined,
        action: action || undefined,
        userId: userId || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setLogs(response.data.data);
      if (response.data.pagination) {
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await usersApi.getAll({ limit: 100 });
      setUsers(response.data.data);
    } catch (error) {
      console.error('Failed to fetch users');
    }
  };

  const handleFilter = () => {
    fetchLogs(1);
  };

  const clearFilters = () => {
    setEntityType('');
    setAction('');
    setUserId('');
    setStartDate('');
    setEndDate('');
    setTimeout(() => fetchLogs(1), 0);
  };

  const toggleExpanded = (id: string) => {
    setExpandedLogs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  const formatChanges = (changes: Record<string, any>) => {
    return Object.entries(changes).map(([field, value]) => {
      const { old, new: newVal } = value as { old: any; new: any };
      return (
        <div key={field} className="flex items-start gap-2 text-sm py-1">
          <span className="font-medium min-w-[100px]" style={{ color: 'var(--text-secondary)' }}>{field}:</span>
          <span className="text-red-600 dark:text-red-400 line-through">
            {old === null ? 'null' : typeof old === 'object' ? JSON.stringify(old) : String(old)}
          </span>
          <span className="text-gray-400">&rarr;</span>
          <span className="text-green-600 dark:text-green-400">
            {newVal === null ? 'null' : typeof newVal === 'object' ? JSON.stringify(newVal) : String(newVal)}
          </span>
        </div>
      );
    });
  };

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const response = await auditApi.exportCsv({
        entityType: entityType || undefined,
        userId: userId || undefined,
        action: action || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      const blob = new Blob([response.data as any], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export audit logs:', error);
    } finally {
      setExporting(false);
    }
  };

  // Render user info for a log entry (non-login)
  const renderUserInfo = (log: AuditLog) => {
    if (!log.user) return <span style={{ color: 'var(--text-secondary)' }}>Unknown User</span>;
    return (
      <>
        {showCol('fullName') && log.user.fullName && (
          <span className="font-medium" style={{ color: 'var(--accent)' }}>
            {log.user.fullName}
          </span>
        )}
        {showCol('username') && (
          <span
            className={log.user.fullName && showCol('fullName') ? 'text-sm' : 'font-medium'}
            style={{ color: log.user.fullName && showCol('fullName') ? 'var(--text-secondary)' : 'var(--accent)' }}
          >
            {log.user.fullName && showCol('fullName') ? `(${log.user.username})` : log.user.username}
          </span>
        )}
        {showCol('role') && log.user.roleName && (
          <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
            {log.user.roleName}
          </span>
        )}
        {showCol('authMethod') && log.user.authMethod && (
          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
            log.user.authMethod !== 'Local' ? 'text-purple-600 dark:text-purple-400' : ''
          }`} style={log.user.authMethod === 'Local' ? { color: 'var(--text-secondary)', backgroundColor: 'var(--bg-tertiary)' } : { backgroundColor: 'color-mix(in srgb, #a855f7 15%, transparent)' }}>
            {log.user.authMethod}
          </span>
        )}
      </>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Audit Log</h1>
          <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>Track all changes made in the system</p>
        </div>
        {exportEnabled && (
          <button
            onClick={handleExportCsv}
            disabled={exporting}
            className="btn btn-secondary flex items-center gap-2"
          >
            <ArrowDownTrayIcon className="w-5 h-5" />
            {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
        )}
      </div>

      {/* Retention info banner */}
      {retentionDays && (
        <div
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm"
          style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 10%, transparent)', color: 'var(--text-secondary)' }}
        >
          <InformationCircleIcon className="w-4 h-4 shrink-0" style={{ color: 'var(--accent)' }} />
          Logs older than {retentionDays} days are automatically deleted
        </div>
      )}

      {/* Filters */}
      <div className="card p-4">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`btn ${showFilters ? 'btn-primary' : 'btn-secondary'} flex items-center gap-2`}
        >
          <FunnelIcon className="w-5 h-5" />
          Filters
        </button>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-4 pt-4 border-t" style={{ borderColor: 'var(--bg-tertiary)' }}>
            <div>
              <label className="label">Entity Type</label>
              <select value={entityType} onChange={(e) => setEntityType(e.target.value)} className="input">
                <option value="">All Types</option>
                <option value="item">Items</option>
                <option value="category">Categories</option>
                <option value="location">Locations</option>
                <option value="tag">Tags</option>
                <option value="user">Users</option>
                <option value="role">Roles</option>
                <option value="group">Groups</option>
                <option value="template">Templates</option>
                <option value="auth">Authentication</option>
              </select>
            </div>

            <div>
              <label className="label">Action</label>
              <select value={action} onChange={(e) => setAction(e.target.value)} className="input">
                <option value="">All Actions</option>
                <option value="CREATE">Create</option>
                <option value="UPDATE">Update</option>
                <option value="DELETE">Delete</option>
                <option value="LOGIN_SUCCESS">Login Success</option>
                <option value="LOGIN_FAILED">Login Failed</option>
              </select>
            </div>

            <div>
              <label className="label">User</label>
              <select value={userId} onChange={(e) => setUserId(e.target.value)} className="input">
                <option value="">All Users</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>{user.username}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input"
              />
            </div>

            <div>
              <label className="label">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="input"
              />
            </div>

            <div className="md:col-span-5 flex gap-2">
              <button onClick={handleFilter} className="btn btn-primary">
                Apply Filters
              </button>
              <button onClick={clearFilters} className="btn btn-secondary">
                Clear
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Logs */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--accent)' }} />
        </div>
      ) : logs.length === 0 ? (
        <div className="card p-12 text-center">
          <ClockIcon className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-secondary)' }} />
          <p style={{ color: 'var(--text-secondary)' }}>No audit logs found</p>
        </div>
      ) : (
        <>
          <div className="card overflow-hidden">
            <div className="divide-y" style={{ borderColor: 'var(--bg-tertiary)' }}>
              {logs.map((log) => {
                const Icon = ACTION_ICONS[log.action] || ClockIcon;
                const isExpanded = expandedLogs.has(log.id);

                return (
                  <div key={log.id} className="p-4 transition-colors" onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-xl ${ACTION_COLORS[log.action]}`}>
                        <Icon className="w-5 h-5" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {log.action === 'LOGIN_SUCCESS' || log.action === 'LOGIN_FAILED' ? (
                            <>
                              <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                                {log.action === 'LOGIN_SUCCESS' ? 'Successful login' : 'Failed login attempt'}
                              </span>
                              <span style={{ color: 'var(--text-secondary)' }}>for user</span>
                              <span className="text-primary">"{log.entityName}"</span>
                              {showCol('authMethod') && log.user?.authMethod && (
                                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                                  log.user.authMethod !== 'Local' ? 'text-purple-600 dark:text-purple-400' : ''
                                }`} style={log.user.authMethod === 'Local' ? { color: 'var(--text-secondary)', backgroundColor: 'var(--bg-tertiary)' } : { backgroundColor: 'color-mix(in srgb, #a855f7 15%, transparent)' }}>
                                  {log.user.authMethod}
                                </span>
                              )}
                            </>
                          ) : (
                            <>
                              {renderUserInfo(log)}
                              <span style={{ color: 'var(--text-secondary)' }}>
                                {log.action.toLowerCase()}d
                              </span>
                              {showCol('entityType') && (
                                <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                                  {ENTITY_LABELS[log.entityType] || log.entityType}
                                </span>
                              )}
                              {showCol('entityName') && log.entityName && (
                                <span className="text-primary">
                                  "{log.entityName}"
                                </span>
                              )}
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-4 mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                          {showCol('timestamp') && <span>{formatDate(log.createdAt)}</span>}
                          {showCol('ipAddress') && log.ipAddress && <span>IP: {log.ipAddress}</span>}
                          {showCol('userAgent') && log.userAgent && <span className="truncate max-w-xs" title={log.userAgent}>UA: {log.userAgent}</span>}
                        </div>

                        {showCol('changes') && log.changes && Object.keys(log.changes).length > 0 && (
                          <button
                            onClick={() => toggleExpanded(log.id)}
                            className="flex items-center gap-1 mt-2 text-sm text-primary hover:underline"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUpIcon className="w-4 h-4" />
                                Hide details
                              </>
                            ) : (
                              <>
                                <ChevronDownIcon className="w-4 h-4" />
                                {`View ${Object.keys(log.changes).length} changes`}
                              </>
                            )}
                          </button>
                        )}

                        {isExpanded && log.changes && (
                          <div className="mt-3 p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                            {formatChanges(log.changes)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} entries
              </p>
              <div className="flex gap-2">
                {pagination.page > 1 && (
                  <button onClick={() => fetchLogs(pagination.page - 1)} className="btn btn-secondary">
                    Previous
                  </button>
                )}
                {pagination.page < pagination.pages && (
                  <button onClick={() => fetchLogs(pagination.page + 1)} className="btn btn-secondary">
                    Next
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
