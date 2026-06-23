import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  shape?: 'square' | 'circle';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  label?: string;
  showOpacity?: boolean;
}

const PRESET_COLORS = [
  // Row 1 - Warm colors
  '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16',
  // Row 2 - Cool colors
  '#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9',
  // Row 3 - Blues & Purples
  '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF',
  // Row 4 - Pinks & Grays
  '#EC4899', '#F43F5E', '#78716C', '#6B7280', '#FFFFFF',
];

const SIZE_CONFIG = {
  sm: { outer: 'w-7 h-7', inner: 'w-5 h-5' },
  md: { outer: 'w-9 h-9', inner: 'w-7 h-7' },
  lg: { outer: 'w-11 h-11', inner: 'w-9 h-9' },
};

// Parse hex color (supports #RGB, #RRGGBB, #RRGGBBAA)
function parseHex(hex: string): { r: number; g: number; b: number; a: number } {
  hex = hex.replace('#', '');

  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2] + 'FF';
  } else if (hex.length === 6) {
    hex = hex + 'FF';
  } else if (hex.length !== 8) {
    return { r: 0, g: 0, b: 0, a: 255 };
  }

  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
    a: parseInt(hex.slice(6, 8), 16),
  };
}

// Convert hex to HSV
function hexToHsv(hex: string): { h: number; s: number; v: number } {
  const { r, g, b } = parseHex(hex);
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const d = max - min;

  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;

  if (max !== min) {
    switch (max) {
      case rNorm: h = ((gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0)) / 6; break;
      case gNorm: h = ((bNorm - rNorm) / d + 2) / 6; break;
      case bNorm: h = ((rNorm - gNorm) / d + 4) / 6; break;
    }
  }

  return { h: h * 360, s: s * 100, v: v * 100 };
}

// Get opacity from hex (0-100)
function getOpacityFromHex(hex: string): number {
  const { a } = parseHex(hex);
  return Math.round((a / 255) * 100);
}

