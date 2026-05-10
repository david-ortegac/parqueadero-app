import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { EntryTicketData, SaleReceiptData, formatCop, formatReceiptDateTime } from './sale-receipt.model';
import { buildEntryTicketPrintDocument, buildSaleReceiptPrintDocument } from './sale-receipt-print-html';
import { buildOwnerProfilePlateUrl } from '../utils/owner-plate-deep-link';
import { buildPlateBarcodeBlockForPrint, getPlateBarcodeDataUrl } from '../utils/plate-barcode';
import { buildPlateQrBlockForPrint, getPlateQrDataUrl } from '../utils/plate-qr';

@Component({
  selector: 'app-sale-receipt-sheet',
  templateUrl: './sale-receipt-sheet.component.html',
  styleUrls: ['./sale-receipt-sheet.component.scss'],
  standalone: false,
})
export class SaleReceiptSheetComponent implements OnChanges {
  @Input() isOpen = false;

  @Input() receipt: SaleReceiptData | null = null;

  @Input() entryTicket: EntryTicketData | null = null;

  @Output() readonly closed = new EventEmitter<void>();

  readonly formatMoney = formatCop;

  readonly formatWhen = formatReceiptDateTime;

  plateQrSrc: string | null = null;

  private plateQrGen = 0;

  get isEntryMode(): boolean {
    return this.entryTicket !== null;
  }

  get receiptPlateBarcodeSrc(): string | null {
    return this.receipt ? getPlateBarcodeDataUrl(this.receipt.plate) : null;
  }

  get entryTicketPlateBarcodeSrc(): string | null {
    return this.entryTicket ? getPlateBarcodeDataUrl(this.entryTicket.plate) : null;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['receipt'] || changes['entryTicket'] || changes['isOpen']) {
      this.refreshPlateQrPreview();
    }
  }

  private refreshPlateQrPreview(): void {
    const plate = this.receipt?.plate ?? this.entryTicket?.plate ?? '';
    if (!plate.trim()) {
      this.plateQrSrc = null;
      return;
    }
    const targetUrl = buildOwnerProfilePlateUrl(plate);
    const gen = ++this.plateQrGen;
    void getPlateQrDataUrl(targetUrl).then((src) => {
      if (gen === this.plateQrGen) {
        this.plateQrSrc = src;
      }
    });
  }

  close(): void {
    this.closed.emit();
  }

  /** Impresión orientada a rollo 80mm (iframe para no depender del tema Ionic). */
  async printThermal(): Promise<void> {
    let html: string;
    const plate = this.receipt?.plate ?? this.entryTicket?.plate ?? '';
    const barcodeHtml = buildPlateBarcodeBlockForPrint(plate);
    const qrUrl = buildOwnerProfilePlateUrl(plate);
    const qrHtml = await buildPlateQrBlockForPrint(qrUrl);
    if (this.receipt) {
      html = buildSaleReceiptPrintDocument(this.receipt, barcodeHtml, qrHtml);
    } else if (this.entryTicket) {
      html = buildEntryTicketPrintDocument(this.entryTicket, barcodeHtml, qrHtml);
    } else {
      return;
    }
    this.printHtmlInIframe(html);
  }

  private printHtmlInIframe(html: string): void {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.title = 'Impresión ticket';
    Object.assign(iframe.style, {
      position: 'fixed',
      right: '0',
      bottom: '0',
      width: '0',
      height: '0',
      border: '0',
      opacity: '0',
      pointerEvents: 'none',
    });
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument;
    const win = iframe.contentWindow;
    if (!doc || !win) {
      iframe.remove();
      return;
    }
    doc.open();
    doc.write(html);
    doc.close();

    const cleanup = (): void => {
      iframe.remove();
    };

    win.addEventListener('afterprint', cleanup);
    requestAnimationFrame(() => {
      win.focus();
      win.print();
      globalThis.setTimeout(cleanup, 120000);
    });
  }
}
