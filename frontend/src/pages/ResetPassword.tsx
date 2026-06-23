import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { authApi } from '../services/api';
import { useBranding } from '../context/BrandingContext';
import toast from 'react-hot-toast';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
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

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    if (!token) {
      toast.error('Invalid reset link');
      return;
    }

    setLoading(true);

    try {
      await authApi.resetPassword(token, password);
      toast.success('Password reset successfully!');
      navigate('/login');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div
        className="min-h-screen flex items-center justify-center py-12 px-4"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        <div className="max-w-md w-full text-center">
          <div className="card p-8">
            <h2 className="text-xl font-semibold mb-4 text-red-600 dark:text-red-400">Invalid Link</h2>
            <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
              This password reset link is invalid or has expired.
            </p>
            <Link to="/forgot-password" className="text-accent hover:underline">
              Request a new reset link
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
            Set your new password
          </p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="password" className="label">New Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                required
                minLength={8}
                placeholder="Enter new password"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="label">Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input"
                required
                placeholder="Confirm new password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn btn-primary"
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>

            <div className="text-center">
              <Link to="/login" className="text-sm text-accent hover:underline">
                Back to login
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
