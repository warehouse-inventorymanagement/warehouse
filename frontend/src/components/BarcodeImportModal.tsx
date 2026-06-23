import { useState, useRef } from 'react';
import {
  XMarkIcon,
  ArrowUpTrayIcon,
  DocumentArrowUpIcon,
} from '@heroicons/react/24/outline';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import {
  downloadMultiBarcodeLbx,
  downloadLbxFilesZip,
  type TapeSize,
  type TextDisplay,
  type BarcodeForLbx,
} from '../utils/lbxGenerator';

interface BarcodeImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ImportedRow {
  code: string;
  name?: string;
}

export default function BarcodeImportModal({ isOpen, onClose }: BarcodeImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importedData, setImportedData] = useState<ImportedRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [codeColumn, setCodeColumn] = useState<string>('');
  const [nameColumn, setNameColumn] = useState<string>('');
  const [rawData, setRawData] = useState<Record<string, string>[]>([]);

  // LBX configuration
  const [tapeSize, setTapeSize] = useState<TapeSize>('12mm');
  const [textDisplay, setTextDisplay] = useState<TextDisplay>('with-sku');
  const [exportMode, setExportMode] = useState<'single' | 'multiple'>('single');
  const [exporting, setExporting] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' });

      if (jsonData.length === 0) {
        toast.error('No data found in the file');
        return;
      }

      // Get column names
      const cols = Object.keys(jsonData[0]);
      setColumns(cols);
      setRawData(jsonData);

      // Auto-detect code and name columns
      const codeCol = cols.find(c =>
        c.toLowerCase().includes('code') ||
        c.toLowerCase().includes('barcode') ||
        c.toLowerCase().includes('sku')
      ) || cols[0];

      const nameCol = cols.find(c =>
        c.toLowerCase().includes('name') ||
        c.toLowerCase().includes('label') ||
        c.toLowerCase().includes('description') ||
        c.toLowerCase().includes('item')
      ) || '';

      setCodeColumn(codeCol);
      setNameColumn(nameCol);

      // Map data
      const mapped = jsonData
        .map(row => ({
          code: String(row[codeCol] || '').trim(),
          name: nameCol ? String(row[nameCol] || '').trim() : undefined,
        }))
        .filter(row => row.code); // Filter out empty codes

      setImportedData(mapped);
      toast.success(`Imported ${mapped.length} codes`);
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to parse file');
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleColumnChange = () => {
    if (!codeColumn) return;

    const mapped = rawData
      .map(row => ({
        code: String(row[codeColumn] || '').trim(),
        name: nameColumn ? String(row[nameColumn] || '').trim() : undefined,
      }))
      .filter(row => row.code);

    setImportedData(mapped);
  };

  const handleExport = async () => {
    if (importedData.length === 0) {
      toast.error('No codes to export');
      return;
    }

    setExporting(true);
    try {
      const config = { tapeSize, textDisplay };
      const barcodes: BarcodeForLbx[] = importedData.map(row => ({
        code: row.code,
        label: row.name,
      }));

      if (exportMode === 'single') {
        await downloadMultiBarcodeLbx(barcodes, config, 'imported-qrcodes');
        toast.success('Downloaded LBX file');
      } else {
        await downloadLbxFilesZip(barcodes, config, 'imported-qrcodes');
        toast.success(`Downloaded ${barcodes.length} LBX files as ZIP`);
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export');
    } finally {
      setExporting(false);
    }
  };

  const handleClose = () => {
    setImportedData([]);
    setColumns([]);
    setCodeColumn('');
    setNameColumn('');
    setRawData([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        className="rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Import QR Codes from Excel
          </h3>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* File upload */}
        {importedData.length === 0 ? (
          <div
            className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:border-[var(--accent)] transition-colors"
            style={{ borderColor: 'var(--bg-tertiary)' }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
            />
            <DocumentArrowUpIcon className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-secondary)' }} />
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
              {importing ? 'Importing...' : 'Click to upload Excel file'}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              .xlsx or .xls with columns for code and optional name
            </p>
          </div>
        ) : (
          <>
            {/* Column mapping */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                  Code Column *
                </label>
                <select
                  value={codeColumn}
                  onChange={(e) => {
                    setCodeColumn(e.target.value);
                    setTimeout(handleColumnChange, 0);
                  }}
                  className="input w-full"
                >
                  {columns.map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                  Name Column (optional)
                </label>
                <select
                  value={nameColumn}
                  onChange={(e) => {
                    setNameColumn(e.target.value);
                    setTimeout(handleColumnChange, 0);
                  }}
                  className="input w-full"
                >
                  <option value="">-- None --</option>
                  {columns.map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Preview */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  Preview ({importedData.length} codes)
                </span>
                <button
                  onClick={() => {
                    setImportedData([]);
                    setColumns([]);
                    setRawData([]);
                  }}
                  className="text-sm"
                  style={{ color: 'var(--accent)' }}
                >
                  Clear & Upload New
                </button>
              </div>
              <div
                className="rounded-lg overflow-hidden max-h-40 overflow-y-auto"
                style={{ backgroundColor: 'var(--bg-tertiary)' }}
              >
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-secondary)' }}>
                      <th className="px-3 py-2 text-left font-medium" style={{ color: 'var(--text-primary)' }}>
                        Code
                      </th>
                      <th className="px-3 py-2 text-left font-medium" style={{ color: 'var(--text-primary)' }}>
                        Name
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {importedData.slice(0, 10).map((row, i) => (
                      <tr key={i} style={{ borderTop: '1px solid var(--bg-secondary)' }}>
                        <td className="px-3 py-2 font-mono" style={{ color: 'var(--text-primary)' }}>
                          {row.code}
                        </td>
                        <td className="px-3 py-2" style={{ color: 'var(--text-secondary)' }}>
                          {row.name || '-'}
                        </td>
                      </tr>
                    ))}
                    {importedData.length > 10 && (
                      <tr style={{ borderTop: '1px solid var(--bg-secondary)' }}>
                        <td colSpan={2} className="px-3 py-2 text-center" style={{ color: 'var(--text-secondary)' }}>
                          ... and {importedData.length - 10} more
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* LBX Export Options */}
            <div className="border-t pt-4 mb-4" style={{ borderColor: 'var(--bg-tertiary)' }}>
              <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                Export to Brother P-Touch
              </h4>

              {/* Tape size */}
              <div className="mb-3">
                <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Tape Size
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['12mm', '18mm', '24mm'] as const).map((size) => (
                    <button
                      key={size}
                      onClick={() => setTapeSize(size)}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        tapeSize === size ? 'ring-2 ring-[var(--accent)]' : ''
                      }`}
                      style={{
                        backgroundColor: tapeSize === size ? 'var(--accent)' : 'var(--bg-tertiary)',
                        color: tapeSize === size ? '#fff' : 'var(--text-primary)',
                      }}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Text display */}
              <div className="mb-3">
                <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
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
                      onClick={() => setTextDisplay(option.value)}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        textDisplay === option.value ? 'ring-2 ring-[var(--accent)]' : ''
                      }`}
                      style={{
                        backgroundColor: textDisplay === option.value ? 'var(--accent)' : 'var(--bg-tertiary)',
                        color: textDisplay === option.value ? '#fff' : 'var(--text-primary)',
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Export mode */}
              <div className="mb-3">
                <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Export Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setExportMode('single')}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      exportMode === 'single' ? 'ring-2 ring-[var(--accent)]' : ''
                    }`}
                    style={{
                      backgroundColor: exportMode === 'single' ? 'var(--accent)' : 'var(--bg-tertiary)',
                      color: exportMode === 'single' ? '#fff' : 'var(--text-primary)',
                    }}
                  >
                    Single Label Strip
                  </button>
                  <button
                    onClick={() => setExportMode('multiple')}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      exportMode === 'multiple' ? 'ring-2 ring-[var(--accent)]' : ''
                    }`}
                    style={{
                      backgroundColor: exportMode === 'multiple' ? 'var(--accent)' : 'var(--bg-tertiary)',
                      color: exportMode === 'multiple' ? '#fff' : 'var(--text-primary)',
                    }}
                  >
                    Individual Files (ZIP)
                  </button>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <button onClick={handleClose} className="btn btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleExport}
                disabled={exporting || importedData.length === 0}
                className="btn btn-primary flex items-center gap-2"
              >
                <ArrowUpTrayIcon className="w-4 h-4" />
                {exporting ? 'Exporting...' : 'Export LBX'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
