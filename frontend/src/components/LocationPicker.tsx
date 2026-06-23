import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronRightIcon,
  ChevronDownIcon,
  MapPinIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  BuildingStorefrontIcon,
  HomeModernIcon,
  Squares2X2Icon,
  ArrowsPointingInIcon,
  QueueListIcon,
  ViewColumnsIcon,
  ArchiveBoxIcon,
  CubeIcon,
  InboxIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import type { Location } from '../types';

// Location types configuration
const LOCATION_TYPES: Record<string, { icon: React.ComponentType<any>; color: string; bgColor: string }> = {
  location: { icon: BuildingStorefrontIcon, color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.15)' },
  room: { icon: HomeModernIcon, color: '#6366f1', bgColor: 'rgba(99, 102, 241, 0.15)' },
  zone: { icon: Squares2X2Icon, color: '#a855f7', bgColor: 'rgba(168, 85, 247, 0.15)' },
  aisle: { icon: ArrowsPointingInIcon, color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.15)' },
  row: { icon: QueueListIcon, color: '#eab308', bgColor: 'rgba(234, 179, 8, 0.15)' },
  bay: { icon: ViewColumnsIcon, color: '#14b8a6', bgColor: 'rgba(20, 184, 166, 0.15)' },
  shelf: { icon: ArchiveBoxIcon, color: '#f97316', bgColor: 'rgba(249, 115, 22, 0.15)' },
  bin: { icon: CubeIcon, color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.15)' },
  box: { icon: InboxIcon, color: '#ec4899', bgColor: 'rgba(236, 72, 153, 0.15)' }
};

const getTypeConfig = (type: string) => {
  return LOCATION_TYPES[type] || LOCATION_TYPES.location;
};

interface LocationPickerProps {
  value: string;
  onChange: (locationId: string) => void;
  locations: Location[]; // Flat list with parent info
  hierarchicalLocations: Location[]; // Tree structure
  placeholder?: string;
}

