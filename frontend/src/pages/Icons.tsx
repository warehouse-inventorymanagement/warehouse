import { useState, useEffect, useMemo } from 'react';
import DOMPurify from 'dompurify';
import { Icon } from '@iconify/react';
import {
  MagnifyingGlassIcon,
  TrashIcon,
  PlusIcon,
  GlobeAltIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  XMarkIcon,
  ChevronLeftIcon,
  CheckIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { iconsApi, CustomIcon, CustomizedIcon } from '../services/api';
import { ICON_SETS, CATEGORY_LABELS, IconSetConfig, isIconColorable } from '../config/iconSets';
import { getIconNames, getIconCount, getTotalIconCount, searchIcons } from '../utils/iconLoader';
import ColorPicker from '../components/ColorPicker';
import { IconDisplay } from '../components/IconPicker';

const ICONS_PER_PAGE = 60;

type DisplaySize = 'small' | 'medium' | 'large' | 'xlarge';

const SIZE_CONFIG: Record<DisplaySize, { icon: number; cell: string; grid: string }> = {
  small: { icon: 20, cell: 'w-8 h-8', grid: 'grid-cols-10 sm:grid-cols-12 md:grid-cols-16 lg:grid-cols-20' },
  medium: { icon: 24, cell: 'w-10 h-10', grid: 'grid-cols-8 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-16' },
  large: { icon: 32, cell: 'w-12 h-12', grid: 'grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12' },
  xlarge: { icon: 48, cell: 'w-16 h-16', grid: 'grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10' },
};

export default function Icons() {
  const { hasPermission } = useAuth();
  const canRead = hasPermission('icons:read');
  const canCreate = hasPermission('icons:create');
  const canDelete = hasPermission('icons:delete');

  const [search, setSearch] = useState('');
  const [selectedSet, setSelectedSet] = useState<string | null>(null);
  const [expandedSets, setExpandedSets] = useState<Set<string>>(new Set());
  const [customIcons, setCustomIcons] = useState<CustomIcon[]>([]);
  const [loading, setLoading] = useState(true);

  // Display size
  const [displaySize, setDisplaySize] = useState<DisplaySize>('medium');

  // Preview modal
  const [previewIcon, setPreviewIcon] = useState<string | null>(null);

  // External search state
  const [showExternalSearch, setShowExternalSearch] = useState(false);
  const [externalQuery, setExternalQuery] = useState('');
  const [externalResults, setExternalResults] = useState<string[]>([]);
  const [externalLoading, setExternalLoading] = useState(false);
  const [importingIcon, setImportingIcon] = useState<string | null>(null);
  const [externalPage, setExternalPage] = useState(1);

  // Usage modal state
  const [usageModal, setUsageModal] = useState<{
    iconName: string;
    usage: { categories: any[]; tags: any[]; templates: any[] };
  } | null>(null);

  // Imported icons selection state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedImported, setSelectedImported] = useState<Set<string>>(new Set());

  // Imported icon detail modal
  const [importedDetailModal, setImportedDetailModal] = useState<CustomIcon | null>(null);
  const [importedDetailUsage, setImportedDetailUsage] = useState<{
    categories: any[];
    tags: any[];
    templates: any[];
  } | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(false);

  // Customized icons
  const [customizedIcons, setCustomizedIcons] = useState<CustomizedIcon[]>([]);
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
  const [editingCustomized, setEditingCustomized] = useState<CustomizedIcon | null>(null);
  const [customizeName, setCustomizeName] = useState('');
  const [customizeSourceIcon, setCustomizeSourceIcon] = useState('');
  const [customizeIconColor, setCustomizeIconColor] = useState('#FFFFFF');
  const [customizeBgColor, setCustomizeBgColor] = useState('#3B82F680');

  const totalIcons = useMemo(() => getTotalIconCount(), []);
  const sizeConfig = SIZE_CONFIG[displaySize];

  useEffect(() => {
    if (canRead) {
      fetchCustomIcons();
      fetchCustomizedIcons();
    } else {
      setLoading(false);
    }
  }, [canRead]);

  const fetchCustomIcons = async () => {
    try {
      const response = await iconsApi.getAll();
      setCustomIcons(response.data.data);
    } catch (error) {
      toast.error('Failed to load custom icons');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomizedIcons = async () => {
    try {
      const response = await iconsApi.getCustomized();
      setCustomizedIcons(response.data.data);
    } catch (error) {
      // Silently fail - might not have the table yet
    }
  };

  const toggleSet = (prefix: string) => {
    const newExpanded = new Set(expandedSets);
    if (newExpanded.has(prefix)) {
      newExpanded.delete(prefix);
    } else {
      newExpanded.add(prefix);
    }
    setExpandedSets(newExpanded);
  };

  // Search results across all sets
  const searchResults = useMemo(() => {
    if (!search || search.length < 2) return null;
    return searchIcons(search, selectedSet || undefined, 200);
  }, [search, selectedSet]);

  // Group icon sets by category
  const iconSetsByCategory = useMemo(() => {
    const grouped: Record<string, IconSetConfig[]> = {};
    ICON_SETS.forEach((set) => {
      if (!grouped[set.category]) {
        grouped[set.category] = [];
      }
      grouped[set.category].push(set);
    });
    return grouped;
  }, []);

  // External search with pagination
  const handleExternalSearch = async () => {
    if (!externalQuery.trim()) return;

    setExternalLoading(true);
    setExternalPage(1);
    try {
      const response = await iconsApi.searchExternal(externalQuery, 100);
      setExternalResults(response.data.data.icons || []);
    } catch (error) {
      toast.error('Failed to search external icons');
    } finally {
      setExternalLoading(false);
    }
  };

  // Paginated external results
  const paginatedExternalResults = useMemo(() => {
    const start = (externalPage - 1) * ICONS_PER_PAGE;
    const end = start + ICONS_PER_PAGE;
    return externalResults.slice(start, end);
  }, [externalResults, externalPage]);

  const totalExternalPages = Math.ceil(externalResults.length / ICONS_PER_PAGE);

  // Import external icon
  const handleImportIcon = async (iconName: string) => {
    setImportingIcon(iconName);
    try {
      const [prefix, name] = iconName.split(':');
      const fetchResponse = await iconsApi.fetchIcon(prefix, name);
      const { svgData } = fetchResponse.data.data;

      await iconsApi.create({ name: iconName, svgData });
      toast.success(`Icon "${iconName}" imported`);
      fetchCustomIcons();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to import icon');
    } finally {
      setImportingIcon(null);
    }
  };

  // Close external search
  const closeExternalSearch = () => {
    setShowExternalSearch(false);
    setExternalQuery('');
    setExternalResults([]);
    setExternalPage(1);
  };

  // Copy icon name
  const handleCopyIcon = (iconName: string) => {
    navigator.clipboard.writeText(iconName);
    toast.success(`Copied: ${iconName}`);
  };

  // Open imported icon detail modal
  const openImportedDetail = async (icon: CustomIcon) => {
    setImportedDetailModal(icon);
    setImportedDetailUsage(null);
    setLoadingUsage(true);
    try {
      const response = await iconsApi.getUsage(icon.name);
      setImportedDetailUsage(response.data.data.usage);
    } catch (error) {
      toast.error('Failed to load usage info');
    } finally {
      setLoadingUsage(false);
    }
  };

  // Toggle icon selection
  const toggleIconSelection = (iconId: string) => {
    const newSelected = new Set(selectedImported);
    if (newSelected.has(iconId)) {
      newSelected.delete(iconId);
    } else {
      newSelected.add(iconId);
    }
    setSelectedImported(newSelected);
  };

  // Select all imported icons
  const selectAllImported = () => {
    if (selectedImported.size === customIcons.length) {
      setSelectedImported(new Set());
    } else {
      setSelectedImported(new Set(customIcons.map(i => i.id)));
    }
  };

  // Bulk delete selected icons
  const handleBulkDelete = async () => {
    // Check usage for all selected icons
    const iconsToDelete = customIcons.filter(i => selectedImported.has(i.id));
    const iconsInUse: string[] = [];

    for (const icon of iconsToDelete) {
      try {
        const response = await iconsApi.getUsage(icon.name);
        const usage = response.data.data.usage;
        if (usage.categories.length > 0 || usage.tags.length > 0 || usage.templates.length > 0) {
          iconsInUse.push(icon.name);
        }
      } catch (error) {
        // Skip
      }
    }

    if (iconsInUse.length > 0) {
      toast.error(`Cannot delete: ${iconsInUse.length} icon(s) are in use`);
      return;
    }

    if (!confirm(`Delete ${selectedImported.size} icon(s)?`)) return;

    let deleted = 0;
    for (const iconId of selectedImported) {
      try {
        await iconsApi.delete(iconId);
        deleted++;
      } catch (error) {
        // Skip failed ones
      }
    }

    toast.success(`Deleted ${deleted} icon(s)`);
    setSelectedImported(new Set());
    setSelectionMode(false);
    fetchCustomIcons();
  };

  // Delete single imported icon
  const handleDeleteImported = async (icon: CustomIcon) => {
    if (importedDetailUsage) {
      const { categories, tags, templates } = importedDetailUsage;
      if (categories.length > 0 || tags.length > 0 || templates.length > 0) {
        toast.error('Cannot delete: icon is in use');
        return;
      }
    }

    if (!confirm(`Delete "${icon.name}"?`)) return;

    try {
      await iconsApi.delete(icon.id);
      toast.success('Icon deleted');
      setImportedDetailModal(null);
      fetchCustomIcons();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete');
    }
  };

  // Open customize modal for new or editing
  const openCustomizeModal = (icon?: CustomizedIcon) => {
    if (icon) {
      setEditingCustomized(icon);
      setCustomizeName(icon.name);
      setCustomizeSourceIcon(icon.sourceIcon);
      setCustomizeIconColor(icon.iconColor || '#FFFFFF');
      setCustomizeBgColor(icon.backgroundColor || '#3B82F680');
    } else {
      setEditingCustomized(null);
      setCustomizeName('');
      setCustomizeSourceIcon('');
      setCustomizeIconColor('#FFFFFF');
      setCustomizeBgColor('#3B82F680');
    }
    setShowCustomizeModal(true);
  };

  // Create customized icon from any icon (bundled, imported, or preview)
  const startCustomizeFromIcon = (iconName: string) => {
    setEditingCustomized(null);
    setCustomizeName('');
    setCustomizeSourceIcon(iconName);
    setCustomizeIconColor('#FFFFFF');
    setCustomizeBgColor('#3B82F680');
    setShowCustomizeModal(true);
    setPreviewIcon(null); // Close preview if open
  };

  // Save customized icon
  const handleSaveCustomized = async () => {
    if (!customizeName.trim() || !customizeSourceIcon) {
      toast.error('Name and icon are required');
      return;
    }

    try {
      if (editingCustomized) {
        await iconsApi.updateCustomized(editingCustomized.id, {
          name: customizeName,
          iconColor: customizeIconColor,
          backgroundColor: customizeBgColor
        });
        toast.success('Customized icon updated');
      } else {
        await iconsApi.createCustomized({
          name: customizeName,
          sourceIcon: customizeSourceIcon,
          iconColor: customizeIconColor,
          backgroundColor: customizeBgColor
        });
        toast.success('Customized icon saved');
      }
      setShowCustomizeModal(false);
      fetchCustomizedIcons();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save');
    }
  };

  // Delete customized icon
  const handleDeleteCustomized = async (icon: CustomizedIcon) => {
    if (!confirm(`Delete "${icon.name}"?`)) return;

    try {
      await iconsApi.deleteCustomized(icon.id);
      toast.success('Customized icon deleted');
      fetchCustomizedIcons();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete');
    }
  };

  // Size selector component
  const SizeSelector = () => (
    <div className="flex items-center gap-1 rounded-lg p-1" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
      {(Object.keys(SIZE_CONFIG) as DisplaySize[]).map((size) => (
        <button
          key={size}
          onClick={() => setDisplaySize(size)}
          className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
            displaySize === size ? 'bg-blue-600 text-white hover:bg-blue-700' : 'hover:opacity-80'
          }`}
          style={displaySize !== size ? { color: 'var(--text-secondary)' } : undefined}
          title={`${size.charAt(0).toUpperCase() + size.slice(1)} icons`}
        >
          {size.charAt(0).toUpperCase()}
        </button>
      ))}
    </div>
  );

  if (!canRead) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500 dark:text-gray-400">You don't have permission to view icons.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--accent)' }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Icons
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {totalIcons.toLocaleString()} bundled icons across {ICON_SETS.length} sets
            {customIcons.length > 0 && ` + ${customIcons.length} imported`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SizeSelector />
          {canCreate && !showExternalSearch && (
            <button
              onClick={() => setShowExternalSearch(true)}
              className="btn btn-primary flex items-center gap-2"
            >
              <GlobeAltIcon className="w-5 h-5" />
              Search External
            </button>
          )}
        </div>
      </div>

      {/* External Search Section (inline, not modal) */}
      {showExternalSearch && (
        <div className="card p-4 border-2 border-blue-500">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <GlobeAltIcon className="w-5 h-5 text-blue-500" />
              Search External Icons
            </h2>
            <div className="flex items-center gap-2">
              <SizeSelector />
              <button
                onClick={closeExternalSearch}
                className="p-1 hover-bg rounded-lg transition-colors"
                style={{ color: 'var(--text-secondary)' }}
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={externalQuery}
              onChange={(e) => setExternalQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleExternalSearch()}
              placeholder="Search for any icon (e.g., car, home, computer)..."
              className="input flex-1"
              autoFocus
            />
            <button
              onClick={handleExternalSearch}
              disabled={externalLoading || !externalQuery.trim()}
              className="btn btn-primary"
            >
              {externalLoading ? 'Searching...' : 'Search'}
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            Search across 200,000+ icons from Iconify. Click to preview, import to use offline.
          </p>

          {/* External Results */}
          {externalResults.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">
              {externalQuery && !externalLoading ? 'No results found. Try a different search term.' : 'Enter a search term to find icons.'}
            </p>
          ) : (
            <>
              <div className={`grid ${sizeConfig.grid} gap-2`}>
                {paginatedExternalResults.map((iconName: string) => {
                  const isImported = customIcons.some((c) => c.name === iconName);
                  const isImporting = importingIcon === iconName;

                  return (
                    <div
                      key={iconName}
                      className="group relative flex flex-col items-center"
                    >
                      <button
                        onClick={() => setPreviewIcon(iconName)}
                        className={`${sizeConfig.cell} flex items-center justify-center rounded-lg border border-gray-200 dark:border-dark-border hover:border-blue-500 hover-bg transition-colors`}
                        title={`${iconName}\nClick to preview`}
                      >
                        <Icon icon={iconName} width={sizeConfig.icon} height={sizeConfig.icon} />
                      </button>
                      {displaySize !== 'small' && (
                        <div className="mt-1 flex flex-col items-center">
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-full" title={iconName}>
                            {iconName.split(':')[1]?.slice(0, 10)}
                          </p>
                          {isImported ? (
                            <span className="text-xs text-green-600 dark:text-green-400">Imported</span>
                          ) : (
                            <button
                              onClick={() => handleImportIcon(iconName)}
                              disabled={isImporting}
                              className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
                            >
                              {isImporting ? '...' : '+ Import'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalExternalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-dark-border">
                  <button
                    onClick={() => setExternalPage((p) => Math.max(1, p - 1))}
                    disabled={externalPage === 1}
                    className="p-2 rounded-lg hover-bg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeftIcon className="w-5 h-5" />
                  </button>
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Page {externalPage} of {totalExternalPages} ({externalResults.length} results)
                  </span>
                  <button
                    onClick={() => setExternalPage((p) => Math.min(totalExternalPages, p + 1))}
                    disabled={externalPage === totalExternalPages}
                    className="p-2 rounded-lg hover-bg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRightIcon className="w-5 h-5" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Regular search and content (hidden when external search is open) */}
      {!showExternalSearch && (
        <>
          {/* Search Bar */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search bundled icons... (min 2 characters)"
              className="input w-full pl-10"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Filter by set */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedSet(null)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                selectedSet === null
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'hover:opacity-80'
              }`}
              style={selectedSet !== null ? { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' } : undefined}
            >
              All Sets
            </button>
            {ICON_SETS.map((set) => (
              <button
                key={set.prefix}
                onClick={() => setSelectedSet(set.prefix === selectedSet ? null : set.prefix)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  selectedSet === set.prefix
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'hover:opacity-80'
                }`}
                style={selectedSet !== set.prefix ? { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' } : undefined}
              >
                {set.name}
              </button>
            ))}
          </div>

          {/* Search Results */}
          {searchResults && (
            <div className="card p-4">
              <h2 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                Search Results ({searchResults.length})
              </h2>
              {searchResults.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">No icons found matching "{search}"</p>
              ) : (
                <div className={`grid ${sizeConfig.grid} gap-2`}>
                  {searchResults.map((icon) => (
                    <button
                      key={icon.fullName}
                      onClick={() => setPreviewIcon(icon.fullName)}
                      className={`${sizeConfig.cell} flex items-center justify-center rounded-lg hover-bg border border-transparent hover-border`}
                      title={`${icon.fullName}\nClick to preview`}
                    >
                      <Icon icon={icon.fullName} width={sizeConfig.icon} height={sizeConfig.icon} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Customized Icons Section */}
          {!searchResults && (
            <div className="card overflow-hidden">
              {/* Header */}
              <div className="px-4 py-3 flex items-center justify-between" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                <div className="flex items-center gap-3">
                  <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Customized Icons ({customizedIcons.length})
                  </h2>
                  <SizeSelector />
                </div>
                {canCreate && (
                  <button
                    onClick={() => openCustomizeModal()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                  >
                    <PlusIcon className="w-4 h-4" />
                    New
                  </button>
                )}
              </div>

              {/* Content */}
              <div className="p-3">
                {customizedIcons.length === 0 ? (
                  <p className="text-center py-4" style={{ color: 'var(--text-secondary)' }}>
                    No customized icons yet. Click any icon and choose "Customize" to create one.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {customizedIcons.map((icon) => (
                      <div
                        key={icon.id}
                        className="group relative flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-all hover:scale-[1.02]"
                        style={{ backgroundColor: 'var(--bg-tertiary)' }}
                        onClick={() => openCustomizeModal(icon)}
                      >
                        <div
                          className={`${sizeConfig.cell} flex items-center justify-center rounded-md`}
                          style={{ backgroundColor: icon.backgroundColor || 'var(--bg-secondary)' }}
                        >
                          <IconDisplay
                            icon={icon.sourceIcon}
                            size={sizeConfig.icon}
                            color={isIconColorable(icon.sourceIcon) ? icon.iconColor || undefined : undefined}
                          />
                        </div>
                        <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                          {icon.name}
                        </span>
                        {canDelete && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteCustomized(icon); }}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500 hover:text-white transition-all"
                            style={{ color: 'var(--text-secondary)' }}
                            title="Delete"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Custom/Imported Icons Section */}
          {customIcons.length > 0 && !searchResults && (
            <div className="card overflow-hidden">
              {/* Header */}
              <div className="px-4 py-3 flex items-center justify-between" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                <div className="flex items-center gap-3">
                  <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Imported Icons ({customIcons.length})
                  </h2>
                  <SizeSelector />
                </div>
                <div className="flex items-center gap-2">
                  {selectionMode && selectedImported.size > 0 && canDelete && (
                    <button
                      onClick={handleBulkDelete}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
                    >
                      <TrashIcon className="w-4 h-4" />
                      Delete ({selectedImported.size})
                    </button>
                  )}
                  {selectionMode && (
                    <button
                      onClick={selectAllImported}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                      style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
                    >
                      <CheckIcon className="w-4 h-4" />
                      {selectedImported.size === customIcons.length ? 'Deselect All' : 'Select All'}
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => {
                        setSelectionMode(!selectionMode);
                        setSelectedImported(new Set());
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        selectionMode ? 'bg-blue-500 text-white' : ''
                      }`}
                      style={!selectionMode ? { backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' } : undefined}
                    >
                      <Squares2X2Icon className="w-4 h-4" />
                      {selectionMode ? 'Done' : 'Select'}
                    </button>
                  )}
                </div>
              </div>

              {/* Icons Grid */}
              <div className="p-3">
                <div className="flex flex-wrap gap-2">
                  {customIcons.map((icon) => {
                    const isSelected = selectedImported.has(icon.id);
                    return (
                      <div
                        key={icon.id}
                        className={`relative cursor-pointer transition-all hover:scale-110 hover:opacity-80 ${
                          isSelected ? 'ring-2 ring-blue-500 ring-offset-2 rounded' : ''
                        }`}
                        onClick={() => {
                          if (selectionMode) {
                            toggleIconSelection(icon.id);
                          } else {
                            openImportedDetail(icon);
                          }
                        }}
                        title={icon.name}
                      >
                        <div
                          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(icon.svgData, { USE_PROFILES: { svg: true, svgFilters: true } }) }}
                          className="[&>svg]:w-full [&>svg]:h-full"
                          style={{ width: sizeConfig.icon, height: sizeConfig.icon }}
                        />
                        {selectionMode && isSelected && (
                          <div className="absolute -top-1 -right-1">
                            <CheckCircleIcon className="w-5 h-5 text-blue-500" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Icon Sets by Category */}
          {!searchResults &&
            Object.entries(iconSetsByCategory).map(([category, sets]) => (
              <div key={category} className="space-y-4">
                <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS]}
                </h2>
                {sets
                  .filter((set) => !selectedSet || selectedSet === set.prefix)
                  .map((set) => {
                    const isExpanded = expandedSets.has(set.prefix);
                    const iconCount = getIconCount(set.prefix);
                    const iconNames = isExpanded ? getIconNames(set.prefix).slice(0, 500) : [];

                    return (
                      <div key={set.prefix} className="card overflow-hidden">
                        <button
                          onClick={() => toggleSet(set.prefix)}
                          className="w-full px-4 py-3 flex items-center justify-between hover-bg transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            {isExpanded ? (
                              <ChevronDownIcon className="w-5 h-5 text-gray-500" />
                            ) : (
                              <ChevronRightIcon className="w-5 h-5 text-gray-500" />
                            )}
                            <div className="text-left">
                              <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                                {set.name}
                              </span>
                              <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                                ({iconCount.toLocaleString()} icons)
                              </span>
                              <p className="text-sm text-gray-500 dark:text-gray-400">{set.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {set.colorable ? (
                              <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 rounded">
                                Colorable
                              </span>
                            ) : (
                              <span className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 rounded">
                                Multicolor
                              </span>
                            )}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="px-4 pb-4 border-t border-gray-200 dark:border-dark-border">
                            <div className={`grid ${sizeConfig.grid} gap-2 pt-4`}>
                              {iconNames.map((name) => {
                                const fullName = `${set.prefix}:${name}`;
                                return (
                                  <button
                                    key={fullName}
                                    onClick={() => setPreviewIcon(fullName)}
                                    className={`${sizeConfig.cell} flex items-center justify-center rounded-lg hover-bg border border-transparent hover-border`}
                                    title={`${fullName}\nClick to preview`}
                                  >
                                    <Icon icon={fullName} width={sizeConfig.icon} height={sizeConfig.icon} />
                                  </button>
                                );
                              })}
                            </div>
                            {iconCount > 500 && (
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-4 text-center">
                                Showing first 500 icons. Use search to find more.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            ))}
        </>
      )}

      {/* Icon Preview Modal */}
      {previewIcon && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewIcon(null)}
        >
          <div
            className="rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border"
            style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--bg-tertiary)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--bg-tertiary)' }}>
              <h3 className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>Icon Preview</h3>
              <button
                onClick={() => setPreviewIcon(null)}
                className="p-2 rounded-xl transition-colors hover-bg"
              >
                <XMarkIcon className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="flex flex-col items-center">
                {/* Icon display with multiple sizes */}
                <div className="flex items-end gap-4 mb-6">
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-10 h-10 flex items-center justify-center rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                      <Icon icon={previewIcon} width={24} height={24} />
                    </div>
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>24px</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-16 h-16 flex items-center justify-center rounded-xl" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                      <Icon icon={previewIcon} width={40} height={40} />
                    </div>
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>40px</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-24 h-24 flex items-center justify-center rounded-2xl" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                      <Icon icon={previewIcon} width={64} height={64} />
                    </div>
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>64px</span>
                  </div>
                </div>

                {/* Icon name */}
                <div className="w-full mb-6">
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
                    Icon Name
                  </label>
                  <code
                    className="text-sm px-4 py-2.5 rounded-xl w-full block text-center font-mono"
                    style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                  >
                    {previewIcon}
                  </code>
                </div>

                {/* Status badge */}
                {customIcons.some(c => c.name === previewIcon) && (
                  <div className="mb-4 px-3 py-1.5 rounded-full text-sm font-medium bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400">
                    Already Imported
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t flex gap-3" style={{ borderColor: 'var(--bg-tertiary)', backgroundColor: 'var(--bg-tertiary)' }}>
              <button
                onClick={() => { handleCopyIcon(previewIcon); setPreviewIcon(null); }}
                className="btn btn-secondary flex-1 py-2.5"
              >
                Copy Name
              </button>
              {canCreate && (
                <button
                  onClick={() => startCustomizeFromIcon(previewIcon)}
                  className="btn btn-primary flex-1 py-2.5"
                >
                  Customize
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Usage Modal */}
      {usageModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setUsageModal(null)}
        >
          <div
            className="rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border"
            style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--bg-tertiary)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--bg-tertiary)' }}>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                Icon Usage
              </h2>
              <button
                onClick={() => setUsageModal(null)}
                className="p-2 rounded-xl transition-colors hover-bg"
              >
                <XMarkIcon className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5">
              {/* Icon preview */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 flex items-center justify-center rounded-xl" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                  <Icon icon={usageModal.iconName} width={36} height={36} />
                </div>
                <code
                  className="text-sm px-3 py-1.5 rounded-lg font-mono flex-1"
                  style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                >
                  {usageModal.iconName}
                </code>
              </div>

              {/* Usage sections */}
              {usageModal.usage.categories.length > 0 && (
                <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                  <h3 className="font-medium text-sm mb-2 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    Categories
                    <span className="text-xs px-2 py-0.5 rounded-full ml-auto" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                      {usageModal.usage.categories.length}
                    </span>
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {usageModal.usage.categories.map((c) => (
                      <span key={c.id} className="text-sm px-2.5 py-1 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                        {c.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {usageModal.usage.tags.length > 0 && (
                <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                  <h3 className="font-medium text-sm mb-2 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    Tags
                    <span className="text-xs px-2 py-0.5 rounded-full ml-auto" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                      {usageModal.usage.tags.length}
                    </span>
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {usageModal.usage.tags.map((t) => (
                      <span key={t.id} className="text-sm px-2.5 py-1 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                        {t.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {usageModal.usage.templates.length > 0 && (
                <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                  <h3 className="font-medium text-sm mb-2 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                    Templates
                    <span className="text-xs px-2 py-0.5 rounded-full ml-auto" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                      {usageModal.usage.templates.length}
                    </span>
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {usageModal.usage.templates.map((t) => (
                      <span key={t.id} className="text-sm px-2.5 py-1 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                        {t.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {usageModal.usage.categories.length === 0 &&
                usageModal.usage.tags.length === 0 &&
                usageModal.usage.templates.length === 0 && (
                  <div className="rounded-xl p-6 text-center" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      This icon is not being used anywhere.
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                      Safe to delete if no longer needed.
                    </p>
                  </div>
                )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t" style={{ borderColor: 'var(--bg-tertiary)', backgroundColor: 'var(--bg-tertiary)' }}>
              <button onClick={() => setUsageModal(null)} className="btn btn-secondary w-full py-2.5">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Imported Icon Detail Modal */}
      {importedDetailModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setImportedDetailModal(null)}
        >
          <div
            className="rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border"
            style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--bg-tertiary)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--bg-tertiary)' }}>
              <h3 className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>Imported Icon</h3>
              <button
                onClick={() => setImportedDetailModal(null)}
                className="p-2 rounded-xl transition-colors hover-bg"
              >
                <XMarkIcon className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Icon preview */}
              <div className="flex flex-col items-center mb-6">
                <div
                  className="mb-4 [&>svg]:w-full [&>svg]:h-full"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(importedDetailModal.svgData, { USE_PROFILES: { svg: true, svgFilters: true } }) }}
                  style={{ width: 64, height: 64 }}
                />
                <div className="text-center">
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                    {importedDetailModal.name.split(':')[1] || importedDetailModal.name}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {importedDetailModal.name.split(':')[0]}
                  </p>
                </div>
              </div>

              {/* Full name */}
              <div className="mb-4">
                <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
                  Full Icon Name
                </label>
                <code
                  className="text-sm px-4 py-2.5 rounded-xl w-full block text-center font-mono cursor-pointer hover:opacity-80"
                  style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                  onClick={() => handleCopyIcon(importedDetailModal.name)}
                  title="Click to copy"
                >
                  {importedDetailModal.name}
                </code>
              </div>

              {/* Usage info */}
              <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Usage</h4>
                {loadingUsage ? (
                  <div className="flex items-center justify-center py-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2" style={{ borderColor: 'var(--accent)' }} />
                  </div>
                ) : importedDetailUsage ? (
                  <>
                    {importedDetailUsage.categories.length === 0 &&
                     importedDetailUsage.tags.length === 0 &&
                     importedDetailUsage.templates.length === 0 ? (
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        Not used anywhere. Safe to delete.
                      </p>
                    ) : (
                      <div className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {importedDetailUsage.categories.length > 0 && (
                          <p>
                            <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-2"></span>
                            {importedDetailUsage.categories.length} categor{importedDetailUsage.categories.length === 1 ? 'y' : 'ies'}
                          </p>
                        )}
                        {importedDetailUsage.tags.length > 0 && (
                          <p>
                            <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                            {importedDetailUsage.tags.length} tag{importedDetailUsage.tags.length === 1 ? '' : 's'}
                          </p>
                        )}
                        {importedDetailUsage.templates.length > 0 && (
                          <p>
                            <span className="inline-block w-2 h-2 rounded-full bg-purple-500 mr-2"></span>
                            {importedDetailUsage.templates.length} template{importedDetailUsage.templates.length === 1 ? '' : 's'}
                          </p>
                        )}
                      </div>
                    )}
                  </>
                ) : null}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t flex gap-3" style={{ borderColor: 'var(--bg-tertiary)', backgroundColor: 'var(--bg-tertiary)' }}>
              <button
                onClick={() => handleCopyIcon(importedDetailModal.name)}
                className="btn btn-secondary flex-1 py-2.5"
              >
                Copy Name
              </button>
              {canCreate && (
                <button
                  onClick={() => { startCustomizeFromIcon(importedDetailModal.name); setImportedDetailModal(null); }}
                  className="btn btn-primary flex-1 py-2.5"
                >
                  Customize
                </button>
              )}
              {canDelete && (
                <button
                  onClick={() => handleDeleteImported(importedDetailModal)}
                  disabled={loadingUsage || !!(importedDetailUsage && (
                    importedDetailUsage.categories.length > 0 ||
                    importedDetailUsage.tags.length > 0 ||
                    importedDetailUsage.templates.length > 0
                  ))}
                  className="btn flex-1 py-2.5 bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Customize Icon Modal */}
      {showCustomizeModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowCustomizeModal(false)}
        >
          <div
            className="rounded-2xl shadow-2xl w-full max-w-md border"
            style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--bg-tertiary)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--bg-tertiary)' }}>
              <h3 className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>
                {editingCustomized ? 'Edit Customized Icon' : 'Create Customized Icon'}
              </h3>
              <button
                onClick={() => setShowCustomizeModal(false)}
                className="p-2 rounded-xl transition-colors hover-bg"
              >
                <XMarkIcon className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* Preview */}
              <div className="flex justify-center">
                <div
                  className="w-20 h-20 flex items-center justify-center rounded-2xl"
                  style={{ backgroundColor: customizeBgColor }}
                >
                  {customizeSourceIcon ? (
                    <IconDisplay
                      icon={customizeSourceIcon}
                      size={48}
                      color={isIconColorable(customizeSourceIcon) ? customizeIconColor : undefined}
                    />
                  ) : (
                    <span className="text-3xl" style={{ color: 'var(--text-secondary)' }}>?</span>
                  )}
                </div>
              </div>

              {/* Name input */}
              <div>
                <label className="text-sm font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
                  Display Name *
                </label>
                <input
                  type="text"
                  value={customizeName}
                  onChange={(e) => setCustomizeName(e.target.value)}
                  className="input w-full"
                  placeholder="e.g., Red Alert, Primary Button"
                />
              </div>

              {/* Source icon - with search functionality */}
              <div>
                <label className="text-sm font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
                  Source Icon {!editingCustomized && '*'}
                </label>
                {editingCustomized ? (
                  <code
                    className="text-sm px-4 py-2.5 rounded-xl w-full block font-mono"
                    style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                  >
                    {customizeSourceIcon}
                  </code>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      value={customizeSourceIcon}
                      onChange={(e) => setCustomizeSourceIcon(e.target.value)}
                      className="input w-full font-mono text-sm"
                      placeholder="Search icons... (e.g., mdi:car, lucide:home)"
                    />
                    {customizeSourceIcon && customizeSourceIcon.length >= 2 && !customizeSourceIcon.includes(':') && (
                      <div
                        className="absolute top-full left-0 right-0 mt-1 rounded-xl border shadow-lg max-h-48 overflow-y-auto z-[200]"
                        style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--bg-tertiary)' }}
                      >
                        {/* Search bundled icons */}
                        {(() => {
                          const results = searchIcons(customizeSourceIcon, undefined, 30);
                          if (results.length === 0) {
                            return (
                              <p className="p-3 text-sm text-center" style={{ color: 'var(--text-secondary)' }}>
                                No icons found
                              </p>
                            );
                          }
                          return (
                            <div className="p-2 grid grid-cols-6 gap-1">
                              {results.map((icon) => (
                                <button
                                  key={icon.fullName}
                                  type="button"
                                  onClick={() => setCustomizeSourceIcon(icon.fullName)}
                                  className="w-10 h-10 flex items-center justify-center rounded-lg hover-bg"
                                  title={icon.fullName}
                                >
                                  <Icon icon={icon.fullName} width={24} height={24} />
                                </button>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    )}
                    {customizeSourceIcon && customizeSourceIcon.includes(':') && (
                      <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                        Selected: <span style={{ color: 'var(--accent)' }}>{customizeSourceIcon}</span>
                        <button
                          type="button"
                          onClick={() => setCustomizeSourceIcon('')}
                          className="ml-2 underline hover:no-underline"
                        >
                          Clear
                        </button>
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Colors - only show when source icon is selected */}
              {customizeSourceIcon && (
                <div className="grid grid-cols-2 gap-4">
                  {/* Background color */}
                  <div className="relative">
                    <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text-secondary)' }}>
                      Background
                    </label>
                    <ColorPicker
                      value={customizeBgColor}
                      onChange={setCustomizeBgColor}
                      shape="square"
                      size="md"
                      showOpacity
                    />
                  </div>

                  {/* Icon color (only for colorable icons) */}
                  <div className="relative">
                    <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text-secondary)' }}>
                      Icon Color {!isIconColorable(customizeSourceIcon) && <span className="text-xs">(N/A)</span>}
                    </label>
                    <ColorPicker
                      value={customizeIconColor}
                      onChange={setCustomizeIconColor}
                      shape="circle"
                      size="md"
                      disabled={!isIconColorable(customizeSourceIcon)}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t flex gap-3" style={{ borderColor: 'var(--bg-tertiary)', backgroundColor: 'var(--bg-tertiary)' }}>
              <button
                onClick={() => setShowCustomizeModal(false)}
                className="btn btn-secondary flex-1 py-2.5"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCustomized}
                disabled={!customizeName.trim() || !customizeSourceIcon}
                className="btn btn-primary flex-1 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingCustomized ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
