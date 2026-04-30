/**
 * Invoice Service
 *
 * Service for generating PDF invoices for orders.
 * Uses jsPDF + jspdf-autotable with a strict one-page layout.
 *
 * @module services/invoiceService
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { OrderWithRelations } from '@/domain/types/order';
import { PaymentType } from '@/domain/types/payment';
import { settingsService } from './settingsService';
import { paymentService } from './paymentService';
import { orderService } from './orderService';

export interface InvoiceData {
  order: OrderWithRelations;
  invoiceType: 'deposit' | 'final';
  invoiceNumber: string;
  invoiceDate: string;
  payments?: any[];
  settings: {
    invoicePrefix: string;
    paymentTerms: string;
    authorizedSignature: string;
  };
}

// ─── Design Tokens (easy to adjust later) ────────────────────────────────────
const COLORS = {
  /** Dark charcoal for headings and accent bars */
  primary: [30, 30, 30] as [number, number, number],
  /** Medium gray for secondary text */
  secondary: [100, 100, 100] as [number, number, number],
  /** Light gray for helper text and separators */
  muted: [160, 160, 160] as [number, number, number],
  /** Table header background */
  tableHead: [38, 38, 38] as [number, number, number],
  /** Table header text */
  tableHeadText: [255, 255, 255] as [number, number, number],
  /** Very light gray for alternating table rows */
  tableStripe: [248, 248, 248] as [number, number, number],
  /** White */
  white: [255, 255, 255] as [number, number, number],
  /** Thin line color */
  line: [220, 220, 220] as [number, number, number],
};

const FONT = {
  family: 'helvetica' as const,
  sizeTitle: 16,
  sizeSubtitle: 11,
  sizeBody: 9,
  sizeSmall: 7.5,
  sizeTiny: 6.5,
};

/** Page margin (mm) */
const MARGIN = 14;

export class InvoiceService {
  /**
   * Generate invoice PDF
   */
  async generateInvoice(orderId: string, invoiceType: 'deposit' | 'final'): Promise<Blob> {
    // Fetch order with relations
    const orderResult = await orderService.getOrderById(orderId);
    if (!orderResult.success || !orderResult.data) {
      throw new Error('Order not found');
    }

    const order = orderResult.data;

    // Fetch invoice settings
    const settings = await this.getInvoiceSettings();

    // Fetch payments for the order
    const paymentsResult = await paymentService.getPaymentsByOrder(orderId);
    const payments = paymentsResult.success ? paymentsResult.data || [] : [];

    // Generate invoice number
    const invoiceNumber = `${settings.invoicePrefix}${order.id.slice(0, 8).toUpperCase()}-${invoiceType.toUpperCase()}`;
    const invoiceDate = new Date().toLocaleDateString('en-IN');

    const invoiceData: InvoiceData = {
      order,
      invoiceType,
      invoiceNumber,
      invoiceDate,
      payments,
      settings,
    };

    return this.generatePDF(invoiceData);
  }

