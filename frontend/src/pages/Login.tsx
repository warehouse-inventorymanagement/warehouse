import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, TwoFactorRequired } from '../context/AuthContext';
import { useBranding } from '../context/BrandingContext';
import { authApi } from '../services/api';
import toast from 'react-hot-toast';
import { ShieldCheckIcon, DevicePhoneMobileIcon, EnvelopeIcon, ArrowLeftIcon, KeyIcon } from '@heroicons/react/24/outline';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [useLdap, setUseLdap] = useState(false);
  const [ldapEnabled, setLdapEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  // 2FA state
  const [step, setStep] = useState<'credentials' | 'choose-method' | 'verify'>('credentials');
  const [pendingToken, setPendingToken] = useState('');
  const [tfaMethods, setTfaMethods] = useState<('totp' | 'email')[]>([]);
  const [tfaMethod, setTfaMethod] = useState<'totp' | 'email'>('totp');
  const [tfaCode, setTfaCode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [resending, setResending] = useState(false);
  const [sendingEmailCode, setSendingEmailCode] = useState(false);
  const codeInputRef = useRef<HTMLInputElement>(null);

  const { login, ldapLogin, verify2FA } = useAuth();
  const { theme } = useBranding();

  // Select the appropriate logo based on theme
  const isLightTheme = theme.preset === 'light' || theme.preset === 'light-purple';
  const customLogoUrl = !isLightTheme && theme.logoDark
    ? `/uploads/branding/${theme.logoDark}`
    : theme.logoLight
      ? `/uploads/branding/${theme.logoLight}`
      : null;

  // Default SVG icon (reactive to theme color)
  const DefaultIcon = ({ className = "w-12 h-12" }: { className?: string }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ color: 'var(--accent)' }}
    >
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  );

  useEffect(() => {
    // Check if LDAP is enabled
    authApi.getLdapStatus()
      .then(response => {
        setLdapEnabled(response.data.data.enabled);
      })
      .catch(() => {
        setLdapEnabled(false);
      });
  }, []);

  // Focus code input when entering verify step
  useEffect(() => {
    if (step === 'verify') {
      setTimeout(() => codeInputRef.current?.focus(), 100);
    }
  }, [step, useBackupCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let result: TwoFactorRequired | void;
      if (useLdap) {
        result = await ldapLogin(username, password);
      } else {
        result = await login(username, password);
      }

      if (result?.requires2FA) {
        setPendingToken(result.pendingToken);
        setTfaMethods(result.methods);
        setTfaCode('');
        setUseBackupCode(false);

        if (result.methods.length > 1) {
          // Multiple methods — let user choose
          setStep('choose-method');
        } else {
          // Single method — go straight to verify
          setTfaMethod(result.methods[0]);
          setStep('verify');
          if (result.methods[0] === 'email') {
            toast.success('Verification code sent to your email');
          }
        }
      } else {
        toast.success('Welcome back!');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await verify2FA(pendingToken, tfaCode.trim(), useBackupCode ? undefined : tfaMethod);
      toast.success('Welcome back!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setResending(true);
    try {
      await authApi.resend2FA(pendingToken);
      toast.success('New verification code sent');
    } catch {
      toast.error('Failed to resend code');
    } finally {
      setResending(false);
    }
  };

  const handleBack = () => {
    if (step === 'verify' && tfaMethods.length > 1) {
      // Go back to method picker
      setStep('choose-method');
      setTfaCode('');
      setUseBackupCode(false);
    } else {
      setStep('credentials');
      setTfaCode('');
      setPendingToken('');
      setUseBackupCode(false);
    }
  };

  const handlePickMethod = async (method: 'totp' | 'email') => {
    setTfaMethod(method);
    setTfaCode('');
    setUseBackupCode(false);

    if (method === 'email') {
      // Send email code when picking email method
      setSendingEmailCode(true);
      try {
        await authApi.sendEmailCode(pendingToken);
        toast.success('Verification code sent to your email');
      } catch {
        toast.error('Failed to send email code');
      } finally {
        setSendingEmailCode(false);
      }
    }

    setStep('verify');
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center py-12 px-4"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          {customLogoUrl ? (
            <img src={customLogoUrl} alt="Logo" className="h-14 mx-auto mb-4 object-contain" />
          ) : (
            <div className="flex flex-col items-center gap-3">
              <DefaultIcon className="w-14 h-14" />
              <div>
                <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  Warehouse
                </h1>
                <p className="text-xs font-light opacity-70" style={{ color: 'var(--text-secondary)' }}>
                  Inventory Management
                </p>
              </div>
            </div>
          )}
          <p className="mt-4" style={{ color: 'var(--text-secondary)' }}>
            {step === 'credentials' ? 'Sign in to your account' : 'Two-Factor Authentication'}
          </p>
        </div>

        <div className="card p-8">
          {step === 'credentials' ? (
            <>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="username" className="label">Username or Email</label>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="input"
                    placeholder="Enter your username"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="password" className="label">Password</label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input"
                    placeholder="Enter your password"
                    required
                  />
                </div>

                {ldapEnabled && (
                  <div className="flex items-center">
                    <input
                      id="ldap"
                      type="checkbox"
                      checked={useLdap}
                      onChange={(e) => setUseLdap(e.target.checked)}
                      className="h-4 w-4"
                      style={{ accentColor: 'var(--accent)' }}
                    />
                    <label htmlFor="ldap" className="ml-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      Use LDAP / Active Directory
                    </label>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn btn-primary"
                >
                  {loading ? 'Signing in...' : 'Sign in'}
                </button>
              </form>

              <div className="mt-6 text-center text-sm">
                <Link to="/forgot-password" className="text-accent hover:underline">
                  Forgot your password?
                </Link>
              </div>

              <div className="mt-4 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
                Don't have an account?{' '}
                <Link to="/register" className="text-accent hover:underline">
                  Sign up
                </Link>
              </div>
            </>
          ) : step === 'choose-method' ? (
            <>
              {/* Method Picker Step */}
              <div className="text-center mb-6">
                <div
                  className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 15%, transparent)' }}
                >
                  <ShieldCheckIcon className="w-8 h-8" style={{ color: 'var(--accent)' }} />
                </div>
                <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Choose Verification Method
                </h2>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                  Select how you'd like to verify your identity
                </p>
              </div>

              <div className="space-y-3">
                {tfaMethods.includes('totp') && (
                  <button
                    onClick={() => handlePickMethod('totp')}
                    className="w-full p-4 rounded-xl border text-left flex items-center gap-3 transition-colors"
                    style={{ borderColor: 'var(--bg-tertiary)', backgroundColor: 'var(--bg-secondary)' }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--bg-tertiary)'}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 15%, transparent)' }}
                    >
                      <DevicePhoneMobileIcon className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                    </div>
                    <div>
                      <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Authenticator App</p>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        Use a code from your authenticator app
                      </p>
                    </div>
                  </button>
                )}

                {tfaMethods.includes('email') && (
                  <button
                    onClick={() => handlePickMethod('email')}
                    disabled={sendingEmailCode}
                    className="w-full p-4 rounded-xl border text-left flex items-center gap-3 transition-colors"
                    style={{ borderColor: 'var(--bg-tertiary)', backgroundColor: 'var(--bg-secondary)' }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--bg-tertiary)'}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 15%, transparent)' }}
                    >
                      <EnvelopeIcon className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                    </div>
                    <div>
                      <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                        {sendingEmailCode ? 'Sending code...' : 'Email Code'}
                      </p>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        Send a verification code to your email
                      </p>
                    </div>
                  </button>
                )}
              </div>

              <div className="mt-4">
                <button
                  type="button"
                  onClick={handleBack}
                  className="w-full text-sm text-center flex items-center justify-center gap-1 hover:underline"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <ArrowLeftIcon className="w-3.5 h-3.5" />
                  Back to sign in
                </button>
              </div>
            </>
          ) : (
            <>
              {/* 2FA Verification Step */}
              <div className="text-center mb-6">
                <div
                  className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 15%, transparent)' }}
                >
                  {useBackupCode ? (
                    <KeyIcon className="w-8 h-8" style={{ color: 'var(--accent)' }} />
                  ) : tfaMethod === 'totp' ? (
                    <DevicePhoneMobileIcon className="w-8 h-8" style={{ color: 'var(--accent)' }} />
                  ) : (
                    <EnvelopeIcon className="w-8 h-8" style={{ color: 'var(--accent)' }} />
                  )}
                </div>
                <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {useBackupCode
                    ? 'Enter Backup Code'
                    : tfaMethod === 'totp'
                      ? 'Authenticator Code'
                      : 'Check Your Email'}
                </h2>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                  {useBackupCode
                    ? 'Enter one of your backup codes'
                    : tfaMethod === 'totp'
                      ? 'Enter the 6-digit code from your authenticator app'
                      : 'Enter the 6-digit code sent to your email'}
                </p>
              </div>

              <form onSubmit={handleVerify} className="space-y-5">
                <div>
                  <input
                    ref={codeInputRef}
                    type="text"
                    value={tfaCode}
                    onChange={(e) => setTfaCode(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                    className="input text-center text-xl tracking-[0.3em] font-mono"
                    placeholder={useBackupCode ? 'xxxxxxxx' : '000000'}
                    maxLength={useBackupCode ? 8 : 6}
                    autoComplete="one-time-code"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || tfaCode.length < (useBackupCode ? 8 : 6)}
                  className="w-full btn btn-primary"
                >
                  <ShieldCheckIcon className="w-5 h-5 mr-2 inline" />
                  {loading ? 'Verifying...' : 'Verify'}
                </button>
              </form>

              <div className="mt-4 space-y-2">
                {/* Toggle backup code mode */}
                <button
                  type="button"
                  onClick={() => {
                    setUseBackupCode(!useBackupCode);
                    setTfaCode('');
                  }}
                  className="w-full text-sm text-center text-accent hover:underline"
                >
                  {useBackupCode ? 'Use verification code instead' : 'Use a backup code'}
                </button>

                {/* Resend for email method */}
                {tfaMethod === 'email' && !useBackupCode && (
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={resending}
                    className="w-full text-sm text-center hover:underline"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {resending ? 'Sending...' : 'Resend verification code'}
                  </button>
                )}

                {/* Back button */}
                <button
                  type="button"
                  onClick={handleBack}
                  className="w-full text-sm text-center flex items-center justify-center gap-1 hover:underline"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <ArrowLeftIcon className="w-3.5 h-3.5" />
                  {tfaMethods.length > 1 ? 'Try another method' : 'Back to sign in'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
