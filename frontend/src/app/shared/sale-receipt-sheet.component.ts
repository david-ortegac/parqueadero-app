import { Component, EventEmitter, Input, Output } from '@angular/core';
import { EntryTicketData, SaleReceiptData, formatCop, formatReceiptDateTime } from './sale-receipt.model';
import { buildEntryTicketPrintDocument, buildSaleReceiptPrintDocument } from './sale-receipt-print-html';

@Component({
  selector: 'app-sale-receipt-sheet',
  templateUrl: './sale-receipt-sheet.component.html',
  styleUrls: ['./sale-receipt-sheet.component.scss'],
  standalone: false,
})
export class SaleReceiptSheetComponent {
  @Input() isOpen = false;

  @Input() receipt: SaleReceiptData | null = null;

  @Input() entryTicket: EntryTicketData | null = null;

  @Output() readonly closed = new EventEmitter<void>();

  readonly formatMoney = formatCop;

  readonly formatWhen = formatReceiptDateTime;

  get isEntryMode(): boolean {
    return this.entryTicket !== null;
  }

  close(): void {
    this.closed.emit();
  }

  /** Impresión orientada a rollo 80mm (iframe para no depender del tema Ionic). */
  printThermal(): void {
    let html: string;
    if (this.receipt) {
      html = buildSaleReceiptPrintDocument(this.receipt);
    } else if (this.entryTicket) {
      html = buildEntryTicketPrintDocument(this.entryTicket);
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