  /**
   * Get invoice settings
   */
  private async getInvoiceSettings() {
    const prefixResult = await settingsService.findByKey('invoice_prefix');
    const termsResult = await settingsService.findByKey('payment_terms');
    const signatureResult = await settingsService.findByKey('authorized_signature');

    return {
      invoicePrefix: prefixResult.success && prefixResult.data ? prefixResult.data.value : 'INV-',
      paymentTerms: termsResult.success && termsResult.data ? termsResult.data.value : '',
      authorizedSignature: signatureResult.success && signatureResult.data ? signatureResult.data.value : '',
    };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  /** Format a number as ₹ currency string */
  private fmt(val: any): string {
    const num = Number(val);
    return isNaN(num) ? '₹0' : `₹${num.toLocaleString('en-IN')}`;
  }

  /** Format a date string to DD/MM/YYYY */
  private fmtDate(dateStr: string): string {
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }

  /** Get product name from the order item's joined product relation */
  private getItemProductName(item: any): string {
    if (item.product && typeof item.product === 'object') {
      return item.product.name || `Item #${item.product_id.slice(0, 8)}`;
    }
    return `Item #${item.product_id.slice(0, 8)}`;
  }

  /** Truncate text to fit a max width, appending "…" if needed */
  private truncate(doc: jsPDF, text: string, maxWidth: number, fontSize: number): string {
    doc.setFontSize(fontSize);
    if (doc.getTextWidth(text) <= maxWidth) return text;
    let t = text;
    while (t.length > 0 && doc.getTextWidth(t + '…') > maxWidth) {
      t = t.slice(0, -1);
    }
    return t + '…';
  }

  // ─── PDF Generation ───────────────────────────────────────────────────────────

  /**
   * Generate a professional single-page PDF invoice.
   *
   * Layout (top → bottom):
   *   1. Accent bar + Company name + Invoice title
   *   2. Store details (left) | Invoice meta (right)
   *   3. Separator line
   *   4. Bill To section
   *   5. Items table (jspdf-autotable)
   *   6. Totals section (right-aligned below table)
   *   7. Payment details (if relevant)
   *   8. Footer: Terms & Conditions + Authorized Signature
   */
  private generatePDF(data: InvoiceData): Blob {
    // ── Page setup ─────────────────────────────────────────────────────────────
    // Change 'a4' to 'a5' here if needed
    const doc = new jsPDF({ format: 'a4', unit: 'mm' });
    const pw = doc.internal.pageSize.getWidth();   // page width
    const ph = doc.internal.pageSize.getHeight();  // page height
    const contentWidth = pw - MARGIN * 2;
    let y = 0; // current Y cursor

    // ── 1. Top accent bar ──────────────────────────────────────────────────────
    doc.setFillColor(...COLORS.primary);
    doc.rect(0, 0, pw, 4, 'F');
    y = 14;

    // ── 2. Header: Store name (left) + Invoice label (right) ───────────────────
    const storeName = data.order.store?.name || 'Paris Bridals';
    doc.setFont(FONT.family, 'bold');
    doc.setFontSize(FONT.sizeTitle);
    doc.setTextColor(...COLORS.primary);
    doc.text(storeName, MARGIN, y);

    const invoiceLabel = data.invoiceType === 'deposit' ? 'DEPOSIT INVOICE' : 'FINAL INVOICE';
    doc.setFontSize(FONT.sizeSubtitle);
    doc.setTextColor(...COLORS.secondary);
    doc.text(invoiceLabel, pw - MARGIN, y, { align: 'right' });
    y += 6;

    // ── 3. Store contact + Invoice meta ────────────────────────────────────────
    doc.setFont(FONT.family, 'normal');
    doc.setFontSize(FONT.sizeBody);
    doc.setTextColor(...COLORS.secondary);

    const leftLines: string[] = [];
    if (data.order.store?.address) leftLines.push(data.order.store.address);
    if (data.order.store?.phone) leftLines.push(`Phone: ${data.order.store.phone}`);
    if (data.order.store?.email) leftLines.push(`Email: ${data.order.store.email}`);
    // Only show GSTIN if it exists
    if (data.order.store?.gstin) leftLines.push(`GSTIN: ${data.order.store.gstin}`);

    for (const line of leftLines) {
      doc.text(line, MARGIN, y);
      y += 4;
    }

    // Right side — invoice meta (drawn at fixed positions aligned to the store info)
    const metaY = y - leftLines.length * 4; // align to start of store info
    const metaX = pw - MARGIN;
    doc.setFont(FONT.family, 'normal');
    doc.setFontSize(FONT.sizeSmall);
    doc.setTextColor(...COLORS.muted);
    doc.text(`Invoice No:`, metaX - 40, metaY);
    doc.setTextColor(...COLORS.primary);
    doc.setFont(FONT.family, 'bold');
    doc.text(data.invoiceNumber, metaX, metaY, { align: 'right' });

    doc.setFont(FONT.family, 'normal');
    doc.setTextColor(...COLORS.muted);
    doc.text(`Date:`, metaX - 40, metaY + 4);
    doc.setTextColor(...COLORS.primary);
    doc.text(data.invoiceDate, metaX, metaY + 4, { align: 'right' });

    doc.setFont(FONT.family, 'normal');
    doc.setTextColor(...COLORS.muted);
    doc.text(`Order:`, metaX - 40, metaY + 8);
    doc.setTextColor(...COLORS.primary);
    doc.text(`#${data.order.id.slice(0, 8).toUpperCase()}`, metaX, metaY + 8, { align: 'right' });

    // Ensure y is past both columns
    y = Math.max(y, metaY + 12) + 2;

    // ── Separator ──────────────────────────────────────────────────────────────
    doc.setDrawColor(...COLORS.line);
    doc.setLineWidth(0.4);
    doc.line(MARGIN, y, pw - MARGIN, y);
    y += 6;

    // ── 4. Bill To + Rental Info ────────────────────────────────────────────────
    const colMid = pw / 2;

    // Left column — Bill To
    doc.setFont(FONT.family, 'bold');
    doc.setFontSize(FONT.sizeSmall);
    doc.setTextColor(...COLORS.muted);
    doc.text('BILL TO', MARGIN, y);

    // Right column — Rental Period
    doc.text('RENTAL DETAILS', colMid + 4, y);
    y += 5;

    doc.setFont(FONT.family, 'bold');
    doc.setFontSize(FONT.sizeBody);
    doc.setTextColor(...COLORS.primary);
    doc.text(data.order.customer.name, MARGIN, y);

    doc.setFont(FONT.family, 'normal');
    doc.setTextColor(...COLORS.secondary);
    doc.text(`${this.fmtDate(data.order.start_date)} — ${this.fmtDate(data.order.end_date)}`, colMid + 4, y);
    y += 4;

    doc.setFont(FONT.family, 'normal');
    doc.setFontSize(FONT.sizeBody);
    doc.setTextColor(...COLORS.secondary);
    doc.text(`Phone: ${data.order.customer.phone}`, MARGIN, y);

    if (data.order.event_date) {
      doc.text(`Event: ${this.fmtDate(data.order.event_date)}`, colMid + 4, y);
    }
    y += 4;

    if (data.order.customer.email) {
      doc.text(data.order.customer.email, MARGIN, y);
      y += 4;
    }

    y += 4;

    // ── 5. Items Table ─────────────────────────────────────────────────────────
    const tableData = data.order.items.map((item, idx) => [
      String(idx + 1),
      this.getItemProductName(item),
      String(item.quantity || 0),
      this.fmt(item.price_per_day),
      this.fmt(item.total_price || (item.price_per_day || 0) * (item.quantity || 0)),
    ]);

    autoTable(doc, {
      startY: y,
      head: [['#', 'Item Name', 'Qty', 'Rent Price', 'Total']],
      body: tableData,
      theme: 'grid',
      tableWidth: contentWidth,
      margin: { left: MARGIN, right: MARGIN },
      styles: {
        font: FONT.family,
        fontSize: FONT.sizeBody,
        cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 },
        textColor: COLORS.primary,
        lineColor: COLORS.line,
        lineWidth: 0.3,
      },
      headStyles: {
        fillColor: COLORS.tableHead,
        textColor: COLORS.tableHeadText,
        fontStyle: 'bold',
        fontSize: FONT.sizeSmall,
        halign: 'left',
      },
      alternateRowStyles: {
        fillColor: COLORS.tableStripe,
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },              // #
        1: { cellWidth: 'auto' },                              // Item Name (flex)
        2: { cellWidth: 16, halign: 'center' },               // Qty
        3: { cellWidth: 28, halign: 'right' },                // Rent Price
        4: { cellWidth: 28, halign: 'right', fontStyle: 'bold' }, // Total
      },
      // STRICT: never break to a second page
      pageBreak: 'avoid',
    });

