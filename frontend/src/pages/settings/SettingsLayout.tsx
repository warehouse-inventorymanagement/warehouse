import { NavLink, Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  GlobeAltIcon,
  ShieldCheckIcon,
  PaintBrushIcon,
  EnvelopeIcon,
  BellIcon,
  CommandLineIcon,
  CircleStackIcon,
  InformationCircleIcon,
  KeyIcon,
  ClockIcon,
  LockClosedIcon,
  Squares2X2Icon,
  LinkIcon,
  DevicePhoneMobileIcon
} from '@heroicons/react/24/outline';

const allTabs = [
  { id: 'branding', name: 'Branding', icon: PaintBrushIcon, color: '#a855f7', adminOnly: true },
  { id: 'dashboard', name: 'Dashboard', icon: Squares2X2Icon, color: '#10b981', adminOnly: true },
  { id: 'networking', name: 'Networking', icon: GlobeAltIcon, color: '#3b82f6', adminOnly: false },
  { id: 'security', name: 'Security', icon: LockClosedIcon, color: '#ef4444', adminOnly: true },
  { id: 'ldap', name: 'LDAP / AD', icon: ShieldCheckIcon, color: '#22c55e', adminOnly: false },
  { id: 'smtp', name: 'Email / SMTP', icon: EnvelopeIcon, color: '#f59e0b', adminOnly: false },
  { id: 'timezone', name: 'Timezone', icon: ClockIcon, color: '#06b6d4', adminOnly: false },
  { id: 'notifications', name: 'Notifications', icon: BellIcon, color: '#ec4899', adminOnly: false },
  { id: 'audit', name: 'Audit', icon: ClockIcon, color: '#8b5cf6', adminOnly: true },
  { id: 'sessions', name: 'Sessions', icon: DevicePhoneMobileIcon, color: '#0ea5e9', adminOnly: false },
  { id: 'api', name: 'API', icon: KeyIcon, color: '#f97316', adminOnly: false },
  { id: 'webhooks', name: 'Webhooks', icon: LinkIcon, color: '#f43f5e', adminOnly: false },
  { id: 'logs', name: 'Logs', icon: CommandLineIcon, color: '#6366f1', adminOnly: true },
  { id: 'database', name: 'Database', icon: CircleStackIcon, color: '#14b8a6', adminOnly: true },
  { id: 'about', name: 'About', icon: InformationCircleIcon, color: '#8b5cf6', adminOnly: false },
];

export default function SettingsLayout() {
  const { hasPermission, isAdmin } = useAuth();
  const location = useLocation();

  if (!hasPermission('settings:read')) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <ShieldCheckIcon className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--bg-tertiary)' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Settings access required</p>
        </div>
      </div>
    );
  }

  const tabs = allTabs.filter(tab => !tab.adminOnly || isAdmin);

  // Redirect /settings to first available tab
  if (location.pathname === '/settings' || location.pathname === '/settings/') {
    const defaultTab = isAdmin ? 'branding' : 'networking';
    return <Navigate to={`/settings/${defaultTab}`} replace />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Settings</h1>
          <p style={{ color: 'var(--text-secondary)' }} className="mt-1">Configure system settings</p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b" style={{ borderColor: 'var(--bg-tertiary)' }}>
        <nav className="flex flex-wrap gap-x-4 gap-y-0" aria-label="Tabs">
          {tabs.map((tab) => (
            <NavLink
              key={tab.id}
              to={`/settings/${tab.id}`}
              className="flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors"
              style={({ isActive }) => ({
                borderColor: isActive ? tab.color : 'transparent',
                color: isActive ? tab.color : 'var(--text-secondary)',
              })}
            >
              <tab.icon className="w-5 h-5" />
              {tab.name}
            </NavLink>
          ))}
        </nav>
      </div>

      <Outlet />
    </div>
  );
}
