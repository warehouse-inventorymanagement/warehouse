import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDownIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import { IconDisplay } from './IconPicker';

export interface IconSelectOption {
  value: string;
  label: string;
  description?: string; // Secondary text shown below or beside label
  icon?: string;
  iconColor?: string;
  iconBackgroundColor?: string;
  color?: string; // For tags that use color field
}

interface IconSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: IconSelectOption[];
  placeholder?: string;
  className?: string;
  showClear?: boolean;
}

export function IconSelect({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  className = '',
  showClear = true
}: IconSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  // Calculate dropdown position when opening
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  }, [isOpen]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        listRef.current &&
        !listRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close on page scroll (but not dropdown scroll)
  useEffect(() => {
    const handleScroll = (e: Event) => {
      // Don't close if scrolling inside the dropdown
      if (listRef.current && listRef.current.contains(e.target as Node)) {
        return;
      }
      if (isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      window.addEventListener('scroll', handleScroll, true);
      return () => window.removeEventListener('scroll', handleScroll, true);
    }
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
        setHighlightedIndex(0);
      }
      return;
    }

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => Math.min(prev + 1, options.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < options.length) {
          onChange(options[highlightedIndex].value);
          setIsOpen(false);
        }
        break;
    }
  };

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && listRef.current) {
      const highlightedEl = listRef.current.children[highlightedIndex] as HTMLElement;
      if (highlightedEl) {
        highlightedEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const getIconColor = (opt: IconSelectOption) => {
    return opt.iconColor || opt.color || undefined;
  };

  const dropdown = isOpen ? createPortal(
    <ul
      ref={listRef}
      role="listbox"
      className="rounded-lg shadow-lg border overflow-auto"
      style={{
        position: 'fixed',
        top: dropdownPosition.top,
        left: dropdownPosition.left,
        width: dropdownPosition.width,
        backgroundColor: 'var(--bg-secondary)',
        borderColor: 'var(--bg-tertiary)',
        maxHeight: '240px',
        zIndex: 99999
      }}
    >
      {options.length === 0 ? (
        <li className="px-3 py-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          No options available
        </li>
      ) : (
        options.map((opt, index) => {
          const isSelected = opt.value === value;
          const isHighlighted = highlightedIndex === index;
          return (
            <li
              key={opt.value}
              role="option"
              aria-selected={isSelected}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              onMouseEnter={() => setHighlightedIndex(index)}
              className="px-3 py-2 text-sm cursor-pointer flex items-center gap-2 transition-colors"
              style={{
                backgroundColor: isHighlighted
                  ? 'var(--bg-tertiary)'
                  : isSelected
                    ? 'color-mix(in srgb, var(--accent) 15%, transparent)'
                    : 'transparent',
                borderLeft: isSelected ? '3px solid var(--accent)' : '3px solid transparent',
                color: isSelected ? 'var(--accent)' : 'var(--text-primary)'
              }}
            >
              {/* Checkmark for selected item */}
              {isSelected ? (
                <CheckIcon className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--accent)' }} />
              ) : (
                <span className="w-4 flex-shrink-0" />
              )}
              {opt.icon && (
                <span
                  className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded"
                  style={{
                    backgroundColor: opt.iconBackgroundColor || 'transparent'
                  }}
                >
                  <IconDisplay
                    icon={opt.icon}
                    size="small"
                    color={getIconColor(opt)}
                  />
                </span>
              )}
              <span className="flex-1 min-w-0">
                <span className="truncate block">{opt.label}</span>
                {opt.description && (
                  <span className="text-xs truncate block" style={{ color: 'var(--text-secondary)', opacity: 0.8 }}>
                    {opt.description}
                  </span>
                )}
              </span>
            </li>
          );
        })
      )}
    </ul>,
    document.body
  ) : null;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className="input w-full flex items-center justify-between gap-2 text-left"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="flex items-center gap-2 flex-1 min-w-0">
          {selectedOption ? (
            <>
              {selectedOption.icon && (
                <span
                  className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded"
                  style={{
                    backgroundColor: selectedOption.iconBackgroundColor || 'transparent'
                  }}
                >
                  <IconDisplay
                    icon={selectedOption.icon}
                    size="small"
                    color={getIconColor(selectedOption)}
                  />
                </span>
              )}
              <span className="truncate" style={{ color: 'var(--text-primary)' }}>
                {selectedOption.label}
              </span>
            </>
          ) : (
            <span style={{ color: 'var(--text-secondary)' }}>{placeholder}</span>
          )}
        </span>
        <span className="flex items-center gap-1 flex-shrink-0">
          {showClear && value && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              className="p-0.5 rounded hover-bg cursor-pointer"
            >
              <XMarkIcon className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
            </span>
          )}
          <ChevronDownIcon
            className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            style={{ color: 'var(--text-secondary)' }}
          />
        </span>
      </button>

      {dropdown}
    </div>
  );
}

export default IconSelect;