    y = (doc as any).lastAutoTable.finalY + 4;

    // ── 6. Totals Section (right-aligned) ──────────────────────────────────────
    const totalsX = pw - MARGIN;
    const labelX = totalsX - 50;

    const drawTotalRow = (label: string, value: string, bold = false) => {
      doc.setFont(FONT.family, bold ? 'bold' : 'normal');
      doc.setFontSize(bold ? FONT.sizeBody + 1 : FONT.sizeBody);
      doc.setTextColor(...(bold ? COLORS.primary : COLORS.secondary));
      doc.text(label, labelX, y, { align: 'right' });
      doc.text(value, totalsX, y, { align: 'right' });
      y += bold ? 5.5 : 4.5;
    };

    if (data.invoiceType === 'final') {
      drawTotalRow('Subtotal:', this.fmt(data.order.subtotal));
      if (Number(data.order.gst_amount) > 0) {
        drawTotalRow('GST:', this.fmt(data.order.gst_amount));
      }
      if (Number(data.order.discount) > 0) {
        drawTotalRow('Discount:', `-${this.fmt(data.order.discount)}`);
      }
      if (Number(data.order.late_fee) > 0) {
        drawTotalRow('Late Fee:', this.fmt(data.order.late_fee));
      }
      if (Number(data.order.damage_charges_total) > 0) {
        drawTotalRow('Damage Charges:', this.fmt(data.order.damage_charges_total));
      }

      // Separator above total
      doc.setDrawColor(...COLORS.line);
      doc.setLineWidth(0.3);
      doc.line(labelX - 10, y - 2, totalsX, y - 2);

      drawTotalRow('Total Amount:', this.fmt(data.order.total_amount), true);

      // Payments info
      const depositPayment = data.payments?.find((p) => p.payment_type === 'deposit');
      if (depositPayment) {
        drawTotalRow('Deposit Paid:', this.fmt(depositPayment.amount));
      }

      const advancePayment = data.payments?.find((p) => p.payment_type === 'advance');
      const advanceAmount = advancePayment ? advancePayment.amount : (data.order as any).advance_amount || 0;
      if (Number(advanceAmount) > 0) {
        drawTotalRow('Advance Paid:', `-${this.fmt(advanceAmount)}`);
      }

      const totalPaid = (data.payments || [])
        .filter((p) => p.payment_type !== 'refund')
        .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
      const balanceDue = Math.max(0, Number(data.order.total_amount || 0) - totalPaid);
      if (balanceDue > 0) {
        doc.setDrawColor(...COLORS.primary);
        doc.setLineWidth(0.5);
        doc.line(labelX - 10, y - 2, totalsX, y - 2);
        drawTotalRow('Balance Due:', this.fmt(balanceDue), true);
      }
    } else {
      // Deposit invoice
      const totalDeposit = data.order.items.reduce(
        (sum, item) => sum + ((item.price_per_day || 0) * (item.quantity || 0)),
        0
      );
      drawTotalRow('Security Deposit:', this.fmt(totalDeposit), true);
    }

