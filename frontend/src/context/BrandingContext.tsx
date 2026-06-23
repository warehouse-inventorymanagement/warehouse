import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { settingsApi } from '../services/api';

// Theme preset type
export interface ThemePreset {
  name: string;
  accent: string;
  accentHover: string;
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;
  textPrimary: string;
  textSecondary: string;
  sidebarBg: string;
  sidebarText: string;
  sidebarBorder: string;
}

// Unified theme presets - each defines complete visual appearance
export const themePresets: Record<string, ThemePreset> = {
  // Dark Themes
  'default-dark': {
    name: 'Midnight Blue',
    accent: '#3b82f6',
    accentHover: '#2563eb',
    bgPrimary: '#0f172a',
    bgSecondary: '#1e293b',
    bgTertiary: '#334155',
    textPrimary: '#f1f5f9',
    textSecondary: '#94a3b8',
    sidebarBg: '#111827',
    sidebarText: '#d1d5db',
    sidebarBorder: '#1f2937',
  },
  'purple-night': {
    name: 'Purple Night',
    accent: '#8b5cf6',
    accentHover: '#7c3aed',
    bgPrimary: '#0f0f1a',
    bgSecondary: '#1a1a2e',
    bgTertiary: '#2d2d44',
    textPrimary: '#f1f5f9',
    textSecondary: '#a5a5c0',
    sidebarBg: '#1e1b4b',
    sidebarText: '#c4b5fd',
    sidebarBorder: '#312e81',
  },
  'emerald-dark': {
    name: 'Emerald Night',
    accent: '#10b981',
    accentHover: '#059669',
    bgPrimary: '#0f1f1a',
    bgSecondary: '#1a2f28',
    bgTertiary: '#2d4a40',
    textPrimary: '#f1f5f9',
    textSecondary: '#94a3b8',
    sidebarBg: '#064e3b',
    sidebarText: '#a7f3d0',
    sidebarBorder: '#065f46',
  },
  'rose-dark': {
    name: 'Rose Quartz',
    accent: '#f43f5e',
    accentHover: '#e11d48',
    bgPrimary: '#1a0a0f',
    bgSecondary: '#2d1219',
    bgTertiary: '#4a1d28',
    textPrimary: '#fdf2f4',
    textSecondary: '#fda4af',
    sidebarBg: '#4c0519',
    sidebarText: '#fecdd3',
    sidebarBorder: '#881337',
  },
  'amber-dark': {
    name: 'Golden Hour',
    accent: '#f59e0b',
    accentHover: '#d97706',
    bgPrimary: '#1a150a',
    bgSecondary: '#2d2412',
    bgTertiary: '#4a3b1d',
    textPrimary: '#fefce8',
    textSecondary: '#fde68a',
    sidebarBg: '#451a03',
    sidebarText: '#fcd34d',
    sidebarBorder: '#78350f',
  },
  'cyan-dark': {
    name: 'Ocean Deep',
    accent: '#06b6d4',
    accentHover: '#0891b2',
    bgPrimary: '#0a1a1d',
    bgSecondary: '#122a2f',
    bgTertiary: '#1d4046',
    textPrimary: '#ecfeff',
    textSecondary: '#a5f3fc',
    sidebarBg: '#083344',
    sidebarText: '#67e8f9',
    sidebarBorder: '#155e75',
  },
  'slate-dark': {
    name: 'Charcoal',
    accent: '#64748b',
    accentHover: '#475569',
    bgPrimary: '#0f0f0f',
    bgSecondary: '#1a1a1a',
    bgTertiary: '#2a2a2a',
    textPrimary: '#fafafa',
    textSecondary: '#a3a3a3',
    sidebarBg: '#171717',
    sidebarText: '#d4d4d4',
    sidebarBorder: '#262626',
  },
  'indigo-dark': {
    name: 'Nebula',
    accent: '#6366f1',
    accentHover: '#4f46e5',
    bgPrimary: '#0c0c1d',
    bgSecondary: '#161632',
    bgTertiary: '#252550',
    textPrimary: '#eef2ff',
    textSecondary: '#a5b4fc',
    sidebarBg: '#1e1b4b',
    sidebarText: '#c7d2fe',
    sidebarBorder: '#3730a3',
  },
  // Light Themes
  'light': {
    name: 'Clean Light',
    accent: '#3b82f6',
    accentHover: '#2563eb',
    bgPrimary: '#f8fafc',
    bgSecondary: '#ffffff',
    bgTertiary: '#e2e8f0',
    textPrimary: '#1e293b',
    textSecondary: '#64748b',
    sidebarBg: '#1e293b',
    sidebarText: '#e2e8f0',
    sidebarBorder: '#334155',
  },
  'light-purple': {
    name: 'Lavender',
    accent: '#8b5cf6',
    accentHover: '#7c3aed',
    bgPrimary: '#faf5ff',
    bgSecondary: '#ffffff',
    bgTertiary: '#ede9fe',
    textPrimary: '#1e1b4b',
    textSecondary: '#6b7280',
    sidebarBg: '#4c1d95',
    sidebarText: '#e9d5ff',
    sidebarBorder: '#5b21b6',
  },
  'light-emerald': {
    name: 'Mint Fresh',
    accent: '#10b981',
    accentHover: '#059669',
    bgPrimary: '#f0fdf4',
    bgSecondary: '#ffffff',
    bgTertiary: '#dcfce7',
    textPrimary: '#14532d',
    textSecondary: '#4b5563',
    sidebarBg: '#064e3b',
    sidebarText: '#a7f3d0',
    sidebarBorder: '#065f46',
  },
  'light-rose': {
    name: 'Blush',
    accent: '#f43f5e',
    accentHover: '#e11d48',
    bgPrimary: '#fff1f2',
    bgSecondary: '#ffffff',
    bgTertiary: '#fecdd3',
    textPrimary: '#4c0519',
    textSecondary: '#6b7280',
    sidebarBg: '#9f1239',
    sidebarText: '#fecdd3',
    sidebarBorder: '#be123c',
  },
};