// Convert HSV to hex with optional alpha
function hsvToHex(h: number, s: number, v: number, alpha?: number): string {
  h = h / 360;
  s = s / 100;
  v = v / 100;

  let r = 0, g = 0, b = 0;

  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);

  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }

  const toHex = (n: number) => {
    const hex = Math.round(n * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  const baseHex = `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();

  if (alpha !== undefined && alpha < 100) {
    const alphaHex = toHex(alpha / 100).toUpperCase();
    return baseHex + alphaHex;
  }

  return baseHex;
}

export default function ColorPicker({
  value,
  onChange,
  shape = 'circle',
  size = 'md',
  disabled = false,
  label,
  showOpacity = false,
}: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hsv, setHsv] = useState(() => hexToHsv(value || '#3B82F6'));
  const [opacity, setOpacity] = useState(() => getOpacityFromHex(value || '#3B82F6'));
  const [hexInput, setHexInput] = useState(value || '#3B82F6');
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const saturationRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const opacityRef = useRef<HTMLDivElement>(null);

  const sizeConfig = SIZE_CONFIG[size];

  // Sync internal state when value changes externally
  useEffect(() => {
    const currentHex = showOpacity ? hsvToHex(hsv.h, hsv.s, hsv.v, opacity) : hsvToHex(hsv.h, hsv.s, hsv.v);
    if (value && value.toUpperCase() !== currentHex.toUpperCase()) {
      setHsv(hexToHsv(value));
      setOpacity(getOpacityFromHex(value));
      setHexInput(value.toUpperCase());
    }
  }, [value]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        pickerRef.current && !pickerRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Calculate dropdown position when opening
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownWidth = 240;
      const dropdownHeight = showOpacity ? 420 : 370;

      let top = rect.bottom + 8;
      let left = rect.left;

      // If dropdown would go off right edge, align to right of button
      if (left + dropdownWidth > window.innerWidth - 16) {
        left = rect.right - dropdownWidth;
      }

      // If dropdown would go off bottom, open upward
      if (top + dropdownHeight > window.innerHeight - 16) {
        top = rect.top - dropdownHeight - 8;
      }

      setDropdownPos({ top, left });
    }
  }, [isOpen, showOpacity]);

  const updateColor = useCallback((newHsv: { h: number; s: number; v: number }, newOpacity?: number) => {
    setHsv(newHsv);
    const op = newOpacity !== undefined ? newOpacity : opacity;
    const hex = showOpacity ? hsvToHex(newHsv.h, newHsv.s, newHsv.v, op) : hsvToHex(newHsv.h, newHsv.s, newHsv.v);
    setHexInput(hex);
    onChange(hex);
  }, [onChange, opacity, showOpacity]);

  const updateOpacity = useCallback((newOpacity: number) => {
    setOpacity(newOpacity);
    const hex = hsvToHex(hsv.h, hsv.s, hsv.v, newOpacity);
    setHexInput(hex);
    onChange(hex);
  }, [onChange, hsv]);

  // Saturation/Value picker handlers
  const handleSaturationMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const updateSaturation = (clientX: number, clientY: number) => {
      if (!saturationRef.current) return;
      const rect = saturationRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const y = Math.max(0, Math.min(clientY - rect.top, rect.height));
      updateColor({
        h: hsv.h,
        s: (x / rect.width) * 100,
        v: 100 - (y / rect.height) * 100,
      });
    };

    updateSaturation(e.clientX, e.clientY);

    const handleMouseMove = (e: MouseEvent) => updateSaturation(e.clientX, e.clientY);
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Hue slider handlers
  const handleHueMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const updateHue = (clientX: number) => {
      if (!hueRef.current) return;
      const rect = hueRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      updateColor({
        h: (x / rect.width) * 360,
        s: hsv.s,
        v: hsv.v,
      });
    };

    updateHue(e.clientX);

    const handleMouseMove = (e: MouseEvent) => updateHue(e.clientX);
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Opacity slider handlers
  const handleOpacityMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const updateOp = (clientX: number) => {
      if (!opacityRef.current) return;
      const rect = opacityRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      updateOpacity(Math.round((x / rect.width) * 100));
    };

    updateOp(e.clientX);

    const handleMouseMove = (e: MouseEvent) => updateOp(e.clientX);
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Hex input handler
  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let hex = e.target.value.toUpperCase();
    if (!hex.startsWith('#')) hex = '#' + hex;
    setHexInput(hex);

    const isValidHex = showOpacity
      ? /^#[0-9A-F]{6}([0-9A-F]{2})?$/i.test(hex)
      : /^#[0-9A-F]{6}$/i.test(hex);

    if (isValidHex) {
      const newHsv = hexToHsv(hex);
      setHsv(newHsv);
      if (showOpacity) {
        setOpacity(getOpacityFromHex(hex));
      }
      onChange(hex);
    }
  };

  const currentColor = showOpacity ? hsvToHex(hsv.h, hsv.s, hsv.v, opacity) : hsvToHex(hsv.h, hsv.s, hsv.v);
  const solidColor = hsvToHex(hsv.h, hsv.s, hsv.v);
  const hueColor = hsvToHex(hsv.h, 100, 100);

  // Checkerboard pattern for transparency preview
  const checkerboardStyle = {
    backgroundImage: `
      linear-gradient(45deg, #ccc 25%, transparent 25%),
      linear-gradient(-45deg, #ccc 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, #ccc 75%),
      linear-gradient(-45deg, transparent 75%, #ccc 75%)
    `,
    backgroundSize: '8px 8px',
    backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px',
  };

  return (
    <div className="relative" ref={pickerRef}>
      {label && <label className="label">{label}</label>}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`${sizeConfig.outer} flex items-center justify-center rounded-lg transition-all ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:ring-2 hover:ring-offset-2 hover:ring-blue-400'
        }`}
        style={{
          backgroundColor: 'var(--bg-tertiary)',
          '--tw-ring-offset-color': 'var(--bg-secondary)',
        } as React.CSSProperties}
      >
        <div
          className={`${sizeConfig.inner} ${shape === 'circle' ? 'rounded-full' : 'rounded'} border-2 border-white shadow-sm`}
          style={showOpacity && opacity < 100 ? {
            ...checkerboardStyle,
            position: 'relative',
          } : { backgroundColor: value || '#3B82F6' }}
        >
          {showOpacity && opacity < 100 && (
            <div
              className={`absolute inset-0 ${shape === 'circle' ? 'rounded-full' : 'rounded'}`}
              style={{ backgroundColor: value || '#3B82F6' }}
            />
          )}
        </div>
      </button>

      {isOpen && dropdownPos && createPortal(
        <div
          ref={dropdownRef}
          className="fixed p-3 rounded-xl shadow-xl z-[9999] w-[240px]"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--bg-tertiary)',
            top: dropdownPos.top,
            left: dropdownPos.left,
          }}
        >
          {/* Saturation/Value picker */}
          <div
            ref={saturationRef}
            className="relative w-full h-36 rounded-lg cursor-crosshair mb-3"
            style={{
              backgroundColor: hueColor,
              backgroundImage: 'linear-gradient(to right, #fff, transparent), linear-gradient(to top, #000, transparent)',
            }}
            onMouseDown={handleSaturationMouseDown}
          >
            <div
              className="absolute w-4 h-4 rounded-full border-2 border-white shadow-md transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={{
                left: `${hsv.s}%`,
                top: `${100 - hsv.v}%`,
                backgroundColor: solidColor,
              }}
            />
          </div>

          {/* Hue slider */}
          <div
            ref={hueRef}
            className="relative w-full h-3 rounded-full cursor-pointer mb-3"
            style={{
              background: 'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)',
            }}
            onMouseDown={handleHueMouseDown}
          >
            <div
              className="absolute w-4 h-4 rounded-full border-2 border-white shadow-md transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={{
                left: `${(hsv.h / 360) * 100}%`,
                top: '50%',
                backgroundColor: hueColor,
              }}
            />
          </div>

          {/* Opacity slider */}
          {showOpacity && (
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Opacity</span>
                <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>{opacity}%</span>
              </div>
              <div
                ref={opacityRef}
                className="relative w-full h-3 rounded-full cursor-pointer"
                style={{
                  ...checkerboardStyle,
                }}
                onMouseDown={handleOpacityMouseDown}
              >
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: `linear-gradient(to right, transparent, ${solidColor})`,
                  }}
                />
                <div
                  className="absolute w-4 h-4 rounded-full border-2 border-white shadow-md transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                  style={{
                    left: `${opacity}%`,
                    top: '50%',
                    backgroundColor: currentColor,
                  }}
                />
              </div>
            </div>
          )}

          {/* Hex input */}
          <div className="flex items-center gap-2 mb-3">
            <div
              className="w-8 h-8 rounded-lg border-2 border-white shadow-sm flex-shrink-0"
              style={showOpacity && opacity < 100 ? {
                ...checkerboardStyle,
                position: 'relative',
              } : { backgroundColor: currentColor }}
            >
              {showOpacity && opacity < 100 && (
                <div
                  className="absolute inset-0 rounded-md"
                  style={{ backgroundColor: currentColor }}
                />
              )}
            </div>
            <input
              type="text"
              value={hexInput}
              onChange={handleHexChange}
              className="input flex-1 text-sm font-mono text-center"
              maxLength={showOpacity ? 9 : 7}
              placeholder={showOpacity ? "#000000FF" : "#000000"}
            />
          </div>

          {/* Preset colors */}
          <div className="grid grid-cols-5 gap-1.5">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => {
                  const newHsv = hexToHsv(color);
                  setHsv(newHsv);
                  const finalColor = showOpacity ? hsvToHex(newHsv.h, newHsv.s, newHsv.v, opacity) : color;
                  setHexInput(finalColor);
                  onChange(finalColor);
                }}
                className={`w-full aspect-square rounded-md transition-transform hover:scale-110 ${
                  solidColor.toUpperCase() === color.toUpperCase() ? 'ring-2 ring-offset-1' : ''
                }`}
                style={{
                  backgroundColor: color,
                  '--tw-ring-color': 'var(--text-secondary)',
                  '--tw-ring-offset-color': 'var(--bg-secondary)',
                  border: color === '#FFFFFF' ? '1px solid var(--bg-tertiary)' : undefined,
                } as React.CSSProperties}
              />
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
