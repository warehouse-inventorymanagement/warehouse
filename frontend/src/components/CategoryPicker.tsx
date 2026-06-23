import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronRightIcon,
  ChevronDownIcon,
  FolderIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { Icon } from '@iconify/react';
import type { Category } from '../types';

interface CategoryPickerProps {
  value: string;
  onChange: (categoryId: string) => void;
  categories: Category[]; // Flat list with parent info
  hierarchicalCategories: Category[]; // Tree structure
  placeholder?: string;
}

export default function CategoryPicker({
  value,
  onChange,
  categories,
  hierarchicalCategories,
  placeholder = 'Select category'
}: CategoryPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Find selected category
  const selectedCategory = categories.find(cat => cat.id === value);

  // Build full path for display
  const buildPath = (category: Category): string => {
    const path: string[] = [];
    let current: Category | undefined = category;

    while (current) {
      path.unshift(current.name);
      if (current.parentId) {
        current = categories.find(c => c.id === current!.parentId);
      } else {
        current = undefined;
      }
    }

    return path.join(' > ');
  };

  // Filter categories based on search
  const filterCategories = (cats: Category[], query: string): Category[] => {
    if (!query.trim()) return cats;

    const lowerQuery = query.toLowerCase();

    const filterTree = (items: Category[]): Category[] => {
      return items.reduce((acc: Category[], cat) => {
        const matches = cat.name.toLowerCase().includes(lowerQuery);

        const filteredChildren = cat.children ? filterTree(cat.children) : [];

        if (matches || filteredChildren.length > 0) {
          acc.push({
            ...cat,
            children: filteredChildren.length > 0 ? filteredChildren : cat.children
          });
        }

        return acc;
      }, []);
    };

    return filterTree(cats);
  };

  const filteredCategories = filterCategories(hierarchicalCategories, searchQuery);

  // Auto-expand when searching
  useEffect(() => {
    if (searchQuery.trim()) {
      const allIds = new Set<string>();
      const collectIds = (cats: Category[]) => {
        cats.forEach(cat => {
          allIds.add(cat.id);
          if (cat.children) collectIds(cat.children);
        });
      };
      collectIds(filteredCategories);
      setExpandedIds(allIds);
    }
  }, [searchQuery, filteredCategories]);

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

  const handleSelect = (categoryId: string) => {
    onChange(categoryId);
    setIsOpen(false);
    setSearchQuery('');
  };

  const renderCategory = (category: Category, depth = 0): JSX.Element => {
    const hasChildren = category.children && category.children.length > 0;
    const isExpanded = expandedIds.has(category.id);
    const isSelected = value === category.id;

    return (
      <div key={category.id}>
        <div
          className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${
            isSelected ? 'bg-[var(--accent)]/10' : 'hover:bg-[var(--bg-tertiary)]'
          }`}
          style={{
            paddingLeft: `${depth * 16 + 12}px`,
            borderLeft: isSelected ? '3px solid var(--accent)' : '3px solid transparent'
          }}
          onClick={() => handleSelect(category.id)}
        >
          {/* Expand/collapse button */}
          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleExpand(category.id, e);
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

          {/* Category icon */}
          <div
            className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: category.iconBackgroundColor || 'var(--bg-tertiary)' }}
          >
            {category.icon ? (
              <Icon
                icon={category.icon}
                className="w-3.5 h-3.5"
                style={{ color: category.iconColor || 'var(--text-secondary)' }}
              />
            ) : (
              <FolderIcon className="w-3.5 h-3.5" style={{ color: 'var(--text-secondary)' }} />
            )}
          </div>

          {/* Name */}
          <span
            className="flex-1 truncate text-sm"
            style={{ color: isSelected ? 'var(--accent)' : 'var(--text-primary)' }}
          >
            {category.name}
          </span>

          {/* Selected check */}
          {isSelected && (
            <CheckIcon className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--accent)' }} />
          )}
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div>
            {category.children!.map(child => renderCategory(child, depth + 1))}
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
        {selectedCategory ? (
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: selectedCategory.iconBackgroundColor || 'var(--bg-tertiary)' }}
            >
              {selectedCategory.icon ? (
                <Icon
                  icon={selectedCategory.icon}
                  className="w-3.5 h-3.5"
                  style={{ color: selectedCategory.iconColor || 'var(--text-secondary)' }}
                />
              ) : (
                <FolderIcon className="w-3.5 h-3.5" style={{ color: 'var(--text-secondary)' }} />
              )}
            </div>
            <span className="truncate" style={{ color: 'var(--text-primary)' }}>
              {buildPath(selectedCategory)}
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
                placeholder="Search categories..."
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
              style={{ borderLeft: !value ? '3px solid var(--accent)' : '3px solid transparent' }}
              onClick={() => handleSelect('')}
            >
              <div className="w-7" />
              <div
                className="w-6 h-6 rounded flex items-center justify-center"
                style={{ backgroundColor: 'var(--bg-tertiary)' }}
              >
                <FolderIcon className="w-3.5 h-3.5" style={{ color: 'var(--text-secondary)' }} />
              </div>
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                No category
              </span>
              {!value && (
                <CheckIcon className="w-4 h-4 ml-auto" style={{ color: 'var(--accent)' }} />
              )}
            </div>

            {/* Category tree */}
            {filteredCategories.length > 0 ? (
              filteredCategories.map(cat => renderCategory(cat))
            ) : (
              <div className="px-3 py-4 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
                No categories found
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