// Custom preset type (user-saved presets)
export interface CustomPreset extends ThemePreset {
  id: string;
}

export type ThemePresetKey = keyof typeof themePresets | 'custom' | string;
export type BorderRadius = 'sharp' | 'rounded' | 'pill';
export type ThemeMode = 'light' | 'dark' | 'system';

// Mapping between dark and light theme variants (direct mappings)
const themeVariantMap: Record<string, string> = {
  'default-dark': 'light',
  'light': 'default-dark',
  'purple-night': 'light-purple',
  'light-purple': 'purple-night',
  'emerald-dark': 'light-emerald',
  'light-emerald': 'emerald-dark',
  'rose-dark': 'light-rose',
  'light-rose': 'rose-dark',
  // Map other dark themes to generic light
  'amber-dark': 'light',
  'cyan-dark': 'light',
  'slate-dark': 'light',
  'indigo-dark': 'light',
};

// Determine if a preset is dark or light
export function isLightPreset(presetKey: string): boolean {
  return presetKey.startsWith('light');
}

export interface ThemeSettings {
  // Core colors
  accent: string;
  accentHover: string;
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;
  textPrimary: string;
  textSecondary: string;
  sidebarBg: string;
  sidebarText: string;
  sidebarBorder: string;
  // UI settings
  radius: BorderRadius;
  glassy: boolean;
  glassBlur: number; // 0, 4, 8, 12, 16
  glassOpacity: number; // 60, 70, 80, 85, 90, 95
  // Theme preset
  preset: ThemePresetKey;
  // Custom presets
  customPresets: CustomPreset[];
  // Branding
  appName: string;
  sidebarMode: 'icon-text' | 'icon' | 'text';
  logoLight: string;
  logoDark: string;
  iconLight: string;
  iconDark: string;
  favicon: string;
}

interface BrandingContextType {
  theme: ThemeSettings;
  loading: boolean;
  refetch: () => Promise<void>;
  setPreview: (preview: Partial<ThemeSettings>) => void;
  // User theme mode toggle
  userThemeMode: ThemeMode;
  setUserThemeMode: (mode: ThemeMode) => void;
  toggleThemeMode: () => void;
  hasVariant: boolean;
}

const defaultTheme: ThemeSettings = {
  ...themePresets['default-dark'],
  preset: 'default-dark',
  radius: 'rounded',
  glassy: true,
  glassBlur: 12,
  glassOpacity: 85,
  customPresets: [],
  appName: 'Warehouse - Inventory Management',
  sidebarMode: 'icon-text',
  logoLight: '',
  logoDark: '',
  iconLight: '',
  iconDark: '',
  favicon: '',
};

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

