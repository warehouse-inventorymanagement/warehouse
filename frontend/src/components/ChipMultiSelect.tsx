import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon, CheckIcon, ChevronDownIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface Option {
  id: string;
  label: string;
  sublabel?: string;
}

interface ChipMultiSelectProps {
  label: string;
  options: Option[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
}

export default function ChipMultiSelect({
  label,
  options,
  selectedIds,
  onChange,
  placeholder = 'Select...'
}: ChipMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  // Filter options based on search
  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    opt.sublabel?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Selected options for chip display
  const selectedOptions = options.filter(opt => selectedIds.includes(opt.id));

  // Toggle selection
  const toggleOption = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(i => i !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  // Remove chip
  const removeChip = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedIds.filter(i => i !== id));
  };

  // Select all / none
  const selectAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(options.map(o => o.id));
  };
  const selectNone = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  // Focus search on open and calculate position
  useEffect(() => {
    if (isOpen) {
      if (searchInputRef.current) {
        setTimeout(() => searchInputRef.current?.focus(), 100);
      }
      // Calculate dropdown position
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const dropdownHeight = 280;
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;

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
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!containerRef.current?.contains(target) && !dropdownRef.current?.contains(target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef}>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          {label}
        </label>
        <div className="flex gap-1">
          <button
            type="button"
            className="text-xs px-1.5 py-0.5 rounded transition-colors hover:bg-[var(--bg-tertiary)]"
            style={{ color: 'var(--accent)' }}
            onClick={selectAll}
          >
            All
          </button>
          <button
            type="button"
            className="text-xs px-1.5 py-0.5 rounded transition-colors hover:bg-[var(--bg-tertiary)]"
            style={{ color: 'var(--text-secondary)' }}
            onClick={selectNone}
          >
            None
          </button>
        </div>
      </div>

      {/* Trigger area with chips */}
      <div
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className="min-h-[42px] px-3 py-2 rounded-lg border cursor-pointer transition-all"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          borderColor: isOpen ? 'var(--accent)' : 'var(--bg-tertiary)',
          boxShadow: isOpen ? '0 0 0 3px color-mix(in srgb, var(--accent) 15%, transparent)' : 'none'
        }}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        {selectedOptions.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {selectedOptions.slice(0, 5).map(opt => (
              <span
                key={opt.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)'
                }}
              >
                <span className="truncate max-w-[100px]">{opt.label}</span>
                <button
                  type="button"
                  onClick={(e) => removeChip(opt.id, e)}
                  className="hover:text-[var(--accent)] transition-colors flex-shrink-0"
                >
                  <XMarkIcon className="w-3 h-3" />
                </button>
              </span>
            ))}
            {selectedOptions.length > 5 && (
              <span
                className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium"
                style={{
                  backgroundColor: 'var(--accent)',
                  color: 'white'
                }}
              >
                +{selectedOptions.length - 5} more
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {placeholder}
            </span>
            <ChevronDownIcon
              className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              style={{ color: 'var(--text-secondary)' }}
            />
          </div>
        )}
      </div>

      {/* Dropdown portal */}
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
          role="listbox"
          aria-multiselectable="true"
        >
          {/* Search */}
          <div className="p-2 border-b" style={{ borderColor: 'var(--bg-tertiary)' }}>
            <div className="relative">
              <MagnifyingGlassIcon
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: 'var(--text-secondary)' }}
              />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  border: 'none',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Options */}
          <div className="overflow-y-auto flex-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map(opt => {
                const isSelected = selectedIds.includes(opt.id);
                return (
                  <div
                    key={opt.id}
                    onClick={() => toggleOption(opt.id)}
                    className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${
                      isSelected ? 'bg-[var(--accent)]/10' : 'hover:bg-[var(--bg-tertiary)]'
                    }`}
                    style={{
                      borderLeft: isSelected ? '3px solid var(--accent)' : '3px solid transparent'
                    }}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors flex-shrink-0 ${
                        isSelected ? 'border-[var(--accent)] bg-[var(--accent)]' : 'border-[var(--text-secondary)]'
                      }`}
                    >
                      {isSelected && <CheckIcon className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                        {opt.label}
                      </div>
                      {opt.sublabel && (
                        <div className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                          {opt.sublabel}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="px-3 py-4 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
                No options found
              </div>
            )}
          </div>

          {/* Footer with count */}
          <div
            className="px-3 py-2 text-xs border-t"
            style={{
              borderColor: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)'
            }}
          >
            {selectedIds.length} of {options.length} selected
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
