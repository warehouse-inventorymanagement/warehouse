import JSZip from 'jszip';

export type TapeSize = '12mm' | '18mm' | '24mm';
export type TextDisplay = 'with-sku' | 'with-name' | 'qr-only';
export type EccLevel = '7%' | '15%' | '25%' | '30%';

export interface LbxConfig {
  tapeSize: TapeSize;
  textDisplay: TextDisplay;
  // Optional QR customization (defaults based on tape size)
  qrSize?: number;      // QR code size in points (default: 30 for 12mm)
  cellSize?: number;    // Cell size in points (default: 1.2 for 12mm)
  spacing?: number;     // Spacing between QR codes (default: 30 for 12mm)
  eccLevel?: EccLevel;  // Error correction level (default: '15%')
}

export interface BarcodeForLbx {
  code: string;
  label?: string;
}

// Tape configurations matching Brother P-Touch Editor exactly
// Values from actual P-Touch Editor 6.9 output
const TAPE_CONFIGS: Record<TapeSize, {
  width: number;
  marginLeft: number;
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  format: number;
}> = {
  '12mm': { width: 33.6, marginLeft: 4, marginTop: 5.6, marginRight: 4, marginBottom: 5.6, format: 259 },
  '18mm': { width: 51.2, marginLeft: 3.2, marginTop: 5.6, marginRight: 3.2, marginBottom: 5.6, format: 260 },
  '24mm': { width: 68, marginLeft: 8.4, marginTop: 5.6, marginRight: 8.4, marginBottom: 5.6, format: 261 },
};

// Default QR code settings per tape size
// These can be overridden via LbxConfig options
export const QR_DEFAULTS: Record<TapeSize, { size: number; cellSize: number; spacing: number; startX: number; y: number }> = {
  '12mm': { size: 30, cellSize: 1.2, spacing: 30, startX: 1, y: 1.8 },
  '18mm': { size: 50, cellSize: 2.0, spacing: 50, startX: 1.6, y: 0.6 },
  '24mm': { size: 60, cellSize: 2.4, spacing: 60, startX: 4.1, y: 4 },
};

// Text settings per tape size (from P-Touch Editor output)
const TEXT_SETTINGS: Record<TapeSize, { fontSize: number; fontWidth: number; textHeight: number; textYOffset: number; textWidth: number }> = {
  '12mm': { fontSize: 5, fontWidth: 1.6, textHeight: 5.6, textYOffset: -2, textWidth: 28 },
  '18mm': { fontSize: 6, fontWidth: 2, textHeight: 7, textYOffset: -2, textWidth: 48 },
  '24mm': { fontSize: 7.6, fontWidth: 2.5, textHeight: 8.4, textYOffset: -4.4, textWidth: 50 },
};

// Available error correction levels
export const ECC_LEVELS: EccLevel[] = ['7%', '15%', '25%', '30%'];

/**
 * Generates a text element for the label
 */
function generateTextElement(text: string, x: number, y: number, index: number, tapeSize: TapeSize): string {
  const settings = TEXT_SETTINGS[tapeSize];

  // Generate stringItem element for the full text (required by P-Touch Editor)
  const stringItem = `<text:stringItem charLen="${text.length}"><text:ptFontInfo><text:logFont name="Arial" width="${settings.fontWidth}pt" italic="false" weight="400" charSet="0" pitchAndFamily="34"></text:logFont><text:fontExt effect="NOEFFECT" underline="0" strikeout="0" size="${settings.fontSize}pt" orgSize="28.8pt" textColor="#000000" textPrintColorNumber="1"></text:fontExt></text:ptFontInfo></text:stringItem>`;

  return `<text:text><pt:objectStyle x="${x}pt" y="${y}pt" width="${settings.textWidth}pt" height="${settings.textHeight}pt" backColor="#FFFFFF" backPrintColorNumber="0" ropMode="COPYPEN" angle="0" anchor="TOPLEFT" flip="NONE"><pt:pen style="NULL" widthX="0.5pt" widthY="0.5pt" color="#000000" printColorNumber="1"></pt:pen><pt:brush style="NULL" color="#000000" printColorNumber="1" id="0"></pt:brush><pt:expanded objectName="Text${index + 1}" ID="0" lock="0" templateMergeTarget="LABELLIST" templateMergeType="NONE" templateMergeID="0" allowOutOfBoundsTransfer="false" linkStatus="NONE" linkID="0"></pt:expanded></pt:objectStyle><text:ptFontInfo><text:logFont name="Arial" width="${settings.fontWidth}pt" italic="false" weight="400" charSet="0" pitchAndFamily="34"></text:logFont><text:fontExt effect="NOEFFECT" underline="0" strikeout="0" size="${settings.fontSize}pt" orgSize="28.8pt" textColor="#000000" textPrintColorNumber="1"></text:fontExt></text:ptFontInfo><text:textControl control="FREE" clipFrame="false" aspectNormal="false" shrink="false" autoLF="false" avoidImage="false"></text:textControl><text:textAlign horizontalAlignment="LEFT" verticalAlignment="TOP" inLineAlignment="BASELINE"></text:textAlign><text:textStyle vertical="false" nullBlock="false" charSpace="0" lineSpace="0" orgPoint="0pt" combinedChars="false"></text:textStyle><text:transferSettings editOnPrintFormat="" editOnPrintOrder="0"></text:transferSettings><pt:data>${escapeXml(text)}</pt:data>${stringItem}</text:text>`;
}

