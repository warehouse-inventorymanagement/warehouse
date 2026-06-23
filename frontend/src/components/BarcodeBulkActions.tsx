import { useState, useRef, useEffect } from 'react';
import {
  ArrowDownTrayIcon,
  PrinterIcon,
  XMarkIcon,
  ChevronDownIcon,
  DocumentIcon,
  TableCellsIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { downloadBarcodesAsZip, printBarcodes } from '../utils/barcodeExport';
import { downloadBarcodePdf, LABEL_PRESETS, type LabelConfig } from '../utils/pdfGenerator';
import { downloadMultiBarcodeLbx, downloadLbxFilesZip, QR_DEFAULTS, ECC_LEVELS, type TapeSize, type TextDisplay, type EccLevel } from '../utils/lbxGenerator';

interface SelectedBarcode {
  id: string;
  code: string;
  label: string;
  url: string;
}

interface BarcodeBulkActionsProps {
  selectedBarcodes: SelectedBarcode[];
  onClearSelection: () => void;
}

export default function BarcodeBulkActions({
  selectedBarcodes,
  onClearSelection,
}: BarcodeBulkActionsProps) {
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [showLbxModal, setShowLbxModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const downloadMenuRef = useRef<HTMLDivElement>(null);

  // PDF configuration
  const [pdfConfig, setPdfConfig] = useState<LabelConfig>(LABEL_PRESETS.medium);
  const [pdfPreset, setPdfPreset] = useState<'small' | 'medium' | 'large' | 'custom'>('medium');

  // LBX configuration
  const [lbxTapeSize, setLbxTapeSize] = useState<TapeSize>('12mm');
  const [lbxMode, setLbxMode] = useState<'single' | 'multiple'>('single');
  const [lbxTextDisplay, setLbxTextDisplay] = useState<TextDisplay>('with-sku');
  const [lbxShowAdvanced, setLbxShowAdvanced] = useState(false);
  const [lbxQrSize, setLbxQrSize] = useState<number | undefined>(undefined);
  const [lbxCellSize, setLbxCellSize] = useState<number | undefined>(undefined);
  const [lbxSpacing, setLbxSpacing] = useState<number | undefined>(undefined);
  const [lbxEccLevel, setLbxEccLevel] = useState<EccLevel>('15%');

  // Get current defaults based on tape size
  const currentDefaults = QR_DEFAULTS[lbxTapeSize];

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target as Node)) {
        setShowDownloadMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDownloadZip = async (format: 'png' | 'jpeg') => {
    setShowDownloadMenu(false);
    setLoading(true);
    try {
      await downloadBarcodesAsZip(
        selectedBarcodes.map((b) => ({ url: b.url, filename: b.code })),
        `barcodes-${format}`,
        format
      );
      toast.success(`Downloaded ${selectedBarcodes.length} QR codes as ZIP`);
    } catch {
      toast.error('Failed to download QR codes');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    setShowPdfModal(false);
    setLoading(true);
    try {
      await downloadBarcodePdf(
        selectedBarcodes.map((b) => ({ url: b.url, code: b.code, label: b.label })),
        pdfConfig,
        'barcodes'
      );
      toast.success('Downloaded PDF');
    } catch {
      toast.error('Failed to create PDF');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadLbx = async () => {
    setShowLbxModal(false);
    setLoading(true);
    try {
      const config = {
        tapeSize: lbxTapeSize,
        textDisplay: lbxTextDisplay,
        qrSize: lbxQrSize,
        cellSize: lbxCellSize,
        spacing: lbxSpacing,
        eccLevel: lbxEccLevel,
      };
      const barcodes = selectedBarcodes.map((b) => ({ code: b.code, label: b.label }));

      if (lbxMode === 'single') {
        // All barcodes on one continuous label
        await downloadMultiBarcodeLbx(barcodes, config, 'barcodes');
        toast.success('Downloaded LBX file');
      } else {
        // Individual LBX files in a ZIP
        await downloadLbxFilesZip(barcodes, config, 'barcodes-lbx');
        toast.success(`Downloaded ${selectedBarcodes.length} LBX files as ZIP`);
      }
    } catch {
      toast.error('Failed to create LBX file(s)');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadXlsx = () => {
    setShowDownloadMenu(false);
    try {
      // Prepare data for Excel
      const data = selectedBarcodes.map((b) => ({
        'QR Code': b.code,
        'Name': b.label,
      }));

      // Create workbook and worksheet
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'QR Codes');

      // Auto-size columns
      const maxWidth = data.reduce((max, row) => {
        const codeLen = row['QR Code']?.length || 0;
        const nameLen = row['Name']?.length || 0;
        return Math.max(max, codeLen, nameLen);
      }, 10);
      ws['!cols'] = [
        { wch: Math.min(maxWidth + 2, 30) },
        { wch: Math.min(maxWidth + 2, 50) },
      ];

      // Download
      XLSX.writeFile(wb, 'barcodes.xlsx');
      toast.success(`Exported ${selectedBarcodes.length} QR codes to Excel`);
    } catch {
      toast.error('Failed to export to Excel');
    }
  };

  const handlePrint = async () => {
    setLoading(true);
    try {
      await printBarcodes(
        selectedBarcodes.map((b) => ({ url: b.url, label: b.label, code: b.code }))
      );
    } catch {
      toast.error('Failed to print QR codes');
    } finally {
      setLoading(false);
    }
  };

  const handlePresetChange = (preset: 'small' | 'medium' | 'large' | 'custom') => {
    setPdfPreset(preset);
    if (preset !== 'custom') {
      setPdfConfig(LABEL_PRESETS[preset]);
    }
  };

  if (selectedBarcodes.length === 0) {
    return null;
  }

  return (
    <>
      {/* Bulk action bar */}
      <div
        className="sticky top-0 z-30 flex items-center justify-between gap-4 px-4 py-3 rounded-xl mb-4"
        style={{ backgroundColor: 'var(--bg-tertiary)' }}
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {selectedBarcodes.length} selected
          </span>
          <button
            onClick={onClearSelection}
            className="text-sm flex items-center gap-1 hover:underline"
            style={{ color: 'var(--text-secondary)' }}
          >
            <XMarkIcon className="w-4 h-4" />
            Clear
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Download dropdown */}
          <div className="relative" ref={downloadMenuRef}>
            <button
              onClick={() => setShowDownloadMenu(!showDownloadMenu)}
              disabled={loading}
              className="btn btn-secondary flex items-center gap-2"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              Download
              <ChevronDownIcon className="w-4 h-4" />
            </button>

            {showDownloadMenu && (
              <div
                className="absolute top-full right-0 mt-1 py-1 rounded-lg shadow-lg z-50 min-w-[180px]"
                style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--bg-tertiary)' }}
              >
                <button
                  onClick={() => handleDownloadZip('png')}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-[var(--bg-tertiary)] transition-colors"
                  style={{ color: 'var(--text-primary)' }}
                >
                  PNG (ZIP)
                </button>
                <button
                  onClick={() => handleDownloadZip('jpeg')}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-[var(--bg-tertiary)] transition-colors"
                  style={{ color: 'var(--text-primary)' }}
                >
                  JPG (ZIP)
                </button>
                <div className="border-t my-1" style={{ borderColor: 'var(--bg-tertiary)' }} />
                <button
                  onClick={() => {
                    setShowDownloadMenu(false);
                    setShowPdfModal(true);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-[var(--bg-tertiary)] transition-colors flex items-center gap-2"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <DocumentIcon className="w-4 h-4" />
                  PDF Labels...
                </button>
                <button
                  onClick={() => {
                    setShowDownloadMenu(false);
                    setShowLbxModal(true);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-[var(--bg-tertiary)] transition-colors flex items-center gap-2"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <DocumentIcon className="w-4 h-4" />
                  Brother P-Touch (LBX)...
                </button>
                <div className="border-t my-1" style={{ borderColor: 'var(--bg-tertiary)' }} />
                <button
                  onClick={handleDownloadXlsx}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-[var(--bg-tertiary)] transition-colors flex items-center gap-2"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <TableCellsIcon className="w-4 h-4" />
                  Excel (XLSX)
                </button>
              </div>
            )}
          </div>

          {/* Print button */}
          <button onClick={handlePrint} disabled={loading} className="btn btn-secondary flex items-center gap-2">
            <PrinterIcon className="w-4 h-4" />
            Print
          </button>
        </div>
      </div>

      {/* PDF Configuration Modal */}
      {showPdfModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div
            className="rounded-xl p-6 max-w-md w-full mx-4"
            style={{ backgroundColor: 'var(--bg-primary)' }}
          >
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              PDF Label Configuration
            </h3>

            {/* Preset selector */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Label Size
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(['small', 'medium', 'large', 'custom'] as const).map((preset) => (
                  <button
                    key={preset}
                    onClick={() => handlePresetChange(preset)}
                    className={`px-3 py-2 rounded-lg text-sm capitalize transition-colors ${
                      pdfPreset === preset ? 'ring-2 ring-[var(--accent)]' : ''
                    }`}
                    style={{
                      backgroundColor: pdfPreset === preset ? 'var(--accent)' : 'var(--bg-tertiary)',
                      color: pdfPreset === preset ? '#fff' : 'var(--text-primary)',
                    }}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom size inputs */}
            {pdfPreset === 'custom' && (
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
                    Width (mm)
                  </label>
                  <input
                    type="number"
                    value={pdfConfig.labelWidth}
                    onChange={(e) => setPdfConfig({ ...pdfConfig, labelWidth: Number(e.target.value) })}
                    className="input w-full"
                    min={20}
                    max={200}
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
                    Height (mm)
                  </label>
                  <input
                    type="number"
                    value={pdfConfig.labelHeight}
                    onChange={(e) => setPdfConfig({ ...pdfConfig, labelHeight: Number(e.target.value) })}
                    className="input w-full"
                    min={10}
                    max={100}
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
                    Columns
                  </label>
                  <input
                    type="number"
                    value={pdfConfig.columns}
                    onChange={(e) => setPdfConfig({ ...pdfConfig, columns: Number(e.target.value) })}
                    className="input w-full"
                    min={1}
                    max={10}
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
                    Rows
                  </label>
                  <input
                    type="number"
                    value={pdfConfig.rows}
                    onChange={(e) => setPdfConfig({ ...pdfConfig, rows: Number(e.target.value) })}
                    className="input w-full"
                    min={1}
                    max={20}
                  />
                </div>
              </div>
            )}

            {/* Options */}
            <div className="space-y-2 mb-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pdfConfig.showLabel}
                  onChange={(e) => setPdfConfig({ ...pdfConfig, showLabel: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                  Include item/location name
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pdfConfig.showCode}
                  onChange={(e) => setPdfConfig({ ...pdfConfig, showCode: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                  Include code text
                </span>
              </label>
            </div>

            {/* Summary */}
            <div className="text-sm mb-4 p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>
                {selectedBarcodes.length} QR code{selectedBarcodes.length !== 1 ? 's' : ''} •{' '}
                {Math.ceil(selectedBarcodes.length / (pdfConfig.columns * pdfConfig.rows))} page
                {Math.ceil(selectedBarcodes.length / (pdfConfig.columns * pdfConfig.rows)) !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowPdfModal(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button onClick={handleDownloadPdf} className="btn btn-primary">
                Generate PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LBX Configuration Modal */}
      {showLbxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div
            className="rounded-xl p-6 max-w-md w-full mx-4"
            style={{ backgroundColor: 'var(--bg-primary)' }}
          >
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              Brother P-Touch Export
            </h3>

            {/* Tape size selector */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Tape Size
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['12mm', '18mm', '24mm'] as const).map((size) => (
                  <button
                    key={size}
                    onClick={() => setLbxTapeSize(size)}
                    className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                      lbxTapeSize === size ? 'ring-2 ring-[var(--accent)]' : ''
                    }`}
                    style={{
                      backgroundColor: lbxTapeSize === size ? 'var(--accent)' : 'var(--bg-tertiary)',
                      color: lbxTapeSize === size ? '#fff' : 'var(--text-primary)',
                    }}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Text Display */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Text Under QR Code
              </label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: 'with-sku', label: 'With SKU' },
                  { value: 'with-name', label: 'With Name' },
                  { value: 'qr-only', label: 'QR Only' },
                ] as const).map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setLbxTextDisplay(option.value)}
                    className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                      lbxTextDisplay === option.value ? 'ring-2 ring-[var(--accent)]' : ''
                    }`}
                    style={{
                      backgroundColor: lbxTextDisplay === option.value ? 'var(--accent)' : 'var(--bg-tertiary)',
                      color: lbxTextDisplay === option.value ? '#fff' : 'var(--text-primary)',
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Export mode */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Export Mode
              </label>
              <div className="space-y-2">
                <label className="flex items-start gap-3 p-3 rounded-lg cursor-pointer" style={{ backgroundColor: lbxMode === 'single' ? 'var(--bg-tertiary)' : 'transparent' }}>
                  <input
                    type="radio"
                    name="lbxMode"
                    checked={lbxMode === 'single'}
                    onChange={() => setLbxMode('single')}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      Single continuous label
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      All QR codes on one label strip
                    </div>
                  </div>
                </label>
                <label className="flex items-start gap-3 p-3 rounded-lg cursor-pointer" style={{ backgroundColor: lbxMode === 'multiple' ? 'var(--bg-tertiary)' : 'transparent' }}>
                  <input
                    type="radio"
                    name="lbxMode"
                    checked={lbxMode === 'multiple'}
                    onChange={() => setLbxMode('multiple')}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      Individual files (ZIP)
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      One LBX file per QR code
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Advanced Options Toggle */}
            <div className="mb-4">
              <button
                type="button"
                onClick={() => setLbxShowAdvanced(!lbxShowAdvanced)}
                className="text-sm flex items-center gap-1"
                style={{ color: 'var(--accent)' }}
              >
                <ChevronDownIcon className={`w-4 h-4 transition-transform ${lbxShowAdvanced ? 'rotate-180' : ''}`} />
                Advanced QR Options
              </button>

              {lbxShowAdvanced && (
                <div className="mt-3 p-3 rounded-lg space-y-3" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
                        QR Size (pt)
                      </label>
                      <input
                        type="number"
                        value={lbxQrSize ?? currentDefaults.size}
                        onChange={(e) => setLbxQrSize(e.target.value ? Number(e.target.value) : undefined)}
                        className="input w-full text-sm"
                        min={10}
                        max={100}
                        step={1}
                      />
                    </div>
                    <div>
                      <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
                        Spacing (pt)
                      </label>
                      <input
                        type="number"
                        value={lbxSpacing ?? currentDefaults.spacing}
                        onChange={(e) => setLbxSpacing(e.target.value ? Number(e.target.value) : undefined)}
                        className="input w-full text-sm"
                        min={10}
                        max={100}
                        step={1}
                      />
                    </div>
                    <div>
                      <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
                        Cell Size (pt)
                      </label>
                      <input
                        type="number"
                        value={lbxCellSize ?? currentDefaults.cellSize}
                        onChange={(e) => setLbxCellSize(e.target.value ? Number(e.target.value) : undefined)}
                        className="input w-full text-sm"
                        min={0.4}
                        max={3}
                        step={0.1}
                      />
                    </div>
                    <div>
                      <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
                        Error Correction
                      </label>
                      <select
                        value={lbxEccLevel}
                        onChange={(e) => setLbxEccLevel(e.target.value as EccLevel)}
                        className="input w-full text-sm"
                      >
                        {ECC_LEVELS.map((level) => (
                          <option key={level} value={level}>{level}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setLbxQrSize(undefined);
                      setLbxCellSize(undefined);
                      setLbxSpacing(undefined);
                      setLbxEccLevel('15%');
                    }}
                    className="text-xs"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Reset to defaults
                  </button>
                </div>
              )}
            </div>

            {/* Summary */}
            <div className="text-sm mb-4 p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>
                {selectedBarcodes.length} QR code{selectedBarcodes.length !== 1 ? 's' : ''} •{' '}
                {lbxMode === 'single' ? '1 LBX file' : `${selectedBarcodes.length} LBX files in ZIP`}
              </span>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowLbxModal(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button onClick={handleDownloadLbx} className="btn btn-primary">
                Export LBX
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
