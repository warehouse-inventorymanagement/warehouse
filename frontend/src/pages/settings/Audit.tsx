import { useState, useEffect } from 'react';
import { settingsApi } from '../../services/api';
import { ClockIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function AuditSettings() {
  const [loading, setLoading] = useState(true);

  // Audit view settings state
  const [auditColFullName, setAuditColFullName] = useState(true);
  const [auditColUsername, setAuditColUsername] = useState(true);
  const [auditColRole, setAuditColRole] = useState(true);
  const [auditColAuthMethod, setAuditColAuthMethod] = useState(true);
  const [auditColIpAddress, setAuditColIpAddress] = useState(true);
  const [auditColUserAgent, setAuditColUserAgent] = useState(false);
  const [auditColEntityType, setAuditColEntityType] = useState(true);
  const [auditColEntityName, setAuditColEntityName] = useState(true);
  const [auditColChanges, setAuditColChanges] = useState(true);
  const [auditColTimestamp, setAuditColTimestamp] = useState(true);
  const [auditItemsPerPage, setAuditItemsPerPage] = useState('50');
  const [auditDefaultDateRange, setAuditDefaultDateRange] = useState('all');
  const [auditDefaultExpanded, setAuditDefaultExpanded] = useState(false);
  const [auditLogItems, setAuditLogItems] = useState(true);
  const [auditLogCategories, setAuditLogCategories] = useState(true);
  const [auditLogLocations, setAuditLogLocations] = useState(true);
  const [auditLogTags, setAuditLogTags] = useState(true);
  const [auditLogUsers, setAuditLogUsers] = useState(true);
  const [auditLogRoles, setAuditLogRoles] = useState(true);
  const [auditLogGroups, setAuditLogGroups] = useState(true);
  const [auditLogAuth, setAuditLogAuth] = useState(true);
  const [auditLogIcons, setAuditLogIcons] = useState(true);
  const [auditLogTemplates, setAuditLogTemplates] = useState(true);
  const [auditExportEnabled, setAuditExportEnabled] = useState(true);
  const [savingAudit, setSavingAudit] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await settingsApi.getAll();
      const data = response.data.data;

      setAuditColFullName(data['audit.columns.fullName'] !== 'false');
      setAuditColUsername(data['audit.columns.username'] !== 'false');
      setAuditColRole(data['audit.columns.role'] !== 'false');
      setAuditColAuthMethod(data['audit.columns.authMethod'] !== 'false');
      setAuditColIpAddress(data['audit.columns.ipAddress'] !== 'false');
      setAuditColUserAgent(data['audit.columns.userAgent'] === 'true');
      setAuditColEntityType(data['audit.columns.entityType'] !== 'false');
      setAuditColEntityName(data['audit.columns.entityName'] !== 'false');
      setAuditColChanges(data['audit.columns.changes'] !== 'false');
      setAuditColTimestamp(data['audit.columns.timestamp'] !== 'false');
      setAuditItemsPerPage(data['audit.display.itemsPerPage'] || '50');
      setAuditDefaultDateRange(data['audit.display.defaultDateRange'] || 'all');
      setAuditDefaultExpanded(data['audit.display.defaultExpanded'] === 'true');
      setAuditLogItems(data['audit.log.items'] !== 'false');
      setAuditLogCategories(data['audit.log.categories'] !== 'false');
      setAuditLogLocations(data['audit.log.locations'] !== 'false');
      setAuditLogTags(data['audit.log.tags'] !== 'false');
      setAuditLogUsers(data['audit.log.users'] !== 'false');
      setAuditLogRoles(data['audit.log.roles'] !== 'false');
      setAuditLogGroups(data['audit.log.groups'] !== 'false');
      setAuditLogAuth(data['audit.log.auth'] !== 'false');
      setAuditLogIcons(data['audit.log.icons'] !== 'false');
      setAuditLogTemplates(data['audit.log.templates'] !== 'false');
      setAuditExportEnabled(data['audit.export.enabled'] !== 'false');
    } catch (error) {
      console.error('Failed to fetch audit settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAuditSettings = async () => {
    setSavingAudit(true);
    try {
      await settingsApi.update({
        'audit.columns.fullName': auditColFullName ? 'true' : 'false',
        'audit.columns.username': auditColUsername ? 'true' : 'false',
        'audit.columns.role': auditColRole ? 'true' : 'false',
        'audit.columns.authMethod': auditColAuthMethod ? 'true' : 'false',
        'audit.columns.ipAddress': auditColIpAddress ? 'true' : 'false',
        'audit.columns.userAgent': auditColUserAgent ? 'true' : 'false',
        'audit.columns.entityType': auditColEntityType ? 'true' : 'false',
        'audit.columns.entityName': auditColEntityName ? 'true' : 'false',
        'audit.columns.changes': auditColChanges ? 'true' : 'false',
        'audit.columns.timestamp': auditColTimestamp ? 'true' : 'false',
        'audit.display.itemsPerPage': auditItemsPerPage,
        'audit.display.defaultDateRange': auditDefaultDateRange,
        'audit.display.defaultExpanded': auditDefaultExpanded ? 'true' : 'false',
        'audit.log.items': auditLogItems ? 'true' : 'false',
        'audit.log.categories': auditLogCategories ? 'true' : 'false',
        'audit.log.locations': auditLogLocations ? 'true' : 'false',
        'audit.log.tags': auditLogTags ? 'true' : 'false',
        'audit.log.users': auditLogUsers ? 'true' : 'false',
        'audit.log.roles': auditLogRoles ? 'true' : 'false',
        'audit.log.groups': auditLogGroups ? 'true' : 'false',
        'audit.log.auth': auditLogAuth ? 'true' : 'false',
        'audit.log.icons': auditLogIcons ? 'true' : 'false',
        'audit.log.templates': auditLogTemplates ? 'true' : 'false',
        'audit.export.enabled': auditExportEnabled ? 'true' : 'false',
      });
      toast.success('Audit settings saved');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save audit settings');
    } finally {
      setSavingAudit(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--accent)' }}></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Column Visibility */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg" style={{ backgroundColor: 'color-mix(in srgb, #8b5cf6 20%, transparent)' }}>
            <ClockIcon className="w-6 h-6" style={{ color: '#8b5cf6' }} />
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Column Visibility</h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Choose which details to show in audit log and item history views</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {([
            { label: 'Full Name', val: auditColFullName, set: setAuditColFullName },
            { label: 'Username', val: auditColUsername, set: setAuditColUsername },
            { label: 'Role', val: auditColRole, set: setAuditColRole },
            { label: 'Auth Method', val: auditColAuthMethod, set: setAuditColAuthMethod },
            { label: 'IP Address', val: auditColIpAddress, set: setAuditColIpAddress },
            { label: 'User Agent', val: auditColUserAgent, set: setAuditColUserAgent },
            { label: 'Entity Type', val: auditColEntityType, set: setAuditColEntityType },
            { label: 'Entity Name', val: auditColEntityName, set: setAuditColEntityName },
            { label: 'Changes', val: auditColChanges, set: setAuditColChanges },
            { label: 'Timestamp', val: auditColTimestamp, set: setAuditColTimestamp },
          ] as const).map((col) => (
            <label key={col.label} className="flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-colors" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
              <input type="checkbox" checked={col.val} onChange={(e) => col.set(e.target.checked)} className="rounded" />
              <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{col.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Display Defaults */}
      <div className="card p-6">
        <h3 className="text-md font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Display Defaults</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="label">Items Per Page</label>
            <select className="input" value={auditItemsPerPage} onChange={(e) => setAuditItemsPerPage(e.target.value)}>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="200">200</option>
            </select>
          </div>
          <div>
            <label className="label">Default Date Range</label>
            <select className="input" value={auditDefaultDateRange} onChange={(e) => setAuditDefaultDateRange(e.target.value)}>
              <option value="all">All Time</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="365d">Last Year</option>
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 p-3 rounded-lg cursor-pointer" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
              <input type="checkbox" checked={auditDefaultExpanded} onChange={(e) => setAuditDefaultExpanded(e.target.checked)} className="rounded" />
              <span className="text-sm" style={{ color: 'var(--text-primary)' }}>Expand entries by default</span>
            </label>
          </div>
        </div>
      </div>

      {/* Entity Type Logging */}
      <div className="card p-6">
        <h3 className="text-md font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Entity Type Logging</h3>
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
          Control which entity types generate audit log entries. Disabling will stop <span className="font-medium">future</span> logging for that type — existing entries are not affected.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {([
            { label: 'Items', val: auditLogItems, set: setAuditLogItems },
            { label: 'Categories', val: auditLogCategories, set: setAuditLogCategories },
            { label: 'Locations', val: auditLogLocations, set: setAuditLogLocations },
            { label: 'Tags', val: auditLogTags, set: setAuditLogTags },
            { label: 'Users', val: auditLogUsers, set: setAuditLogUsers },
            { label: 'Roles', val: auditLogRoles, set: setAuditLogRoles },
            { label: 'Groups', val: auditLogGroups, set: setAuditLogGroups },
            { label: 'Authentication', val: auditLogAuth, set: setAuditLogAuth },
            { label: 'Icons', val: auditLogIcons, set: setAuditLogIcons },
            { label: 'Templates', val: auditLogTemplates, set: setAuditLogTemplates },
          ] as const).map((entity) => (
            <label key={entity.label} className="flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-colors" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
              <input type="checkbox" checked={entity.val} onChange={(e) => entity.set(e.target.checked)} className="rounded" />
              <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{entity.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Retention & Export */}
      <div className="card p-6">
        <h3 className="text-md font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Retention & Export</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="label">Retention Period</label>
            <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>Audit logs older than this will be automatically deleted. Managed by the existing <code className="px-1 py-0.5 rounded text-xs" style={{ backgroundColor: 'var(--bg-tertiary)' }}>audit.retentionDays</code> setting in Data Retention.</p>
          </div>
          <div>
            <label className="flex items-center gap-2 p-3 rounded-lg cursor-pointer" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
              <input type="checkbox" checked={auditExportEnabled} onChange={(e) => setAuditExportEnabled(e.target.checked)} className="rounded" />
              <div>
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Enable CSV Export</span>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Show export button on the Audit Log page</p>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button
          onClick={handleSaveAuditSettings}
          disabled={savingAudit}
          className="px-6 py-2 rounded-lg text-white font-medium transition-colors disabled:opacity-50"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          {savingAudit ? 'Saving...' : 'Save Audit Settings'}
        </button>
      </div>
    </div>
  );
}
