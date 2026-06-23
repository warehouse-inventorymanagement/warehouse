import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@iconify/react';
import { MagnifyingGlassIcon, XMarkIcon, StarIcon } from '@heroicons/react/24/outline';
import { ICON_SETS, isIconColorable } from '../config/iconSets';
import { getIconNames, searchIcons } from '../utils/iconLoader';
import ColorPicker from './ColorPicker';
import { iconsApi, CustomizedIcon } from '../services/api';

export type IconSize = 'small' | 'medium' | 'large';

interface IconPickerProps {
  value: string;
  onChange: (iconName: string) => void;
  color?: string;
  onColorChange?: (color: string) => void;
  backgroundColor?: string;
  onBackgroundColorChange?: (color: string) => void;
  size?: IconSize;
  onSizeChange?: (size: IconSize) => void;
  showSizeSelector?: boolean;
  showColorPicker?: boolean;
}

const SIZE_VALUES: Record<IconSize, number> = {
  small: 16,
  medium: 24,
  large: 32,
};

type GridSize = 'S' | 'M' | 'L' | 'X';

const GRID_CONFIG: Record<GridSize, { icon: number; cell: string; cols: string }> = {
  S: { icon: 16, cell: 'w-7 h-7', cols: 'grid-cols-12' },
  M: { icon: 20, cell: 'w-9 h-9', cols: 'grid-cols-10' },
  L: { icon: 28, cell: 'w-11 h-11', cols: 'grid-cols-8' },
  X: { icon: 36, cell: 'w-14 h-14', cols: 'grid-cols-6' },
};

export function IconDisplay({
  icon,
  size = 'medium',
  color,
  className = ''
}: {
  icon: string;
  size?: IconSize | number;
  color?: string;
  className?: string;
}) {
  if (!icon) return null;

  // Convert size to pixels
  const pixelSize = typeof size === 'number' ? size : SIZE_VALUES[size] || 24;

  // Legacy emoji support
  if (!icon.includes(':') && !icon.startsWith('mdi-') && !icon.startsWith('material-') && !icon.startsWith('ic-')) {
    if (icon.length <= 4 || /\p{Emoji}/u.test(icon)) {
      return <span className={className} style={{ fontSize: `${pixelSize * 0.0625}rem` }}>{icon}</span>;
    }
  }

  // Only apply color if the icon is colorable
  const effectiveColor = isIconColorable(icon) ? color : undefined;

  return <Icon icon={icon} width={pixelSize} height={pixelSize} color={effectiveColor} className={className} />;
}

