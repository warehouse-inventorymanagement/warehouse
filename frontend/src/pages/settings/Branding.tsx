import { useState, useEffect, useRef } from 'react';
import { settingsApi } from '../../services/api';
import { useBranding, themePresets, ThemePresetKey, BorderRadius, CustomPreset } from '../../context/BrandingContext';
import toast from 'react-hot-toast';
import {
  PaintBrushIcon,
  PhotoIcon,
  TrashIcon,
  SwatchIcon,
  PlusIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

export default function BrandingSettings() {
  const [loading, setLoading] = useState(true);

  // Branding settings
  const { refetch: refetchBranding, setPreview: setBrandingPreview } = useBranding();
  const [appName, setAppName] = useState('Warehouse - Inventory Management');
  const [preset, setPreset] = useState<ThemePresetKey>('default-dark');
  const [accent, setAccent] = useState('#3b82f6');
  const [bgPrimary, setBgPrimary] = useState('#0f172a');
  const [sidebarBg, setSidebarBg] = useState('#111827');
  const [sidebarBorder, setSidebarBorder] = useState('#1f2937');
  const [textPrimary, setTextPrimary] = useState('#f1f5f9');
  const [radius, setRadius] = useState<BorderRadius>('rounded');
  const [glassy, setGlassy] = useState(true);
  const [glassBlur, setGlassBlur] = useState(12);
  const [glassOpacity, setGlassOpacity] = useState(85);
  const [customPresets, setCustomPresets] = useState<CustomPreset[]>([]);
  const [newPresetName, setNewPresetName] = useState('');
  const [showSavePreset, setShowSavePreset] = useState(false);
  const [sidebarMode, setSidebarMode] = useState<'icon-text' | 'icon' | 'text'>('icon-text');
  const [logoLight, setLogoLight] = useState('');
  const [logoDark, setLogoDark] = useState('');
  const [iconLight, setIconLight] = useState('');
  const [iconDark, setIconDark] = useState('');
  const [favicon, setFavicon] = useState('');
  const [savingBranding, setSavingBranding] = useState(false);

  // File input refs
  const logoLightRef = useRef<HTMLInputElement>(null);
  const logoDarkRef = useRef<HTMLInputElement>(null);
  const iconLightRef = useRef<HTMLInputElement>(null);
  const iconDarkRef = useRef<HTMLInputElement>(null);
  const faviconRef = useRef<HTMLInputElement>(null);

  // Load settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await settingsApi.getAll();
        const data = response.data.data;

        setAppName(data['branding.appName'] || 'Warehouse - Inventory Management');
        setPreset((data['branding.preset'] as ThemePresetKey) || 'default-dark');
        setAccent(data['branding.accent'] || '#3b82f6');
        setBgPrimary(data['branding.bgPrimary'] || '#0f172a');
        setSidebarBg(data['branding.sidebarBg'] || '#111827');
        setSidebarBorder(data['branding.sidebarBorder'] || '#1f2937');
        setTextPrimary(data['branding.textPrimary'] || '#f1f5f9');
        setRadius((data['branding.radius'] as BorderRadius) || 'rounded');
        setGlassy(data['branding.glassy'] !== 'false');
        setGlassBlur(parseInt(data['branding.glassBlur']) || 12);
        setGlassOpacity(parseInt(data['branding.glassOpacity']) || 85);
        try {
          if (data['branding.customPresets']) {
            setCustomPresets(JSON.parse(data['branding.customPresets']));
          }
        } catch (e) {
          console.error('Failed to parse custom presets:', e);
        }
        setSidebarMode((data['branding.sidebarMode'] as 'icon-text' | 'icon' | 'text') || 'icon-text');
        setLogoLight(data['branding.logoLight'] || '');
        setLogoDark(data['branding.logoDark'] || '');
        setIconLight(data['branding.iconLight'] || '');
        setIconDark(data['branding.iconDark'] || '');
        setFavicon(data['branding.favicon'] || '');
      } catch (error: any) {
        toast.error('Failed to load branding settings');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSaveBranding = async () => {
    setSavingBranding(true);
    try {
      const currentPreset = preset !== 'custom' && themePresets[preset] ? themePresets[preset] : null;

      await settingsApi.update({
        'branding.appName': appName,
        'branding.sidebarMode': sidebarMode,
        'branding.preset': preset,
        'branding.accent': preset === 'custom' ? accent : (currentPreset?.accent || accent),
        'branding.accentHover': currentPreset?.accentHover || '#2563eb',
        'branding.bgPrimary': preset === 'custom' ? bgPrimary : (currentPreset?.bgPrimary || bgPrimary),
        'branding.bgSecondary': currentPreset?.bgSecondary || '#1e293b',
        'branding.bgTertiary': currentPreset?.bgTertiary || '#334155',
        'branding.textPrimary': preset === 'custom' ? textPrimary : (currentPreset?.textPrimary || textPrimary),
        'branding.textSecondary': currentPreset?.textSecondary || '#94a3b8',
        'branding.sidebarBg': preset === 'custom' ? sidebarBg : (currentPreset?.sidebarBg || sidebarBg),
        'branding.sidebarText': currentPreset?.sidebarText || '#d1d5db',
        'branding.sidebarBorder': preset === 'custom' ? sidebarBorder : (currentPreset?.sidebarBorder || sidebarBorder),
        'branding.radius': radius,
        'branding.glassy': glassy ? 'true' : 'false',
        'branding.glassBlur': glassBlur.toString(),
        'branding.glassOpacity': glassOpacity.toString(),
        'branding.customPresets': JSON.stringify(customPresets),
      });
      await refetchBranding();
      toast.success('Branding settings saved');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save branding');
    } finally {
      setSavingBranding(false);
    }
  };

  const handlePresetChange = (newPreset: ThemePresetKey) => {
    setPreset(newPreset);
    if (newPreset !== 'custom' && themePresets[newPreset]) {
      const p = themePresets[newPreset];
      setAccent(p.accent);
      setBgPrimary(p.bgPrimary);
      setSidebarBg(p.sidebarBg);
      setSidebarBorder(p.sidebarBorder);
      setTextPrimary(p.textPrimary);
      setBrandingPreview({
        preset: newPreset,
        ...p,
      });
    }
  };

  const handleCustomColorChange = (type: 'accent' | 'bgPrimary' | 'sidebarBg' | 'sidebarBorder' | 'textPrimary', value: string) => {
    if (type === 'accent') setAccent(value);
    else if (type === 'bgPrimary') setBgPrimary(value);
    else if (type === 'sidebarBg') setSidebarBg(value);
    else if (type === 'sidebarBorder') setSidebarBorder(value);
    else if (type === 'textPrimary') setTextPrimary(value);

    if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
      setPreset('custom');
      setBrandingPreview({
        preset: 'custom',
        [type]: value,
      });
    }
  };

  const handleRadiusChange = (newRadius: BorderRadius) => {
    setRadius(newRadius);
    setBrandingPreview({ radius: newRadius });
  };

  const handleGlassyToggle = (enabled: boolean) => {
    setGlassy(enabled);
    setBrandingPreview({ glassy: enabled });
  };

  const handleGlassBlurChange = (blur: number) => {
    setGlassBlur(blur);
    setBrandingPreview({ glassBlur: blur });
  };

  const handleGlassOpacityChange = (opacity: number) => {
    setGlassOpacity(opacity);
    setBrandingPreview({ glassOpacity: opacity });
  };

  const handleResetGlassy = () => {
    setGlassy(true);
    setGlassBlur(12);
    setGlassOpacity(85);
    setBrandingPreview({ glassy: true, glassBlur: 12, glassOpacity: 85 });
  };

  const handleSaveCustomPreset = () => {
    if (!newPresetName.trim()) {
      toast.error('Please enter a preset name');
      return;
    }

    const newPreset: CustomPreset = {
      id: `custom-${Date.now()}`,
      name: newPresetName.trim(),
      accent,
      accentHover: accent,
      bgPrimary,
      bgSecondary: bgPrimary,
      bgTertiary: bgPrimary,
      textPrimary,
      textSecondary: textPrimary,
      sidebarBg,
      sidebarText: textPrimary,
      sidebarBorder,
    };

    setCustomPresets([...customPresets, newPreset]);
    setNewPresetName('');
    setShowSavePreset(false);
    toast.success(`Preset "${newPresetName.trim()}" saved`);
  };

  const handleDeleteCustomPreset = (presetId: string) => {
    setCustomPresets(customPresets.filter(p => p.id !== presetId));
    toast.success('Preset deleted');
  };

  const handleApplyCustomPreset = (customPreset: CustomPreset) => {
    setPreset(customPreset.id);
    setAccent(customPreset.accent);
    setBgPrimary(customPreset.bgPrimary);
    setSidebarBg(customPreset.sidebarBg);
    setSidebarBorder(customPreset.sidebarBorder);
    setTextPrimary(customPreset.textPrimary);
    setBrandingPreview({
      preset: customPreset.id,
      accent: customPreset.accent,
      accentHover: customPreset.accentHover,
      bgPrimary: customPreset.bgPrimary,
      bgSecondary: customPreset.bgSecondary,
      bgTertiary: customPreset.bgTertiary,
      textPrimary: customPreset.textPrimary,
      textSecondary: customPreset.textSecondary,
      sidebarBg: customPreset.sidebarBg,
      sidebarText: customPreset.sidebarText,
      sidebarBorder: customPreset.sidebarBorder,
    });
  };

  const handleUploadAsset = async (type: 'logoLight' | 'logoDark' | 'iconLight' | 'iconDark' | 'favicon', file: File) => {
    try {
      const response = await settingsApi.uploadBrandingAsset({ [type]: file });
      const data = response.data.data;

      if (type === 'logoLight') setLogoLight(data['branding.logoLight'] || '');
      if (type === 'logoDark') setLogoDark(data['branding.logoDark'] || '');
      if (type === 'iconLight') setIconLight(data['branding.iconLight'] || '');
      if (type === 'iconDark') setIconDark(data['branding.iconDark'] || '');
      if (type === 'favicon') setFavicon(data['branding.favicon'] || '');

      await refetchBranding();
      toast.success('Asset uploaded');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to upload asset');
    }
  };

  const handleDeleteAsset = async (type: 'logoLight' | 'logoDark' | 'iconLight' | 'iconDark' | 'favicon') => {
    try {
      await settingsApi.deleteBrandingAsset(type);

      if (type === 'logoLight') setLogoLight('');
      if (type === 'logoDark') setLogoDark('');
      if (type === 'iconLight') setIconLight('');
      if (type === 'iconDark') setIconDark('');
      if (type === 'favicon') setFavicon('');

      await refetchBranding();
      toast.success('Asset deleted');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete asset');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--accent)' }} />
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg" style={{ backgroundColor: 'color-mix(in srgb, #a855f7 20%, transparent)' }}>
          <PaintBrushIcon className="w-6 h-6" style={{ color: '#a855f7' }} />
        </div>
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Branding</h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Customize the look and feel of your application</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* App Name */}
        <div>
          <label className="label">Application Name</label>
          <input
            type="text"
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
            className="input max-w-md"
            placeholder="Warehouse - Inventory Management"
          />
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Displayed in the browser tab title only</p>
        </div>

        {/* Sidebar Display Mode */}
        <div>
          <label className="label">Sidebar Display Mode</label>
          <select
            value={sidebarMode}
            onChange={(e) => setSidebarMode(e.target.value as 'icon-text' | 'icon' | 'text')}
            className="input max-w-md"
          >
            <option value="icon-text">Icon + Text (Default)</option>
            <option value="icon">Icon Only</option>
            <option value="text">Text Only</option>
          </select>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Choose how the logo appears in the sidebar</p>
        </div>

        {/* Custom Assets Info */}
        <div className="p-4 rounded-lg border" style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 5%, transparent)', borderColor: 'color-mix(in srgb, var(--accent) 20%, transparent)' }}>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>Custom Assets:</strong> Upload custom logos to replace the default.
            Leave empty to use the default icon which automatically adapts to your theme colors.
          </p>
          <ul className="text-xs mt-2 space-y-1" style={{ color: 'var(--text-secondary)' }}>
            <li>• <strong>Logo:</strong> Recommended 200x40px (PNG, JPG, or SVG)</li>
            <li>• <strong>Icon:</strong> Recommended 32x32px (PNG, JPG, or SVG)</li>
            <li>• <strong>Favicon:</strong> Recommended 32x32px (PNG, ICO, or SVG)</li>
          </ul>
        </div>

        {/* Logo Uploads */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Light Mode Logo */}
          <div>
            <label className="label">Logo (Light Theme)</label>
            <div className="border-2 border-dashed rounded-xl p-4" style={{ borderColor: 'var(--bg-tertiary)' }}>
              {logoLight ? (
                <div className="flex items-center gap-4">
                  <img
                    src={`/uploads/branding/${logoLight}`}
                    alt="Light logo"
                    className="h-12 object-contain rounded p-2"
                    style={{ backgroundColor: 'var(--bg-tertiary)' }}
                  />
                  <button
                    onClick={() => handleDeleteAsset('logoLight')}
                    className="p-2 text-red-500 rounded-lg"
                    style={{ backgroundColor: 'color-mix(in srgb, #ef4444 10%, transparent)' }}
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => logoLightRef.current?.click()}
                  className="flex flex-col items-center justify-center w-full py-4"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <PhotoIcon className="w-8 h-8 mb-2" />
                  <span className="text-sm">Upload logo</span>
                </button>
              )}
              <input
                ref={logoLightRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleUploadAsset('logoLight', e.target.files[0])}
              />
            </div>
          </div>

          {/* Dark Mode Logo */}
          <div>
            <label className="label">Logo (Dark Theme)</label>
            <div className="border-2 border-dashed rounded-xl p-4" style={{ borderColor: 'var(--bg-tertiary)' }}>
              {logoDark ? (
                <div className="flex items-center gap-4">
                  <img
                    src={`/uploads/branding/${logoDark}`}
                    alt="Dark logo"
                    className="h-12 object-contain rounded p-2"
                    style={{ backgroundColor: '#1f2937' }}
                  />
                  <button
                    onClick={() => handleDeleteAsset('logoDark')}
                    className="p-2 text-red-500 rounded-lg"
                    style={{ backgroundColor: 'color-mix(in srgb, #ef4444 10%, transparent)' }}
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => logoDarkRef.current?.click()}
                  className="flex flex-col items-center justify-center w-full py-4"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <PhotoIcon className="w-8 h-8 mb-2" />
                  <span className="text-sm">Upload logo</span>
                </button>
              )}
              <input
                ref={logoDarkRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleUploadAsset('logoDark', e.target.files[0])}
              />
            </div>
          </div>
        </div>

        {/* Icon Uploads */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Light Mode Icon */}
          <div>
            <label className="label">Icon Only (Light Theme)</label>
            <div className="border-2 border-dashed rounded-xl p-4" style={{ borderColor: 'var(--bg-tertiary)' }}>
              {iconLight ? (
                <div className="flex items-center gap-4">
                  <img
                    src={`/uploads/branding/${iconLight}`}
                    alt="Light icon"
                    className="w-8 h-8 object-contain rounded p-1"
                    style={{ backgroundColor: 'var(--bg-tertiary)' }}
                  />
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{iconLight}</span>
                  <button
                    onClick={() => handleDeleteAsset('iconLight')}
                    className="p-2 text-red-500 rounded-lg ml-auto"
                    style={{ backgroundColor: 'color-mix(in srgb, #ef4444 10%, transparent)' }}
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => iconLightRef.current?.click()}
                  className="flex flex-col items-center justify-center w-full py-4"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <PhotoIcon className="w-8 h-8 mb-2" />
                  <span className="text-sm">Upload icon (32x32)</span>
                </button>
              )}
              <input
                ref={iconLightRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleUploadAsset('iconLight', e.target.files[0])}
              />
            </div>
          </div>

          {/* Dark Mode Icon */}
          <div>
            <label className="label">Icon Only (Dark Theme)</label>
            <div className="border-2 border-dashed rounded-xl p-4" style={{ borderColor: 'var(--bg-tertiary)' }}>
              {iconDark ? (
                <div className="flex items-center gap-4">
                  <img
                    src={`/uploads/branding/${iconDark}`}
                    alt="Dark icon"
                    className="w-8 h-8 object-contain rounded p-1"
                    style={{ backgroundColor: '#1f2937' }}
                  />
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{iconDark}</span>
                  <button
                    onClick={() => handleDeleteAsset('iconDark')}
                    className="p-2 text-red-500 rounded-lg ml-auto"
                    style={{ backgroundColor: 'color-mix(in srgb, #ef4444 10%, transparent)' }}
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => iconDarkRef.current?.click()}
                  className="flex flex-col items-center justify-center w-full py-4"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <PhotoIcon className="w-8 h-8 mb-2" />
                  <span className="text-sm">Upload icon (32x32)</span>
                </button>
              )}
              <input
                ref={iconDarkRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleUploadAsset('iconDark', e.target.files[0])}
              />
            </div>
          </div>
        </div>

        {/* Favicon */}
        <div>
          <label className="label">Favicon</label>
          <div className="border-2 border-dashed rounded-xl p-4 max-w-xs" style={{ borderColor: 'var(--bg-tertiary)' }}>
            {favicon ? (
              <div className="flex items-center gap-4">
                <img
                  src={`/uploads/branding/${favicon}`}
                  alt="Favicon"
                  className="w-8 h-8 object-contain"
                />
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{favicon}</span>
                <button
                  onClick={() => handleDeleteAsset('favicon')}
                  className="p-2 text-red-500 rounded-lg ml-auto"
                  style={{ backgroundColor: 'color-mix(in srgb, #ef4444 10%, transparent)' }}
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => faviconRef.current?.click()}
                className="flex items-center gap-3 w-full py-2"
                style={{ color: 'var(--text-secondary)' }}
              >
                <PhotoIcon className="w-6 h-6" />
                <span className="text-sm">Upload favicon (.ico, .png)</span>
              </button>
            )}
            <input
              ref={faviconRef}
              type="file"
              accept="image/*,.ico"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleUploadAsset('favicon', e.target.files[0])}
            />
          </div>
        </div>

        {/* Theme Presets */}
        <div className="border-t pt-6" style={{ borderColor: 'var(--bg-tertiary)' }}>
          <div className="flex items-center gap-2 mb-4">
            <SwatchIcon className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
            <h3 className="text-md font-medium" style={{ color: 'var(--text-primary)' }}>Theme</h3>
          </div>

          {/* Theme Presets Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            {Object.entries(themePresets).map(([key, p]) => {
              const isSelected = preset === key;
              return (
                <button
                  key={key}
                  onClick={() => handlePresetChange(key as ThemePresetKey)}
                  className="relative p-3 rounded-xl border-2 transition-all text-left"
                  style={{
                    borderColor: isSelected ? p.accent : 'var(--bg-tertiary)',
                    backgroundColor: isSelected ? `color-mix(in srgb, ${p.accent} 10%, transparent)` : 'transparent',
                  }}
                >
                  <div className="flex gap-1 mb-2">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: p.accent }} title="Accent" />
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: p.bgPrimary }} title="Background" />
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: p.sidebarBg }} title="Sidebar" />
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: p.sidebarBorder }} title="Sidebar Border" />
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: p.textPrimary }} title="Text" />
                  </div>
                  <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{p.name}</span>
                  {isSelected && (
                    <div className="absolute top-1 right-1 w-2 h-2 rounded-full" style={{ backgroundColor: p.accent }} />
                  )}
                </button>
              );
            })}
            {/* Custom option */}
            <button
              onClick={() => handlePresetChange('custom')}
              className="relative p-3 rounded-xl border-2 transition-all text-left"
              style={{
                borderColor: preset === 'custom' ? accent : 'var(--bg-tertiary)',
                backgroundColor: preset === 'custom' ? `color-mix(in srgb, ${accent} 10%, transparent)` : 'transparent',
              }}
            >
              <div className="flex gap-1 mb-2">
                <div className="w-4 h-4 rounded-full border-2 border-dashed" style={{ backgroundColor: accent, borderColor: 'var(--text-secondary)' }} title="Accent" />
                <div className="w-4 h-4 rounded-full border-2 border-dashed" style={{ backgroundColor: bgPrimary, borderColor: 'var(--text-secondary)' }} title="Background" />
                <div className="w-4 h-4 rounded-full border-2 border-dashed" style={{ backgroundColor: sidebarBg, borderColor: 'var(--text-secondary)' }} title="Sidebar" />
                <div className="w-4 h-4 rounded-full border-2 border-dashed" style={{ backgroundColor: sidebarBorder, borderColor: 'var(--text-secondary)' }} title="Sidebar Border" />
                <div className="w-4 h-4 rounded-full border-2 border-dashed" style={{ backgroundColor: textPrimary, borderColor: 'var(--text-secondary)' }} title="Text" />
              </div>
              <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>Custom</span>
              {preset === 'custom' && (
                <div className="absolute top-1 right-1 w-2 h-2 rounded-full" style={{ backgroundColor: accent }} />
              )}
            </button>
          </div>

          {/* Custom Saved Presets */}
          {customPresets.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <SparklesIcon className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Your Saved Presets</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {customPresets.map((cp) => {
                  const isSelected = preset === cp.id;
                  return (
                    <div
                      key={cp.id}
                      className="relative p-3 rounded-xl border-2 transition-all text-left group"
                      style={{
                        borderColor: isSelected ? cp.accent : 'var(--bg-tertiary)',
                        backgroundColor: isSelected ? `color-mix(in srgb, ${cp.accent} 10%, transparent)` : 'transparent',
                      }}
                    >
                      <button
                        onClick={() => handleApplyCustomPreset(cp)}
                        className="w-full text-left"
                      >
                        <div className="flex gap-1 mb-2">
                          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: cp.accent }} title="Accent" />
                          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: cp.bgPrimary }} title="Background" />
                          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: cp.sidebarBg }} title="Sidebar" />
                          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: cp.sidebarBorder }} title="Sidebar Border" />
                          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: cp.textPrimary }} title="Text" />
                        </div>
                        <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{cp.name}</span>
                      </button>
                      <button
                        onClick={() => handleDeleteCustomPreset(cp.id)}
                        className="absolute top-1 right-1 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ backgroundColor: 'color-mix(in srgb, #ef4444 20%, transparent)' }}
                      >
                        <TrashIcon className="w-3 h-3" style={{ color: '#ef4444' }} />
                      </button>
                      {isSelected && (
                        <div className="absolute top-1 right-1 w-2 h-2 rounded-full" style={{ backgroundColor: cp.accent }} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Custom Colors (shown when custom is selected) */}
          {preset === 'custom' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 p-4 rounded-xl mb-6" style={{ backgroundColor: 'var(--bg-primary)' }}>
              <div>
                <label className="text-sm block mb-1" style={{ color: 'var(--text-secondary)' }}>Accent Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={accent}
                    onChange={(e) => handleCustomColorChange('accent', e.target.value)}
                    className="w-10 h-10 rounded-lg border cursor-pointer"
                    style={{ borderColor: 'var(--bg-tertiary)' }}
                  />
                  <input
                    type="text"
                    value={accent}
                    onChange={(e) => handleCustomColorChange('accent', e.target.value)}
                    className="input flex-1"
                    placeholder="#3b82f6"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm block mb-1" style={{ color: 'var(--text-secondary)' }}>Background</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={bgPrimary}
                    onChange={(e) => handleCustomColorChange('bgPrimary', e.target.value)}
                    className="w-10 h-10 rounded-lg border cursor-pointer"
                    style={{ borderColor: 'var(--bg-tertiary)' }}
                  />
                  <input
                    type="text"
                    value={bgPrimary}
                    onChange={(e) => handleCustomColorChange('bgPrimary', e.target.value)}
                    className="input flex-1"
                    placeholder="#0f172a"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm block mb-1" style={{ color: 'var(--text-secondary)' }}>Sidebar</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={sidebarBg}
                    onChange={(e) => handleCustomColorChange('sidebarBg', e.target.value)}
                    className="w-10 h-10 rounded-lg border cursor-pointer"
                    style={{ borderColor: 'var(--bg-tertiary)' }}
                  />
                  <input
                    type="text"
                    value={sidebarBg}
                    onChange={(e) => handleCustomColorChange('sidebarBg', e.target.value)}
                    className="input flex-1"
                    placeholder="#111827"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm block mb-1" style={{ color: 'var(--text-secondary)' }}>Sidebar Border</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={sidebarBorder}
                    onChange={(e) => handleCustomColorChange('sidebarBorder', e.target.value)}
                    className="w-10 h-10 rounded-lg border cursor-pointer"
                    style={{ borderColor: 'var(--bg-tertiary)' }}
                  />
                  <input
                    type="text"
                    value={sidebarBorder}
                    onChange={(e) => handleCustomColorChange('sidebarBorder', e.target.value)}
                    className="input flex-1"
                    placeholder="#1f2937"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm block mb-1" style={{ color: 'var(--text-secondary)' }}>Text</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={textPrimary}
                    onChange={(e) => handleCustomColorChange('textPrimary', e.target.value)}
                    className="w-10 h-10 rounded-lg border cursor-pointer"
                    style={{ borderColor: 'var(--bg-tertiary)' }}
                  />
                  <input
                    type="text"
                    value={textPrimary}
                    onChange={(e) => handleCustomColorChange('textPrimary', e.target.value)}
                    className="input flex-1"
                    placeholder="#f1f5f9"
                  />
                </div>
              </div>
              {/* Save as Preset Button */}
              <div className="col-span-full mt-2">
                {!showSavePreset ? (
                  <button
                    onClick={() => setShowSavePreset(true)}
                    className="flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg transition-colors"
                    style={{ color: 'var(--accent)', backgroundColor: 'color-mix(in srgb, var(--accent) 10%, transparent)' }}
                  >
                    <PlusIcon className="w-4 h-4" />
                    Save as Preset
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newPresetName}
                      onChange={(e) => setNewPresetName(e.target.value)}
                      placeholder="Preset name..."
                      className="input flex-1"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveCustomPreset}
                      className="btn btn-primary"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => { setShowSavePreset(false); setNewPresetName(''); }}
                      className="btn btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Glassy Effect */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="label mb-0">Glassy Effect</label>
              <button
                onClick={handleResetGlassy}
                className="text-xs px-2 py-1 rounded transition-colors"
                style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--bg-tertiary)' }}
              >
                Reset to Default
              </button>
            </div>

            {/* Enable/Disable Toggle */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleGlassyToggle(!glassy)}
                className="relative w-11 h-6 rounded-full transition-colors"
                style={{ backgroundColor: glassy ? 'var(--accent)' : 'var(--bg-tertiary)' }}
              >
                <span
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${glassy ? 'left-6' : 'left-1'}`}
                />
              </button>
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {glassy ? 'Enabled' : 'Disabled'}
              </span>
            </div>

            {/* Blur & Opacity Controls - only show when glassy is enabled */}
            {glassy && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {/* Blur Intensity */}
                <div>
                  <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--text-secondary)' }}>
                    Blur Intensity
                  </label>
                  <div className="inline-flex gap-1">
                    {[
                      { value: 0, label: 'None' },
                      { value: 4, label: 'Light' },
                      { value: 8, label: 'Medium' },
                      { value: 12, label: 'Strong' },
                      { value: 16, label: 'Heavy' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => handleGlassBlurChange(option.value)}
                        className="px-2 py-1 text-xs border rounded transition-all"
                        style={{
                          borderColor: glassBlur === option.value ? 'var(--accent)' : 'var(--bg-tertiary)',
                          backgroundColor: glassBlur === option.value ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'transparent',
                          color: glassBlur === option.value ? 'var(--accent)' : 'var(--text-secondary)',
                        }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Background Opacity */}
                <div>
                  <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--text-secondary)' }}>
                    Background Opacity
                  </label>
                  <div className="inline-flex gap-1">
                    {[
                      { value: 60, label: '60%' },
                      { value: 70, label: '70%' },
                      { value: 80, label: '80%' },
                      { value: 85, label: '85%' },
                      { value: 90, label: '90%' },
                      { value: 95, label: '95%' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => handleGlassOpacityChange(option.value)}
                        className="px-2 py-1 text-xs border rounded transition-all"
                        style={{
                          borderColor: glassOpacity === option.value ? 'var(--accent)' : 'var(--bg-tertiary)',
                          backgroundColor: glassOpacity === option.value ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'transparent',
                          color: glassOpacity === option.value ? 'var(--accent)' : 'var(--text-secondary)',
                        }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Glass morphism effects on cards and modals. Adjust blur and opacity for your preference.
            </p>
          </div>

          {/* Border Radius */}
          <div>
            <label className="label">Border Radius</label>
            <div className="inline-flex gap-2">
              {(['sharp', 'rounded', 'pill'] as const).map((style) => (
                <button
                  key={style}
                  onClick={() => handleRadiusChange(style)}
                  className={`px-4 py-2 border-2 capitalize transition-all ${
                    style === 'sharp' ? 'rounded-none' : style === 'rounded' ? 'rounded-lg' : 'rounded-full'
                  }`}
                  style={{
                    borderColor: radius === style ? 'var(--accent)' : 'var(--bg-tertiary)',
                    backgroundColor: radius === style ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'transparent',
                    color: radius === style ? 'var(--accent)' : 'var(--text-primary)',
                  }}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t" style={{ borderColor: 'var(--bg-tertiary)' }}>
          <button
            onClick={handleSaveBranding}
            disabled={savingBranding}
            className="btn btn-primary"
          >
            {savingBranding ? 'Saving...' : 'Save Branding'}
          </button>
        </div>
      </div>
    </div>
  );
}
