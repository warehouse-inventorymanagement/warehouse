import React, { useState, useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useBranding } from '../context/BrandingContext';
import { versionApi, announcementsApi, itemsApi, UpdateInfo } from '../services/api';
import { IconDisplay } from './IconPicker';
import { useKeyboardShortcuts, SHORTCUTS } from '../hooks/useKeyboardShortcuts';
import toast from 'react-hot-toast';
import type { Announcement } from '../types';
import {
  HomeIcon,
  CubeIcon,
  FolderIcon,
  MapPinIcon,
  TagIcon,
  UsersIcon,
  UserGroupIcon,
  Bars3Icon,
  XMarkIcon,
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
  ShieldCheckIcon,
  ClockIcon,
  WrenchScrewdriverIcon,
  DocumentDuplicateIcon,
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
  Squares2X2Icon,
  ArchiveBoxIcon,
  ArrowUpCircleIcon,
  ChevronDownIcon,
  CheckIcon,
  QrCodeIcon,
  DevicePhoneMobileIcon,
  MegaphoneIcon,
  LinkIcon,
  ArrowTopRightOnSquareIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Items', href: '/items', icon: CubeIcon },
  { name: 'Categories', href: '/categories', icon: FolderIcon },
  { name: 'Locations', href: '/locations', icon: MapPinIcon },
  { name: 'Scanner', href: '/scanner', icon: QrCodeIcon },
  { name: 'QR Codes', href: '/barcodes', icon: Squares2X2Icon },
  { name: 'Tags', href: '/tags', icon: TagIcon }
];

const adminNavigation = [
  { name: 'Users', href: '/users', icon: UsersIcon },
  { name: 'Roles', href: '/roles', icon: ShieldCheckIcon },
  { name: 'Groups', href: '/groups', icon: UserGroupIcon },
  { name: 'Templates', href: '/templates', icon: DocumentDuplicateIcon },
  { name: 'Devices', href: '/devices', icon: DevicePhoneMobileIcon },
  { name: 'Icons', href: '/icons', icon: Squares2X2Icon },
  { name: 'Announcements', href: '/announcements', icon: MegaphoneIcon },
  { name: 'Audit Log', href: '/audit', icon: ClockIcon },
  { name: 'Settings', href: '/settings', icon: WrenchScrewdriverIcon }
];

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/^[-*+]\s/gm, '')
    .replace(/^#+\s/gm, '');
}

const ANNOUNCEMENT_TYPE_META: Record<string, { icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>, color: string }> = {
  info: { icon: InformationCircleIcon, color: '#3b82f6' },
  warning: { icon: ExclamationTriangleIcon, color: '#f97316' },
  success: { icon: CheckCircleIcon, color: '#22c55e' },
  error: { icon: XCircleIcon, color: '#ef4444' },
};

function sanitizeUrl(url: string): string {
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('/')) return trimmed;
  return '#';
}