export default function IconPicker({
  value,
  onChange,
  color,
  onColorChange,
  backgroundColor,
  onBackgroundColorChange,
  size = 'medium',
  onSizeChange,
  showSizeSelector = false,
  showColorPicker = false,
}: IconPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeSet, setActiveSet] = useState<string>('lucide');
  const [gridSize, setGridSize] = useState<GridSize>('M');
  const [previewIcon, setPreviewIcon] = useState<string | null>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const pickerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Customized icons
  const [customizedIcons, setCustomizedIcons] = useState<CustomizedIcon[]>([]);

  // Determine if current icon is colorable
  const currentIconColorable = value ? isIconColorable(value) : true;
  const gridConfig = GRID_CONFIG[gridSize];

  // Fetch customized icons when picker opens
  useEffect(() => {
    if (isOpen) {
      iconsApi.getCustomized()
        .then(res => setCustomizedIcons(res.data.data))
        .catch(() => {}); // Silently fail
    }
  }, [isOpen]);

  // Calculate dropdown position based on available space (using fixed positioning via portal)
  useEffect(() => {
    if (isOpen && pickerRef.current) {
      const rect = pickerRef.current.getBoundingClientRect();
      const dropdownWidth = 420;
      const dropdownHeight = 500; // approximate max height
      const margin = 8;

      const spaceOnRight = window.innerWidth - rect.right;

      let top: number;
      let left: number;

      // Try to position to the right first
      if (spaceOnRight >= dropdownWidth + margin) {
        left = rect.right + margin;
        top = rect.top;
        // Adjust if it would go off the bottom
        if (top + dropdownHeight > window.innerHeight - margin) {
          top = Math.max(margin, window.innerHeight - dropdownHeight - margin);
        }
      } else {
        // Position below
        left = rect.left;
        top = rect.bottom + margin;
        // Adjust if it would go off the right
        if (left + dropdownWidth > window.innerWidth - margin) {
          left = Math.max(margin, window.innerWidth - dropdownWidth - margin);
        }
        // Adjust if it would go off the bottom
        if (top + dropdownHeight > window.innerHeight - margin) {
          top = Math.max(margin, rect.top - dropdownHeight - margin);
        }
      }

      setDropdownStyle({
        position: 'fixed',
        top: `${top}px`,
        left: `${left}px`,
        maxHeight: `${Math.min(dropdownHeight, window.innerHeight - top - margin)}px`,
      });
    }
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isInsidePicker = pickerRef.current?.contains(target);
      const isInsideDropdown = dropdownRef.current?.contains(target);

      if (!isInsidePicker && !isInsideDropdown) {
        setIsOpen(false);
        setPreviewIcon(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get icons for current set or search results
  const displayedIcons = useMemo(() => {
    if (search && search.length >= 2) {
      // Search across all sets
      return searchIcons(search, undefined, 100);
    }
    // Show icons from active set
    const icons = getIconNames(activeSet).slice(0, 200);
    return icons.map(name => ({
      prefix: activeSet,
      name,
      fullName: `${activeSet}:${name}`,
    }));
  }, [search, activeSet]);

  const activeSetConfig = ICON_SETS.find(s => s.prefix === activeSet);

  const handleSelectIcon = (iconName: string) => {
    onChange(iconName);
    setIsOpen(false);
    setSearch('');
    setPreviewIcon(null);
  };

  // Handle selecting a customized icon - applies its saved colors
  const handleSelectCustomizedIcon = (customIcon: CustomizedIcon) => {
    onChange(customIcon.sourceIcon);
    // Apply the customized icon's color settings
    if (onColorChange && customIcon.iconColor) {
      onColorChange(customIcon.iconColor);
    }
    if (onBackgroundColorChange && customIcon.backgroundColor) {
      onBackgroundColorChange(customIcon.backgroundColor);
    }
    setIsOpen(false);
    setSearch('');
    setPreviewIcon(null);
  };

  return (
    <div className="relative" ref={pickerRef}>
      <label className="label">Icon</label>
      <div className="flex gap-2 items-center">
        {/* Icon button with background */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-12 h-12 flex items-center justify-center rounded-xl transition-colors hover:ring-2 hover:ring-offset-2 hover:ring-blue-400"
          style={{
            backgroundColor: backgroundColor || 'var(--bg-tertiary)',
            '--tw-ring-offset-color': 'var(--bg-secondary)',
          } as React.CSSProperties}
        >
          {value ? (
            <IconDisplay icon={value} size={size} color={currentIconColorable ? color : undefined} />
          ) : (
            <Icon icon="lucide:image" width={24} height={24} style={{ color: 'var(--text-secondary)' }} />
          )}
        </button>

        {/* Background Color Picker (square) */}
        {onBackgroundColorChange && (
          <ColorPicker
            value={backgroundColor || '#374151'}
            onChange={onBackgroundColorChange}
            shape="square"
            size="md"
            showOpacity
          />
        )}

        {/* Icon Color Picker (circle) */}
        {showColorPicker && onColorChange && (
          <ColorPicker
            value={color || '#FFFFFF'}
            onChange={onColorChange}
            shape="circle"
            size="md"
            disabled={!currentIconColorable}
          />
        )}

        {/* Size Selector */}
        {showSizeSelector && onSizeChange && (
          <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid var(--bg-tertiary)' }}>
            {(['small', 'medium', 'large'] as IconSize[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onSizeChange(s)}
                className={`px-2 h-10 text-xs font-medium transition-colors ${
                  size === s ? 'bg-blue-600 text-white' : ''
                }`}
                style={size !== s ? { backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' } : undefined}
                title={`${s.charAt(0).toUpperCase() + s.slice(1)} (${SIZE_VALUES[s]}px)`}
              >
                {s.charAt(0).toUpperCase()}
              </button>
            ))}
          </div>
        )}

        {/* Clear button */}
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-sm text-red-500 hover:text-red-600 font-medium"
          >
            Clear
          </button>
        )}
      </div>

      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          className="rounded-xl shadow-lg z-[9999] w-[420px] flex flex-col"
          style={{
            ...dropdownStyle,
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--bg-tertiary)',
          }}
        >
          {/* Header with search and grid size */}
          <div className="p-2 border-b" style={{ borderColor: 'var(--bg-tertiary)' }}>
            <div className="flex gap-2 items-center">
              <div className="relative flex-1">
                <MagnifyingGlassIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search all icons..."
                  className="input w-full pl-8 py-1.5 text-sm"
                  autoFocus
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
              {/* Grid size selector */}
              <div className="flex rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                {(Object.keys(GRID_CONFIG) as GridSize[]).map((gs) => (
                  <button
                    key={gs}
                    type="button"
                    onClick={() => setGridSize(gs)}
                    className={`px-2 py-1 text-xs font-medium transition-colors ${
                      gridSize === gs ? 'bg-blue-600 text-white' : ''
                    }`}
                    style={gridSize !== gs ? { color: 'var(--text-secondary)' } : undefined}
                    title={`${gs === 'S' ? 'Small' : gs === 'M' ? 'Medium' : gs === 'L' ? 'Large' : 'Extra Large'} grid`}
                  >
                    {gs}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Set Tabs (only show when not searching) */}
          {!search && (
            <div className="p-2 border-b" style={{ borderColor: 'var(--bg-tertiary)' }}>
              <div className="flex flex-wrap gap-1">
                {ICON_SETS.map((set) => (
                  <button
                    key={set.prefix}
                    type="button"
                    onClick={() => setActiveSet(set.prefix)}
                    className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                      activeSet === set.prefix ? 'bg-blue-600 text-white' : ''
                    }`}
                    style={activeSet !== set.prefix ? { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' } : undefined}
                    title={set.description}
                  >
                    {set.name}
                  </button>
                ))}
              </div>
              {activeSetConfig && (
                <div className="flex items-center gap-2 mt-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <span>{activeSetConfig.description}</span>
                  {activeSetConfig.colorable ? (
                    <span className="px-1.5 py-0.5 bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 rounded">
                      Colorable
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 rounded">
                      Multicolor
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Customized Icons Section (at top) */}
          {customizedIcons.length > 0 && !search && (
            <div className="p-2 border-b" style={{ borderColor: 'var(--bg-tertiary)' }}>
              <div className="flex items-center gap-1.5 mb-2">
                <StarIcon className="w-4 h-4 text-yellow-500" />
                <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Customized ({customizedIcons.length})
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {customizedIcons.map((customIcon) => (
                  <button
                    key={customIcon.id}
                    type="button"
                    onClick={() => handleSelectCustomizedIcon(customIcon)}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-colors ${
                      value === customIcon.sourceIcon ? 'ring-2 ring-blue-500' : ''
                    }`}
                    style={{ backgroundColor: 'var(--bg-tertiary)' }}
                    title={`${customIcon.name}\nSource: ${customIcon.sourceIcon}`}
                  >
                    <div
                      className="w-6 h-6 flex items-center justify-center rounded"
                      style={{ backgroundColor: customIcon.backgroundColor || 'transparent' }}
                    >
                      <IconDisplay
                        icon={customIcon.sourceIcon}
                        size={16}
                        color={isIconColorable(customIcon.sourceIcon) ? customIcon.iconColor || undefined : undefined}
                      />
                    </div>
                    <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                      {customIcon.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Icons Grid */}
          <div className="p-2 flex-1 overflow-y-auto min-h-0">
            {search && search.length < 2 ? (
              <p className="text-center py-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                Type at least 2 characters to search
              </p>
            ) : displayedIcons.length === 0 ? (
              <p className="text-center py-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                No icons found
              </p>
            ) : (
              <>
                <div className={`grid ${gridConfig.cols} gap-1`}>
                  {displayedIcons.map((icon) => {
                    const iconColorable = isIconColorable(icon.fullName);
                    return (
                      <button
                        key={icon.fullName}
                        type="button"
                        onClick={() => setPreviewIcon(icon.fullName)}
                        onDoubleClick={() => handleSelectIcon(icon.fullName)}
                        className={`${gridConfig.cell} flex items-center justify-center rounded transition-colors ${
                          value === icon.fullName ? 'bg-blue-100 dark:bg-blue-500/20 ring-2 ring-blue-500' : ''
                        }`}
                        style={{
                          backgroundColor: value === icon.fullName ? undefined : 'transparent',
                        }}
                        onMouseEnter={(e) => {
                          if (value !== icon.fullName) {
                            e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (value !== icon.fullName) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }
                        }}
                        title={`${icon.fullName}\nClick to preview, double-click to select`}
                      >
                        <Icon
                          icon={icon.fullName}
                          width={gridConfig.icon}
                          height={gridConfig.icon}
                          color={value === icon.fullName && iconColorable ? color : undefined}
                        />
                      </button>
                    );
                  })}
                </div>
                {!search && displayedIcons.length >= 200 && (
                  <p className="text-xs mt-2 text-center" style={{ color: 'var(--text-secondary)' }}>
                    Showing first 200 icons. Use search to find more.
                  </p>
                )}
              </>
            )}
          </div>

          {/* Preview / Selection area */}
          {previewIcon && (
            <div className="p-3 border-t" style={{ borderColor: 'var(--bg-tertiary)' }}>
              <div className="flex items-center gap-3">
                <div
                  className="w-16 h-16 flex items-center justify-center rounded-lg"
                  style={{ backgroundColor: 'var(--bg-tertiary)' }}
                >
                  <Icon icon={previewIcon} width={48} height={48} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-mono truncate" style={{ color: 'var(--text-primary)' }}>
                    {previewIcon}
                  </p>
                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => handleSelectIcon(previewIcon)}
                      className="btn btn-primary text-xs px-3 py-1"
                    >
                      Select
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewIcon(null)}
                      className="btn btn-secondary text-xs px-3 py-1"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Clear Button */}
          {value && !previewIcon && (
            <div className="p-2 border-t" style={{ borderColor: 'var(--bg-tertiary)' }}>
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setIsOpen(false);
                }}
                className="w-full flex items-center justify-center gap-1 text-sm text-red-600 hover:text-red-700 py-1"
              >
                <XMarkIcon className="w-4 h-4" />
                Remove icon
              </button>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