    // ── 7. Payment Mode (if recorded) ──────────────────────────────────────────
    const relevantPayment = data.payments?.find(
      (p) => p.payment_type === (data.invoiceType === 'deposit' ? 'deposit' : 'final')
    );
    if (relevantPayment) {
      y += 2;
      doc.setDrawColor(...COLORS.line);
      doc.line(MARGIN, y, pw - MARGIN, y);
      y += 5;

      doc.setFont(FONT.family, 'bold');
      doc.setFontSize(FONT.sizeSmall);
      doc.setTextColor(...COLORS.muted);
      doc.text('PAYMENT DETAILS', MARGIN, y);
      y += 4;

      doc.setFont(FONT.family, 'normal');
      doc.setFontSize(FONT.sizeBody);
      doc.setTextColor(...COLORS.secondary);

      const payDetails: string[] = [];
      payDetails.push(`Mode: ${relevantPayment.payment_mode.toUpperCase()}`);
      if (relevantPayment.transaction_id) {
        payDetails.push(`Txn ID: ${relevantPayment.transaction_id}`);
      }
      payDetails.push(`Date: ${this.fmtDate(relevantPayment.payment_date)}`);

      doc.text(payDetails.join('    |    '), MARGIN, y);
      y += 5;
    }

    // ── 8. Footer: Terms & Conditions ────────────────────────────────────────
    const footerFloor = ph - MARGIN - 6; // 6mm for bottom accent bar + padding
    const termsAvailableHeight = footerFloor - y - 8; // -8mm for heading + padding

    if (data.settings.paymentTerms && termsAvailableHeight > 6) {
      y += 3;
      doc.setDrawColor(...COLORS.line);
      doc.line(MARGIN, y, pw - MARGIN, y);
      y += 5;

      doc.setFont(FONT.family, 'bold');
      doc.setFontSize(FONT.sizeSmall);
      doc.setTextColor(...COLORS.muted);
      doc.text('TERMS & CONDITIONS', MARGIN, y);
      y += 4;

      // Adaptive font size: shrink if there's not enough space
      let termsFontSize = FONT.sizeTiny;
      doc.setFont(FONT.family, 'normal');
      doc.setFontSize(termsFontSize);
      doc.setTextColor(...COLORS.muted);

      let termsLines = doc.splitTextToSize(data.settings.paymentTerms, contentWidth);
      const lineHeight = termsFontSize * 0.45; // approximate mm per line
      let termsHeight = termsLines.length * lineHeight;

      // If terms don't fit, try a smaller font first, then truncate
      if (termsHeight > termsAvailableHeight) {
        termsFontSize = 5.5;
        doc.setFontSize(termsFontSize);
        termsLines = doc.splitTextToSize(data.settings.paymentTerms, contentWidth);
        termsHeight = termsLines.length * (termsFontSize * 0.45);

        if (termsHeight > termsAvailableHeight) {
          // Hard truncate: keep only lines that fit
          const maxLines = Math.floor(termsAvailableHeight / (termsFontSize * 0.45));
          termsLines = termsLines.slice(0, Math.max(1, maxLines));
          // Add ellipsis to last line
          if (termsLines.length > 0) {
            termsLines[termsLines.length - 1] = termsLines[termsLines.length - 1].trim() + ' …';
          }
        }
      }

      doc.text(termsLines, MARGIN, y);
    }

    // Bottom accent bar
    doc.setFillColor(...COLORS.primary);
    doc.rect(0, ph - 3, pw, 3, 'F');

    return doc.output('blob');
  }
}

// Singleton instance
export const invoiceService = new InvoiceService();