// Apply theme to CSS variables
export function applyTheme(theme: ThemeSettings) {
  const root = document.documentElement;

  // Core colors
  root.style.setProperty('--accent', theme.accent);
  root.style.setProperty('--accent-hover', theme.accentHover);
  root.style.setProperty('--bg-primary', theme.bgPrimary);
  root.style.setProperty('--bg-secondary', theme.bgSecondary);
  root.style.setProperty('--bg-tertiary', theme.bgTertiary);
  root.style.setProperty('--text-primary', theme.textPrimary);
  root.style.setProperty('--text-secondary', theme.textSecondary);
  root.style.setProperty('--sidebar-bg', theme.sidebarBg);
  root.style.setProperty('--sidebar-text', theme.sidebarText);
  root.style.setProperty('--sidebar-border', theme.sidebarBorder);

  // Toggle Tailwind dark mode class based on theme
  // For custom themes, detect based on background color luminance
  let isLight = isLightPreset(theme.preset);
  if (theme.preset === 'custom' || theme.preset.startsWith('custom-')) {
    // Check if bgPrimary is light or dark by parsing the color
    const hex = theme.bgPrimary.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    isLight = luminance > 0.5;
  }
  if (isLight) {
    root.classList.remove('dark');
  } else {
    root.classList.add('dark');
  }

  // Border radius
  root.setAttribute('data-radius', theme.radius);

  // Glassy effect
  root.setAttribute('data-glassy', theme.glassy ? 'true' : 'false');
  root.style.setProperty('--glass-blur', `${theme.glassBlur || 12}px`);
  root.style.setProperty('--glass-opacity', `${theme.glassOpacity || 85}%`);

  // Update favicon - use custom if set, otherwise use default SVG
  const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement || document.createElement('link');
  link.rel = 'icon';
  if (theme.favicon) {
    // Custom favicon uploaded
    link.type = theme.favicon.endsWith('.svg') ? 'image/svg+xml' : 'image/x-icon';
    link.href = `/uploads/branding/${theme.favicon}`;
  } else {
    // Default SVG favicon (reactive to theme color)
    const svgFavicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${theme.accent}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;
    link.type = 'image/svg+xml';
    link.href = `data:image/svg+xml,${encodeURIComponent(svgFavicon)}`;
  }
  document.getElementsByTagName('head')[0].appendChild(link);

  // Update document title
  document.title = theme.appName || 'Warehouse - Inventory Management';
}

