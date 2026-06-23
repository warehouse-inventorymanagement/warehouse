import { useState, useEffect } from 'react';
import { settingsApi } from '../../services/api';
import { SmtpProvider } from '../../types';
import { EnvelopeIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function SmtpSettings() {
  const [loading, setLoading] = useState(true);
  const [smtpProviders, setSmtpProviders] = useState<SmtpProvider[]>([]);
  const [smtpProvider, setSmtpProvider] = useState('custom');
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUsername, setSmtpUsername] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [smtpSslMode, setSmtpSslMode] = useState<'none' | 'starttls' | 'ssl'>('starttls');
  const [smtpFromEmail, setSmtpFromEmail] = useState('');
  const [smtpFromName, setSmtpFromName] = useState('Warehouse');
  const [savingSmtp, setSavingSmtp] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [testEmailRecipient, setTestEmailRecipient] = useState('');

  const fetchSmtpProviders = async () => {
    try {
      const response = await settingsApi.getSmtpProviders();
      setSmtpProviders(response.data.data);
    } catch (error) {
      console.error('Failed to fetch SMTP providers:', error);
    }
  };

  const fetchSmtpConfig = async () => {
    try {
      const response = await settingsApi.getSmtpConfig();
      const config = response.data.data;
      setSmtpProvider(config['smtp.provider'] || 'custom');
      setSmtpHost(config['smtp.host'] || '');
      setSmtpPort(config['smtp.port'] || '587');
      setSmtpUsername(config['smtp.username'] || '');
      setSmtpPassword(config['smtp.password'] || '');
      setSmtpSslMode((config['smtp.sslMode'] as 'none' | 'starttls' | 'ssl') || 'starttls');
      setSmtpFromEmail(config['smtp.fromEmail'] || '');
      setSmtpFromName(config['smtp.fromName'] || 'Warehouse');
    } catch (error) {
      console.error('Failed to fetch SMTP config:', error);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchSmtpProviders(), fetchSmtpConfig()]);
      setLoading(false);
    };
    init();
  }, []);

  const handleSmtpProviderChange = (providerId: string) => {
    setSmtpProvider(providerId);
    const provider = smtpProviders.find(p => p.id === providerId);
    if (provider && providerId !== 'custom') {
      setSmtpHost(provider.host);
      setSmtpPort(String(provider.port));
    }
  };

  const handleSaveSmtp = async () => {
    setSavingSmtp(true);
    try {
      await settingsApi.updateSmtpConfig({
        provider: smtpProvider,
        host: smtpHost,
        port: parseInt(smtpPort, 10),
        username: smtpUsername,
        password: smtpPassword,
        sslMode: smtpSslMode,
        fromEmail: smtpFromEmail,
        fromName: smtpFromName
      });
      toast.success('SMTP settings saved');
      await fetchSmtpConfig();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save SMTP settings');
    } finally {
      setSavingSmtp(false);
    }
  };

  const handleTestSmtp = async () => {
    if (!testEmailRecipient) {
      toast.error('Please enter a recipient email address');
      return;
    }
    setTestingSmtp(true);
    try {
      const result = await settingsApi.testSmtp(testEmailRecipient);
      if (result.data.success) {
        toast.success(result.data.message);
      } else {
        toast.error(result.data.message);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Test email failed');
    } finally {
      setTestingSmtp(false);
    }
  };

  if (loading) {
    return <div className="card p-6 text-center" style={{ color: 'var(--text-secondary)' }}>Loading...</div>;
  }

  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg" style={{ backgroundColor: 'color-mix(in srgb, #f59e0b 20%, transparent)' }}>
          <EnvelopeIcon className="w-6 h-6" style={{ color: '#f59e0b' }} />
        </div>
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Email / SMTP Configuration</h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Configure email settings for notifications and password resets</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Provider Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="label">Email Provider</label>
            <select
              value={smtpProvider}
              onChange={(e) => handleSmtpProviderChange(e.target.value)}
              className="input"
            >
              {smtpProviders.map(provider => (
                <option key={provider.id} value={provider.id}>
                  {provider.name}
                </option>
              ))}
            </select>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              Select a provider to auto-fill host and port
            </p>
          </div>

          <div>
            <label className="label">SSL Mode</label>
            <select
              value={smtpSslMode}
              onChange={(e) => setSmtpSslMode(e.target.value as 'none' | 'starttls' | 'ssl')}
              className="input"
            >
              <option value="none">None</option>
              <option value="starttls">STARTTLS (Recommended)</option>
              <option value="ssl">SSL/TLS</option>
            </select>
          </div>
        </div>

        {/* Connection Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="label">SMTP Host</label>
            <input
              type="text"
              value={smtpHost}
              onChange={(e) => setSmtpHost(e.target.value)}
              className="input"
              placeholder="smtp.example.com"
            />
          </div>
          <div>
            <label className="label">SMTP Port</label>
            <input
              type="number"
              value={smtpPort}
              onChange={(e) => setSmtpPort(e.target.value)}
              className="input"
              placeholder="587"
            />
          </div>
        </div>

        {/* Authentication */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="label">Username</label>
            <input
              type="text"
              value={smtpUsername}
              onChange={(e) => setSmtpUsername(e.target.value)}
              className="input"
              placeholder="user@example.com"
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              type="password"
              value={smtpPassword}
              onChange={(e) => setSmtpPassword(e.target.value)}
              className="input"
              placeholder="Enter password"
            />
          </div>
        </div>

        {/* From Address */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="label">From Email</label>
            <input
              type="email"
              value={smtpFromEmail}
              onChange={(e) => setSmtpFromEmail(e.target.value)}
              className="input"
              placeholder="noreply@example.com"
            />
          </div>
          <div>
            <label className="label">From Name</label>
            <input
              type="text"
              value={smtpFromName}
              onChange={(e) => setSmtpFromName(e.target.value)}
              className="input"
              placeholder="Warehouse"
            />
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              Display name shown in recipient's inbox (e.g., "Warehouse Notifications")
            </p>
          </div>
        </div>

        {/* Test Email */}
        <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--bg-tertiary)' }}>
          <h3 className="font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Test Email Configuration</h3>
          <div className="flex gap-3">
            <input
              type="email"
              value={testEmailRecipient}
              onChange={(e) => setTestEmailRecipient(e.target.value)}
              className="input flex-1"
              placeholder="test@example.com"
            />
            <button
              onClick={handleTestSmtp}
              disabled={testingSmtp || !testEmailRecipient}
              className="btn btn-primary py-2 px-4"
            >
              {testingSmtp ? 'Sending...' : 'Send Test Email'}
            </button>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t" style={{ borderColor: 'var(--bg-tertiary)' }}>
          <button
            onClick={handleSaveSmtp}
            disabled={savingSmtp}
            className="btn btn-primary"
          >
            {savingSmtp ? 'Saving...' : 'Save SMTP Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
