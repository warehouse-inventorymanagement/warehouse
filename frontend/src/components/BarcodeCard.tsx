import { useState, useEffect } from 'react';
import {
  ArrowDownTrayIcon,
  PrinterIcon,
  ClipboardDocumentIcon,
  EllipsisVerticalIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { fetchBarcodeAsUrl, downloadBarcode, printBarcode, copyBarcodeText } from '../utils/barcodeExport';
import { downloadSingleLbx, type TapeSize } from '../utils/lbxGenerator';

interface BarcodeCardProps {
  id: string;
  type: 'item' | 'location';
  code: string;
  label: string;
  sublabel?: string;
  barcodeUrl: string;
  isSelected: boolean;
  onSelect: () => void;
  canExport?: boolean;
}

export default function BarcodeCard({
  id: _id,
  type,
  code,
  label,
  sublabel,
  barcodeUrl,
  isSelected,
  onSelect,
  canExport = true,
}: BarcodeCardProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showLbxMenu, setShowLbxMenu] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadImage() {
      try {
        setLoading(true);
        setError(false);
        const url = await fetchBarcodeAsUrl(barcodeUrl);
        if (!cancelled) {
          setImageUrl(url);
        }
      } catch {
        if (!cancelled) {
          setError(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadImage();

    return () => {
      cancelled = true;
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [barcodeUrl]);

  const handleDownload = async (format: 'png' | 'jpeg') => {
    setShowMenu(false);
    try {
      await downloadBarcode(barcodeUrl, code, format);
      toast.success(`Downloaded as ${format.toUpperCase()}`);
    } catch {
      toast.error('Failed to download QR code');
    }
  };

  const handleDownloadLbx = async (tapeSize: TapeSize) => {
    setShowLbxMenu(false);
    setShowMenu(false);
    try {
      await downloadSingleLbx({ code, label }, { tapeSize, textDisplay: 'with-sku' });
      toast.success('Downloaded LBX file');
    } catch {
      toast.error('Failed to create LBX file');
    }
  };

  const handlePrint = async () => {
    setShowMenu(false);
    try {
      await printBarcode(barcodeUrl, label);
    } catch {
      toast.error('Failed to print QR code');
    }
  };

  const handleCopy = async () => {
    setShowMenu(false);
    try {
      await copyBarcodeText(code);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Failed to copy');
    }
  };

  return (
    <div
      className={`relative rounded-xl overflow-hidden transition-all ${
        isSelected ? 'ring-2 ring-[var(--accent)]' : ''
      }`}
      style={{ backgroundColor: 'var(--bg-secondary)' }}
    >
      {/* Selection checkbox */}
      <div className="absolute top-2 left-2 z-10">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onSelect}
          className="w-4 h-4 rounded cursor-pointer"
          style={{ accentColor: 'var(--accent)' }}
        />
      </div>

      {/* Menu button */}
      {canExport && (
        <div className="absolute top-2 right-2 z-10">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 rounded-lg transition-colors hover:bg-[var(--bg-tertiary)]"
            style={{ color: 'var(--text-secondary)' }}
          >
            <EllipsisVerticalIcon className="w-4 h-4" />
          </button>

          {showMenu && (
            <div
              className="absolute top-full right-0 mt-1 py-1 rounded-lg shadow-lg z-50 min-w-[160px]"
              style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--bg-tertiary)' }}
            >
              <button
                onClick={() => handleDownload('png')}
                className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--bg-tertiary)] transition-colors flex items-center gap-2"
                style={{ color: 'var(--text-primary)' }}
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                Download PNG
              </button>
              <button
                onClick={() => handleDownload('jpeg')}
                className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--bg-tertiary)] transition-colors flex items-center gap-2"
                style={{ color: 'var(--text-primary)' }}
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                Download JPG
              </button>
              <div className="border-t my-1" style={{ borderColor: 'var(--bg-tertiary)' }} />
              <div className="relative">
                <button
                  onClick={() => setShowLbxMenu(!showLbxMenu)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--bg-tertiary)] transition-colors flex items-center gap-2"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <ArrowDownTrayIcon className="w-4 h-4" />
                  Download LBX
                  <span className="ml-auto text-xs" style={{ color: 'var(--text-secondary)' }}>
                    &gt;
                  </span>
                </button>
                {showLbxMenu && (
                  <div
                    className="absolute left-full top-0 ml-1 py-1 rounded-lg shadow-lg min-w-[100px]"
                    style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--bg-tertiary)' }}
                  >
                    <button
                      onClick={() => handleDownloadLbx('12mm')}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--bg-tertiary)] transition-colors"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      12mm tape
                    </button>
                    <button
                      onClick={() => handleDownloadLbx('18mm')}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--bg-tertiary)] transition-colors"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      18mm tape
                    </button>
                    <button
                      onClick={() => handleDownloadLbx('24mm')}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--bg-tertiary)] transition-colors"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      24mm tape
                    </button>
                  </div>
                )}
              </div>
              <div className="border-t my-1" style={{ borderColor: 'var(--bg-tertiary)' }} />
              <button
                onClick={handlePrint}
                className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--bg-tertiary)] transition-colors flex items-center gap-2"
                style={{ color: 'var(--text-primary)' }}
              >
                <PrinterIcon className="w-4 h-4" />
                Print
              </button>
              <button
                onClick={handleCopy}
                className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--bg-tertiary)] transition-colors flex items-center gap-2"
                style={{ color: 'var(--text-primary)' }}
              >
                <ClipboardDocumentIcon className="w-4 h-4" />
                Copy Code
              </button>
            </div>
          )}
        </div>
      )}

      {/* QR code image */}
      <div
        className="flex items-center justify-center p-4 pt-8"
        style={{ backgroundColor: '#ffffff', minHeight: '80px' }}
      >
        {loading ? (
          <div
            className="animate-spin rounded-full h-6 w-6 border-b-2"
            style={{ borderColor: 'var(--accent)' }}
          />
        ) : error ? (
          <span className="text-xs" style={{ color: '#999' }}>
            Failed to load
          </span>
        ) : imageUrl ? (
          <img
            src={imageUrl}
            alt={`QR Code: ${code}`}
            className="max-w-full h-auto"
            style={{ maxHeight: '60px', imageRendering: 'pixelated' }}
          />
        ) : null}
      </div>

      {/* Info section */}
      <div className="p-3">
        <div
          className="text-xs font-mono truncate mb-1"
          style={{ color: 'var(--text-secondary)' }}
          title={code}
        >
          {code}
        </div>
        <div
          className="text-sm font-medium truncate"
          style={{ color: 'var(--text-primary)' }}
          title={label}
        >
          {label}
        </div>
        {sublabel && (
          <div
            className="text-xs truncate mt-0.5"
            style={{ color: 'var(--text-secondary)' }}
            title={sublabel}
          >
            {sublabel}
          </div>
        )}
        <div
          className="text-xs mt-1 px-1.5 py-0.5 rounded inline-block"
          style={{
            backgroundColor: type === 'item' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(34, 197, 94, 0.15)',
            color: type === 'item' ? '#3b82f6' : '#22c55e',
          }}
        >
          {type === 'item' ? 'Item' : 'Location'}
        </div>
      </div>

      {/* Click outside to close menu */}
      {showMenu && (
        <div className="fixed inset-0 z-40" onClick={() => { setShowMenu(false); setShowLbxMenu(false); }} />
      )}
    </div>
  );
}
