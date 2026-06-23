import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../services/api';
import { useBranding } from '../context/BrandingContext';
import toast from 'react-hot-toast';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await authApi.forgotPassword(email);
      setSent(true);
      toast.success('Reset instructions sent!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
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
            Reset your password
          </p>
        </div>

        <div className="card p-8">
          {sent ? (
            <div className="text-center">
              <div className="mb-4 text-green-600 dark:text-green-400">
                <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                Check your email
              </h2>
              <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
                If an account exists with {email}, we've sent password reset instructions.
              </p>
              <Link to="/login" className="text-accent hover:underline">
                Back to login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="label">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                  required
                  placeholder="Enter your email address"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn btn-primary"
              >
                {loading ? 'Sending...' : 'Send reset instructions'}
              </button>

              <div className="text-center">
                <Link to="/login" className="text-sm text-accent hover:underline">
                  Back to login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
