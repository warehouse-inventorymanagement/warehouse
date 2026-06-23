import { useState, useEffect } from 'react';
import { settingsApi } from '../../services/api';
import toast from 'react-hot-toast';
import { GlobeAltIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default function NetworkingSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Network settings
  const [trustProxy, setTrustProxy] = useState(false);
  const [rateLimitEnabled, setRateLimitEnabled] = useState(true);
  const [rateLimitGeneral, setRateLimitGeneral] = useState('500');
  const [rateLimitAuth, setRateLimitAuth] = useState('10');
  const [rateLimitPasswordReset, setRateLimitPasswordReset] = useState('5');
  const [trustedProxies, setTrustedProxies] = useState('');

  // Server URL settings
  const [serverProtocol, setServerProtocol] = useState('http');
  const [serverHostname, setServerHostname] = useState('');
  const [serverPort, setServerPort] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await settingsApi.getAll();
        const data = response.data.data;

        setTrustProxy(data['network.trustProxy'] === 'true');
        setTrustedProxies(data['network.trustedProxies'] || '');
        setRateLimitEnabled(data['rateLimit.enabled'] !== 'false');
        setRateLimitGeneral(data['rateLimit.general'] || '500');
        setRateLimitAuth(data['rateLimit.auth'] || '10');
        setRateLimitPasswordReset(data['rateLimit.passwordReset'] || '5');

        setServerProtocol(data['server.protocol'] || 'http');
        setServerHostname(data['server.hostname'] || '');
        setServerPort(data['server.port'] || '');
      } catch (error: any) {
        toast.error('Failed to load networking settings');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
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
      });
      toast.success('Settings saved successfully.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="card p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--accent)' }} />
        </div>
      </div>
    );
  }

  return (
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg" style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 10%, transparent)' }}>
            <GlobeAltIcon className="w-6 h-6" style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Networking</h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Configure reverse proxy settings</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="trustProxy"
              checked={trustProxy}
              onChange={(e) => setTrustProxy(e.target.checked)}
              className="h-4 w-4 rounded"
              style={{ accentColor: 'var(--accent)' }}
            />
            <label htmlFor="trustProxy" className="ml-2 text-sm" style={{ color: 'var(--text-primary)' }}>
              Enable trust proxy (required for correct IP logging behind reverse proxy)
            </label>
          </div>

          {trustProxy && (
            <div>
              <label className="label">Trusted Proxies</label>
              <input
                type="text"
                value={trustedProxies}
                onChange={(e) => setTrustedProxies(e.target.value)}
                className="input"
                placeholder="e.g., 127.0.0.1, 10.0.0.0/8, loopback"
              />
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                Comma-separated list of trusted proxy IPs or CIDR ranges. Leave empty to trust all proxies.
              </p>
              <div className="mt-2 p-3 rounded-lg" style={{ backgroundColor: 'color-mix(in srgb, #f59e0b 10%, transparent)' }}>
                <p className="text-xs" style={{ color: '#f59e0b' }}>
                  <strong>Common values:</strong> <code className="px-1 rounded" style={{ backgroundColor: 'color-mix(in srgb, #f59e0b 20%, transparent)' }}>loopback</code> (localhost),
                  <code className="px-1 rounded ml-1" style={{ backgroundColor: 'color-mix(in srgb, #f59e0b 20%, transparent)' }}>127.0.0.1</code>,
                  <code className="px-1 rounded ml-1" style={{ backgroundColor: 'color-mix(in srgb, #f59e0b 20%, transparent)' }}>10.0.0.0/8</code> (private network)
                </p>
              </div>
            </div>
          )}

          {/* Server URL Settings */}
          <div className="pt-4 mt-4 border-t" style={{ borderColor: 'var(--bg-tertiary)' }}>
            <h3 className="font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Server URL (for Email Links)</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              Configure the public URL used in notification emails. Leave empty to use the server's default.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="label">Protocol</label>
                <select
                  value={serverProtocol}
                  onChange={(e) => setServerProtocol(e.target.value)}
                  className="input"
                >
                  <option value="http">HTTP</option>
                  <option value="https">HTTPS</option>
                </select>
              </div>
              <div>
                <label className="label">Hostname / IP</label>
                <input
                  type="text"
                  value={serverHostname}
                  onChange={(e) => setServerHostname(e.target.value)}
                  className="input"
                  placeholder="e.g., warehouse.example.com or 192.168.1.100"
                />
              </div>
              <div>
                <label className="label">Port (optional)</label>
                <input
                  type="text"
                  value={serverPort}
                  onChange={(e) => setServerPort(e.target.value)}
                  className="input"
                  placeholder="e.g., 5317 (empty = standard 80/443)"
                />
              </div>
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
              Preview: {serverProtocol}://{serverHostname || 'localhost'}{serverPort ? `:${serverPort}` : ''}
            </p>
          </div>

          {/* Rate Limiting */}
          <div className="pt-4 mt-4 border-t" style={{ borderColor: 'var(--bg-tertiary)' }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-medium" style={{ color: 'var(--text-primary)' }}>Rate Limiting</h3>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Limit API requests to prevent abuse. Changes require a server restart.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={rateLimitEnabled}
                  onChange={(e) => setRateLimitEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 rounded-full peer transition-colors" style={{ backgroundColor: rateLimitEnabled ? 'var(--accent)' : 'var(--bg-tertiary)' }}>
                  <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${rateLimitEnabled ? 'translate-x-5' : ''}`} />
                </div>
              </label>
            </div>
            {rateLimitEnabled && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="label">General API (per minute)</label>
                <input
                  type="number"
                  value={rateLimitGeneral}
                  onChange={(e) => setRateLimitGeneral(e.target.value)}
                  className="input"
                  min="10"
                  placeholder="500"
                />
              </div>
              <div>
                <label className="label">Auth Attempts (per 15 min)</label>
                <input
                  type="number"
                  value={rateLimitAuth}
                  onChange={(e) => setRateLimitAuth(e.target.value)}
                  className="input"
                  min="1"
                  placeholder="10"
                />
              </div>
              <div>
                <label className="label">Password Reset (per hour)</label>
                <input
                  type="number"
                  value={rateLimitPasswordReset}
                  onChange={(e) => setRateLimitPasswordReset(e.target.value)}
                  className="input"
                  min="1"
                  placeholder="5"
                />
              </div>
            </div>
            )}
          </div>

          {/* Info Box */}
          <div className="p-4 rounded-lg border" style={{ backgroundColor: 'color-mix(in srgb, #f59e0b 10%, transparent)', borderColor: 'color-mix(in srgb, #f59e0b 20%, transparent)' }}>
            <div className="flex items-start gap-3">
              <ExclamationTriangleIcon className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#f59e0b' }} />
              <p className="text-sm" style={{ color: '#f59e0b' }}>
                Proxy and rate limit settings require a server restart. Server URL settings take effect immediately for new emails.
              </p>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4 border-t" style={{ borderColor: 'var(--bg-tertiary)' }}>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn btn-primary"
            >
              {saving ? 'Saving...' : 'Save Network Settings'}
            </button>
          </div>
        </div>
      </div>
  );
}
