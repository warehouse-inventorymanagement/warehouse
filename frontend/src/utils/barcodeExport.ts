import JSZip from 'jszip';

export interface BarcodeData {
  id: string;
  code: string;
  label: string;
  type: 'item' | 'location';
  sublabel?: string;
}

/**
 * Fetches a barcode image from the API with authentication
 */
export async function fetchBarcodeImage(url: string): Promise<Blob> {
  const token = localStorage.getItem('accessToken');
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch barcode image');
  }

  return response.blob();
}

/**
 * Creates a blob URL from a barcode image URL
 */
export async function fetchBarcodeAsUrl(url: string): Promise<string> {
  const blob = await fetchBarcodeImage(url);
  return URL.createObjectURL(blob);
}

/**
 * Converts a blob to a canvas with optional format conversion
 */
async function blobToCanvas(blob: Blob, format: 'png' | 'jpeg' = 'png'): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(blob);
  const img = new Image();

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = url;
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
  URL.revokeObjectURL(url);

  return canvas;
}

/**
 * Downloads a single barcode as PNG or JPEG
 */
export async function downloadBarcode(
  barcodeUrl: string,
  filename: string,
  format: 'png' | 'jpeg' = 'png'
): Promise<void> {
  const blob = await fetchBarcodeImage(barcodeUrl);
  const canvas = await blobToCanvas(blob, format);

  const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
  const extension = format === 'jpeg' ? 'jpg' : 'png';

  canvas.toBlob(
    (resultBlob) => {
      if (!resultBlob) {
        throw new Error('Failed to create image');
      }
      const url = URL.createObjectURL(resultBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.${extension}`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    mimeType,
    0.95
  );
}

/**
 * Downloads multiple barcodes as a ZIP file
 */
export async function downloadBarcodesAsZip(
  barcodes: { url: string; filename: string }[],
  zipFilename: string,
  format: 'png' | 'jpeg' = 'png'
): Promise<void> {
  const zip = new JSZip();
  const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
  const extension = format === 'jpeg' ? 'jpg' : 'png';

  for (const barcode of barcodes) {
    try {
      const blob = await fetchBarcodeImage(barcode.url);
      const canvas = await blobToCanvas(blob, format);

      const imageBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Failed to create image'))),
          mimeType,
          0.95
        );
      });

      zip.file(`${barcode.filename}.${extension}`, imageBlob);
    } catch (error) {
      console.error(`Failed to add barcode ${barcode.filename}:`, error);
    }
  }

  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${zipFilename}.zip`;
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

/**
 * Prints a single barcode
 */
export async function printBarcode(barcodeUrl: string, label: string): Promise<void> {
  const blob = await fetchBarcodeImage(barcodeUrl);
  const imageUrl = URL.createObjectURL(blob);

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Barcode - ${label}</title>
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
            .label-name {
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
            <div class="label-name">${label}</div>
            <img src="${imageUrl}" alt="Barcode" class="barcode-img" onload="window.print(); window.close();" />
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  }
}

/**
 * Prints multiple barcodes
 */
export async function printBarcodes(
  barcodes: { url: string; label: string; code: string }[]
): Promise<void> {
  const imageUrls: { url: string; label: string; code: string }[] = [];

  for (const barcode of barcodes) {
    try {
      const blob = await fetchBarcodeImage(barcode.url);
      const url = URL.createObjectURL(blob);
      imageUrls.push({ url, label: barcode.label, code: barcode.code });
    } catch (error) {
      console.error(`Failed to fetch barcode for ${barcode.label}:`, error);
    }
  }

  if (imageUrls.length === 0) {
    throw new Error('No barcodes to print');
  }

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    const labelsHtml = imageUrls
      .map(
        (img) => `
        <div class="label">
          <div class="label-name">${img.label}</div>
          <img src="${img.url}" alt="Barcode" class="barcode-img" />
        </div>
      `
      )
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Barcodes</title>
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
              display: flex;
              flex-wrap: wrap;
              gap: 10px;
              padding: 10px;
              background: white !important;
              color: black !important;
            }
            .label {
              display: inline-block;
              text-align: center;
              padding: 10px;
              border: 1px dashed #ccc;
              page-break-inside: avoid;
            }
            .label-name {
              font-size: 12px;
              font-weight: bold;
              margin-bottom: 6px;
              max-width: 200px;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
              color: black !important;
            }
            .barcode-img {
              max-width: 200px;
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
          ${labelsHtml}
          <script>
            let loaded = 0;
            const images = document.querySelectorAll('img');
            images.forEach(img => {
              if (img.complete) {
                loaded++;
              } else {
                img.onload = () => {
                  loaded++;
                  if (loaded === images.length) {
                    window.print();
                    window.close();
                  }
                };
              }
            });
            if (loaded === images.length) {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }
}

/**
 * Copies barcode text to clipboard
 */
export async function copyBarcodeText(text: string): Promise<void> {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(text);
  } else {
    // Fallback for non-HTTPS contexts
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
  }
}