/**
 * Generates the label.xml content matching Brother P-Touch Editor 6.9 format
 */
function generateLabelXml(barcodes: BarcodeForLbx[], config: LbxConfig): string {
  const tape = TAPE_CONFIGS[config.tapeSize];
  const defaults = QR_DEFAULTS[config.tapeSize];
  const textSettings = TEXT_SETTINGS[config.tapeSize];

  // Apply config overrides or use defaults
  const qrSize = config.qrSize ?? defaults.size;
  const cellSize = config.cellSize ?? defaults.cellSize;
  const spacing = config.spacing ?? defaults.spacing;
  const eccLevel = config.eccLevel ?? '15%';
  const startX = defaults.startX;
  const y = defaults.y;

  // Generate QR code elements
  const qrElements = barcodes
    .map((barcode, index) => {
      const x = startX + index * spacing;

      return `<barcode:barcode><pt:objectStyle x="${x}pt" y="${y}pt" width="${qrSize}pt" height="${qrSize}pt" backColor="#FFFFFF" backPrintColorNumber="0" ropMode="COPYPEN" angle="0" anchor="TOPLEFT" flip="NONE"><pt:pen style="NULL" widthX="0.5pt" widthY="0.5pt" color="#000000" printColorNumber="1"></pt:pen><pt:brush style="NULL" color="#000000" printColorNumber="1" id="0"></pt:brush><pt:expanded objectName="QR${index + 1}" ID="0" lock="0" templateMergeTarget="LABELLIST" templateMergeType="NONE" templateMergeID="0" allowOutOfBoundsTransfer="false" linkStatus="NONE" linkID="0"></pt:expanded></pt:objectStyle><barcode:barcodeStyle protocol="QRCODE" lengths="0" zeroFill="false" barWidth="0.8pt" barRatio="1:3" humanReadable="false" humanReadableAlignment="CENTER" checkDigit="true" autoLengths="true" margin="false" sameLengthBar="false" bearerBar="true"></barcode:barcodeStyle><barcode:qrcodeStyle model="2" eccLevel="${eccLevel}" cellSize="${cellSize}pt" mbcs="auto" joint="1" version="auto"></barcode:qrcodeStyle><pt:data>${escapeXml(barcode.code)}</pt:data></barcode:barcode>`;
    })
    .join('');

  // Generate text elements based on textDisplay setting (skip for 'qr-only')
  let textElements = '';
  if (config.textDisplay !== 'qr-only') {
    textElements = barcodes
      .map((barcode, index) => {
        const qrX = startX + index * spacing;
        // Position text below QR code, centered under QR
        const textX = qrX + 5; // Small offset from QR left edge
        const textY = y + qrSize + textSettings.textYOffset;

        // Determine what text to show
        const displayText = config.textDisplay === 'with-name' && barcode.label
          ? barcode.label
          : barcode.code;

        return generateTextElement(displayText, textX, textY, index, config.tapeSize);
      })
      .join('');
  }

  const elements = qrElements + textElements;

  // Calculate total width
  const totalWidth = barcodes.length * spacing;
  const bgHeight = tape.width - tape.marginTop - tape.marginBottom;

  return `<?xml version="1.0" encoding="UTF-8"?>
<pt:document xmlns:pt="http://schemas.brother.info/ptouch/2007/lbx/main" xmlns:style="http://schemas.brother.info/ptouch/2007/lbx/style" xmlns:text="http://schemas.brother.info/ptouch/2007/lbx/text" xmlns:draw="http://schemas.brother.info/ptouch/2007/lbx/draw" xmlns:image="http://schemas.brother.info/ptouch/2007/lbx/image" xmlns:barcode="http://schemas.brother.info/ptouch/2007/lbx/barcode" xmlns:database="http://schemas.brother.info/ptouch/2007/lbx/database" xmlns:table="http://schemas.brother.info/ptouch/2007/lbx/table" xmlns:cable="http://schemas.brother.info/ptouch/2007/lbx/cable" version="1.10" generator="P-touch Editor 6.9.0.0 Windows"><pt:body currentSheet="Sheet 1" direction="LTR"><style:sheet name="Sheet 1"><style:paper media="0" width="${tape.width}pt" height="2834.4pt" marginLeft="${tape.marginLeft}pt" marginTop="${tape.marginTop}pt" marginRight="${tape.marginRight}pt" marginBottom="${tape.marginBottom}pt" orientation="landscape" autoLength="true" monochromeDisplay="true" printColorDisplay="false" printColorsID="0" paperColor="#FFFFFF" paperInk="#000000" split="1" format="${tape.format}" backgroundTheme="0" printerID="0" printerName=""></style:paper><style:cutLine regularCut="0pt" freeCut=""></style:cutLine><style:backGround x="${tape.marginBottom}pt" y="${tape.marginTop}pt" width="${totalWidth}pt" height="${bgHeight}pt" brushStyle="NULL" brushId="0" userPattern="NONE" userPatternId="0" color="#000000" printColorNumber="1" backColor="#FFFFFF" backPrintColorNumber="0"></style:backGround><pt:objects>${elements}</pt:objects></style:sheet></pt:body></pt:document>`;
}

