import { useState, useEffect, useRef } from 'react';
import { locationsApi } from '../services/api';
import toast from 'react-hot-toast';
import {
  ArrowPathIcon,
  ClipboardDocumentIcon,
  ArrowDownTrayIcon,
  PrinterIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';

interface BarcodeDisplayProps {
  locationId: string;
  barcode: string | null | undefined;
  locationName: string;
  onBarcodeRegenerated?: (newBarcode: string) => void;
  canEdit?: boolean;
  canEditBarcode?: boolean; // Specific permission for barcode management
}

export default function BarcodeDisplay({
  locationId,
  barcode,
  locationName,
  onBarcodeRegenerated,
  canEdit = false,
  canEditBarcode = false
}: BarcodeDisplayProps) {
  const [regenerating, setRegenerating] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [whiteBackground, setWhiteBackground] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(barcode || '');
  const [saving, setSaving] = useState(false);
  const [showFormatMenu, setShowFormatMenu] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customBarcode, setCustomBarcode] = useState('');
  const formatMenuRef = useRef<HTMLDivElement>(null);
  const customInputRef = useRef<HTMLInputElement>(null);

  const barcodeUrl = barcode ? locationsApi.getBarcodeUrl(locationId) : null;

  // Update editValue when barcode changes
  useEffect(() => {
    setEditValue(barcode || '');
  }, [barcode]);

  // Close format menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (formatMenuRef.current && !formatMenuRef.current.contains(event.target as Node)) {
        setShowFormatMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch barcode image with authentication
  useEffect(() => {
    if (!barcodeUrl || !barcode) {
      setImageSrc(null);
      return;
    }

    setImageLoading(true);
    setImageError(false);

    fetch(barcodeUrl, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`
      }
    })
      .then((response) => {
        if (!response.ok) throw new Error('Failed to load');
        return response.blob();
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        setImageSrc(url);
        setImageLoading(false);
      })
      .catch(() => {
        setImageError(true);
        setImageLoading(false);
      });

    return () => {
      if (imageSrc) {
        URL.revokeObjectURL(imageSrc);
      }
    };
  }, [barcodeUrl, barcode]);

  const handleRegenerate = async (format: 'short' | 'full') => {
    setShowFormatMenu(false);

    const formatLabel = format === 'short' ? 'Short (last 2 levels)' : 'Full hierarchy';
    if (!confirm(`Generate barcode using "${formatLabel}" format?\n\nThe old barcode will no longer work.`)) {
      return;
    }

    setRegenerating(true);
    try {
      const response = await locationsApi.generateBarcode(locationId, format);
      const newBarcode = response.data.data.barcode;
      if (newBarcode && onBarcodeRegenerated) {
        onBarcodeRegenerated(newBarcode);
      }
      setImageError(false);
      // Refetch the barcode image
      setImageSrc(null);
      toast.success('Barcode regenerated successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to regenerate barcode');
    } finally {
      setRegenerating(false);
    }
  };

  const handleCustomBarcodeOpen = () => {
    setShowFormatMenu(false);
    setShowCustomInput(true);
    setCustomBarcode('');
    // Focus the input after state update
    setTimeout(() => customInputRef.current?.focus(), 100);
  };

  const handleCustomBarcodeSubmit = async () => {
    if (!customBarcode.trim()) {
      toast.error('Please enter a barcode');
      return;
    }

    // Validate barcode format (alphanumeric, dashes, underscores)
    const validPattern = /^[A-Za-z0-9\-_]+$/;
    if (!validPattern.test(customBarcode.trim())) {
      toast.error('Barcode can only contain letters, numbers, dashes, and underscores');
      return;
    }

    if (barcode && !confirm(`Set custom barcode "${customBarcode.trim()}"?\n\nThe old barcode will no longer work.`)) {
      return;
    }

    setRegenerating(true);
    try {
      const response = await locationsApi.updateBarcode(locationId, customBarcode.trim());
      const newBarcode = response.data.data.barcode;
      if (newBarcode && onBarcodeRegenerated) {
        onBarcodeRegenerated(newBarcode);
      }
      setImageError(false);
      setImageSrc(null);
      setShowCustomInput(false);
      setCustomBarcode('');
      toast.success('Custom barcode set successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to set custom barcode');
    } finally {
      setRegenerating(false);
    }
  };

  const handleCustomBarcodeCancel = () => {
    setShowCustomInput(false);
    setCustomBarcode('');
  };

  const handleCopy = async () => {
    if (!barcode) return;
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(barcode);
      } else {
        // Fallback for non-HTTPS contexts
        const textArea = document.createElement('textarea');
        textArea.value = barcode;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      toast.success('Barcode copied to clipboard');
    } catch {
      toast.error('Failed to copy barcode');
    }
  };

  const handleSaveBarcode = async () => {
    if (!editValue.trim()) {
      toast.error('Barcode cannot be empty');
      return;
    }

    setSaving(true);
    try {
      const response = await locationsApi.updateBarcode(locationId, editValue.trim());
      const newBarcode = response.data.data.barcode;
      if (newBarcode && onBarcodeRegenerated) {
        onBarcodeRegenerated(newBarcode);
      }
      setImageSrc(null);
      setIsEditing(false);
      toast.success('Barcode updated successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update barcode');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditValue(barcode || '');
    setIsEditing(false);
  };

  const handleDownload = async (format: 'png' | 'jpeg' = 'png') => {
    if (!barcodeUrl || !imageSrc) return;

    try {
      // Create canvas to convert format if needed
      const img = new Image();
      img.crossOrigin = 'anonymous';

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = imageSrc;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;

      // For JPEG, fill with white background first
      if (format === 'jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.drawImage(img, 0, 0);

      const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
      const extension = format === 'jpeg' ? 'jpg' : 'png';

      canvas.toBlob((blob) => {
        if (!blob) {
          toast.error('Failed to create image');
          return;
        }
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${barcode}.${extension}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success(`Barcode downloaded as ${extension.toUpperCase()}`);
      }, mimeType, 0.95);
    } catch {
      toast.error('Failed to download barcode');
    }
  };

  const handlePrint = async () => {
    if (!barcodeUrl || !imageSrc) return;

    try {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Print Barcode - ${locationName}</title>
              <style>
                @page {
                  size: auto;
                  margin: 5mm;
                }
                * {
                  margin: 0;
                  padding: 0;
                  box-sizing: border-box;
                }
                body {
                  font-family: system-ui, -apple-system, sans-serif;
                  background: white !important;
                  color: black !important;
                }
                .label {
                  display: inline-block;
                  text-align: center;
                  padding: 10px;
                  border: 1px dashed #ccc;
                }
                .location-name {
                  font-size: 14px;
                  font-weight: bold;
                  margin-bottom: 8px;
                  color: black !important;
                }
                .barcode-img {
                  max-width: 250px;
                  height: auto;
                  print-color-adjust: exact;
                  -webkit-print-color-adjust: exact;
                }
                @media print {
                  .label { border: 1px dashed #ddd; padding: 5px; }
                }
              </style>
            </head>
            <body>
              <div class="label">
                <div class="location-name">${locationName}</div>
                <img src="${imageSrc}" alt="Barcode" class="barcode-img" onload="window.print(); window.close();" />
              </div>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    } catch {
      toast.error('Failed to print barcode');
    }
  };

  if (!barcode) {
    return (
      <div
        className="flex flex-col items-center justify-center p-6 rounded-xl overflow-visible"
        style={{ backgroundColor: 'var(--bg-tertiary)', position: 'relative', zIndex: 1 }}
      >
        <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
          No barcode generated
        </p>
        {canEdit && (
          <div className="relative" ref={formatMenuRef}>
            <button
              onClick={() => setShowFormatMenu(!showFormatMenu)}
              disabled={regenerating}
              className="btn btn-primary flex items-center gap-2"
            >
              <ArrowPathIcon className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} />
              Generate Barcode
              <ChevronDownIcon className="w-4 h-4" />
            </button>
            {showFormatMenu && (
              <div
                className="absolute top-full left-0 mt-1 py-1 rounded-lg shadow-lg z-50 min-w-[220px]"
                style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--bg-tertiary)' }}
              >
                <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                  Auto Generate
                </div>
                <button
                  onClick={() => handleRegenerate('short')}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-[var(--bg-tertiary)] transition-colors"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <div className="font-medium">Short (Recommended)</div>
                  <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Last 2 levels only</div>
                </button>
                <button
                  onClick={() => handleRegenerate('full')}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-[var(--bg-tertiary)] transition-colors"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <div className="font-medium">Full Hierarchy</div>
                  <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Complete location path</div>
                </button>
                <div className="border-t my-1" style={{ borderColor: 'var(--bg-tertiary)' }} />
                <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                  Manual Entry
                </div>
                <button
                  onClick={handleCustomBarcodeOpen}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-[var(--bg-tertiary)] transition-colors"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <div className="font-medium">Custom Barcode</div>
                  <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Enter your own code</div>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Custom barcode input modal */}
        {showCustomInput && (
          <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Enter Custom Barcode
            </label>
            <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
              Use letters, numbers, dashes (-) and underscores (_). Example: CUST001-SHELF-A1
            </p>
            <div className="flex gap-2">
              <input
                ref={customInputRef}
                type="text"
                value={customBarcode}
                onChange={(e) => setCustomBarcode(e.target.value.toUpperCase())}
                placeholder="e.g., WH-001-A1"
                className="input flex-1 font-mono"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCustomBarcodeSubmit();
                  if (e.key === 'Escape') handleCustomBarcodeCancel();
                }}
              />
              <button
                onClick={handleCustomBarcodeSubmit}
                disabled={regenerating || !customBarcode.trim()}
                className="btn btn-primary"
              >
                {regenerating ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={handleCustomBarcodeCancel}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Barcode Image */}
      <div
        className="flex flex-col items-center p-6 rounded-xl"
        style={{ backgroundColor: whiteBackground ? '#ffffff' : 'var(--bg-tertiary)' }}
      >
        {imageLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--accent)' }} />
          </div>
        ) : imageError ? (
          <div className="text-center py-4">
            <p className="text-sm" style={{ color: whiteBackground ? '#666' : 'var(--text-secondary)' }}>
              Failed to load barcode image
            </p>
          </div>
        ) : imageSrc ? (
          <img
            src={imageSrc}
            alt={`Barcode: ${barcode}`}
            className="max-w-full h-auto"
            style={{ imageRendering: 'pixelated' }}
          />
        ) : null}

        {/* Barcode text */}
        <div className="mt-3 flex items-center gap-2">
          {isEditing ? (
            <>
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="px-3 py-1.5 rounded-lg text-sm font-mono border"
                style={{
                  backgroundColor: whiteBackground ? '#fff' : 'var(--bg-secondary)',
                  color: whiteBackground ? '#000' : 'var(--text-primary)',
                  borderColor: 'var(--accent)'
                }}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveBarcode();
                  if (e.key === 'Escape') handleCancelEdit();
                }}
              />
              <button
                onClick={handleSaveBarcode}
                disabled={saving}
                className="p-2 rounded-lg transition-colors"
                style={{ color: '#22c55e' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(34, 197, 94, 0.15)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                title="Save"
              >
                {saving ? (
                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckIcon className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={handleCancelEdit}
                className="p-2 rounded-lg transition-colors"
                style={{ color: '#ef4444' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                title="Cancel"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <code
                className="px-3 py-1.5 rounded-lg text-sm font-mono"
                style={{
                  backgroundColor: whiteBackground ? '#f0f0f0' : 'var(--bg-secondary)',
                  color: whiteBackground ? '#000' : 'var(--text-primary)'
                }}
              >
                {barcode}
              </code>
              <button
                onClick={handleCopy}
                className="p-2 rounded-lg transition-colors"
                style={{ color: whiteBackground ? '#666' : 'var(--text-secondary)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = whiteBackground ? '#e0e0e0' : 'var(--bg-secondary)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                title="Copy barcode"
              >
                <ClipboardDocumentIcon className="w-4 h-4" />
              </button>
              {canEditBarcode && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-2 rounded-lg transition-colors"
                  style={{ color: whiteBackground ? '#666' : 'var(--text-secondary)' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = whiteBackground ? '#e0e0e0' : 'var(--bg-secondary)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  title="Edit barcode"
                >
                  <PencilIcon className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* White background toggle */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={whiteBackground}
          onChange={(e) => setWhiteBackground(e.target.checked)}
          className="w-4 h-4 rounded"
        />
        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          White background (for scanning)
        </span>
      </label>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => handleDownload('png')}
          className="btn btn-secondary flex items-center gap-2 flex-1"
        >
          <ArrowDownTrayIcon className="w-4 h-4" />
          PNG
        </button>
        <button
          onClick={() => handleDownload('jpeg')}
          className="btn btn-secondary flex items-center gap-2 flex-1"
        >
          <ArrowDownTrayIcon className="w-4 h-4" />
          JPG
        </button>
        <button
          onClick={handlePrint}
          className="btn btn-secondary flex items-center gap-2 flex-1"
        >
          <PrinterIcon className="w-4 h-4" />
          Print
        </button>
        {canEdit && (
          <div className="relative" ref={formatMenuRef}>
            <button
              onClick={() => setShowFormatMenu(!showFormatMenu)}
              disabled={regenerating}
              className="btn btn-secondary flex items-center gap-2"
              title="Regenerate barcode"
            >
              <ArrowPathIcon className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} />
              <ChevronDownIcon className="w-3 h-3" />
            </button>
            {showFormatMenu && (
              <div
                className="absolute bottom-full right-0 mb-1 py-1 rounded-lg shadow-lg z-50 min-w-[220px]"
                style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--bg-tertiary)' }}
              >
                <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                  Auto Generate
                </div>
                <button
                  onClick={() => handleRegenerate('short')}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-[var(--bg-tertiary)] transition-colors"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <div className="font-medium">Short (Recommended)</div>
                  <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Last 2 levels only</div>
                </button>
                <button
                  onClick={() => handleRegenerate('full')}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-[var(--bg-tertiary)] transition-colors"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <div className="font-medium">Full Hierarchy</div>
                  <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Complete location path</div>
                </button>
                <div className="border-t my-1" style={{ borderColor: 'var(--bg-tertiary)' }} />
                <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                  Manual Entry
                </div>
                <button
                  onClick={handleCustomBarcodeOpen}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-[var(--bg-tertiary)] transition-colors"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <div className="font-medium">Custom Barcode</div>
                  <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Enter your own code</div>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Custom barcode input section */}
      {showCustomInput && (
        <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
            Enter Custom Barcode
          </label>
          <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
            Use letters, numbers, dashes (-) and underscores (_). Example: CUST001-SHELF-A1
          </p>
          <div className="flex gap-2">
            <input
              ref={customInputRef}
              type="text"
              value={customBarcode}
              onChange={(e) => setCustomBarcode(e.target.value.toUpperCase())}
              placeholder="e.g., WH-001-A1"
              className="input flex-1 font-mono"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCustomBarcodeSubmit();
                if (e.key === 'Escape') handleCustomBarcodeCancel();
              }}
            />
            <button
              onClick={handleCustomBarcodeSubmit}
              disabled={regenerating || !customBarcode.trim()}
              className="btn btn-primary"
            >
              {regenerating ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={handleCustomBarcodeCancel}
              className="btn btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