export default function Layout() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [showUpdateBanner, setShowUpdateBanner] = useState(true);
  const { user, logout, isAdmin, hasPermission } = useAuth();
  const { theme, userThemeMode, setUserThemeMode, hasVariant } = useBranding();
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  const themeDropdownRef = useRef<HTMLDivElement>(null);
  const [uiScale, setUiScale] = useState<number>(() => {
    const stored = localStorage.getItem('uiScale');
    return stored ? parseInt(stored) : 70;
  });
  const [scaleDropdownOpen, setScaleDropdownOpen] = useState(false);
  const scaleDropdownRef = useRef<HTMLDivElement>(null);
  const [avatarError, setAvatarError] = useState(false);
  const { showHelp, setShowHelp } = useKeyboardShortcuts();

  // Global search (Ctrl+K)
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [globalSearchResults, setGlobalSearchResults] = useState<any>(null);
  const globalSearchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowGlobalSearch(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (showGlobalSearch && globalSearchRef.current) {
      globalSearchRef.current.focus();
    }
  }, [showGlobalSearch]);

  useEffect(() => {
    if (!globalSearchQuery.trim() || globalSearchQuery.length < 2) {
      setGlobalSearchResults(null);
      return;
    }
    const timer = setTimeout(() => {
      itemsApi.globalSearch(globalSearchQuery).then(res => setGlobalSearchResults(res.data.data)).catch(() => {});
    }, 300);
    return () => clearTimeout(timer);
  }, [globalSearchQuery]);

  // Live clock
  const [systemTimezone, setSystemTimezone] = useState<string>('UTC');
  const [showHeaderDateTime, setShowHeaderDateTime] = useState(true);
  const formatDateTime = (tz?: string) => {
    const now = new Date();
    const opts: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: tz || systemTimezone };
    return now.toLocaleString([], opts);
  };
  const [currentTime, setCurrentTime] = useState(() => formatDateTime('UTC'));

  // Active announcements for header
  const [activeAnnouncements, setActiveAnnouncements] = useState<Announcement[]>([]);
  const [announcementScrollPaused, setAnnouncementScrollPaused] = useState(false);
  const [announcementScrollSpeed, setAnnouncementScrollSpeed] = useState(8);
  const [, setAnnouncementTextSize] = useState<'small' | 'medium' | 'large'>('small');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (themeDropdownRef.current && !themeDropdownRef.current.contains(event.target as Node)) {
        setThemeDropdownOpen(false);
      }
      if (scaleDropdownRef.current && !scaleDropdownRef.current.contains(event.target as Node)) {
        setScaleDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Apply UI scale
  useEffect(() => {
    document.documentElement.style.fontSize = `${uiScale * 16 / 100}px`;
    localStorage.setItem('uiScale', String(uiScale));
  }, [uiScale]);

  // Live clock - update every minute, restart when timezone changes
  useEffect(() => {
    setCurrentTime(formatDateTime());
    let intervalId: ReturnType<typeof setInterval>;
    const msToNextMinute = (60 - new Date().getSeconds()) * 1000;
    const timeout = setTimeout(() => {
      setCurrentTime(formatDateTime());
      intervalId = setInterval(() => setCurrentTime(formatDateTime()), 60000);
    }, msToNextMinute);
    return () => {
      clearTimeout(timeout);
      if (intervalId) clearInterval(intervalId);
    };
  }, [systemTimezone]);

  // Fetch active announcements + system timezone
  useEffect(() => {
    const fetchAnnouncements = () => {
      announcementsApi.getActive().then(res => {
        setActiveAnnouncements(res.data.data || []);
        const resp = res.data as any;
        if (resp.timezone) {
          setSystemTimezone(resp.timezone);
          setCurrentTime(formatDateTime(resp.timezone));
        }
        if (resp.showDateTime !== undefined) {
          setShowHeaderDateTime(resp.showDateTime);
        }
        if (resp.scrollSpeed !== undefined) {
          setAnnouncementScrollSpeed(resp.scrollSpeed);
        }
        if (resp.textSize) {
          setAnnouncementTextSize(resp.textSize);
        }
      }).catch(() => {});
    };
    fetchAnnouncements();
    const interval = setInterval(fetchAnnouncements, 120000);
    window.addEventListener('announcements-updated', fetchAnnouncements);
    return () => {
      clearInterval(interval);
      window.removeEventListener('announcements-updated', fetchAnnouncements);
    };
  }, []);

  // Close announcement modal on Escape + mark as read
  useEffect(() => {
    if (!selectedAnnouncement) return;
    // Fire-and-forget read tracking
    announcementsApi.markRead(selectedAnnouncement.id).catch(() => {});
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedAnnouncement(null);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [selectedAnnouncement]);

  const location = useLocation();

  // Check for updates on mount (for admins only)
  useEffect(() => {
    if (isAdmin) {
      // Check if we've already checked today
      const lastCheck = localStorage.getItem('lastUpdateCheck');
      const today = new Date().toDateString();

      if (lastCheck !== today) {
        versionApi.checkForUpdates().then((response) => {
          setUpdateInfo(response.data.data);
          localStorage.setItem('lastUpdateCheck', today);
        }).catch((err) => {
          console.error('Failed to check for updates:', err);
        });
      } else {
        // Still fetch to show version, but don't force refresh
        versionApi.checkForUpdates().then((response) => {
          setUpdateInfo(response.data.data);
        }).catch(() => {});
      }
    }
  }, [isAdmin]);

  // Get user initials - prefer firstName + lastName, fallback to username
  const getInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
    }
    if (user?.firstName) {
      return user.firstName.slice(0, 2).toUpperCase();
    }
    if (user?.username) {
      return user.username.slice(0, 2).toUpperCase();
    }
    return '?';
  };

  // Get display name - prefer full name, fallback to username
  const getDisplayName = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user?.firstName) {
      return user.firstName;
    }
    return user?.username || 'User';
  };

  // Build navigation - filter by permissions, Quarantine is visible to all users
  const filteredNavigation = navigation.filter(item =>
    !('permission' in item) || hasPermission(item.permission as string)
  );
  const quarantineNav = [{ name: 'Quarantine', href: '/quarantine', icon: ArchiveBoxIcon }];

  // Grouped navigation for section headers
  const navGroups: { label: string | null; items: typeof navigation }[] = [
    { label: null, items: filteredNavigation },
    ...(isAdmin ? [{ label: 'Admin', items: adminNavigation }] : []),
    { label: null, items: quarantineNav },
  ];

  // Select the appropriate logo/icon based on theme brightness
  const isLightTheme = theme.preset === 'light' || theme.preset === 'light-purple';

  // Custom logos (full horizontal logo with text)
  const customLogoUrl = !isLightTheme && theme.logoDark
    ? `/uploads/branding/${theme.logoDark}`
    : theme.logoLight
      ? `/uploads/branding/${theme.logoLight}`
      : null;

  // Custom icons (just the icon, no text)
  const customIconUrl = !isLightTheme && theme.iconDark
    ? `/uploads/branding/${theme.iconDark}`
    : theme.iconLight
      ? `/uploads/branding/${theme.iconLight}`
      : null;

  // Default SVG icon (reactive to theme color)
  const DefaultIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
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

  // Sidebar mode: 'icon-text' (default) | 'icon' | 'text'
  const sidebarMode = theme.sidebarMode || 'icon-text';

  // Render logo/brand based on mode and custom uploads
  const renderBrand = () => {
    // If user has custom logo uploaded, use it (for icon-text or text modes)
    if (customLogoUrl && (sidebarMode === 'icon-text' || sidebarMode === 'text')) {
      return <img src={customLogoUrl} alt={theme.appName} className="h-10 object-contain" />;
    }

    // If user has custom icon uploaded and mode is icon-only
    if (customIconUrl && sidebarMode === 'icon') {
      return <img src={customIconUrl} alt={theme.appName} className="h-8 w-8 object-contain" />;
    }

    // If user has custom icon but no logo in icon-text mode, use custom icon with text
    if (customIconUrl && sidebarMode === 'icon-text') {
      return (
        <div className="flex items-center gap-3">
          <img src={customIconUrl} alt="Logo" className="h-8 w-8 object-contain" />
          <div className="flex flex-col">
            <span className="text-[15px] font-bold leading-tight" style={{ color: 'var(--sidebar-text)' }}>
              Warehouse
            </span>
            <span className="text-[10px] font-light opacity-70" style={{ color: 'var(--sidebar-text)' }}>
              Inventory Management
            </span>
          </div>
        </div>
      );
    }

    // Default rendering based on mode
    switch (sidebarMode) {
      case 'icon':
        return <DefaultIcon className="w-8 h-8" />;

      case 'text':
        return (
          <div className="flex flex-col">
            <span className="text-[15px] font-bold leading-tight" style={{ color: 'var(--sidebar-text)' }}>
              Warehouse
            </span>
            <span className="text-[10px] font-light opacity-70" style={{ color: 'var(--sidebar-text)' }}>
              Inventory Management
            </span>
          </div>
        );

      case 'icon-text':
      default:
        return (
          <div className="flex items-center gap-3">
            <DefaultIcon className="w-8 h-8" />
            <div className="flex flex-col">
              <span className="text-[15px] font-bold leading-tight" style={{ color: 'var(--sidebar-text)' }}>
                Warehouse
              </span>
              <span className="text-[10px] font-light opacity-70" style={{ color: 'var(--sidebar-text)' }}>
                Inventory Management
              </span>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 flex flex-col transform transition-transform duration-300 lg:hidden ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{
          backgroundColor: 'var(--sidebar-bg)',
          backgroundImage:
            'linear-gradient(180deg, color-mix(in srgb, white 4%, transparent) 0%, transparent 30%), radial-gradient(ellipse 80% 40% at 0% 0%, color-mix(in srgb, var(--accent) 10%, transparent), transparent 70%)',
        }}
      >
        <div
          className="flex items-center justify-between h-16 px-6 border-b"
          style={{ borderColor: 'color-mix(in srgb, var(--sidebar-border) 70%, transparent)' }}
        >
          {renderBrand()}
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 rounded-xl transition-colors hover:opacity-80"
            style={{ color: 'var(--sidebar-text)' }}
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 min-h-0 p-4 space-y-1 overflow-y-auto">
          {navGroups.map((group, gi) => (
            <div key={gi}>
              {group.label && (
                <div
                  className="px-4 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--sidebar-text)', opacity: 0.4 }}
                >
                  {group.label}
                </div>
              )}
              {group.items.map((item) => {
                const isActive = location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href + '/'));
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className="relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200"
                    style={{
                      backgroundColor: isActive ? 'color-mix(in srgb, var(--accent) 15%, transparent)' : 'transparent',
                      color: isActive ? 'var(--accent)' : 'var(--sidebar-text)',
                      boxShadow: isActive
                        ? 'inset 0 0 0 1px color-mix(in srgb, var(--accent) 20%, transparent), 0 4px 12px -4px var(--accent-glow)'
                        : 'none',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.backgroundColor = 'var(--sidebar-active)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    {isActive && (
                      <span
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full"
                        style={{ backgroundColor: 'var(--accent)' }}
                      />
                    )}
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72 lg:flex-col">
        <div
          className="flex flex-col flex-1 min-h-0 border-r"
          style={{
            backgroundColor: 'var(--sidebar-bg)',
            backgroundImage:
              'linear-gradient(180deg, color-mix(in srgb, white 4%, transparent) 0%, transparent 30%), radial-gradient(ellipse 80% 40% at 0% 0%, color-mix(in srgb, var(--accent) 10%, transparent), transparent 70%)',
            borderColor: 'color-mix(in srgb, var(--sidebar-border) 70%, transparent)',
          }}
        >
          <div
            className="flex items-center h-16 px-6 border-b"
            style={{ borderColor: 'color-mix(in srgb, var(--sidebar-border) 70%, transparent)' }}
          >
            {renderBrand()}
          </div>
          <nav className="flex-1 min-h-0 p-4 space-y-1 overflow-y-auto">
            {navGroups.map((group, gi) => (
              <div key={gi}>
                {group.label && (
                  <div
                    className="px-4 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--sidebar-text)', opacity: 0.4 }}
                  >
                    {group.label}
                  </div>
                )}
                {group.items.map((item) => {
                  const isActive = location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href + '/'));
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className="relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200"
                      style={{
                        backgroundColor: isActive ? 'color-mix(in srgb, var(--accent) 15%, transparent)' : 'transparent',
                        color: isActive ? 'var(--accent)' : 'var(--sidebar-text)',
                        boxShadow: isActive
                          ? 'inset 0 0 0 1px color-mix(in srgb, var(--accent) 20%, transparent), 0 4px 12px -4px var(--accent-glow)'
                          : 'none',
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) e.currentTarget.style.backgroundColor = 'var(--sidebar-active)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      {isActive && (
                        <span
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full"
                          style={{ backgroundColor: 'var(--accent)' }}
                        />
                      )}
                      <item.icon className="w-5 h-5" />
                      <span className="font-medium">{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* User info & version at bottom of sidebar */}
          <div className="px-3 py-3 border-t" style={{ borderColor: 'color-mix(in srgb, var(--sidebar-border) 70%, transparent)' }}>
            <Link
              to="/profile"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200"
              style={{ color: 'var(--sidebar-text)', backgroundColor: 'color-mix(in srgb, var(--sidebar-active) 50%, transparent)' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--sidebar-active)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--sidebar-active) 50%, transparent)'}
            >
              {user?.avatarPath && !avatarError ? (
                <img src={`/uploads/${user.avatarPath}`} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" onError={() => setAvatarError(true)} />
              ) : (
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ backgroundColor: 'var(--accent)' }}
                >
                  {getInitials()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium truncate" style={{ color: 'var(--sidebar-text)' }}>{getDisplayName()}</span>
                  {user?.isLdap && (
                    <span
                      className="px-1 py-px text-[7px] font-bold rounded leading-tight shrink-0"
                      style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 20%, transparent)', color: 'var(--accent)' }}
                    >
                      LDAP
                    </span>
                  )}
                </div>
                {user?.role?.name && (
                  <span className="text-[10px] opacity-60" style={{ color: 'var(--sidebar-text)' }}>{user.role.name}</span>
                )}
              </div>
              <Cog6ToothIcon className="w-4 h-4 opacity-40 shrink-0" style={{ color: 'var(--sidebar-text)' }} />
            </Link>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Top header */}
        <header
          className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 backdrop-blur-md border-b lg:px-8"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--bg-secondary) 80%, transparent)',
            borderColor: 'var(--bg-tertiary)',
          }}
        >
          {/* Left half: hamburger (mobile) + clock + announcements */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-xl lg:hidden shrink-0"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <Bars3Icon className="w-5 h-5" />
            </button>

            {/* Clock */}
            {showHeaderDateTime && (
              <div
                className="hidden sm:flex items-center gap-2 text-sm font-medium shrink-0"
                style={{ color: 'var(--text-secondary)' }}
              >
                <ClockIcon className="w-4 h-4" />
                <span>{currentTime}</span>
              </div>
            )}

            {/* Announcements ticker */}
            {activeAnnouncements.length > 0 && (() => {
              const pinnedAnnouncements = activeAnnouncements.filter(a => a.isPinned);
              const scrollingAnnouncements = activeAnnouncements.filter(a => !a.isPinned);
              const handleDismiss = (e: React.MouseEvent, a: Announcement) => {
                e.stopPropagation();
                announcementsApi.dismiss(a.id).then(() => {
                  setActiveAnnouncements(prev => prev.filter(x => x.id !== a.id));
                }).catch(() => { toast.error('Failed to dismiss announcement'); });
              };
              const renderCard = (a: Announcement, i: number, prefix: string) => {
                const accentColor = a.color || '#3b82f6';
                const itemImage = a.useLinkedItemImage && a.linkedItem?.images?.[0]?.filename;
                return (
                  <button
                    key={`${prefix}-${a.id}-${i}`}
                    className="flex items-start gap-2.5 px-3 py-2 rounded-xl shrink-0 cursor-pointer transition-all hover:opacity-90"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${accentColor} 8%, var(--bg-secondary))`,
                      border: `1px solid color-mix(in srgb, ${accentColor} 20%, transparent)`,
                      borderLeft: `3px solid ${accentColor}`,
                      maxWidth: '280px',
                    }}
                    title={`${a.title}: ${a.message}`}
                    onClick={() => setSelectedAnnouncement(a)}
                  >
                    {itemImage ? (
                      <img
                        src={`/uploads/${itemImage}`}
                        alt=""
                        className="w-7 h-7 rounded-lg object-cover shrink-0 mt-0.5"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); }}
                      />
                    ) : null}
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${itemImage ? 'hidden' : ''}`}
                      style={{ backgroundColor: `color-mix(in srgb, ${accentColor} 18%, transparent)` }}
                    >
                      {a.icon ? (
                        <IconDisplay icon={a.icon} size={14} color={accentColor} />
                      ) : (() => {
                        const typeMeta = ANNOUNCEMENT_TYPE_META[a.type || 'info'];
                        const TypeIcon = typeMeta?.icon || MegaphoneIcon;
                        return <TypeIcon className="w-3.5 h-3.5" style={{ color: accentColor }} />;
                      })()}
                    </div>
                    <div className="flex flex-col items-start min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 w-full">
                        {a.isPinned && <MapPinIcon className="w-3 h-3 shrink-0" style={{ color: accentColor }} />}
                        {a.type && a.type !== 'info' && (() => {
                          const typeMeta = ANNOUNCEMENT_TYPE_META[a.type];
                          if (!typeMeta) return null;
                          return <span className="text-[9px] font-bold uppercase px-1 py-px rounded shrink-0" style={{ backgroundColor: `color-mix(in srgb, ${typeMeta.color} 18%, transparent)`, color: typeMeta.color }}>{a.type}</span>;
                        })()}
                        <span className="text-xs font-semibold truncate" style={{ color: accentColor }}>{a.title}</span>
                        {(a.linkedItem || a.actionUrl) && <LinkIcon className="w-2.5 h-2.5 shrink-0 opacity-50" style={{ color: accentColor }} />}
                      </div>
                      <span className="text-[11px] leading-tight truncate w-full text-left" style={{ color: 'var(--text-secondary)' }}>
                        {stripMarkdown(a.message)}
                      </span>
                    </div>
                    {a.dismissType && a.dismissType !== 'none' && (
                      <span
                        className="p-0.5 rounded-full shrink-0 transition-colors hover:opacity-100 opacity-40 mt-0.5"
                        onClick={(e) => handleDismiss(e, a)}
                        title="Dismiss"
                      >
                        <XMarkIcon className="w-3 h-3" style={{ color: accentColor }} />
                      </span>
                    )}
                  </button>
                );
              };
              const mobileAnnouncement = pinnedAnnouncements[0] || scrollingAnnouncements[0];
              const mobileAccent = mobileAnnouncement?.color || '#3b82f6';
              return (
                <>
                  {/* Mobile: single announcement banner */}
                  {mobileAnnouncement && (
                    <button
                      className="sm:hidden flex items-center gap-2 px-2.5 py-1.5 rounded-lg min-w-0 flex-1"
                      style={{
                        backgroundColor: `color-mix(in srgb, ${mobileAccent} 8%, var(--bg-secondary))`,
                        border: `1px solid color-mix(in srgb, ${mobileAccent} 20%, transparent)`,
                      }}
                      onClick={() => setSelectedAnnouncement(mobileAnnouncement)}
                    >
                      {(() => {
                        const typeMeta = ANNOUNCEMENT_TYPE_META[mobileAnnouncement.type || 'info'];
                        const TypeIcon = typeMeta?.icon || MegaphoneIcon;
                        return <TypeIcon className="w-4 h-4 shrink-0" style={{ color: mobileAccent }} />;
                      })()}
                      <span className="text-xs font-medium truncate" style={{ color: mobileAccent }}>
                        {mobileAnnouncement.title}
                      </span>
                      {activeAnnouncements.length > 1 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0" style={{ backgroundColor: `color-mix(in srgb, ${mobileAccent} 15%, transparent)`, color: mobileAccent }}>
                          +{activeAnnouncements.length - 1}
                        </span>
                      )}
                    </button>
                  )}
                  {/* Desktop: divider */}
                  <div className="hidden sm:block w-px h-5 shrink-0" style={{ backgroundColor: 'var(--bg-tertiary)' }} />
                  {/* Pinned announcements (static) */}
                  {pinnedAnnouncements.length > 0 && (
                    <div className="hidden sm:flex items-center gap-2 shrink-0">
                      {pinnedAnnouncements.map((a, i) => renderCard(a, i, 'pin'))}
                    </div>
                  )}
                  {/* Scrolling announcements */}
                  {scrollingAnnouncements.length > 0 && (
                    <div
                      className="hidden sm:block min-w-0 flex-1 overflow-hidden"
                      onMouseEnter={() => setAnnouncementScrollPaused(true)}
                      onMouseLeave={() => setAnnouncementScrollPaused(false)}
                    >
                      <div
                        className="flex items-center gap-2 w-max"
                        style={{
                          animation: scrollingAnnouncements.length > 1
                            ? `announcementScroll ${scrollingAnnouncements.length * announcementScrollSpeed}s linear infinite`
                            : 'none',
                          animationPlayState: announcementScrollPaused ? 'paused' : 'running',
                        }}
                      >
                        {[...scrollingAnnouncements, ...(scrollingAnnouncements.length > 1 ? scrollingAnnouncements : [])].map((a, i) => renderCard(a, i, 'scroll'))}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          {/* Right half: theme, zoom, profile, logout */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Theme Dropdown - only show if theme has a variant */}
            {hasVariant && (
              <div className="relative" ref={themeDropdownRef}>
                <button
                  onClick={() => { setThemeDropdownOpen(!themeDropdownOpen); setScaleDropdownOpen(false); }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  {userThemeMode === 'system' ? (
                    <ComputerDesktopIcon className="w-5 h-5" />
                  ) : userThemeMode === 'light' ? (
                    <SunIcon className="w-5 h-5" />
                  ) : (
                    <MoonIcon className="w-5 h-5" />
                  )}
                  <ChevronDownIcon className={`w-4 h-4 transition-transform ${themeDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {themeDropdownOpen && (
                  <div
                    className="absolute right-0 mt-2 w-44 rounded-xl shadow-lg z-50 py-1 border"
                    style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--bg-tertiary)' }}
                  >
                    <button
                      onClick={() => { setUserThemeMode('system'); setThemeDropdownOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover-bg"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      <ComputerDesktopIcon className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
                      <span className="flex-1 text-left">System</span>
                      {userThemeMode === 'system' && <CheckIcon className="w-4 h-4" style={{ color: 'var(--accent)' }} />}
                    </button>
                    <button
                      onClick={() => { setUserThemeMode('light'); setThemeDropdownOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover-bg"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      <SunIcon className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
                      <span className="flex-1 text-left">Light</span>
                      {userThemeMode === 'light' && <CheckIcon className="w-4 h-4" style={{ color: 'var(--accent)' }} />}
                    </button>
                    <button
                      onClick={() => { setUserThemeMode('dark'); setThemeDropdownOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover-bg"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      <MoonIcon className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
                      <span className="flex-1 text-left">Dark</span>
                      {userThemeMode === 'dark' && <CheckIcon className="w-4 h-4" style={{ color: 'var(--accent)' }} />}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* UI Zoom Dropdown */}
            <div className="relative" ref={scaleDropdownRef}>
              <button
                onClick={() => { setScaleDropdownOpen(!scaleDropdownOpen); setThemeDropdownOpen(false); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl transition-colors text-sm font-medium"
                style={{ color: 'var(--text-secondary)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                title="UI Zoom"
              >
                <span>{uiScale}%</span>
                <ChevronDownIcon className={`w-4 h-4 transition-transform ${scaleDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {scaleDropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-36 rounded-xl shadow-lg z-50 py-1 border"
                  style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--bg-tertiary)' }}
                >
                  {[40, 50, 60, 70, 75, 80, 85, 90, 95, 100].map((scale) => (
                    <button
                      key={scale}
                      onClick={() => { setUiScale(scale); setScaleDropdownOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover-bg"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      <span className="flex-1 text-left">{scale}%</span>
                      {uiScale === scale && <CheckIcon className="w-4 h-4" style={{ color: 'var(--accent)' }} />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <ArrowRightOnRectangleIcon className="w-5 h-5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Update banner */}
        {isAdmin && updateInfo?.updateAvailable && showUpdateBanner && (
          <div
            className="mx-4 mt-4 lg:mx-8 lg:mt-6 p-3 rounded-lg flex items-center justify-between"
            style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 15%, transparent)' }}
          >
            <div className="flex items-center gap-3">
              <ArrowUpCircleIcon className="w-5 h-5" style={{ color: 'var(--accent)' }} />
              <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                <strong>Update available:</strong> v{updateInfo.latestVersion} is now available.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={updateInfo.releaseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium px-3 py-1 rounded-md"
                style={{ backgroundColor: 'var(--accent)', color: 'white' }}
              >
                View Release
              </a>
              <button
                onClick={() => setShowUpdateBanner(false)}
                className="p-1 rounded hover:opacity-70"
                style={{ color: 'var(--text-secondary)' }}
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Page content */}
        <main className="p-4 lg:p-8">
          <Outlet />
        </main>
      </div>

      {/* Keyboard Shortcuts Modal */}
      {showHelp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={() => setShowHelp(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl shadow-xl p-6"
            style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--bg-tertiary)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Keyboard Shortcuts</h2>
              <button onClick={() => setShowHelp(false)} className="p-1 rounded-lg" style={{ color: 'var(--text-secondary)' }}>
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2">
              {SHORTCUTS.map((s) => (
                <div key={s.key} className="flex items-center justify-between py-2">
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{s.description}</span>
                  <kbd
                    className="px-2 py-1 text-xs font-mono rounded"
                    style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--bg-tertiary)' }}
                  >
                    {s.label}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Global Search Modal (Ctrl+K) */}
      {showGlobalSearch && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={() => { setShowGlobalSearch(false); setGlobalSearchQuery(''); setGlobalSearchResults(null); }}
        >
          <div
            className="w-full max-w-lg rounded-xl shadow-xl overflow-hidden"
            style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--bg-tertiary)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b" style={{ borderColor: 'var(--bg-tertiary)' }}>
              <input
                ref={globalSearchRef}
                type="text"
                value={globalSearchQuery}
                onChange={(e) => setGlobalSearchQuery(e.target.value)}
                placeholder="Search items, categories, locations, tags..."
                className="w-full bg-transparent text-base outline-none"
                style={{ color: 'var(--text-primary)' }}
                onKeyDown={(e) => { if (e.key === 'Escape') { setShowGlobalSearch(false); setGlobalSearchQuery(''); setGlobalSearchResults(null); } }}
              />
            </div>
            {globalSearchResults && (
              <div className="max-h-80 overflow-y-auto p-2">
                {Object.entries(globalSearchResults).map(([type, results]: [string, any]) =>
                  results.length > 0 && (
                    <div key={type} className="mb-2">
                      <p className="text-xs font-medium uppercase px-3 py-1" style={{ color: 'var(--text-secondary)' }}>{type}</p>
                      {results.map((r: any) => (
                        <Link
                          key={r.id}
                          to={type === 'items' ? `/items/${r.id}` : type === 'categories' ? `/categories` : type === 'locations' ? `/locations` : `/tags`}
                          className="block px-3 py-2 rounded-lg text-sm hover:opacity-80"
                          style={{ color: 'var(--text-primary)' }}
                          onClick={() => { setShowGlobalSearch(false); setGlobalSearchQuery(''); setGlobalSearchResults(null); }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <span className="font-medium">{r.name}</span>
                          {r.sku && <span className="ml-2 opacity-60">({r.sku})</span>}
                          {r.type && <span className="ml-2 opacity-60">{r.type}</span>}
                        </Link>
                      ))}
                    </div>
                  )
                )}
                {Object.values(globalSearchResults).every((r: any) => r.length === 0) && (
                  <p className="text-center py-6 text-sm" style={{ color: 'var(--text-secondary)' }}>No results found</p>
                )}
              </div>
            )}
            {!globalSearchResults && (
              <div className="p-4 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
                Type at least 2 characters to search
              </div>
            )}
          </div>
        </div>
      )}

      {/* Announcement Detail Modal */}
      {selectedAnnouncement && (() => {
        const accentColor = selectedAnnouncement.color || '#3b82f6';
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
            onClick={() => setSelectedAnnouncement(null)}
          >
            <div
              className="w-full max-w-md rounded-xl shadow-xl p-6"
              style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--bg-tertiary)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                {selectedAnnouncement.useLinkedItemImage && selectedAnnouncement.linkedItem?.images?.[0]?.filename ? (
                  <img
                    src={`/uploads/${selectedAnnouncement.linkedItem.images[0].filename}`}
                    alt=""
                    className="w-10 h-10 rounded-lg object-cover shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); }}
                  />
                ) : null}
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${selectedAnnouncement.useLinkedItemImage && selectedAnnouncement.linkedItem?.images?.[0]?.filename ? 'hidden' : ''}`}
                  style={{ backgroundColor: `color-mix(in srgb, ${accentColor} 20%, transparent)` }}
                >
                  {selectedAnnouncement.icon ? (
                    <IconDisplay icon={selectedAnnouncement.icon} size={20} color={accentColor} />
                  ) : (() => {
                    const typeMeta = ANNOUNCEMENT_TYPE_META[selectedAnnouncement.type || 'info'];
                    const TypeIcon = typeMeta?.icon || MegaphoneIcon;
                    return <TypeIcon className="w-5 h-5" style={{ color: accentColor }} />;
                  })()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold" style={{ color: accentColor }}>
                      {selectedAnnouncement.title}
                    </h3>
                    {selectedAnnouncement.type && selectedAnnouncement.type !== 'info' && (() => {
                      const typeMeta = ANNOUNCEMENT_TYPE_META[selectedAnnouncement.type];
                      if (!typeMeta) return null;
                      const TypeIcon = typeMeta.icon;
                      return <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0" style={{ backgroundColor: `color-mix(in srgb, ${typeMeta.color} 15%, transparent)`, color: typeMeta.color }}><TypeIcon className="w-3 h-3" />{selectedAnnouncement.type}</span>;
                    })()}
                    {selectedAnnouncement.isPinned && <MapPinIcon className="w-4 h-4 shrink-0" style={{ color: '#f59e0b' }} />}
                  </div>
                  {selectedAnnouncement.createdAt && (
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {new Date(selectedAnnouncement.createdAt).toLocaleDateString(undefined, {
                        month: 'short', day: 'numeric', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setSelectedAnnouncement(null)}
                  className="p-1 rounded-lg transition-colors shrink-0"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Message body with markdown */}
              <div
                className="text-sm leading-relaxed whitespace-pre-wrap prose prose-sm max-w-none"
                style={{ color: 'var(--text-primary)' }}
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(
                    selectedAnnouncement.message
                      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                      .replace(/\*(.*?)\*/g, '<em>$1</em>')
                      .replace(/\[(.*?)\]\((.*?)\)/g, (_match: string, text: string, url: string) => `<a href="${sanitizeUrl(url)}" target="_blank" rel="noopener noreferrer" style="color: var(--accent); text-decoration: underline;">${text}</a>`)
                      .replace(/^[-*+]\s(.+)/gm, '<li style="margin-left: 1rem;">$1</li>')
                      .replace(/^###\s(.+)/gm, '<h4 style="font-weight: 600; margin-top: 0.5rem;">$1</h4>')
                      .replace(/^##\s(.+)/gm, '<h3 style="font-weight: 600; margin-top: 0.5rem;">$1</h3>')
                      .replace(/^#\s(.+)/gm, '<h2 style="font-weight: 700; margin-top: 0.5rem;">$1</h2>'),
                    { ALLOWED_TAGS: ['strong', 'em', 'a', 'li', 'h2', 'h3', 'h4', 'br', 'span'], ALLOWED_ATTR: ['href', 'target', 'rel', 'style'] }
                  )
                }}
              />

              {/* Linked Item Card */}
              {selectedAnnouncement.linkedItem && (() => {
                const item = selectedAnnouncement.linkedItem!;
                const itemImage = item.images?.[0]?.filename;
                const isLowStock = item.quantity !== undefined && item.minQuantity !== undefined && item.quantity <= item.minQuantity;
                return (
                  <button
                    className="mt-4 w-full flex items-start gap-3 p-3 rounded-xl transition-colors text-left"
                    style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--bg-tertiary)' }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = accentColor}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--bg-tertiary)'}
                    onClick={() => {
                      navigate(`/items/${item.id}`);
                      setSelectedAnnouncement(null);
                    }}
                  >
                    {itemImage ? (
                      <img
                        src={`/uploads/${itemImage}`}
                        alt={item.name}
                        className="w-14 h-14 rounded-lg object-cover shrink-0"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); }}
                      />
                    ) : null}
                    <div className={`w-14 h-14 rounded-lg flex items-center justify-center shrink-0 ${itemImage ? 'hidden' : ''}`} style={{ backgroundColor: `color-mix(in srgb, ${accentColor} 15%, transparent)` }}>
                      {item.template?.icon ? (
                        <IconDisplay icon={item.template.icon} size={24} color={item.template.iconColor || accentColor} />
                      ) : item.category?.icon ? (
                        <IconDisplay icon={item.category.icon} size={24} color={item.category.iconColor || accentColor} />
                      ) : (
                        <LinkIcon className="w-6 h-6" style={{ color: accentColor }} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{item.name}</p>
                        <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5 shrink-0 opacity-50" style={{ color: 'var(--text-secondary)' }} />
                      </div>
                      {/* SKU + Quantity */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                        {item.sku && (
                          <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                            {item.sku}
                          </span>
                        )}
                        {item.quantity !== undefined && (
                          <span className={`text-xs font-medium ${isLowStock ? '' : ''}`} style={{ color: isLowStock ? '#ef4444' : 'var(--text-secondary)' }}>
                            Qty: {item.quantity}{item.minQuantity ? ` / ${item.minQuantity} min` : ''}
                          </span>
                        )}
                      </div>
                      {/* Category + Location */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        {item.category && (
                          <span className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-md" style={{ backgroundColor: item.category.iconBackgroundColor ? `color-mix(in srgb, ${item.category.iconBackgroundColor} 20%, transparent)` : 'var(--bg-tertiary)', color: item.category.iconColor || 'var(--text-secondary)' }}>
                            {item.category.icon && <IconDisplay icon={item.category.icon} size={11} color={item.category.iconColor || 'var(--text-secondary)'} />}
                            {item.category.name}
                          </span>
                        )}
                        {item.location && (
                          <span className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-md" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                            <MapPinIcon className="w-3 h-3" />
                            {item.location.name}
                          </span>
                        )}
                      </div>
                      {/* Tags */}
                      {item.tags && item.tags.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1 mt-1.5">
                          {item.tags.map(({ tag }) => (
                            <span
                              key={tag.id}
                              className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full"
                              style={{ backgroundColor: `color-mix(in srgb, ${tag.color} 18%, transparent)`, color: tag.color }}
                            >
                              {tag.icon && <IconDisplay icon={tag.icon} size={10} color={tag.iconColor || tag.color} />}
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })()}

              {/* Action URL */}
              {selectedAnnouncement.actionUrl && (
                <a
                  href={selectedAnnouncement.actionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
                  style={{ backgroundColor: accentColor, color: '#fff' }}
                >
                  <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                  Open Link
                </a>
              )}

              {/* Footer buttons */}
              <div className="flex justify-end gap-3 mt-6">
                {selectedAnnouncement.dismissType && selectedAnnouncement.dismissType !== 'none' && (
                  <button
                    onClick={() => {
                      announcementsApi.dismiss(selectedAnnouncement.id).then(() => {
                        setActiveAnnouncements(prev => prev.filter(x => x.id !== selectedAnnouncement.id));
                      }).catch(() => { toast.error('Failed to dismiss announcement'); });
                      setSelectedAnnouncement(null);
                    }}
                    className="btn btn-secondary px-4 py-2"
                    style={{ color: '#ef4444' }}
                  >
                    Dismiss
                  </button>
                )}
                <button
                  onClick={() => setSelectedAnnouncement(null)}
                  className="btn btn-secondary px-4 py-2"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
