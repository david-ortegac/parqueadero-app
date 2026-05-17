import {
  EntryTicketData,
  SaleReceiptData,
  formatCop,
  formatReceiptDateTime,
} from './sale-receipt.model';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const THERMAL_TICKET_CSS = `
    @page { size: 80mm auto; margin: 3mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      font-family: ui-monospace, 'Cascadia Mono', 'Segoe UI Mono', 'Roboto Mono', monospace;
      font-size: 11px;
      line-height: 1.35;
      color: #000;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .ticket {
      width: 72mm;
      max-width: 100%;
      margin: 0 auto;
      padding: 2mm 1mm;
    }
    .center { text-align: center; }
    .title { font-weight: 700; font-size: 13px; letter-spacing: 0.02em; text-transform: uppercase; }
    .muted { font-size: 10px; color: #333; }
    .wrap { word-break: break-word; }
    .rule {
      border: none;
      border-top: 1px dashed #000;
      margin: 6px 0;
    }
    .row {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      margin: 3px 0;
    }
    .row span:first-child { flex: 0 0 auto; font-weight: 600; }
    .row span:last-child { text-align: right; flex: 1; min-width: 0; }
    .big {
      margin-top: 8px;
      font-size: 14px;
      font-weight: 700;
      text-align: center;
    }
    .footer {
      margin-top: 10px;
      font-size: 9px;
      text-align: center;
      color: #444;
    }
    .barcode-block {
      margin: 12px 0 6px;
      padding: 4px 0;
    }
    .barcode-block img {
      max-width: 100%;
      height: auto;
      display: block;
      margin: 0 auto;
      image-rendering: pixelated;
    }
    .qr-block {
      margin: 12px 0 6px;
      padding: 6px 0;
    }
    .qr-block img {
      display: block;
      margin: 0 auto;
      width: 120px;
      height: 120px;
      image-rendering: pixelated;
    }
`;

/** Documento HTML completo para impresora térmica 80mm (iframe / ventana de impresión). */
export function buildSaleReceiptPrintDocument(
  data: SaleReceiptData,
  plateBarcodeHtml = '',
  plateQrHtml = '',
): string {
  const title = escapeHtml(data.businessName);
  const nitLine =
    data.nit && data.nit.length > 0 ? `<div class="muted">NIT: ${escapeHtml(data.nit)}</div>` : '';
  const addrLine =
    data.address && data.address.length > 0 ? `<div class="muted wrap">${escapeHtml(data.address)}</div>` : '';
  const docLine =
    data.depositorDocument && data.depositorDocument.length > 0
      ? `<div class="row"><span>Doc.</span><span class="wrap">${escapeHtml(data.depositorDocument)}</span></div>`
      : '';

  const amount = formatCop(data.amountPaid);

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>${THERMAL_TICKET_CSS}</style>
</head>
<body>
  <div class="ticket">
    <div class="center title">${title}</div>
    ${nitLine}
    ${addrLine}
    <div class="center muted" style="margin-top:6px">Recibo de pago — Parqueo</div>
    <hr class="rule" />
    <div class="row"><span>Ticket</span><span>#${escapeHtml(data.ticketNo)}</span></div>
    <div class="row"><span>Placa</span><span>${escapeHtml(data.plate)}</span></div>
    ${plateBarcodeHtml}
    <div class="row"><span>Vehículo</span><span>${escapeHtml(data.vehicleClassLabel)}</span></div>
    <div class="row"><span>Modalidad</span><span>${escapeHtml(data.billingModeLabel)}</span></div>
    ${docLine}
    <div class="row"><span>Ingreso</span><span>${escapeHtml(formatReceiptDateTime(data.enteredAtIso))}</span></div>
    <div class="row"><span>Salida</span><span>${escapeHtml(formatReceiptDateTime(data.exitedAtIso))}</span></div>
    ${plateQrHtml}
    <hr class="rule" />
    <div class="big">TOTAL ${escapeHtml(amount)}</div>
    <div class="footer">Gracias por su visita<br />Documento para control interno</div>
  </div>
</body>
</html>`;
}

/** Ticket de ingreso — misma anchura 80mm que el recibo de salida. */
export function buildEntryTicketPrintDocument(
  data: EntryTicketData,
  plateBarcodeHtml = '',
  plateQrHtml = '',
): string {
  const title = escapeHtml(data.businessName);
  const nitLine =
    data.nit && data.nit.length > 0 ? `<div class="muted">NIT: ${escapeHtml(data.nit)}</div>` : '';
  const addrLine =
    data.address && data.address.length > 0 ? `<div class="muted wrap">${escapeHtml(data.address)}</div>` : '';
  const docLine =
    data.depositorDocument && data.depositorDocument.length > 0
      ? `<div class="row"><span>Doc.</span><span class="wrap">${escapeHtml(data.depositorDocument)}</span></div>`
      : '';
  const periodLine =
    data.periodEndsAtIso && data.periodEndsAtIso.length > 0
      ? `<div class="row"><span>Válido hasta</span><span>${escapeHtml(formatReceiptDateTime(data.periodEndsAtIso))}</span></div>`
      : '';
  const subscriptionLine =
    data.subscriptionCoverageLine && data.subscriptionCoverageLine.length > 0
      ? `<div class="row wrap"><span>Cobertura</span><span>${escapeHtml(data.subscriptionCoverageLine)}</span></div>`
      : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} — Ingreso</title>
  <style>${THERMAL_TICKET_CSS}</style>
</head>
<body>
  <div class="ticket">
    <div class="center title">${title}</div>
    ${nitLine}
    ${addrLine}
    <div class="center muted" style="margin-top:6px">Ticket de ingreso — Parqueo</div>
    <hr class="rule" />
    <div class="row"><span>Ticket</span><span>#${escapeHtml(data.ticketNo)}</span></div>
    <div class="row"><span>Placa</span><span>${escapeHtml(data.plate)}</span></div>
    ${plateBarcodeHtml}
    <div class="row"><span>Vehículo</span><span>${escapeHtml(data.vehicleClassLabel)}</span></div>
    <div class="row"><span>Modalidad</span><span>${escapeHtml(data.billingModeLabel)}</span></div>
    ${docLine}
    <div class="row"><span>Ingreso</span><span>${escapeHtml(formatReceiptDateTime(data.enteredAtIso))}</span></div>
    ${periodLine}
    ${subscriptionLine}
    ${plateQrHtml}
    <hr class="rule" />
    <div class="big">${escapeHtml(data.amountLine)}</div>
    <div class="footer">Conserve este ticket · Presente al retirar el vehículo</div>
  </div>
</body>
</html>`;
}