export default function LocationPicker({
  value,
  onChange,
  locations,
  hierarchicalLocations,
  placeholder = 'Select location'
}: LocationPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Find selected location
  const selectedLocation = locations.find(loc => loc.id === value);

  // Build full path for display
  const buildPath = (location: Location): string => {
    const path: string[] = [];
    let current: Location | undefined = location;

    while (current) {
      path.unshift(current.name);
      if (current.parentId) {
        current = locations.find(l => l.id === current!.parentId);
      } else {
        current = undefined;
      }
    }

    return path.join(' > ');
  };

  // Filter locations based on search
  const filterLocations = (locs: Location[], query: string): Location[] => {
    if (!query.trim()) return locs;

    const lowerQuery = query.toLowerCase();

    const filterTree = (items: Location[]): Location[] => {
      return items.reduce((acc: Location[], loc) => {
        const matches = loc.name.toLowerCase().includes(lowerQuery) ||
                       loc.type?.toLowerCase().includes(lowerQuery);

        const filteredChildren = loc.children ? filterTree(loc.children) : [];

        if (matches || filteredChildren.length > 0) {
          acc.push({
            ...loc,
            children: filteredChildren.length > 0 ? filteredChildren : loc.children
          });
        }

        return acc;
      }, []);
    };

    return filterTree(locs);
  };

  const filteredLocations = filterLocations(hierarchicalLocations, searchQuery);

  // Auto-expand when searching
  useEffect(() => {
    if (searchQuery.trim()) {
      const allIds = new Set<string>();
      const collectIds = (locs: Location[]) => {
        locs.forEach(loc => {
          allIds.add(loc.id);
          if (loc.children) collectIds(loc.children);
        });
      };
      collectIds(filteredLocations);
      setExpandedIds(allIds);
    }
  }, [searchQuery, filteredLocations]);

  // Focus search on open and calculate position
  useEffect(() => {
    if (isOpen) {
      if (searchInputRef.current) {
        setTimeout(() => searchInputRef.current?.focus(), 100);
      }
      // Calculate dropdown position
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const dropdownHeight = 320;
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;

        // Show above if not enough space below
        if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
          setDropdownStyle({
            position: 'fixed',
            bottom: `${window.innerHeight - rect.top + 4}px`,
            left: `${rect.left}px`,
            width: `${rect.width}px`,
            maxHeight: `${Math.min(dropdownHeight, spaceAbove - 8)}px`,
          });
        } else {
          setDropdownStyle({
            position: 'fixed',
            top: `${rect.bottom + 4}px`,
            left: `${rect.left}px`,
            width: `${rect.width}px`,
            maxHeight: `${Math.min(dropdownHeight, spaceBelow - 8)}px`,
          });
        }
      }
    }
  }, [isOpen]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const isInsideContainer = containerRef.current?.contains(target);
      const isInsideDropdown = dropdownRef.current?.contains(target);
      if (!isInsideContainer && !isInsideDropdown) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelect = (locationId: string) => {
    onChange(locationId);
    setIsOpen(false);
    setSearchQuery('');
  };

  const renderLocation = (location: Location, depth = 0): JSX.Element => {
    const hasChildren = location.children && location.children.length > 0;
    const isExpanded = expandedIds.has(location.id);
    const isSelected = value === location.id;
    const typeConfig = getTypeConfig(location.type || 'location');
    const TypeIcon = typeConfig.icon;

    return (
      <div key={location.id}>
        <div
          className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${
            isSelected ? 'bg-[var(--accent)]/10' : 'hover:bg-[var(--bg-tertiary)]'
          }`}
          style={{ paddingLeft: `${depth * 16 + 12}px` }}
          onClick={() => handleSelect(location.id)}
        >
          {/* Expand/collapse button */}
          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleExpand(location.id, e);
              }}
              className="w-7 h-7 flex items-center justify-center flex-shrink-0 rounded-md hover:bg-[var(--bg-primary)] transition-colors"
              style={{ backgroundColor: 'var(--bg-tertiary)' }}
            >
              {isExpanded ? (
                <ChevronDownIcon className="w-4 h-4" style={{ color: 'var(--text-primary)' }} />
              ) : (
                <ChevronRightIcon className="w-4 h-4" style={{ color: 'var(--text-primary)' }} />
              )}
            </button>
          ) : (
            <div className="w-7" />
          )}

          {/* Type icon */}
          <div
            className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: typeConfig.bgColor }}
          >
            <TypeIcon className="w-3.5 h-3.5" style={{ color: typeConfig.color }} />
          </div>

          {/* Name and type badge */}
          <div className="flex-1 min-w-0 flex items-center gap-2">
            <span
              className="truncate text-sm"
              style={{ color: isSelected ? 'var(--accent)' : 'var(--text-primary)' }}
            >
              {location.name}
            </span>
            <span
              className="text-xs px-1.5 py-0.5 rounded flex-shrink-0"
              style={{ backgroundColor: typeConfig.bgColor, color: typeConfig.color }}
            >
              {location.type}
            </span>
          </div>

          {/* Selected check */}
          {isSelected && (
            <CheckIcon className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--accent)' }} />
          )}
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div>
            {location.children!.map(child => renderLocation(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="input w-full text-left flex items-center justify-between gap-2"
      >
        {selectedLocation ? (
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: getTypeConfig(selectedLocation.type || 'location').bgColor }}
            >
              {(() => {
                const TypeIcon = getTypeConfig(selectedLocation.type || 'location').icon;
                return <TypeIcon className="w-3.5 h-3.5" style={{ color: getTypeConfig(selectedLocation.type || 'location').color }} />;
              })()}
            </div>
            <span className="truncate" style={{ color: 'var(--text-primary)' }}>
              {buildPath(selectedLocation)}
            </span>
          </div>
        ) : (
          <span style={{ color: 'var(--text-secondary)' }}>{placeholder}</span>
        )}
        <ChevronDownIcon
          className={`w-4 h-4 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          style={{ color: 'var(--text-secondary)' }}
        />
      </button>

      {/* Dropdown - rendered via portal */}
      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          className="rounded-xl shadow-lg overflow-hidden flex flex-col"
          style={{
            ...dropdownStyle,
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--bg-tertiary)',
            zIndex: 9999,
          }}
        >
          {/* Search */}
          <div className="p-2 border-b flex-shrink-0" style={{ borderColor: 'var(--bg-tertiary)' }}>
            <div className="relative">
              <MagnifyingGlassIcon
                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: 'var(--text-secondary)' }}
              />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search locations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-8 py-2 text-sm rounded-lg"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  border: 'none',
                  outline: 'none'
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-[var(--bg-secondary)]"
                >
                  <XMarkIcon className="w-3.5 h-3.5" style={{ color: 'var(--text-secondary)' }} />
                </button>
              )}
            </div>
          </div>

          {/* Options */}
          <div className="overflow-y-auto flex-1 min-h-0">
            {/* Clear option */}
            <div
              className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${
                !value ? 'bg-[var(--accent)]/10' : 'hover:bg-[var(--bg-tertiary)]'
              }`}
              onClick={() => handleSelect('')}
            >
              <div className="w-5" />
              <div
                className="w-6 h-6 rounded flex items-center justify-center"
                style={{ backgroundColor: 'var(--bg-tertiary)' }}
              >
                <MapPinIcon className="w-3.5 h-3.5" style={{ color: 'var(--text-secondary)' }} />
              </div>
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                No location
              </span>
              {!value && (
                <CheckIcon className="w-4 h-4 ml-auto" style={{ color: 'var(--accent)' }} />
              )}
            </div>

            {/* Location tree */}
            {filteredLocations.length > 0 ? (
              filteredLocations.map(loc => renderLocation(loc))
            ) : (
              <div className="px-3 py-4 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
                No locations found
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
