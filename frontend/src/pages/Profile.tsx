import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { authApi, usersApi, devicesApi } from '../services/api';
import toast from 'react-hot-toast';
import { CameraIcon, KeyIcon, UserIcon, DevicePhoneMobileIcon, ShieldExclamationIcon, TrashIcon, PencilIcon, NoSymbolIcon, CheckCircleIcon, ShieldCheckIcon, ArrowPathIcon, DocumentDuplicateIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import type { Device } from '../types';

export default function Profile() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarError, setAvatarError] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Device management state
  const [devices, setDevices] = useState<Device[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [blockingDevice, setBlockingDevice] = useState<string | null>(null);
  const [deletingDevice, setDeletingDevice] = useState<string | null>(null);
  const [editingDevice, setEditingDevice] = useState<string | null>(null);
  const [editDeviceName, setEditDeviceName] = useState('');

  // 2FA state
  const [tfaStatus, setTfaStatus] = useState<{ enabled: boolean; method: string | null; methods: string[]; totpConfigured: boolean; emailConfigured: boolean; backupCodesRemaining: number } | null>(null);
  const [tfaLoading, setTfaLoading] = useState(true);
  const [tfaSetupStep, setTfaSetupStep] = useState<'idle' | 'choose' | 'setup-totp' | 'setup-email' | 'confirm' | 'backup-codes'>('idle');
  const [disablingMethod, setDisablingMethod] = useState<'totp' | 'email' | 'all' | null>(null);
  const [tfaSetupData, setTfaSetupData] = useState<{ secret?: string; qrCodeDataUrl?: string; backupCodes?: string[] } | null>(null);
  const [tfaConfirmCode, setTfaConfirmCode] = useState('');
  const [tfaConfirming, setTfaConfirming] = useState(false);
  const [tfaDisablePassword, setTfaDisablePassword] = useState('');
  const [tfaDisableCode, setTfaDisableCode] = useState('');
  const [tfaDisabling, setTfaDisabling] = useState(false);
  const [showDisableForm, setShowDisableForm] = useState(false);
  const [regenPassword, setRegenPassword] = useState('');
  const [regenCode, setRegenCode] = useState('');
  const [regenerating, setRegenerating] = useState(false);
  const [showRegenForm, setShowRegenForm] = useState(false);
  const isLdapUser = !!user?.isLdap;

  // Fetch 2FA status
  useEffect(() => {
    authApi.get2FAStatus()
      .then(res => setTfaStatus(res.data.data))
      .catch(() => setTfaStatus({ enabled: false, method: null, methods: [], totpConfigured: false, emailConfigured: false, backupCodesRemaining: 0 }))
      .finally(() => setTfaLoading(false));
  }, []);

  const handleTfaSetup = async (method: 'totp' | 'email') => {
    try {
      const res = await authApi.setup2FA(method);
      const data = res.data.data;
      setTfaSetupData({
        secret: data.secret,
        qrCodeDataUrl: data.qrCodeDataUrl,
        backupCodes: data.backupCodes,
      });
      setTfaSetupStep(method === 'totp' ? 'setup-totp' : 'setup-email');
      setTfaConfirmCode('');
      if (method === 'email') {
        toast.success('Verification code sent to your email');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to start 2FA setup');
    }
  };

  const handleTfaConfirm = async () => {
    setTfaConfirming(true);
    const method = tfaSetupStep === 'setup-totp' ? 'totp' : 'email';
    try {
      await authApi.confirm2FA(tfaConfirmCode, method);
      toast.success('Two-factor authentication enabled!');
      if (tfaSetupData?.backupCodes?.length) {
        // Backup codes were returned during setup — show them now
        setTfaSetupStep('backup-codes');
      } else {
        setTfaSetupStep('idle');
        setTfaSetupData(null);
      }
      // Refresh status
      authApi.get2FAStatus().then(r => setTfaStatus(r.data.data)).catch(() => {});
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Invalid verification code');
    } finally {
      setTfaConfirming(false);
    }
  };

  const handleTfaDisable = async (method?: 'totp' | 'email') => {
    setTfaDisabling(true);
    try {
      const data: { password?: string; code?: string; method?: string } = isLdapUser ? { code: tfaDisableCode } : { password: tfaDisablePassword };
      if (method) data.method = method;
      await authApi.disable2FA(data);
      toast.success(method ? `${method === 'totp' ? 'Authenticator' : 'Email'} 2FA disabled` : 'Two-factor authentication disabled');
      // Refresh status
      authApi.get2FAStatus()
        .then(r => setTfaStatus(r.data.data))
        .catch(() => setTfaStatus({ enabled: false, method: null, methods: [], totpConfigured: false, emailConfigured: false, backupCodesRemaining: 0 }));
      setShowDisableForm(false);
      setDisablingMethod(null);
      setTfaDisablePassword('');
      setTfaDisableCode('');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to disable 2FA');
    } finally {
      setTfaDisabling(false);
    }
  };

  const handleRegenBackupCodes = async () => {
    setRegenerating(true);
    try {
      const data = isLdapUser ? { code: regenCode } : { password: regenPassword };
      const res = await authApi.regenerateBackupCodes(data);
      setTfaSetupData({ backupCodes: res.data.data.backupCodes });
      setTfaSetupStep('backup-codes');
      setShowRegenForm(false);
      setRegenPassword('');
      setRegenCode('');
      setTfaStatus(prev => prev ? { ...prev, backupCodesRemaining: 10 } : prev);
      toast.success('Backup codes regenerated');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to regenerate backup codes');
    } finally {
      setRegenerating(false);
    }
  };

  const downloadBackupCodes = () => {
    if (!tfaSetupData?.backupCodes) return;
    const content = `Warehouse - Two-Factor Authentication Backup Codes\n${'='.repeat(50)}\n\nKeep these codes safe. Each code can only be used once.\n\n${tfaSetupData.backupCodes.map((c, i) => `${i + 1}. ${c}`).join('\n')}\n\nGenerated: ${new Date().toLocaleString()}\n`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'warehouse-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyBackupCodes = () => {
    if (!tfaSetupData?.backupCodes) return;
    navigator.clipboard.writeText(tfaSetupData.backupCodes.join('\n'));
    toast.success('Backup codes copied to clipboard');
  };

  // Fetch user's devices
  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const response = await devicesApi.getMyDevices();
        setDevices(response.data.data || []);
      } catch (error) {
        console.error('Failed to fetch devices:', error);
      } finally {
        setLoadingDevices(false);
      }
    };
    fetchDevices();
  }, []);

  const handleBlockDevice = async (deviceId: string, isBlocked: boolean) => {
    setBlockingDevice(deviceId);
    try {
      if (isBlocked) {
        await devicesApi.unblock(deviceId);
        toast.success('Device unblocked');
      } else {
        await devicesApi.block(deviceId, 'Blocked by user from profile');
        toast.success('Device blocked. All sessions have been revoked.');
      }
      // Refresh devices
      const response = await devicesApi.getMyDevices();
      setDevices(response.data.data || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update device');
    } finally {
      setBlockingDevice(null);
    }
  };

  const handleDeleteDevice = async (deviceId: string) => {
    if (!confirm('Are you sure you want to delete this device? This action cannot be undone.')) {
      return;
    }
    setDeletingDevice(deviceId);
    try {
      await devicesApi.delete(deviceId);
      toast.success('Device deleted');
      setDevices(devices.filter(d => d.id !== deviceId));
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete device');
    } finally {
      setDeletingDevice(null);
    }
  };

  const handleRenameDevice = async (deviceId: string) => {
    if (!editDeviceName.trim()) {
      toast.error('Device name cannot be empty');
      return;
    }
    try {
      await devicesApi.update(deviceId, { name: editDeviceName });
      toast.success('Device renamed');
      setDevices(devices.map(d => d.id === deviceId ? { ...d, name: editDeviceName } : d));
      setEditingDevice(null);
      setEditDeviceName('');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to rename device');
    }
  };

  const startEditingDevice = (device: Device) => {
    setEditingDevice(device.id);
    setEditDeviceName(device.name);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setChangingPassword(true);

    try {
      await authApi.changePassword(currentPassword, newPassword);
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Profile Settings</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your account settings</p>
      </div>

      {/* Profile Info */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
          <UserIcon className="w-5 h-5" />
          Profile Information
        </h2>

        <div className="flex flex-col sm:flex-row items-start gap-6">
          {/* Avatar */}
          <div className="relative">
            {user?.avatarPath && !avatarError ? (
              <img
                src={`/uploads/${user.avatarPath}`}
                alt=""
                className="w-24 h-24 rounded-2xl object-cover shadow-lg"
                onError={() => setAvatarError(true)}
              />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                {user?.firstName && user?.lastName
                  ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
                  : user?.firstName
                  ? user.firstName.slice(0, 2).toUpperCase()
                  : user?.username?.charAt(0).toUpperCase()}
              </div>
            )}
            {user?.isLdap && (
              <span
                className="absolute -top-2 -left-2 px-1.5 py-0.5 text-[9px] font-bold rounded-md shadow-sm"
                style={{ backgroundColor: 'var(--accent)', color: 'white' }}
              >
                LDAP
              </span>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-2 -right-2 p-2 rounded-xl shadow-lg border transition-colors hover-bg"
              style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--bg-tertiary)' }}
            >
              <CameraIcon className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 5 * 1024 * 1024) {
                  toast.error('Image must be under 5 MB');
                  return;
                }
                try {
                  await usersApi.uploadAvatar(file);
                  toast.success('Profile picture updated');
                  // Refresh user data so avatar shows immediately
                  window.location.reload();
                } catch (err: any) {
                  toast.error(err.response?.data?.message || 'Failed to upload avatar');
                } finally {
                  e.target.value = '';
                }
              }}
            />
          </div>

          {/* User Details */}
          <div className="flex-1 space-y-4">
            {/* Display Name */}
            {(user?.firstName || user?.lastName) && (
              <div>
                <label className="label">Name</label>
                <p className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>
                  {[user?.firstName, user?.lastName].filter(Boolean).join(' ')}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Username</label>
                <input
                  type="text"
                  value={user?.username || ''}
                  className="input disabled:opacity-100"
                  style={{ color: 'var(--text-primary)', backgroundColor: 'var(--bg-tertiary)' }}
                  disabled
                />
              </div>

              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  value={user?.email || ''}
                  className="input disabled:opacity-100"
                  style={{ color: 'var(--text-primary)', backgroundColor: 'var(--bg-tertiary)' }}
                  disabled
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {user?.employeeId && (
                <div>
                  <label className="label">Employee ID</label>
                  <input
                    type="text"
                    value={user.employeeId}
                    className="input disabled:opacity-100"
                    style={{ color: 'var(--text-primary)', backgroundColor: 'var(--bg-tertiary)' }}
                    disabled
                  />
                </div>
              )}

              {user?.phone && (
                <div>
                  <label className="label">Phone</label>
                  <input
                    type="text"
                    value={user.phone}
                    className="input disabled:opacity-100"
                    style={{ color: 'var(--text-primary)', backgroundColor: 'var(--bg-tertiary)' }}
                    disabled
                  />
                </div>
              )}
            </div>

            {user?.address && (
              <div>
                <label className="label">Address</label>
                <input
                  type="text"
                  value={user.address}
                  className="input disabled:opacity-100"
                  style={{ color: 'var(--text-primary)', backgroundColor: 'var(--bg-tertiary)' }}
                  disabled
                />
              </div>
            )}

            <div>
              <label className="label">Role</label>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 text-sm rounded-lg font-medium ${
                  user?.role?.name === 'Admin'
                    ? 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-400'
                    : user?.role?.name === 'Manager'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-400'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-500/20 dark:text-gray-400'
                }`}>
                  {user?.role?.name || 'Unknown'}
                </span>
              </div>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400">Contact admin to update profile information</p>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
          <KeyIcon className="w-5 h-5" />
          Change Password
        </h2>

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="label">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="input"
              placeholder="Enter your current password"
              required
            />
          </div>

          <div>
            <label className="label">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="input"
              placeholder="Enter new password"
              required
              minLength={8}
            />
          </div>

          <div>
            <label className="label">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input"
              placeholder="Confirm new password"
              required
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={changingPassword}
              className="btn btn-primary"
            >
              {changingPassword ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>

      {/* Two-Factor Authentication */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
          <ShieldCheckIcon className="w-5 h-5" />
          Two-Factor Authentication
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Add an extra layer of security to your account
        </p>

        {tfaLoading ? (
          <div className="text-center py-4 text-gray-500">Loading...</div>
        ) : tfaSetupStep === 'backup-codes' && tfaSetupData?.backupCodes ? (
          /* Backup Codes Display */
          <div>
            <div className="p-4 rounded-xl border border-amber-300 dark:border-amber-500/50 bg-amber-50 dark:bg-amber-500/10 mb-4">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-1">Save your backup codes</p>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Store these codes in a safe place. Each code can only be used once to sign in if you lose access to your authenticator.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
              {tfaSetupData.backupCodes.map((code, i) => (
                <div
                  key={i}
                  className="px-3 py-2 rounded-lg text-center font-mono text-sm"
                  style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                >
                  {code}
                </div>
              ))}
            </div>

            <div className="flex gap-2 mb-4">
              <button onClick={downloadBackupCodes} className="btn btn-secondary flex-1 flex items-center justify-center gap-2 text-sm">
                <ArrowDownTrayIcon className="w-4 h-4" /> Download
              </button>
              <button onClick={copyBackupCodes} className="btn btn-secondary flex-1 flex items-center justify-center gap-2 text-sm">
                <DocumentDuplicateIcon className="w-4 h-4" /> Copy
              </button>
            </div>

            <button
              onClick={() => { setTfaSetupStep('idle'); setTfaSetupData(null); }}
              className="btn btn-primary w-full"
            >
              Done
            </button>
          </div>
        ) : tfaSetupStep === 'choose' ? (
          /* Method Selection */
          <div className="space-y-3">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {tfaStatus?.enabled ? 'Add another verification method:' : 'Choose your preferred method:'}
            </p>
            {!tfaStatus?.totpConfigured && (
              <button
                onClick={() => handleTfaSetup('totp')}
                className="w-full p-4 rounded-xl border text-left flex items-start gap-3 transition-colors hover:border-blue-400"
                style={{ borderColor: 'var(--bg-tertiary)', backgroundColor: 'var(--bg-secondary)' }}
              >
                <DevicePhoneMobileIcon className="w-6 h-6 text-blue-500 mt-0.5" />
                <div>
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Authenticator App</p>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Use Google Authenticator, Authy, or similar app
                  </p>
                </div>
              </button>
            )}
            {!tfaStatus?.emailConfigured && (
              <button
                onClick={() => handleTfaSetup('email')}
                className="w-full p-4 rounded-xl border text-left flex items-start gap-3 transition-colors hover:border-blue-400"
                style={{ borderColor: 'var(--bg-tertiary)', backgroundColor: 'var(--bg-secondary)' }}
              >
                <svg className="w-6 h-6 text-green-500 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                <div>
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Email</p>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Receive a code via email each time you sign in
                  </p>
                </div>
              </button>
            )}
            <button
              onClick={() => setTfaSetupStep('idle')}
              className="btn btn-secondary w-full text-sm"
            >
              Cancel
            </button>
          </div>
        ) : tfaSetupStep === 'setup-totp' ? (
          /* TOTP Setup - QR Code */
          <div>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
            </p>

            {tfaSetupData?.qrCodeDataUrl && (
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-white rounded-xl">
                  <img src={tfaSetupData.qrCodeDataUrl} alt="QR Code" className="w-48 h-48" />
                </div>
              </div>
            )}

            {tfaSetupData?.secret && (
              <div className="mb-4">
                <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Or enter this key manually:
                </p>
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-lg font-mono text-sm select-all"
                  style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                >
                  <span className="flex-1 break-all">{tfaSetupData.secret}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(tfaSetupData.secret!);
                      toast.success('Secret copied');
                    }}
                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 flex-shrink-0"
                  >
                    <DocumentDuplicateIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            <div className="mb-4">
              <label className="label">Enter the 6-digit code from your app</label>
              <input
                type="text"
                value={tfaConfirmCode}
                onChange={(e) => setTfaConfirmCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="input text-center text-xl tracking-[0.3em] font-mono"
                placeholder="000000"
                maxLength={6}
                autoComplete="one-time-code"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => { setTfaSetupStep('idle'); setTfaSetupData(null); }}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleTfaConfirm}
                disabled={tfaConfirming || tfaConfirmCode.length !== 6}
                className="btn btn-primary flex-1"
              >
                {tfaConfirming ? 'Verifying...' : 'Enable 2FA'}
              </button>
            </div>
          </div>
        ) : tfaSetupStep === 'setup-email' ? (
          /* Email Setup - Verify Code */
          <div>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              We sent a verification code to your email. Enter it below to confirm.
            </p>

            <div className="mb-4">
              <label className="label">Verification code</label>
              <input
                type="text"
                value={tfaConfirmCode}
                onChange={(e) => setTfaConfirmCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="input text-center text-xl tracking-[0.3em] font-mono"
                placeholder="000000"
                maxLength={6}
                autoComplete="one-time-code"
                autoFocus
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => { setTfaSetupStep('idle'); setTfaSetupData(null); }}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleTfaConfirm}
                disabled={tfaConfirming || tfaConfirmCode.length !== 6}
                className="btn btn-primary flex-1"
              >
                {tfaConfirming ? 'Verifying...' : 'Enable 2FA'}
              </button>
            </div>
          </div>
        ) : tfaStatus?.enabled ? (
          /* 2FA Enabled State — show method cards */
          <div>
            <div className="flex items-center gap-3 p-4 rounded-xl border border-green-300 dark:border-green-500/50 bg-green-50 dark:bg-green-500/10 mb-4">
              <ShieldCheckIcon className="w-8 h-8 text-green-600 dark:text-green-400" />
              <div>
                <p className="font-medium text-green-800 dark:text-green-300">2FA is enabled</p>
                <p className="text-sm text-green-700 dark:text-green-400">
                  {tfaStatus.methods.length === 2 ? 'Authenticator App + Email' : tfaStatus.methods[0] === 'totp' ? 'Authenticator App' : 'Email'}
                  {' · '}{tfaStatus.backupCodesRemaining} backup code{tfaStatus.backupCodesRemaining !== 1 ? 's' : ''} remaining
                </p>
              </div>
            </div>

            {/* Method Cards */}
            <div className="space-y-3 mb-4">
              {/* TOTP Method Card */}
              <div
                className="p-4 rounded-xl border flex items-center justify-between"
                style={{ borderColor: tfaStatus.totpConfigured ? 'var(--accent)' : 'var(--bg-tertiary)', backgroundColor: 'var(--bg-secondary)' }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: tfaStatus.totpConfigured ? 'color-mix(in srgb, var(--accent) 15%, transparent)' : 'var(--bg-tertiary)' }}
                  >
                    <DevicePhoneMobileIcon className="w-5 h-5" style={{ color: tfaStatus.totpConfigured ? 'var(--accent)' : 'var(--text-secondary)' }} />
                  </div>
                  <div>
                    <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>Authenticator App</p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {tfaStatus.totpConfigured ? 'Enabled' : 'Not configured'}
                    </p>
                  </div>
                </div>
                {tfaStatus.totpConfigured ? (
                  <button
                    onClick={() => { setDisablingMethod('totp'); setShowDisableForm(true); }}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Remove
                  </button>
                ) : (
                  <button
                    onClick={() => handleTfaSetup('totp')}
                    className="text-xs text-accent hover:underline"
                  >
                    Set up
                  </button>
                )}
              </div>

              {/* Email Method Card */}
              <div
                className="p-4 rounded-xl border flex items-center justify-between"
                style={{ borderColor: tfaStatus.emailConfigured ? 'var(--accent)' : 'var(--bg-tertiary)', backgroundColor: 'var(--bg-secondary)' }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: tfaStatus.emailConfigured ? 'color-mix(in srgb, var(--accent) 15%, transparent)' : 'var(--bg-tertiary)' }}
                  >
                    <svg className="w-5 h-5" style={{ color: tfaStatus.emailConfigured ? 'var(--accent)' : 'var(--text-secondary)' }} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>Email Verification</p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {tfaStatus.emailConfigured ? 'Enabled' : 'Not configured'}
                    </p>
                  </div>
                </div>
                {tfaStatus.emailConfigured ? (
                  <button
                    onClick={() => { setDisablingMethod('email'); setShowDisableForm(true); }}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Remove
                  </button>
                ) : (
                  <button
                    onClick={() => handleTfaSetup('email')}
                    className="text-xs text-accent hover:underline"
                  >
                    Set up
                  </button>
                )}
              </div>
            </div>

            {/* Regenerate Backup Codes */}
            {showRegenForm ? (
              <div className="p-4 rounded-xl border mb-3" style={{ borderColor: 'var(--bg-tertiary)', backgroundColor: 'var(--bg-secondary)' }}>
                <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
                  Regenerate Backup Codes
                </p>
                {isLdapUser ? (
                  <div className="mb-3">
                    <label className="label">Current 2FA Code</label>
                    <input
                      type="text"
                      value={regenCode}
                      onChange={(e) => setRegenCode(e.target.value)}
                      className="input"
                      placeholder="Enter your current 2FA code"
                    />
                  </div>
                ) : (
                  <div className="mb-3">
                    <label className="label">Password</label>
                    <input
                      type="password"
                      value={regenPassword}
                      onChange={(e) => setRegenPassword(e.target.value)}
                      className="input"
                      placeholder="Confirm your password"
                    />
                  </div>
                )}
                <div className="flex gap-2">
                  <button onClick={() => { setShowRegenForm(false); setRegenPassword(''); setRegenCode(''); }} className="btn btn-secondary flex-1 text-sm">
                    Cancel
                  </button>
                  <button
                    onClick={handleRegenBackupCodes}
                    disabled={regenerating || (isLdapUser ? !regenCode : !regenPassword)}
                    className="btn btn-primary flex-1 text-sm"
                  >
                    {regenerating ? 'Regenerating...' : 'Regenerate'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowRegenForm(true)}
                className="btn btn-secondary w-full mb-3 flex items-center justify-center gap-2 text-sm"
              >
                <ArrowPathIcon className="w-4 h-4" /> Regenerate Backup Codes
              </button>
            )}

            {/* Disable 2FA (specific method or all) */}
            {showDisableForm ? (
              <div className="p-4 rounded-xl border border-red-300 dark:border-red-500/50 bg-red-50 dark:bg-red-500/10">
                <p className="text-sm font-medium text-red-800 dark:text-red-300 mb-3">
                  {disablingMethod && disablingMethod !== 'all'
                    ? `Remove ${disablingMethod === 'totp' ? 'Authenticator App' : 'Email'} method`
                    : 'Disable Two-Factor Authentication'}
                </p>
                {isLdapUser ? (
                  <div className="mb-3">
                    <label className="label">Current 2FA Code</label>
                    <input
                      type="text"
                      value={tfaDisableCode}
                      onChange={(e) => setTfaDisableCode(e.target.value)}
                      className="input"
                      placeholder="Enter your current 2FA code"
                    />
                  </div>
                ) : (
                  <div className="mb-3">
                    <label className="label">Password</label>
                    <input
                      type="password"
                      value={tfaDisablePassword}
                      onChange={(e) => setTfaDisablePassword(e.target.value)}
                      className="input"
                      placeholder="Confirm your password"
                    />
                  </div>
                )}
                <div className="flex gap-2">
                  <button onClick={() => { setShowDisableForm(false); setDisablingMethod(null); setTfaDisablePassword(''); setTfaDisableCode(''); }} className="btn btn-secondary flex-1 text-sm">
                    Cancel
                  </button>
                  <button
                    onClick={() => handleTfaDisable(disablingMethod === 'all' ? undefined : disablingMethod as 'totp' | 'email')}
                    disabled={tfaDisabling || (isLdapUser ? !tfaDisableCode : !tfaDisablePassword)}
                    className="btn btn-primary flex-1 text-sm !bg-red-600 hover:!bg-red-700"
                  >
                    {tfaDisabling ? 'Disabling...' : disablingMethod && disablingMethod !== 'all' ? 'Remove Method' : 'Disable All'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => { setDisablingMethod('all'); setShowDisableForm(true); }}
                className="w-full text-sm text-center text-red-500 hover:underline"
              >
                Disable All Two-Factor Authentication
              </button>
            )}
          </div>
        ) : (
          /* 2FA Not Enabled */
          <div>
            <div className="flex items-center gap-3 p-4 rounded-xl border mb-4" style={{ borderColor: 'var(--bg-tertiary)', backgroundColor: 'var(--bg-secondary)' }}>
              <ShieldCheckIcon className="w-8 h-8" style={{ color: 'var(--text-secondary)' }} />
              <div>
                <p className="font-medium" style={{ color: 'var(--text-primary)' }}>2FA is not enabled</p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Protect your account with an additional verification step
                </p>
              </div>
            </div>
            <button
              onClick={() => setTfaSetupStep('choose')}
              className="btn btn-primary w-full"
            >
              Enable Two-Factor Authentication
            </button>
          </div>
        )}
      </div>

      {/* My Devices */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
          <DevicePhoneMobileIcon className="w-5 h-5" />
          My Devices
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Devices that have logged into your account. Block a device if it's lost or stolen.
        </p>

        {loadingDevices ? (
          <div className="text-center py-8 text-gray-500">Loading devices...</div>
        ) : devices.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <DevicePhoneMobileIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No devices registered</p>
            <p className="text-sm mt-1">Devices will appear here when you log in from the mobile app</p>
          </div>
        ) : (
          <div className="space-y-4">
            {devices.map((device) => (
              <div
                key={device.id}
                className={`p-4 rounded-xl border transition-colors ${
                  device.isBlocked
                    ? 'border-red-300 dark:border-red-500/50 bg-red-50 dark:bg-red-500/10'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className={`p-2 rounded-lg ${
                      device.isBlocked
                        ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400'
                        : 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400'
                    }`}>
                      <DevicePhoneMobileIcon className="w-6 h-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      {editingDevice === device.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editDeviceName}
                            onChange={(e) => setEditDeviceName(e.target.value)}
                            className="input py-1 px-2 text-sm flex-1"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRenameDevice(device.id);
                              if (e.key === 'Escape') { setEditingDevice(null); setEditDeviceName(''); }
                            }}
                          />
                          <button
                            onClick={() => handleRenameDevice(device.id)}
                            className="btn btn-primary py-1 px-2 text-xs"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => { setEditingDevice(null); setEditDeviceName(''); }}
                            className="btn btn-secondary py-1 px-2 text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                            {device.name}
                          </h3>
                          {device.isBlocked && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-400">
                              <ShieldExclamationIcon className="w-3 h-3" />
                              Blocked
                            </span>
                          )}
                        </div>
                      )}
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 space-y-0.5">
                        {(device.manufacturer || device.model) && (
                          <p>{[device.manufacturer, device.model].filter(Boolean).join(' ')}</p>
                        )}
                        {device.androidVersion && (
                          <p>Android {device.androidVersion}</p>
                        )}
                        <p className="font-mono text-xs opacity-60">ID: {device.id}</p>
                        <p className="font-mono text-xs opacity-60">Device UUID: {device.deviceUuid || 'Not provided'}</p>
                        {device.lastActiveAt && (
                          <p>Last active: {new Date(device.lastActiveAt).toLocaleString()}</p>
                        )}
                        {device.isBlocked && device.blockedAt && (
                          <p className="text-red-600 dark:text-red-400">
                            Blocked: {new Date(device.blockedAt).toLocaleString()}
                            {device.blockedReason && ` - ${device.blockedReason}`}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!editingDevice && (
                      <>
                        <button
                          onClick={() => startEditingDevice(device)}
                          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          title="Rename device"
                        >
                          <PencilIcon className="w-4 h-4 text-gray-500" />
                        </button>
                        <button
                          onClick={() => handleBlockDevice(device.id, device.isBlocked)}
                          disabled={blockingDevice === device.id}
                          className={`p-2 rounded-lg transition-colors ${
                            device.isBlocked
                              ? 'hover:bg-green-100 dark:hover:bg-green-500/20 text-green-600 dark:text-green-400'
                              : 'hover:bg-yellow-100 dark:hover:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400'
                          }`}
                          title={device.isBlocked ? 'Unblock device' : 'Block device'}
                        >
                          {blockingDevice === device.id ? (
                            <span className="w-4 h-4 block border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : device.isBlocked ? (
                            <CheckCircleIcon className="w-4 h-4" />
                          ) : (
                            <NoSymbolIcon className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDeleteDevice(device.id)}
                          disabled={deletingDevice === device.id}
                          className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 transition-colors"
                          title="Delete device"
                        >
                          {deletingDevice === device.id ? (
                            <span className="w-4 h-4 block border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <TrashIcon className="w-4 h-4" />
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Account Info */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Account Information</h2>
        <div className="text-sm text-gray-500 dark:text-gray-400 space-y-2">
          <p>For account deletion or other administrative changes, please contact your system administrator.</p>
        </div>
      </div>
    </div>
  );
}