// Get system preference
const getSystemPreference = (): 'light' | 'dark' => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark';
};

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeSettings>(defaultTheme);
  const [adminTheme, setAdminTheme] = useState<ThemeSettings>(defaultTheme); // Store original admin theme
  const [loading, setLoading] = useState(true);
  const [userThemeMode, setUserThemeMode] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem('userThemeMode');
    return (stored === 'light' || stored === 'dark' || stored === 'system') ? stored : 'system';
  });

  // Get effective mode (resolves 'system' to actual light/dark)
  const getEffectiveMode = (mode: ThemeMode): 'light' | 'dark' => {
    if (mode === 'system') {
      return getSystemPreference();
    }
    return mode;
  };

  const fetchBranding = async () => {
    try {
      const response = await settingsApi.getBrandingPublic();
      const data = response.data.data;

      // Get preset or use default
      const presetKey = (data['branding.preset'] as ThemePresetKey) || 'default-dark';
      const preset = presetKey !== 'custom' && themePresets[presetKey]
        ? themePresets[presetKey]
        : themePresets['default-dark'];

      // Parse custom presets from JSON
      let customPresets: CustomPreset[] = [];
      try {
        if (data['branding.customPresets']) {
          customPresets = JSON.parse(data['branding.customPresets']);
        }
      } catch (e) {
        console.error('Failed to parse custom presets:', e);
      }

      const newTheme: ThemeSettings = {
        preset: presetKey,
        // Use preset colors or custom overrides
        accent: data['branding.accent'] || preset.accent,
        accentHover: data['branding.accentHover'] || preset.accentHover,
        bgPrimary: data['branding.bgPrimary'] || preset.bgPrimary,
        bgSecondary: data['branding.bgSecondary'] || preset.bgSecondary,
        bgTertiary: data['branding.bgTertiary'] || preset.bgTertiary,
        textPrimary: data['branding.textPrimary'] || preset.textPrimary,
        textSecondary: data['branding.textSecondary'] || preset.textSecondary,
        sidebarBg: data['branding.sidebarBg'] || preset.sidebarBg,
        sidebarText: data['branding.sidebarText'] || preset.sidebarText,
        sidebarBorder: data['branding.sidebarBorder'] || preset.sidebarBorder,
        // UI settings
        radius: (data['branding.radius'] as BorderRadius) || 'rounded',
        glassy: data['branding.glassy'] !== 'false', // Default to true
        glassBlur: parseInt(data['branding.glassBlur']) || 12,
        glassOpacity: parseInt(data['branding.glassOpacity']) || 85,
        customPresets,
        // Branding
        appName: data['branding.appName'] || 'Warehouse - Inventory Management',
        sidebarMode: (data['branding.sidebarMode'] as 'icon-text' | 'icon' | 'text') || 'icon-text',
        logoLight: data['branding.logoLight'] || '',
        logoDark: data['branding.logoDark'] || '',
        iconLight: data['branding.iconLight'] || '',
        iconDark: data['branding.iconDark'] || '',
        favicon: data['branding.favicon'] || '',
      };

      setAdminTheme(newTheme);
      // Apply theme with user mode preference (resolve 'system' to actual mode)
      const effectiveMode = getEffectiveMode(userThemeMode);
      const appliedTheme = getThemeForMode(newTheme, effectiveMode);
      setTheme(appliedTheme);
      applyTheme(appliedTheme);
    } catch (error) {
      console.error('Failed to fetch branding:', error);
      applyTheme(defaultTheme);
    } finally {
      setLoading(false);
    }
  };

  // Get the theme variant based on user mode preference
  const getThemeForMode = (baseTheme: ThemeSettings, mode: ThemeMode): ThemeSettings => {
    const presetKey = baseTheme.preset;

    // Don't modify custom themes
    if (presetKey === 'custom' || presetKey.startsWith('custom-')) {
      return baseTheme;
    }

    const isCurrentLight = isLightPreset(presetKey);
    const wantsLight = mode === 'light';

    // If user wants the same mode as current theme, return as-is
    if (isCurrentLight === wantsLight) {
      return baseTheme;
    }

    // Try to find a variant
    const variantKey = themeVariantMap[presetKey];
    if (variantKey && themePresets[variantKey]) {
      return {
        ...baseTheme,
        ...themePresets[variantKey],
        preset: variantKey,
      };
    }

    // Fallback to generic light or dark theme
    const fallbackKey = wantsLight ? 'light' : 'default-dark';
    if (themePresets[fallbackKey]) {
      return {
        ...baseTheme,
        ...themePresets[fallbackKey],
        preset: fallbackKey,
      };
    }

    return baseTheme;
  };

  // Check if current theme has a variant available (all predefined themes do, custom doesn't)
  const hasVariant = adminTheme.preset !== 'custom' && !adminTheme.preset.startsWith('custom-');

  // Set theme mode directly
  const handleSetUserThemeMode = (newMode: ThemeMode) => {
    setUserThemeMode(newMode);
    localStorage.setItem('userThemeMode', newMode);

    const effectiveMode = getEffectiveMode(newMode);
    const appliedTheme = getThemeForMode(adminTheme, effectiveMode);
    setTheme(appliedTheme);
    applyTheme(appliedTheme);
  };

  // Cycle through theme modes: system -> light -> dark -> system
  const toggleThemeMode = () => {
    const modeOrder: ThemeMode[] = ['system', 'light', 'dark'];
    const currentIndex = modeOrder.indexOf(userThemeMode);
    const newMode = modeOrder[(currentIndex + 1) % modeOrder.length];
    handleSetUserThemeMode(newMode);
  };

  // Listen for system preference changes when in 'system' mode
  useEffect(() => {
    if (userThemeMode !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const effectiveMode = getEffectiveMode('system');
      const appliedTheme = getThemeForMode(adminTheme, effectiveMode);
      setTheme(appliedTheme);
      applyTheme(appliedTheme);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [userThemeMode, adminTheme]);

  useEffect(() => {
    fetchBranding();
  }, []);

  // Update theme preview without saving to backend
  const setPreview = (preview: Partial<ThemeSettings>) => {
    const newTheme = { ...theme, ...preview };
    setTheme(newTheme);
    applyTheme(newTheme);
  };

  return (
    <BrandingContext.Provider value={{
      theme,
      loading,
      refetch: fetchBranding,
      setPreview,
      userThemeMode,
      setUserThemeMode: handleSetUserThemeMode,
      toggleThemeMode,
      hasVariant
    }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const context = useContext(BrandingContext);
  if (!context) {
    throw new Error('useBranding must be used within BrandingProvider');
  }
  return context;
}