/**
 * Generates the prop.xml content for a Brother P-Touch LBX file
 */
function generatePropXml(): string {
  const now = new Date().toISOString();

  return `<?xml version="1.0" encoding="UTF-8"?>
<meta:properties xmlns:meta="http://schemas.brother.info/ptouch/2007/lbx/meta" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/"><meta:appName>P-touch Editor</meta:appName><dc:title></dc:title><dc:subject></dc:subject><dc:creator></dc:creator><meta:keyword></meta:keyword><dc:description></dc:description><meta:template></meta:template><dcterms:created>${now}</dcterms:created><dcterms:modified>${now}</dcterms:modified><meta:lastPrinted></meta:lastPrinted><meta:modifiedBy></meta:modifiedBy><meta:revision>1</meta:revision><meta:editTime>0</meta:editTime><meta:numPages>1</meta:numPages><meta:numWords>0</meta:numWords><meta:numChars>0</meta:numChars><meta:security>0</meta:security><meta:transferScript></meta:transferScript></meta:properties>`;
}

/**
 * Escapes special XML characters
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generates a single LBX file with one QR code
 */
export async function generateSingleLbx(
  barcode: BarcodeForLbx,
  config: LbxConfig
): Promise<Blob> {
  const zip = new JSZip();

  zip.file('label.xml', generateLabelXml([barcode], config));
  zip.file('prop.xml', generatePropXml());

  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}

/**
 * Generates an LBX file with multiple QR codes on a continuous label
 */
export async function generateMultiBarcodeLbx(
  barcodes: BarcodeForLbx[],
  config: LbxConfig
): Promise<Blob> {
  const zip = new JSZip();

  zip.file('label.xml', generateLabelXml(barcodes, config));
  zip.file('prop.xml', generatePropXml());

  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}

/**
 * Generates multiple individual LBX files (one per QR code) in a ZIP
 */
export async function generateLbxFilesZip(
  barcodes: BarcodeForLbx[],
  config: LbxConfig
): Promise<Blob> {
  const zip = new JSZip();

  for (const barcode of barcodes) {
    const singleLbx = await generateSingleLbx(barcode, config);
    const filename = sanitizeFilename(barcode.code);
    zip.file(`${filename}.lbx`, singleLbx);
  }

  return zip.generateAsync({ type: 'blob' });
}

/**
 * Sanitizes a string for use as a filename
 */
function sanitizeFilename(str: string): string {
  return str.replace(/[<>:"/\\|?*]/g, '_').substring(0, 50);
}

/**
 * Downloads a single LBX file
 */
export async function downloadSingleLbx(
  barcode: BarcodeForLbx,
  config: LbxConfig,
  filename?: string
): Promise<void> {
  const blob = await generateSingleLbx(barcode, config);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename || sanitizeFilename(barcode.code)}.lbx`;
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

/**
 * Downloads an LBX file with all QR codes on one continuous label
 */
export async function downloadMultiBarcodeLbx(
  barcodes: BarcodeForLbx[],
  config: LbxConfig,
  filename: string = 'qrcodes'
): Promise<void> {
  const blob = await generateMultiBarcodeLbx(barcodes, config);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.lbx`;
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

/**
 * Downloads multiple LBX files (one per QR code) in a ZIP
 */
export async function downloadLbxFilesZip(
  barcodes: BarcodeForLbx[],
  config: LbxConfig,
  zipFilename: string = 'qrcodes'
): Promise<void> {
  const blob = await generateLbxFilesZip(barcodes, config);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${zipFilename}.zip`;
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
