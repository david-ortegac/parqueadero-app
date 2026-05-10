import QRCode from 'qrcode';

/** Data URL PNG del QR que apunta a `targetUrl`. Solo en navegador. */
export async function getPlateQrDataUrl(targetUrl: string): Promise<string | null> {
  const u = targetUrl.trim();
  if (!u) {
    return null;
  }
  try {
    return await QRCode.toDataURL(u, {
      width: 200,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#000000ff', light: '#ffffffff' },
    });
  } catch {
    return null;
  }
}

/** Bloque HTML para ticket térmico (imagen + leyenda). */
export async function buildPlateQrBlockForPrint(targetUrl: string): Promise<string> {
  const dataUrl = await getPlateQrDataUrl(targetUrl);
  if (!dataUrl) {
    return '';
  }
  return `<div class="qr-block center"><img src="${dataUrl}" alt="" width="120" height="120" /></div>
<div class="center muted" style="margin-top:4px">Consulta en la app (Parqueo)<br />con esta placa</div>`;
}
