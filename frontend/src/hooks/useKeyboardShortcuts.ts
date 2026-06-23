import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export interface KeyboardShortcut {
  key: string;
  label: string;
  description: string;
}

export const SHORTCUTS: KeyboardShortcut[] = [
  { key: '/', label: '/', description: 'Focus search' },
  { key: 'n', label: 'N', description: 'New item' },
  { key: 'Escape', label: 'Esc', description: 'Blur / close' },
  { key: '?', label: '?', description: 'Show shortcuts help' },
  { key: 'k', label: 'Ctrl+K', description: 'Global search' },
];

export function useKeyboardShortcuts(searchInputRef?: React.RefObject<HTMLInputElement | null>) {
  const navigate = useNavigate();
  const location = useLocation();
  const [showHelp, setShowHelp] = useState(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    const tag = target.tagName;
    const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;

    // Escape always works
    if (e.key === 'Escape') {
      if (showHelp) {
        setShowHelp(false);
        return;
      }
      if (isInput) {
        (target as HTMLElement).blur();
        return;
      }
    }

    // Skip other shortcuts when typing in inputs
    if (isInput) return;

    if (e.key === '/') {
      e.preventDefault();
      if (searchInputRef?.current) {
        searchInputRef.current.focus();
      } else if (location.pathname !== '/items') {
        navigate('/items');
      }
      return;
    }

    if (e.key === 'n') {
      e.preventDefault();
      navigate('/items/new');
      return;
    }

    if (e.key === '?') {
      e.preventDefault();
      setShowHelp(prev => !prev);
      return;
    }
  }, [navigate, location.pathname, searchInputRef, showHelp]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return { showHelp, setShowHelp };
}
