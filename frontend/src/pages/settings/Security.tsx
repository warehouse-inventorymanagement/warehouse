import { useState, useEffect } from 'react';
import { settingsApi } from '../../services/api';
import toast from 'react-hot-toast';
import { LockClosedIcon, EnvelopeIcon } from '@heroicons/react/24/outline';

export default function SecuritySettings() {
  const [loading, setLoading] = useState(true);
  const [tfaRequired, setTfaRequired] = useState(false);
  const [tfaAllowTotp, setTfaAllowTotp] = useState(true);
  const [tfaAllowEmail, setTfaAllowEmail] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await settingsApi.getAll();
        const data = response.data.data;
        setTfaRequired(data['auth.twoFactorRequired'] === 'true');
        const tfaMethods = (data['auth.twoFactorMethods'] || 'totp,email').split(',');
        setTfaAllowTotp(tfaMethods.includes('totp'));
        setTfaAllowEmail(tfaMethods.includes('email'));
      } catch {
        toast.error('Failed to load security settings');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--accent)' }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
          Two-Factor Authentication
        </h2>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
          Configure two-factor authentication requirements for all users
        </p>

        {/* Require 2FA */}
        <div className="space-y-5">
          <div className="flex items-center justify-between p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <div>
              <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>Require 2FA for all users</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                When enabled, users will be prompted to set up 2FA on their next login
              </p>
            </div>
            <button
              onClick={async () => {
                const newValue = !tfaRequired;
                setTfaRequired(newValue);
                try {
                  await settingsApi.update({ 'auth.twoFactorRequired': String(newValue) });
                  toast.success(`2FA requirement ${newValue ? 'enabled' : 'disabled'}`);
                } catch {
                  setTfaRequired(!newValue);
                  toast.error('Failed to update setting');
                }
              }}
              className="relative inline-flex h-7 w-12 items-center rounded-full transition-colors"
              style={{ backgroundColor: tfaRequired ? 'var(--accent)' : 'var(--bg-tertiary)' }}
            >
              <span
                className="inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform"
                style={{ transform: tfaRequired ? 'translateX(1.375rem)' : 'translateX(0.25rem)' }}
              />
            </button>
          </div>

          {/* Allowed Methods */}
          <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <p className="font-medium text-sm mb-3" style={{ color: 'var(--text-primary)' }}>Allowed Methods</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-500/20">
                    <LockClosedIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Authenticator App (TOTP)</p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      Google Authenticator, Authy, etc.
                    </p>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    // Must keep at least one method enabled
                    if (tfaAllowTotp && !tfaAllowEmail) {
                      toast.error('At least one method must be enabled');
                      return;
                    }
                    const newValue = !tfaAllowTotp;
                    setTfaAllowTotp(newValue);
                    const methods = [newValue ? 'totp' : '', tfaAllowEmail ? 'email' : ''].filter(Boolean).join(',');
                    try {
                      await settingsApi.update({ 'auth.twoFactorMethods': methods });
                      toast.success(`TOTP method ${newValue ? 'enabled' : 'disabled'}`);
                    } catch {
                      setTfaAllowTotp(!newValue);
                      toast.error('Failed to update setting');
                    }
                  }}
                  className="relative inline-flex h-7 w-12 items-center rounded-full transition-colors"
                  style={{ backgroundColor: tfaAllowTotp ? 'var(--accent)' : 'var(--bg-tertiary)' }}
                >
                  <span
                    className="inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform"
                    style={{ transform: tfaAllowTotp ? 'translateX(1.375rem)' : 'translateX(0.25rem)' }}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-100 dark:bg-green-500/20">
                    <EnvelopeIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Email</p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      Receive a code via email on each login
                    </p>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    if (tfaAllowEmail && !tfaAllowTotp) {
                      toast.error('At least one method must be enabled');
                      return;
                    }
                    const newValue = !tfaAllowEmail;
                    setTfaAllowEmail(newValue);
                    const methods = [tfaAllowTotp ? 'totp' : '', newValue ? 'email' : ''].filter(Boolean).join(',');
                    try {
                      await settingsApi.update({ 'auth.twoFactorMethods': methods });
                      toast.success(`Email method ${newValue ? 'enabled' : 'disabled'}`);
                    } catch {
                      setTfaAllowEmail(!newValue);
                      toast.error('Failed to update setting');
                    }
                  }}
                  className="relative inline-flex h-7 w-12 items-center rounded-full transition-colors"
                  style={{ backgroundColor: tfaAllowEmail ? 'var(--accent)' : 'var(--bg-tertiary)' }}
                >
                  <span
                    className="inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform"
                    style={{ transform: tfaAllowEmail ? 'translateX(1.375rem)' : 'translateX(0.25rem)' }}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Info note */}
          <div className="p-3 rounded-lg text-xs" style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 10%, transparent)', color: 'var(--text-secondary)' }}>
            <p>Users can set up 2FA from their <strong>Profile Settings</strong> page. When "Require 2FA" is enabled, users without 2FA will be prompted to configure it on their next login.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
