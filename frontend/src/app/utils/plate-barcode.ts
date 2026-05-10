import JsBarcode from 'jsbarcode';

/**
 * Data URL (SVG) del código de barras CODE128 con la placa (alfanumérico).
 * Solo en navegador (usa DOM). `null` si la placa está vacía o no se pudo generar.
 */
export function getPlateBarcodeDataUrl(plateRaw: string): string | null {
  const plate = plateRaw.trim().toUpperCase();
  if (!plate) {
    return null;
  }
  try {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    JsBarcode(svg, plate, {
      format: 'CODE128',
      width: 1.15,
      height: 42,
      margin: 4,
      displayValue: true,
      fontSize: 11,
      textMargin: 3,
      background: '#ffffff',
      lineColor: '#000000',
    });
    const ser = new XMLSerializer().serializeToString(svg);
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(ser)}`;
  } catch {
    return null;
  }
}

/** Fragmento HTML listo para insertar en el documento de impresión térmica. */
export function buildPlateBarcodeBlockForPrint(plateRaw: string): string {
  const url = getPlateBarcodeDataUrl(plateRaw);
  if (!url) {
    return '';
  }
  return `<div class="barcode-block center"><img src="${url}" alt="" /></div>`;
}
