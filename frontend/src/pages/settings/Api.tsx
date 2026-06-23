import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { apiKeysApi } from '../../services/api';
import type { ApiKey, ApiPermission } from '../../types';
import {
  KeyIcon,
  PlusIcon,
  TrashIcon,
  ClipboardDocumentIcon,
  EyeIcon,
  EyeSlashIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  XMarkIcon,
  ArrowPathIcon,
  ShieldExclamationIcon,
  ClockIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

export default function ApiSettings() {
  // API Keys state
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [apiPermissions, setApiPermissions] = useState<ApiPermission[]>([]);
  const [loadingApiKeys, setLoadingApiKeys] = useState(false);
  const [showCreateApiKey, setShowCreateApiKey] = useState(false);
  const [newApiKeyName, setNewApiKeyName] = useState('');
  const [newApiKeyPermissions, setNewApiKeyPermissions] = useState<string[]>([]);
  const [newApiKeyExpiry, setNewApiKeyExpiry] = useState('');
  const [creatingApiKey, setCreatingApiKey] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [showKeyModal, setShowKeyModal] = useState(false);
  // API Key edit modal state
  const [editingApiKey, setEditingApiKey] = useState<ApiKey | null>(null);
  const [editIpMode, setEditIpMode] = useState<'none' | 'whitelist' | 'blacklist'>('none');
  const [editIpWhitelist, setEditIpWhitelist] = useState('');
  const [editIpBlacklist, setEditIpBlacklist] = useState('');
  const [editRateLimitMinute, setEditRateLimitMinute] = useState<string>('');
  const [editRateLimitHour, setEditRateLimitHour] = useState<string>('');
  const [editRateLimitDay, setEditRateLimitDay] = useState<string>('');
  const [savingApiKey, setSavingApiKey] = useState(false);
  // API Key usage modal state
  const [usageApiKey, setUsageApiKey] = useState<ApiKey | null>(null);
  const [usageData, setUsageData] = useState<any>(null);
  const [loadingUsage, setLoadingUsage] = useState(false);

  useEffect(() => {
    fetchApiKeys();
    fetchApiPermissions();
  }, []);

  const fetchApiKeys = async () => {
    setLoadingApiKeys(true);
    try {
      const response = await apiKeysApi.list();
      setApiKeys(response.data.data);
    } catch (error) {
      toast.error('Failed to load API keys');
    } finally {
      setLoadingApiKeys(false);
    }
  };

  const fetchApiPermissions = async () => {
    try {
      const response = await apiKeysApi.getPermissions();
      setApiPermissions(response.data.data);
    } catch (error) {
      console.error('Failed to load API permissions:', error);
    }
  };

  const handleCreateApiKey = async () => {
    if (!newApiKeyName.trim()) {
      toast.error('Name is required');
      return;
    }
    if (newApiKeyPermissions.length === 0) {
      toast.error('At least one permission is required');
      return;
    }

    setCreatingApiKey(true);
    try {
      const response = await apiKeysApi.create({
        name: newApiKeyName.trim(),
        permissions: newApiKeyPermissions,
        expiresAt: newApiKeyExpiry || undefined,
      });
      setNewlyCreatedKey(response.data.data.key || null);
      setShowKeyModal(true);
      setShowCreateApiKey(false);
      setNewApiKeyName('');
      setNewApiKeyPermissions([]);
      setNewApiKeyExpiry('');
      fetchApiKeys();
      toast.success('API key created');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create API key');
    } finally {
      setCreatingApiKey(false);
    }
  };

  const handleToggleApiKeyStatus = async (key: ApiKey) => {
    try {
      await apiKeysApi.update(key.id, { isActive: !key.isActive });
      fetchApiKeys();
      toast.success(`API key ${key.isActive ? 'disabled' : 'enabled'}`);
    } catch (error) {
      toast.error('Failed to update API key');
    }
  };

  const handleDeleteApiKey = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this API key? This cannot be undone.')) return;
    try {
      await apiKeysApi.delete(id);
      fetchApiKeys();
      toast.success('API key revoked');
    } catch (error) {
      toast.error('Failed to revoke API key');
    }
  };

  const handleRegenerateApiKey = async (id: string) => {
    if (!confirm('Are you sure you want to regenerate this API key? The old key will stop working immediately.')) return;
    try {
      const response = await apiKeysApi.regenerate(id);
      setNewlyCreatedKey(response.data.data.key || null);
      setShowKeyModal(true);
      fetchApiKeys();
      toast.success('API key regenerated');
    } catch (error) {
      toast.error('Failed to regenerate API key');
    }
  };

  const openEditApiKey = (key: ApiKey) => {
    setEditingApiKey(key);
    setEditIpMode((key.ipRestrictionMode as 'none' | 'whitelist' | 'blacklist') || 'none');
    setEditIpWhitelist((key.ipWhitelist || []).join('\n'));
    setEditIpBlacklist((key.ipBlacklist || []).join('\n'));
    setEditRateLimitMinute(key.rateLimitPerMinute?.toString() || '');
    setEditRateLimitHour(key.rateLimitPerHour?.toString() || '');
    setEditRateLimitDay(key.rateLimitPerDay?.toString() || '');
  };

  const handleSaveApiKeySettings = async () => {
    if (!editingApiKey) return;
    setSavingApiKey(true);
    try {
      const parseIpList = (text: string) =>
        text.split('\n').map(s => s.trim()).filter(s => s.length > 0);

      await apiKeysApi.update(editingApiKey.id, {
        ipRestrictionMode: editIpMode,
        ipWhitelist: parseIpList(editIpWhitelist),
        ipBlacklist: parseIpList(editIpBlacklist),
        rateLimitPerMinute: editRateLimitMinute ? parseInt(editRateLimitMinute) : null,
        rateLimitPerHour: editRateLimitHour ? parseInt(editRateLimitHour) : null,
        rateLimitPerDay: editRateLimitDay ? parseInt(editRateLimitDay) : null,
      });
      fetchApiKeys();
      setEditingApiKey(null);
      toast.success('API key settings updated');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update API key');
    } finally {
      setSavingApiKey(false);
    }
  };

  const fetchApiKeyUsage = async (key: ApiKey) => {
    setUsageApiKey(key);
    setLoadingUsage(true);
    try {
      const response = await apiKeysApi.getUsage(key.id);
      setUsageData(response.data.data);
    } catch (error) {
      toast.error('Failed to fetch usage data');
      setUsageApiKey(null);
    } finally {
      setLoadingUsage(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for non-secure contexts
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.top = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      toast.success('Copied to clipboard');
    } catch (err) {
      console.error('Failed to copy:', err);
      toast.error('Failed to copy to clipboard');
    }
  };

  return (
    <>
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: 'color-mix(in srgb, #f97316 20%, transparent)' }}>
              <KeyIcon className="w-6 h-6" style={{ color: '#f97316' }} />
            </div>
            <div>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>API Keys</h2>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Manage API keys for external integrations</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateApiKey(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <PlusIcon className="w-4 h-4" />
            Create API Key
          </button>
        </div>

        {/* API Documentation Info */}
        <div className="p-4 rounded-lg border mb-6" style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 5%, transparent)', borderColor: 'color-mix(in srgb, var(--accent) 20%, transparent)' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium" style={{ color: 'var(--text-primary)' }}>API Endpoint</h3>
            <a
              href="/docs"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={{ backgroundColor: 'var(--accent)', color: 'white' }}
            >
              <DocumentTextIcon className="w-4 h-4" />
              API Documentation
            </a>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <code className="px-3 py-1.5 rounded text-sm flex-1" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>
              {window.location.origin}/api/v1
            </code>
            <button
              onClick={() => copyToClipboard(`${window.location.origin}/api/v1`)}
              className="p-2 rounded-lg transition-colors"
              style={{ backgroundColor: 'var(--bg-tertiary)' }}
              title="Copy"
            >
              <ClipboardDocumentIcon className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
            </button>
          </div>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            Use the <code className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: 'var(--bg-tertiary)' }}>X-API-Key</code> header or <code className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: 'var(--bg-tertiary)' }}>Authorization: Bearer &lt;key&gt;</code> to authenticate.
          </p>

          {/* API Examples */}
          <h4 className="font-medium mb-2 text-sm" style={{ color: 'var(--text-primary)' }}>Usage Examples</h4>
          <div className="space-y-3">
            {/* List Items Example */}
            <div className="rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
              <div className="flex items-center justify-between px-3 py-2" style={{ backgroundColor: 'color-mix(in srgb, var(--bg-tertiary) 50%, black 10%)' }}>
                <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>List Items (GET)</span>
                <button
                  onClick={() => copyToClipboard(`curl -X GET "${window.location.origin}/api/v1/items" -H "X-API-Key: YOUR_API_KEY"`)}
                  className="p-1 rounded transition-opacity hover:opacity-80"
                  title="Copy"
                >
                  <ClipboardDocumentIcon className="w-3.5 h-3.5" style={{ color: 'var(--text-secondary)' }} />
                </button>
              </div>
              <pre className="p-3 text-xs overflow-x-auto" style={{ color: 'var(--text-primary)' }}>
{`curl -X GET "${window.location.origin}/api/v1/items" \\
  -H "X-API-Key: YOUR_API_KEY"`}
              </pre>
            </div>

            {/* Get Single Item Example */}
            <div className="rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
              <div className="flex items-center justify-between px-3 py-2" style={{ backgroundColor: 'color-mix(in srgb, var(--bg-tertiary) 50%, black 10%)' }}>
                <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Get Item by ID (GET)</span>
                <button
                  onClick={() => copyToClipboard(`curl -X GET "${window.location.origin}/api/v1/items/ITEM_ID" -H "X-API-Key: YOUR_API_KEY"`)}
                  className="p-1 rounded transition-opacity hover:opacity-80"
                  title="Copy"
                >
                  <ClipboardDocumentIcon className="w-3.5 h-3.5" style={{ color: 'var(--text-secondary)' }} />
                </button>
              </div>
              <pre className="p-3 text-xs overflow-x-auto" style={{ color: 'var(--text-primary)' }}>
{`curl -X GET "${window.location.origin}/api/v1/items/ITEM_ID" \\
  -H "X-API-Key: YOUR_API_KEY"`}
              </pre>
            </div>

            {/* Adjust Stock Example */}
            <div className="rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
              <div className="flex items-center justify-between px-3 py-2" style={{ backgroundColor: 'color-mix(in srgb, var(--bg-tertiary) 50%, black 10%)' }}>
                <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Adjust Stock (POST)</span>
                <button
                  onClick={() => copyToClipboard(`curl -X POST "${window.location.origin}/api/v1/items/ITEM_ID/adjust" -H "X-API-Key: YOUR_API_KEY" -H "Content-Type: application/json" -d '{"adjustment": 5, "notes": "Restocked"}'`)}
                  className="p-1 rounded transition-opacity hover:opacity-80"
                  title="Copy"
                >
                  <ClipboardDocumentIcon className="w-3.5 h-3.5" style={{ color: 'var(--text-secondary)' }} />
                </button>
              </div>
              <pre className="p-3 text-xs overflow-x-auto" style={{ color: 'var(--text-primary)' }}>
{`curl -X POST "${window.location.origin}/api/v1/items/ITEM_ID/adjust" \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"adjustment": 5, "notes": "Restocked"}'`}
              </pre>
            </div>

            {/* Alternative Auth Header */}
            <div className="rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
              <div className="flex items-center justify-between px-3 py-2" style={{ backgroundColor: 'color-mix(in srgb, var(--bg-tertiary) 50%, black 10%)' }}>
                <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Using Bearer Token (Alternative)</span>
                <button
                  onClick={() => copyToClipboard(`curl -X GET "${window.location.origin}/api/v1/items" -H "Authorization: Bearer YOUR_API_KEY"`)}
                  className="p-1 rounded transition-opacity hover:opacity-80"
                  title="Copy"
                >
                  <ClipboardDocumentIcon className="w-3.5 h-3.5" style={{ color: 'var(--text-secondary)' }} />
                </button>
              </div>
              <pre className="p-3 text-xs overflow-x-auto" style={{ color: 'var(--text-primary)' }}>
{`curl -X GET "${window.location.origin}/api/v1/items" \\
  -H "Authorization: Bearer YOUR_API_KEY"`}
              </pre>
            </div>
          </div>

          <p className="text-xs mt-3" style={{ color: 'var(--text-secondary)' }}>
            Replace <code className="px-1 rounded" style={{ backgroundColor: 'var(--bg-primary)' }}>YOUR_API_KEY</code> with your actual API key and <code className="px-1 rounded" style={{ backgroundColor: 'var(--bg-primary)' }}>ITEM_ID</code> with a valid item UUID.
          </p>
        </div>

        {/* Create API Key Form */}
        {showCreateApiKey && (
          <div className="p-4 rounded-lg border mb-6" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--bg-tertiary)' }}>
            <h3 className="font-medium mb-4" style={{ color: 'var(--text-primary)' }}>Create New API Key</h3>
            <div className="space-y-4">
              <div>
                <label className="label">Name</label>
                <input
                  type="text"
                  value={newApiKeyName}
                  onChange={(e) => setNewApiKeyName(e.target.value)}
                  placeholder="e.g., Production Integration"
                  className="input max-w-md"
                />
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>A descriptive name to identify this key</p>
              </div>

              <div>
                <label className="label">Permissions</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {apiPermissions.map((perm) => (
                    <label
                      key={perm.key}
                      className="flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-colors"
                      style={{
                        borderColor: newApiKeyPermissions.includes(perm.key) ? 'var(--accent)' : 'var(--bg-tertiary)',
                        backgroundColor: newApiKeyPermissions.includes(perm.key) ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'transparent',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={newApiKeyPermissions.includes(perm.key)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewApiKeyPermissions([...newApiKeyPermissions, perm.key]);
                          } else {
                            setNewApiKeyPermissions(newApiKeyPermissions.filter(p => p !== perm.key));
                          }
                        }}
                        className="mt-0.5"
                        style={{ accentColor: 'var(--accent)' }}
                      />
                      <div>
                        <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{perm.label}</div>
                        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{perm.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Expiration (Optional)</label>
                <input
                  type="date"
                  value={newApiKeyExpiry}
                  onChange={(e) => setNewApiKeyExpiry(e.target.value)}
                  className="input max-w-xs"
                  min={new Date().toISOString().split('T')[0]}
                />
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Leave empty for no expiration</p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleCreateApiKey}
                  disabled={creatingApiKey}
                  className="btn btn-primary"
                >
                  {creatingApiKey ? 'Creating...' : 'Create Key'}
                </button>
                <button
                  onClick={() => {
                    setShowCreateApiKey(false);
                    setNewApiKeyName('');
                    setNewApiKeyPermissions([]);
                    setNewApiKeyExpiry('');
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* API Keys List */}
        {loadingApiKeys ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--accent)' }} />
          </div>
        ) : apiKeys.length === 0 ? (
          <div className="text-center py-12" style={{ color: 'var(--text-secondary)' }}>
            <KeyIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No API keys yet</p>
            <p className="text-sm mt-1">Create an API key to enable external integrations</p>
          </div>
        ) : (
          <div className="space-y-3">
            {apiKeys.map((key) => (
              <div
                key={key.id}
                className="p-4 rounded-lg border"
                style={{
                  backgroundColor: key.isActive ? 'var(--bg-secondary)' : 'var(--bg-primary)',
                  borderColor: 'var(--bg-tertiary)',
                  opacity: key.isActive ? 1 : 0.6,
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{key.name}</span>
                      {!key.isActive && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-red-500/20 text-red-500">Disabled</span>
                      )}
                      {key.expiresAt && new Date(key.expiresAt) < new Date() && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-red-500/20 text-red-500">Expired</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <code className="px-2 py-1 rounded text-xs" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                        {key.keyPrefix}...
                      </code>
                      {key.user && (
                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          by {key.user.username}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {key.permissions.map((perm) => {
                        const permInfo = apiPermissions.find(p => p.key === perm);
                        return (
                          <span
                            key={perm}
                            className="px-2 py-0.5 text-xs rounded"
                            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                            title={permInfo?.description}
                          >
                            {permInfo?.label || perm}
                          </span>
                        );
                      })}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      Created {new Date(key.createdAt).toLocaleDateString()}
                      {key.lastUsedAt && ` • Last used ${new Date(key.lastUsedAt).toLocaleDateString()}`}
                      {key.expiresAt && ` • Expires ${new Date(key.expiresAt).toLocaleDateString()}`}
                    </div>
                    {/* IP and Rate Limit badges */}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {key.ipRestrictionMode && key.ipRestrictionMode !== 'none' && (
                        <span
                          className="px-2 py-0.5 text-xs rounded flex items-center gap-1"
                          style={{
                            backgroundColor: key.ipRestrictionMode === 'whitelist'
                              ? 'color-mix(in srgb, #22c55e 15%, transparent)'
                              : 'color-mix(in srgb, #ef4444 15%, transparent)',
                            color: key.ipRestrictionMode === 'whitelist' ? '#22c55e' : '#ef4444',
                          }}
                        >
                          <ShieldExclamationIcon className="w-3 h-3" />
                          {key.ipRestrictionMode === 'whitelist' ? `${key.ipWhitelist?.length || 0} IPs allowed` : `${key.ipBlacklist?.length || 0} IPs blocked`}
                        </span>
                      )}
                      {(key.rateLimitPerMinute || key.rateLimitPerHour || key.rateLimitPerDay) && (
                        <span
                          className="px-2 py-0.5 text-xs rounded flex items-center gap-1"
                          style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 15%, transparent)', color: 'var(--accent)' }}
                        >
                          <ClockIcon className="w-3 h-3" />
                          {key.rateLimitPerMinute || key.defaultLimits?.perMinute || 60}/min
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => fetchApiKeyUsage(key)}
                      className="p-2 rounded-lg transition-colors"
                      style={{ backgroundColor: 'var(--bg-tertiary)' }}
                      title="View Usage"
                    >
                      <ChartBarIcon className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                    </button>
                    <button
                      onClick={() => openEditApiKey(key)}
                      className="p-2 rounded-lg transition-colors"
                      style={{ backgroundColor: 'var(--bg-tertiary)' }}
                      title="Settings"
                    >
                      <Cog6ToothIcon className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                    </button>
                    <button
                      onClick={() => handleToggleApiKeyStatus(key)}
                      className="p-2 rounded-lg transition-colors"
                      style={{ backgroundColor: 'var(--bg-tertiary)' }}
                      title={key.isActive ? 'Disable' : 'Enable'}
                    >
                      {key.isActive ? (
                        <EyeSlashIcon className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                      ) : (
                        <EyeIcon className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                      )}
                    </button>
                    <button
                      onClick={() => handleRegenerateApiKey(key.id)}
                      className="p-2 rounded-lg transition-colors"
                      style={{ backgroundColor: 'var(--bg-tertiary)' }}
                      title="Regenerate"
                    >
                      <ArrowPathIcon className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                    </button>
                    <button
                      onClick={() => handleDeleteApiKey(key.id)}
                      className="p-2 rounded-lg transition-colors text-red-500"
                      style={{ backgroundColor: 'var(--bg-tertiary)' }}
                      title="Revoke"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Key Modal */}
      {showKeyModal && newlyCreatedKey && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card p-6 max-w-lg w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg" style={{ backgroundColor: 'color-mix(in srgb, #22c55e 20%, transparent)' }}>
                <CheckCircleIcon className="w-6 h-6 text-green-500" />
              </div>
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>API Key Created</h3>
            </div>
            <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>
              Copy this key now. You won't be able to see it again!
            </p>
            <div className="flex items-center gap-2 mb-6">
              <code className="flex-1 p-3 rounded text-sm break-all" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>
                {newlyCreatedKey}
              </code>
              <button
                onClick={() => copyToClipboard(newlyCreatedKey)}
                className="p-2 rounded-lg transition-colors flex-shrink-0"
                style={{ backgroundColor: 'var(--accent)' }}
                title="Copy"
              >
                <ClipboardDocumentIcon className="w-5 h-5 text-white" />
              </button>
            </div>
            <div className="p-3 rounded-lg mb-4" style={{ backgroundColor: 'color-mix(in srgb, #f59e0b 10%, transparent)' }}>
              <p className="text-sm" style={{ color: '#f59e0b' }}>
                <ExclamationTriangleIcon className="w-4 h-4 inline mr-1" />
                Store this key securely. It will not be displayed again.
              </p>
            </div>
            <button
              onClick={() => {
                setShowKeyModal(false);
                setNewlyCreatedKey(null);
              }}
              className="btn btn-primary w-full"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* API Key Settings Modal */}
      {editingApiKey && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg" style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 20%, transparent)' }}>
                  <Cog6ToothIcon className="w-6 h-6" style={{ color: 'var(--accent)' }} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>API Key Settings</h3>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{editingApiKey.name}</p>
                </div>
              </div>
              <button onClick={() => setEditingApiKey(null)} className="p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                <XMarkIcon className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
              </button>
            </div>

            {/* IP Restrictions */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <ShieldExclamationIcon className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
                <h4 className="font-medium" style={{ color: 'var(--text-primary)' }}>IP Restrictions</h4>
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                {(['none', 'whitelist', 'blacklist'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setEditIpMode(mode)}
                    className="px-3 py-1.5 text-sm font-medium rounded-lg transition-all"
                    style={{
                      backgroundColor: editIpMode === mode ? 'var(--accent)' : 'var(--bg-tertiary)',
                      color: editIpMode === mode ? 'white' : 'var(--text-secondary)',
                    }}
                  >
                    {mode === 'none' ? 'No Restriction' : mode === 'whitelist' ? 'Whitelist' : 'Blacklist'}
                  </button>
                ))}
              </div>
              {editIpMode === 'whitelist' && (
                <div>
                  <label className="label">Allowed IPs (one per line, CIDR supported)</label>
                  <textarea
                    value={editIpWhitelist}
                    onChange={(e) => setEditIpWhitelist(e.target.value)}
                    placeholder="192.168.1.0/24&#10;10.0.0.1"
                    className="input w-full h-24 font-mono text-sm"
                  />
                </div>
              )}
              {editIpMode === 'blacklist' && (
                <div>
                  <label className="label">Blocked IPs (one per line, CIDR supported)</label>
                  <textarea
                    value={editIpBlacklist}
                    onChange={(e) => setEditIpBlacklist(e.target.value)}
                    placeholder="203.0.113.0/24&#10;198.51.100.1"
                    className="input w-full h-24 font-mono text-sm"
                  />
                </div>
              )}
            </div>

            {/* Rate Limits */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <ClockIcon className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
                <h4 className="font-medium" style={{ color: 'var(--text-primary)' }}>Rate Limits</h4>
              </div>
              <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
                Leave empty to use defaults ({editingApiKey.defaultLimits?.perMinute || 60}/min, {editingApiKey.defaultLimits?.perHour || 1000}/hr, {editingApiKey.defaultLimits?.perDay || 10000}/day)
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label text-xs">Per Minute</label>
                  <input
                    type="number"
                    value={editRateLimitMinute}
                    onChange={(e) => setEditRateLimitMinute(e.target.value)}
                    placeholder="60"
                    min="1"
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="label text-xs">Per Hour</label>
                  <input
                    type="number"
                    value={editRateLimitHour}
                    onChange={(e) => setEditRateLimitHour(e.target.value)}
                    placeholder="1000"
                    min="1"
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="label text-xs">Per Day</label>
                  <input
                    type="number"
                    value={editRateLimitDay}
                    onChange={(e) => setEditRateLimitDay(e.target.value)}
                    placeholder="10000"
                    min="1"
                    className="input w-full"
                  />
                </div>
              </div>
            </div>

            {/* Current Usage */}
            {editingApiKey.rateLimitStatus && (
              <div className="mb-6 p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Current Usage</h4>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {editingApiKey.rateLimitStatus.minute.used}/{editingApiKey.rateLimitStatus.minute.limit}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>This Minute</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {editingApiKey.rateLimitStatus.hour.used}/{editingApiKey.rateLimitStatus.hour.limit}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>This Hour</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {editingApiKey.rateLimitStatus.day.used}/{editingApiKey.rateLimitStatus.day.limit}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Today</div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={handleSaveApiKeySettings} disabled={savingApiKey} className="btn btn-primary flex-1">
                {savingApiKey ? 'Saving...' : 'Save Settings'}
              </button>
              <button onClick={() => setEditingApiKey(null)} className="btn btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* API Key Usage Modal */}
      {usageApiKey && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg" style={{ backgroundColor: 'color-mix(in srgb, #10b981 20%, transparent)' }}>
                  <ChartBarIcon className="w-6 h-6" style={{ color: '#10b981' }} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>API Usage</h3>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{usageApiKey.name} - Last 24 hours</p>
                </div>
              </div>
              <button onClick={() => { setUsageApiKey(null); setUsageData(null); }} className="p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                <XMarkIcon className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
              </button>
            </div>

            {loadingUsage ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--accent)' }} />
              </div>
            ) : usageData ? (
              <>
                {/* Summary Stats */}
                <div className="grid grid-cols-4 gap-3 mb-6">
                  <div className="p-3 rounded-lg text-center" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                    <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{usageData.summary.totalRequests}</div>
                    <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Total Requests</div>
                  </div>
                  <div className="p-3 rounded-lg text-center" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                    <div className="text-2xl font-bold text-green-500">{usageData.summary.successRequests}</div>
                    <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Successful</div>
                  </div>
                  <div className="p-3 rounded-lg text-center" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                    <div className="text-2xl font-bold text-red-500">{usageData.summary.errorRequests}</div>
                    <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Errors ({usageData.summary.errorRate}%)</div>
                  </div>
                  <div className="p-3 rounded-lg text-center" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                    <div className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>{usageData.summary.avgResponseMs}ms</div>
                    <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Avg Response</div>
                  </div>
                </div>

                {/* Top Endpoints */}
                {usageData.topEndpoints && usageData.topEndpoints.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Top Endpoints</h4>
                    <div className="space-y-2">
                      {usageData.topEndpoints.slice(0, 5).map((ep: { endpoint: string; count: number }, i: number) => (
                        <div key={i} className="flex items-center justify-between p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                          <code className="text-sm" style={{ color: 'var(--text-primary)' }}>{ep.endpoint}</code>
                          <span className="text-sm font-medium" style={{ color: 'var(--accent)' }}>{ep.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Status Codes */}
                {usageData.statusCodes && Object.keys(usageData.statusCodes).length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Status Codes</h4>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(usageData.statusCodes).map(([code, count]) => (
                        <span
                          key={code}
                          className="px-3 py-1.5 rounded-lg text-sm font-medium"
                          style={{
                            backgroundColor: parseInt(code) >= 400 ? 'color-mix(in srgb, #ef4444 20%, transparent)' : 'color-mix(in srgb, #22c55e 20%, transparent)',
                            color: parseInt(code) >= 400 ? '#ef4444' : '#22c55e',
                          }}
                        >
                          {code}: {count as number}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {usageData.summary.totalRequests === 0 && (
                  <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
                    <ChartBarIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No API requests in the last 24 hours</p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
                <p>Failed to load usage data</p>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button onClick={() => { setUsageApiKey(null); setUsageData(null); }} className="btn btn-secondary">Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
