import { jsPDF } from 'jspdf';
import { fetchBarcodeImage } from './barcodeExport';

export interface LabelConfig {
  labelWidth: number; // mm
  labelHeight: number; // mm
  columns: number;
  rows: number;
  marginX: number; // mm - horizontal margin between labels
  marginY: number; // mm - vertical margin between labels
  pageMargin: number; // mm - page margin
  showLabel: boolean;
  showCode: boolean;
}

export interface BarcodeForPdf {
  url: string;
  code: string;
  label: string;
}

// Preset label configurations
export const LABEL_PRESETS: Record<string, LabelConfig> = {
  small: {
    labelWidth: 50,
    labelHeight: 25,
    columns: 4,
    rows: 10,
    marginX: 2,
    marginY: 2,
    pageMargin: 10,
    showLabel: true,
    showCode: true,
  },
  medium: {
    labelWidth: 60,
    labelHeight: 30,
    columns: 3,
    rows: 8,
    marginX: 3,
    marginY: 3,
    pageMargin: 10,
    showLabel: true,
    showCode: true,
  },
  large: {
    labelWidth: 90,
    labelHeight: 40,
    columns: 2,
    rows: 6,
    marginX: 5,
    marginY: 5,
    pageMargin: 10,
    showLabel: true,
    showCode: true,
  },
};

/**
 * Converts a blob to a base64 data URL
 */
async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Generates a PDF with barcode labels
 */
export async function generateBarcodePdf(
  barcodes: BarcodeForPdf[],
  config: LabelConfig
): Promise<Blob> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const labelsPerPage = config.columns * config.rows;
  let currentLabel = 0;

  // Calculate starting position to center labels on page
  const totalLabelWidth = config.columns * config.labelWidth + (config.columns - 1) * config.marginX;
  const totalLabelHeight = config.rows * config.labelHeight + (config.rows - 1) * config.marginY;
  const startX = (pageWidth - totalLabelWidth) / 2;
  const startY = (pageHeight - totalLabelHeight) / 2;

  for (const barcode of barcodes) {
    // Add new page if needed
    if (currentLabel > 0 && currentLabel % labelsPerPage === 0) {
      pdf.addPage();
    }

    const labelIndex = currentLabel % labelsPerPage;
    const col = labelIndex % config.columns;
    const row = Math.floor(labelIndex / config.columns);

    const x = startX + col * (config.labelWidth + config.marginX);
    const y = startY + row * (config.labelHeight + config.marginY);

    // Draw label border (light gray)
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.1);
    pdf.rect(x, y, config.labelWidth, config.labelHeight);

    try {
      // Fetch and add barcode image
      const blob = await fetchBarcodeImage(barcode.url);
      const dataUrl = await blobToDataUrl(blob);

      // Calculate image dimensions - keep QR code square
      const maxHeight = config.showLabel ? config.labelHeight * 0.5 : config.labelHeight * 0.7;
      const maxWidth = config.labelWidth * 0.9;
      // Use the smaller dimension to maintain square aspect ratio for QR codes
      const qrSize = Math.min(maxWidth, maxHeight);
      const barcodeX = x + (config.labelWidth - qrSize) / 2;
      const barcodeY = y + 2;

      pdf.addImage(dataUrl, 'PNG', barcodeX, barcodeY, qrSize, qrSize);

      // Add label text
      if (config.showLabel) {
        pdf.setFontSize(8);
        pdf.setTextColor(0, 0, 0);
        const labelY = y + config.labelHeight * 0.65;
        const labelText = barcode.label.length > 25 ? barcode.label.substring(0, 22) + '...' : barcode.label;
        pdf.text(labelText, x + config.labelWidth / 2, labelY, { align: 'center' });
      }

      // Add code text
      if (config.showCode) {
        pdf.setFontSize(7);
        pdf.setTextColor(80, 80, 80);
        const codeY = y + config.labelHeight - 3;
        const codeText = barcode.code.length > 30 ? barcode.code.substring(0, 27) + '...' : barcode.code;
        pdf.text(codeText, x + config.labelWidth / 2, codeY, { align: 'center' });
      }
    } catch (error) {
      // Draw error placeholder
      pdf.setFontSize(8);
      pdf.setTextColor(200, 0, 0);
      pdf.text('Error loading', x + config.labelWidth / 2, y + config.labelHeight / 2, { align: 'center' });
    }

    currentLabel++;
  }

  return pdf.output('blob');
}

/**
 * Downloads a PDF of barcode labels
 */
export async function downloadBarcodePdf(
  barcodes: BarcodeForPdf[],
  config: LabelConfig,
  filename: string = 'barcodes'
): Promise<void> {
  const blob = await generateBarcodePdf(barcodes, config);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.pdf`;
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
