import { useState, useEffect } from 'react';
import { settingsApi } from '../../services/api';
import toast from 'react-hot-toast';
import {
  ShieldCheckIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserGroupIcon,
  UserIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

interface LdapUserTestResult {
  success: boolean;
  message: string;
  data: {
    dn: string;
    email?: string;
    displayName?: string;
    groups: string[];
    roleName: string | null;
  } | null;
}

export default function LdapSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Network settings (needed because handleSave saves both LDAP + networking together)
  const [trustProxy, setTrustProxy] = useState(false);
  const [trustedProxies, setTrustedProxies] = useState('');
  const [serverProtocol, setServerProtocol] = useState('http');
  const [serverHostname, setServerHostname] = useState('');
  const [serverPort, setServerPort] = useState('');
  const [rateLimitEnabled, setRateLimitEnabled] = useState(true);
  const [rateLimitGeneral, setRateLimitGeneral] = useState('500');
  const [rateLimitAuth, setRateLimitAuth] = useState('10');
  const [rateLimitPasswordReset, setRateLimitPasswordReset] = useState('5');

  // LDAP settings
  const [ldapEnabled, setLdapEnabled] = useState(false);
  const [ldapName, setLdapName] = useState('');
  const [ldapUrl, setLdapUrl] = useState('');
  const [ldapBindDn, setLdapBindDn] = useState('');
  const [ldapBindPassword, setLdapBindPassword] = useState('');
  const [ldapSearchBase, setLdapSearchBase] = useState('');
  const [ldapSearchFilter, setLdapSearchFilter] = useState('(uid={{username}})');
  const [testingLdap, setTestingLdap] = useState(false);
  const [ldapTestResult, setLdapTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // LDAP SSL settings
  const [ldapVerifySsl, setLdapVerifySsl] = useState(false);

  // LDAP Group settings
  const [ldapGroupSearchBase, setLdapGroupSearchBase] = useState('');
  const [ldapGroupSearchFilter, setLdapGroupSearchFilter] = useState('(member={{userDn}})');

  // Role group mappings
  const [ldapViewerGroup, setLdapViewerGroup] = useState('');
  const [ldapUserGroup, setLdapUserGroup] = useState('');
  const [ldapTechnicianGroup, setLdapTechnicianGroup] = useState('');
  const [ldapManagerGroup, setLdapManagerGroup] = useState('');
  const [ldapAdminGroup, setLdapAdminGroup] = useState('');

  // Group test states
  type RoleType = 'viewer' | 'user' | 'technician' | 'manager' | 'admin';
  const [testingGroup, setTestingGroup] = useState<RoleType | null>(null);
  const [groupTestResults, setGroupTestResults] = useState<Record<RoleType, { success: boolean; message: string; totalUsers: number; sampleUsers: string[] } | null>>({
    viewer: null,
    user: null,
    technician: null,
    manager: null,
    admin: null
  });

  // LDAP User test
  const [testUsername, setTestUsername] = useState('');
  const [testPassword, setTestPassword] = useState('');
  const [testingUser, setTestingUser] = useState(false);
  const [userTestResult, setUserTestResult] = useState<LdapUserTestResult | null>(null);

  // LDAP user sync
  const [syncingLdapUsers, setSyncingLdapUsers] = useState(false);
  const [ldapSyncResult, setLdapSyncResult] = useState<{ synced: number; errors: string[] } | null>(null);

  // Clear settings confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await settingsApi.getAll();
      const data = response.data.data;

      // Network settings
      setTrustProxy(data['network.trustProxy'] === 'true');
      setTrustedProxies(data['network.trustedProxies'] || '');
      setRateLimitEnabled(data['rateLimit.enabled'] !== 'false');
      setRateLimitGeneral(data['rateLimit.general'] || '500');
      setRateLimitAuth(data['rateLimit.auth'] || '10');
      setRateLimitPasswordReset(data['rateLimit.passwordReset'] || '5');
      setServerProtocol(data['server.protocol'] || 'http');
      setServerHostname(data['server.hostname'] || '');
      setServerPort(data['server.port'] || '');

      // LDAP settings
      setLdapEnabled(data['ldap.enabled'] === 'true');
      setLdapName(data['ldap.name'] || '');
      setLdapUrl(data['ldap.url'] || '');
      setLdapBindDn(data['ldap.bindDn'] || '');
      setLdapBindPassword(data['ldap.bindPassword'] || '');
      setLdapSearchBase(data['ldap.searchBase'] || '');
      setLdapSearchFilter(data['ldap.searchFilter'] || '(uid={{username}})');

      // LDAP SSL settings
      setLdapVerifySsl(data['ldap.verifySsl'] === 'true');

      // LDAP Group settings
      setLdapGroupSearchBase(data['ldap.groupSearchBase'] || '');
      setLdapGroupSearchFilter(data['ldap.groupSearchFilter'] || '(member={{userDn}})');

      // Role group mappings
      setLdapViewerGroup(data['ldap.viewerGroup'] || '');
      setLdapUserGroup(data['ldap.userGroup'] || '');
      setLdapTechnicianGroup(data['ldap.technicianGroup'] || '');
      setLdapManagerGroup(data['ldap.managerGroup'] || '');
      setLdapAdminGroup(data['ldap.adminGroup'] || '');
    } catch (error) {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (clearLdap = false) => {
    setSaving(true);
    try {
      // If clearing LDAP, reset all values to empty
      const ldapSettings = clearLdap ? {
        'ldap.enabled': 'false',
        'ldap.name': '',
        'ldap.url': '',
        'ldap.bindDn': '',
        'ldap.bindPassword': '',
        'ldap.searchBase': '',
        'ldap.searchFilter': '(uid={{username}})',
        'ldap.verifySsl': 'false',
        'ldap.groupSearchBase': '',
        'ldap.groupSearchFilter': '(member={{userDn}})',
        'ldap.viewerGroup': '',
        'ldap.userGroup': '',
        'ldap.technicianGroup': '',
        'ldap.managerGroup': '',
        'ldap.adminGroup': '',
      } : {
        'ldap.enabled': ldapEnabled ? 'true' : 'false',
        'ldap.name': ldapName,
        'ldap.url': ldapUrl,
        'ldap.bindDn': ldapBindDn,
        'ldap.bindPassword': ldapBindPassword,
        'ldap.searchBase': ldapSearchBase,
        'ldap.searchFilter': ldapSearchFilter,
        'ldap.verifySsl': ldapVerifySsl ? 'true' : 'false',
        'ldap.groupSearchBase': ldapGroupSearchBase,
        'ldap.groupSearchFilter': ldapGroupSearchFilter,
        'ldap.viewerGroup': ldapViewerGroup,
        'ldap.userGroup': ldapUserGroup,
        'ldap.technicianGroup': ldapTechnicianGroup,
        'ldap.managerGroup': ldapManagerGroup,
        'ldap.adminGroup': ldapAdminGroup,
      };

      await settingsApi.update({
        'network.trustProxy': trustProxy ? 'true' : 'false',
        'network.trustedProxies': trustedProxies,
        'server.protocol': serverProtocol,
        'server.hostname': serverHostname,
        'server.port': serverPort,
        'rateLimit.enabled': rateLimitEnabled ? 'true' : 'false',
        'rateLimit.general': rateLimitGeneral,
        'rateLimit.auth': rateLimitAuth,
        'rateLimit.passwordReset': rateLimitPasswordReset,
        ...ldapSettings,
      });

      if (clearLdap) {
        // Reset local state
        setLdapEnabled(false);
        setLdapName('');
        setLdapUrl('');
        setLdapBindDn('');
        setLdapBindPassword('');
        setLdapSearchBase('');
        setLdapSearchFilter('(uid={{username}})');
        setLdapVerifySsl(false);
        setLdapGroupSearchBase('');
        setLdapGroupSearchFilter('(member={{userDn}})');
        setLdapViewerGroup('');
        setLdapUserGroup('');
        setLdapTechnicianGroup('');
        setLdapManagerGroup('');
        setLdapAdminGroup('');
        setGroupTestResults({ viewer: null, user: null, technician: null, manager: null, admin: null });
        toast.success('LDAP settings cleared.');
      } else {
        toast.success('Settings saved successfully.');
      }
      setShowDeleteConfirm(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleLdapToggle = (checked: boolean) => {
    setLdapEnabled(checked);
  };

  const handleClearLdapSettings = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    handleSave(true);
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  const handleTestLdap = async () => {
    if (!ldapUrl) {
      toast.error('LDAP URL is required');
      return;
    }

    setTestingLdap(true);
    setLdapTestResult(null);
    try {
      const response = await settingsApi.testLdap({
        url: ldapUrl,
        bindDn: ldapBindDn,
        bindPassword: ldapBindPassword,
        searchBase: ldapSearchBase,
        verifySsl: ldapVerifySsl,
      });
      setLdapTestResult({ success: response.data.success, message: response.data.message });
    } catch (error: any) {
      setLdapTestResult({
        success: false,
        message: error.response?.data?.message || 'Connection test failed'
      });
    } finally {
      setTestingLdap(false);
    }
  };

  const handleTestGroup = async (groupName: string, role: RoleType) => {
    if (!ldapUrl) {
      toast.error('LDAP URL is required');
      return;
    }
    if (!groupName) {
      toast.error('Group name is required');
      return;
    }

    setTestingGroup(role);
    setGroupTestResults(prev => ({ ...prev, [role]: null }));
    try {
      const response = await settingsApi.testLdapGroup({
        url: ldapUrl,
        bindDn: ldapBindDn,
        bindPassword: ldapBindPassword,
        searchBase: ldapGroupSearchBase || ldapSearchBase,
        groupName,
        verifySsl: ldapVerifySsl,
      });
      setGroupTestResults(prev => ({ ...prev, [role]: response.data }));
    } catch (error: any) {
      setGroupTestResults(prev => ({
        ...prev,
        [role]: {
          success: false,
          message: error.response?.data?.message || 'Group test failed',
          totalUsers: 0,
          sampleUsers: []
        }
      }));
    } finally {
      setTestingGroup(null);
    }
  };

  const handleTestUser = async () => {
    if (!testUsername || !testPassword) {
      toast.error('Username and password are required');
      return;
    }

    if (!ldapUrl || !ldapSearchBase) {
      toast.error('LDAP URL and Search Base are required');
      return;
    }

    setTestingUser(true);
    setUserTestResult(null);
    try {
      const response = await settingsApi.testLdapUser({
        username: testUsername,
        password: testPassword,
        url: ldapUrl,
        bindDn: ldapBindDn,
        bindPassword: ldapBindPassword,
        searchBase: ldapSearchBase,
        searchFilter: ldapSearchFilter,
        verifySsl: ldapVerifySsl,
        viewerGroup: ldapViewerGroup,
        userGroup: ldapUserGroup,
        technicianGroup: ldapTechnicianGroup,
        managerGroup: ldapManagerGroup,
        adminGroup: ldapAdminGroup,
      });
      setUserTestResult(response.data as LdapUserTestResult);
    } catch (error: any) {
      setUserTestResult({
        success: false,
        message: error.response?.data?.message || 'User test failed',
        data: null
      });
    } finally {
      setTestingUser(false);
    }
  };

  const handleSyncLdapUsers = async () => {
    setSyncingLdapUsers(true);
    setLdapSyncResult(null);
    try {
      const response = await settingsApi.syncLdapUsers();
      setLdapSyncResult(response.data.data);
      if (response.data.success) {
        if (response.data.data.synced > 0) {
          toast.success(response.data.message);
        } else {
          toast.success('All LDAP users are already up to date');
        }
      } else {
        toast.error(response.data.message);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Sync failed');
      setLdapSyncResult({ synced: 0, errors: [error.response?.data?.message || 'Sync failed'] });
    } finally {
      setSyncingLdapUsers(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading settings...</div>
      </div>
    );
  }

  return (
    <>
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={handleCancelDelete} />
          <div className="relative rounded-xl shadow-xl p-6 max-w-md w-full mx-4" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full" style={{ backgroundColor: 'color-mix(in srgb, #ef4444 20%, transparent)' }}>
                <ExclamationTriangleIcon className="w-6 h-6" style={{ color: '#ef4444' }} />
              </div>
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Clear LDAP Settings?</h3>
            </div>
            <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
              This will delete all LDAP configuration including server URL, credentials, and group settings. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={handleCancelDelete}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={saving}
                className="btn bg-red-600 hover:bg-red-700 text-white"
              >
                {saving ? 'Clearing...' : 'Clear Settings'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg" style={{ backgroundColor: 'color-mix(in srgb, #22c55e 20%, transparent)' }}>
            <ShieldCheckIcon className="w-6 h-6" style={{ color: '#22c55e' }} />
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>LDAP / Active Directory</h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Configure LDAP authentication</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="ldapEnabled"
                checked={ldapEnabled}
                onChange={(e) => handleLdapToggle(e.target.checked)}
                className="h-4 w-4 rounded"
                style={{ accentColor: '#a855f7' }}
              />
              <label htmlFor="ldapEnabled" className="ml-2 text-sm" style={{ color: 'var(--text-primary)' }}>
                Enable LDAP authentication
              </label>
            </div>
            <div className="flex items-center gap-2">
              {!ldapEnabled && ldapUrl && (
                <span className="text-xs px-2 py-1 rounded" style={{ color: '#f59e0b', backgroundColor: 'color-mix(in srgb, #f59e0b 10%, transparent)' }}>
                  Configured but disabled
                </span>
              )}
              {ldapUrl && (
                <button
                  type="button"
                  onClick={handleClearLdapSettings}
                  className="text-xs"
                  style={{ color: '#ef4444' }}
                >
                  Clear Settings
                </button>
              )}
            </div>
          </div>

          {!ldapEnabled && (
            <div className="p-3 rounded-lg border" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--bg-tertiary)' }}>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                You can configure LDAP settings below for testing. Enable the checkbox above to activate LDAP authentication.
              </p>
            </div>
          )}

          <div className={`space-y-4 mt-4 ${!ldapEnabled ? 'opacity-75' : ''}`}>
              <div>
                <label className="label">Configuration Name</label>
                <input
                  type="text"
                  value={ldapName}
                  onChange={(e) => setLdapName(e.target.value)}
                  className="input"
                  placeholder="e.g., Corporate AD, LLDAP"
                />
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                  A friendly name for this LDAP configuration. Shown in audit logs to identify LDAP users.
                </p>
              </div>

              <div>
                <label className="label">LDAP URL *</label>
                <input
                  type="text"
                  value={ldapUrl}
                  onChange={(e) => setLdapUrl(e.target.value)}
                  className="input"
                  placeholder="ldap://ldap.example.com:389 or ldaps://ldap.example.com:636"
                />
              </div>

              {ldapUrl.toLowerCase().startsWith('ldaps://') && (
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="ldapVerifySsl"
                    checked={ldapVerifySsl}
                    onChange={(e) => setLdapVerifySsl(e.target.checked)}
                    className="h-4 w-4 rounded"
                    style={{ accentColor: '#a855f7' }}
                  />
                  <label htmlFor="ldapVerifySsl" className="ml-2 text-sm" style={{ color: 'var(--text-primary)' }}>
                    Verify SSL certificate
                  </label>
                  <span className="ml-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    (Disable for self-signed certificates)
                  </span>
                </div>
              )}

              <div>
                <label className="label">Bind DN</label>
                <input
                  type="text"
                  value={ldapBindDn}
                  onChange={(e) => setLdapBindDn(e.target.value)}
                  className="input"
                  placeholder="cn=admin,dc=example,dc=com"
                />
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                  Service account DN for searching users. Leave empty for anonymous bind.
                </p>
              </div>

              <div>
                <label className="label">Bind Password</label>
                <input
                  type="password"
                  value={ldapBindPassword}
                  onChange={(e) => setLdapBindPassword(e.target.value)}
                  className="input"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="label">Search Base *</label>
                <input
                  type="text"
                  value={ldapSearchBase}
                  onChange={(e) => setLdapSearchBase(e.target.value)}
                  className="input"
                  placeholder="ou=users,dc=example,dc=com"
                />
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                  Base DN where user accounts are located.
                </p>
              </div>

              <div>
                <label className="label">Search Filter</label>
                <input
                  type="text"
                  value={ldapSearchFilter}
                  onChange={(e) => setLdapSearchFilter(e.target.value)}
                  className="input"
                  placeholder="(uid={{username}})"
                />
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                  Filter to find users. Use <code className="px-1 rounded" style={{ backgroundColor: 'var(--bg-tertiary)' }}>{'{{username}}'}</code> as placeholder.
                  Common filters: <code className="px-1 rounded" style={{ backgroundColor: 'var(--bg-tertiary)' }}>(uid={'{{username}}'})</code> or{' '}
                  <code className="px-1 rounded" style={{ backgroundColor: 'var(--bg-tertiary)' }}>(sAMAccountName={'{{username}}'})</code> for AD.
                </p>
              </div>

              {/* Test Connection Button */}
              <div className="flex items-center gap-4 pt-2">
                <button
                  type="button"
                  onClick={handleTestLdap}
                  disabled={testingLdap || !ldapUrl}
                  className="btn btn-secondary"
                >
                  {testingLdap ? 'Testing...' : 'Test Connection'}
                </button>

                {ldapTestResult && (
                  <div className="flex items-center gap-2 text-sm" style={{ color: ldapTestResult.success ? '#22c55e' : '#ef4444' }}>
                    {ldapTestResult.success ? (
                      <CheckCircleIcon className="w-5 h-5" />
                    ) : (
                      <XCircleIcon className="w-5 h-5" />
                    )}
                    <span>{ldapTestResult.message}</span>
                  </div>
                )}
              </div>

              {/* Group Settings Divider */}
              <div className="border-t pt-6 mt-6" style={{ borderColor: 'var(--bg-tertiary)' }}>
                <div className="flex items-center gap-2 mb-4">
                  <UserGroupIcon className="w-5 h-5" style={{ color: '#a855f7' }} />
                  <h3 className="text-md font-semibold" style={{ color: 'var(--text-primary)' }}>Group Settings</h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="label">Group Search Base</label>
                    <input
                      type="text"
                      value={ldapGroupSearchBase}
                      onChange={(e) => setLdapGroupSearchBase(e.target.value)}
                      className="input"
                      placeholder="ou=groups,dc=example,dc=com"
                    />
                    <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                      Base DN where groups are located. Leave empty to use the user search base.
                    </p>
                  </div>

                  <div>
                    <label className="label">Group Search Filter</label>
                    <input
                      type="text"
                      value={ldapGroupSearchFilter}
                      onChange={(e) => setLdapGroupSearchFilter(e.target.value)}
                      className="input"
                      placeholder="(member={{userDn}})"
                    />
                    <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                      Filter to find user's groups. Use <code className="px-1 rounded" style={{ backgroundColor: 'var(--bg-tertiary)' }}>{'{{userDn}}'}</code> as placeholder.
                      For AD, groups are usually in the <code className="px-1 rounded" style={{ backgroundColor: 'var(--bg-tertiary)' }}>memberOf</code> attribute (no search needed).
                    </p>
                  </div>

                  {/* Role Group Mappings */}
                  <div className="border-t pt-4 mt-4" style={{ borderColor: 'var(--bg-tertiary)' }}>
                    <h4 className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
                      Role Group Mappings
                    </h4>
                    <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
                      Map LDAP groups to application roles. Users will be assigned the highest matching role.
                      If no groups are configured, all LDAP users get the "User" role by default.
                    </p>

                    {/* Role group inputs - displayed from highest to lowest privilege */}
                    {([
                      { role: 'admin' as RoleType, label: 'Admin Group', value: ldapAdminGroup, setter: setLdapAdminGroup, desc: 'Full system access' },
                      { role: 'manager' as RoleType, label: 'Manager Group', value: ldapManagerGroup, setter: setLdapManagerGroup, desc: 'Manage inventory and view users' },
                      { role: 'technician' as RoleType, label: 'Technician Group', value: ldapTechnicianGroup, setter: setLdapTechnicianGroup, desc: 'Settings and audit log access' },
                      { role: 'user' as RoleType, label: 'User Group', value: ldapUserGroup, setter: setLdapUserGroup, desc: 'Basic inventory operations' },
                      { role: 'viewer' as RoleType, label: 'Viewer Group', value: ldapViewerGroup, setter: setLdapViewerGroup, desc: 'Read-only access' },
                    ]).map(({ role, label, value, setter, desc }) => (
                      <div key={role} className="mb-3">
                        <label className="label">{label}</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={value}
                            onChange={(e) => setter(e.target.value)}
                            className="input flex-1"
                            placeholder={`e.g., Warehouse${label.replace(' Group', '')}s`}
                          />
                          <button
                            type="button"
                            onClick={() => handleTestGroup(value, role)}
                            disabled={testingGroup === role || !value || !ldapUrl}
                            className="btn btn-secondary whitespace-nowrap"
                          >
                            {testingGroup === role ? 'Testing...' : 'Test'}
                          </button>
                        </div>
                        <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{desc}</p>
                        {groupTestResults[role] && (
                          <div className="mt-2 p-3 rounded-lg text-sm" style={{
                            backgroundColor: groupTestResults[role]!.success ? 'color-mix(in srgb, #22c55e 10%, transparent)' : 'color-mix(in srgb, #ef4444 10%, transparent)',
                            color: groupTestResults[role]!.success ? '#22c55e' : '#ef4444'
                          }}>
                            <div className="flex items-center gap-2">
                              {groupTestResults[role]!.success ? (
                                <CheckCircleIcon className="w-4 h-4" />
                              ) : (
                                <XCircleIcon className="w-4 h-4" />
                              )}
                              <span>{groupTestResults[role]!.message}</span>
                            </div>
                            {groupTestResults[role]!.success && groupTestResults[role]!.sampleUsers.length > 0 && (
                              <div className="mt-2 text-xs">
                                <span style={{ color: 'var(--text-secondary)' }}>Sample users: </span>
                                {groupTestResults[role]!.sampleUsers.join(', ')}
                                {groupTestResults[role]!.totalUsers > 3 && (
                                  <span style={{ color: 'var(--text-secondary)' }}> and {groupTestResults[role]!.totalUsers - 3} more...</span>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Test User Section */}
              <div className="border-t pt-6 mt-6" style={{ borderColor: 'var(--bg-tertiary)' }}>
                <div className="flex items-center gap-2 mb-4">
                  <UserIcon className="w-5 h-5" style={{ color: '#a855f7' }} />
                  <h3 className="text-md font-semibold" style={{ color: 'var(--text-primary)' }}>Test User Authentication</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Username</label>
                    <input
                      type="text"
                      value={testUsername}
                      onChange={(e) => setTestUsername(e.target.value)}
                      className="input"
                      placeholder="testuser"
                    />
                  </div>
                  <div>
                    <label className="label">Password</label>
                    <input
                      type="password"
                      value={testPassword}
                      onChange={(e) => setTestPassword(e.target.value)}
                      className="input"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <button
                    type="button"
                    onClick={handleTestUser}
                    disabled={testingUser || !testUsername || !testPassword}
                    className="btn btn-secondary"
                  >
                    {testingUser ? 'Testing...' : 'Test User Login'}
                  </button>
                </div>

                {userTestResult && (
                  <div className="mt-4 p-4 rounded-lg border" style={{
                    backgroundColor: userTestResult.success ? 'color-mix(in srgb, #22c55e 10%, transparent)' : 'color-mix(in srgb, #ef4444 10%, transparent)',
                    borderColor: userTestResult.success ? 'color-mix(in srgb, #22c55e 20%, transparent)' : 'color-mix(in srgb, #ef4444 20%, transparent)'
                  }}>
                    <div className="flex items-center gap-2" style={{ color: userTestResult.success ? '#22c55e' : '#ef4444' }}>
                      {userTestResult.success ? (
                        <CheckCircleIcon className="w-5 h-5" />
                      ) : (
                        <XCircleIcon className="w-5 h-5" />
                      )}
                      <span className="font-medium">{userTestResult.message}</span>
                    </div>

                    {userTestResult.data && (
                      <div className="mt-3 space-y-2 text-sm">
                        <div>
                          <span style={{ color: 'var(--text-secondary)' }}>DN:</span>{' '}
                          <span className="font-mono text-xs" style={{ color: 'var(--text-primary)' }}>{userTestResult.data.dn}</span>
                        </div>
                        {userTestResult.data.email && (
                          <div>
                            <span style={{ color: 'var(--text-secondary)' }}>Email:</span>{' '}
                            <span style={{ color: 'var(--text-primary)' }}>{userTestResult.data.email}</span>
                          </div>
                        )}
                        {userTestResult.data.displayName && (
                          <div>
                            <span style={{ color: 'var(--text-secondary)' }}>Display Name:</span>{' '}
                            <span style={{ color: 'var(--text-primary)' }}>{userTestResult.data.displayName}</span>
                          </div>
                        )}
                        <div>
                          <span style={{ color: 'var(--text-secondary)' }}>Groups:</span>{' '}
                          {userTestResult.data.groups.length > 0 ? (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {userTestResult.data.groups.map((group, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                                  style={{ backgroundColor: 'color-mix(in srgb, #a855f7 20%, transparent)', color: '#c4b5fd' }}
                                >
                                  {group}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="italic" style={{ color: 'var(--text-secondary)' }}>No groups found</span>
                          )}
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-secondary)' }}>Assigned Role:</span>{' '}
                          <span className="font-medium" style={{ color: userTestResult.data.roleName ? '#22c55e' : '#ef4444' }}>
                            {userTestResult.data.roleName || 'None (login denied)'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Sync LDAP Users */}
              <div className="border-t pt-6 mt-6" style={{ borderColor: 'var(--bg-tertiary)' }}>
                <div className="flex items-center gap-2 mb-4">
                  <ArrowPathIcon className="w-5 h-5" style={{ color: '#a855f7' }} />
                  <h3 className="text-md font-semibold" style={{ color: 'var(--text-primary)' }}>Sync LDAP Users</h3>
                </div>

                <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                  Update existing LDAP users' profile information (name, email, phone, employee ID) from the directory.
                  This is useful for users who logged in before these fields were being synced.
                </p>

                <button
                  type="button"
                  onClick={handleSyncLdapUsers}
                  disabled={syncingLdapUsers || !ldapEnabled}
                  className="btn btn-secondary"
                >
                  {syncingLdapUsers ? 'Syncing...' : 'Sync All LDAP Users'}
                </button>

                {ldapSyncResult && (
                  <div className="mt-4 p-4 rounded-lg border" style={{
                    backgroundColor: ldapSyncResult.errors.length === 0 ? 'color-mix(in srgb, #22c55e 10%, transparent)' : 'color-mix(in srgb, #f59e0b 10%, transparent)',
                    borderColor: ldapSyncResult.errors.length === 0 ? 'color-mix(in srgb, #22c55e 20%, transparent)' : 'color-mix(in srgb, #f59e0b 20%, transparent)'
                  }}>
                    <div className="flex items-center gap-2" style={{ color: ldapSyncResult.errors.length === 0 ? '#22c55e' : '#f59e0b' }}>
                      {ldapSyncResult.errors.length === 0 ? (
                        <CheckCircleIcon className="w-5 h-5" />
                      ) : (
                        <ExclamationTriangleIcon className="w-5 h-5" />
                      )}
                      <span className="font-medium">
                        {ldapSyncResult.synced} user(s) updated
                        {ldapSyncResult.errors.length > 0 && `, ${ldapSyncResult.errors.length} error(s)`}
                      </span>
                    </div>
                    {ldapSyncResult.errors.length > 0 && (
                      <div className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                        <p className="font-medium mb-1">Errors:</p>
                        <ul className="list-disc list-inside">
                          {ldapSyncResult.errors.slice(0, 5).map((err, idx) => (
                            <li key={idx}>{err}</li>
                          ))}
                          {ldapSyncResult.errors.length > 5 && (
                            <li>...and {ldapSyncResult.errors.length - 5} more</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
          </div>

          {/* Info Box */}
          <div className="p-4 rounded-lg border" style={{ backgroundColor: 'color-mix(in srgb, #22c55e 10%, transparent)', borderColor: 'color-mix(in srgb, #22c55e 20%, transparent)' }}>
            <div className="flex items-start gap-3">
              <CheckCircleIcon className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#22c55e' }} />
              <p className="text-sm" style={{ color: '#22c55e' }}>
                LDAP settings take effect immediately after saving. No server restart required.
              </p>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4 border-t" style={{ borderColor: 'var(--bg-tertiary)' }}>
            <button
              onClick={() => handleSave(false)}
              disabled={saving}
              className="btn btn-primary"
            >
              {saving ? 'Saving...' : 'Save LDAP Settings'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
