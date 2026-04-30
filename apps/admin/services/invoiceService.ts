/**
 * Invoice Service
 *
 * Service for generating PDF invoices for orders.
 * Produces a traditional Indian Tally ERP / Tally Prime style
 * Tax Invoice on A4 paper using jsPDF + jspdf-autotable.
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

// ─── Layout constants ────────────────────────────────────────────────────────
const M = 10;                 // page margin (mm)
const BORDER_W = 0.4;         // standard border line width
const THIN_W = 0.2;           // thin inner lines
const FONT = 'helvetica';
const BLACK: [number, number, number] = [0, 0, 0];
const WHITE: [number, number, number] = [255, 255, 255];

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

  /** Format number as Indian currency string (no ₹ symbol — Tally uses plain numbers) */
  private fmt(val: any): string {
    const num = Number(val);
    return isNaN(num) ? '0.00' : num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  /** Format date to DD-MMM-YYYY (Tally style) */
  private fmtDate(dateStr: string): string {
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
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

  /**
   * Convert a number to Indian Rupees in words.
   * e.g. 5230 → "Indian Rupees Five Thousand Two Hundred Thirty Only"
   */
  private numberToWords(num: number): string {
    if (num === 0) return 'Indian Rupees Zero Only';

    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
      'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen',
      'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const toWords = (n: number): string => {
      if (n === 0) return '';
      if (n < 20) return ones[n];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
      if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + toWords(n % 100) : '');
      if (n < 100000) return toWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + toWords(n % 1000) : '');
      if (n < 10000000) return toWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + toWords(n % 100000) : '');
      return toWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + toWords(n % 10000000) : '');
    };

    const whole = Math.floor(Math.abs(num));
    const paise = Math.round((Math.abs(num) - whole) * 100);
    let result = 'Indian Rupees ' + toWords(whole);
    if (paise > 0) {
      result += ' and ' + toWords(paise) + ' Paise';
    }
    return result + ' Only';
  }

  // ─── PDF Generation (Tally ERP Style) ─────────────────────────────────────────

  /**
   * Generate a traditional Tally-style bordered Tax Invoice on A4.
   *
   * Layout:
   * ┌─────────────────────────────────────────────────────────────────┐
   * │                        TAX INVOICE                             │
   * ├──────────────────────────────┬──────────────────────────────────┤
   * │  Company Name & Address     │  Invoice No:        Date:        │
   * │  Phone / GSTIN              │  Mode/Terms:        Ref No:      │
   * ├──────────────────────────────┼──────────────────────────────────┤
   * │  Buyer (Bill To)            │  Rental Period / Event Date      │
   * ├─────┬───────────────┬───┬────────┬──────────────────────────────┤
   * │S.No │ Description   │Qty│  Rate  │         Amount              │
   * ├─────┼───────────────┼───┼────────┼──────────────────────────────┤
   * │  …  │  …            │ … │   …    │           …                 │
   * │     │               │   │        │                              │
   * ├─────┴───────────────┴───┴────────┼──────────────────────────────┤
   * │                                  │  Subtotal / GST / Total      │
   * ├──────────────────────────────────┴──────────────────────────────┤
   * │  Amount Chargeable (in words): Indian Rupees …                 │
   * ├──────────────────────────────────┬──────────────────────────────┤
   * │  Declaration / Terms            │  for Paris Bridals            │
   * │                                 │                               │
   * │                                 │  Authorised Signatory         │
   * └──────────────────────────────────┴──────────────────────────────┘
   */
  private generatePDF(data: InvoiceData): Blob {
    const doc = new jsPDF({ format: 'a4', unit: 'mm' });
    const pw = doc.internal.pageSize.getWidth();   // 210
    const ph = doc.internal.pageSize.getHeight();  // 297

    // Content box coordinates
    const L = M;                    // left edge
    const R = pw - M;               // right edge
    const T = M;                    // top edge
    const B = ph - M;               // bottom edge
    const W = R - L;                // content width
    const MID = L + W / 2;          // vertical midpoint

    // ── Utility: draw text with current font ───────────────────────────────────
    const txt = (text: string, x: number, y: number, opts?: { align?: 'left' | 'center' | 'right'; maxWidth?: number }) => {
      doc.text(text, x, y, opts);
    };

    const setFont = (style: 'normal' | 'bold' | 'italic' = 'normal', size: number = 9) => {
      doc.setFont(FONT, style);
      doc.setFontSize(size);
      doc.setTextColor(...BLACK);
    };

    const hLine = (y: number, x1: number = L, x2: number = R) => {
      doc.setLineWidth(THIN_W);
      doc.setDrawColor(...BLACK);
      doc.line(x1, y, x2, y);
    };

    const vLine = (x: number, y1: number, y2: number) => {
      doc.setLineWidth(THIN_W);
      doc.setDrawColor(...BLACK);
      doc.line(x, y1, x, y2);
    };

    // ── 1. OUTER BORDER ────────────────────────────────────────────────────────
    doc.setLineWidth(BORDER_W);
    doc.setDrawColor(...BLACK);
    doc.rect(L, T, W, B - T);

    // ── 2. TITLE ROW: "TAX INVOICE" ────────────────────────────────────────────
    let y = T;
    const titleH = 8;
    setFont('bold', 12);
    txt(data.invoiceType === 'deposit' ? 'DEPOSIT INVOICE' : 'TAX INVOICE', pw / 2, y + 5.5, { align: 'center' });
    y += titleH;
    hLine(y);

    // ── 3. SELLER + INVOICE META (two columns) ─────────────────────────────────
    const sellerH = 28;
    const sellerBottom = y + sellerH;

    // Vertical divider
    vLine(MID, y, sellerBottom);

    // LEFT: Company details
    let ly = y + 5;
    const storeName = data.order.store?.name || 'Paris Bridals';
    setFont('bold', 11);
    txt(storeName, L + 3, ly);
    ly += 4.5;

    setFont('normal', 8);
    if (data.order.store?.address) {
      // Wrap address if long
      const addrLines = doc.splitTextToSize(data.order.store.address, MID - L - 6);
      doc.text(addrLines, L + 3, ly);
      ly += addrLines.length * 3.5;
    }
    if (data.order.store?.phone) {
      txt(`Phone: ${data.order.store.phone}`, L + 3, ly);
      ly += 3.5;
    }
    if (data.order.store?.email) {
      txt(`Email: ${data.order.store.email}`, L + 3, ly);
      ly += 3.5;
    }
    if (data.order.store?.gstin) {
      setFont('bold', 8);
      txt(`GSTIN: ${data.order.store.gstin}`, L + 3, ly);
    }

    // RIGHT: Invoice meta (split into 4 rows of key-value pairs)
    const metaRowH = sellerH / 4;
    const metaLabelX = MID + 3;
    const metaValueX = MID + 35;

    // Row 1: Invoice No
    setFont('normal', 8);
    txt('Invoice No.', metaLabelX, y + 4);
    setFont('bold', 9);
    txt(data.invoiceNumber, metaValueX, y + 4);
    hLine(y + metaRowH, MID, R);

    // Row 2: Dated
    setFont('normal', 8);
    txt('Dated', metaLabelX, y + metaRowH + 4);
    setFont('bold', 9);
    txt(data.invoiceDate, metaValueX, y + metaRowH + 4);
    hLine(y + metaRowH * 2, MID, R);

    // Row 3: Mode/Terms
    setFont('normal', 8);
    txt('Mode/Terms', metaLabelX, y + metaRowH * 2 + 4);
    setFont('normal', 8);
    const depositPayment = data.payments?.find((p) => p.payment_type === 'deposit');
    const paymentMode = depositPayment?.payment_mode?.toUpperCase() || 'N/A';
    txt(paymentMode, metaValueX, y + metaRowH * 2 + 4);
    hLine(y + metaRowH * 3, MID, R);

    // Row 4: Reference No (Order ID)
    setFont('normal', 8);
    txt('Reference No.', metaLabelX, y + metaRowH * 3 + 4);
    setFont('bold', 9);
    txt(`#${data.order.id.slice(0, 8).toUpperCase()}`, metaValueX, y + metaRowH * 3 + 4);

    y = sellerBottom;
    hLine(y);

    // ── 4. BUYER SECTION (two columns) ─────────────────────────────────────────
    const buyerH = 22;
    const buyerBottom = y + buyerH;
    vLine(MID, y, buyerBottom);

    // LEFT: Buyer / Bill To
    let by = y + 4;
    setFont('bold', 8);
    txt('Buyer (Bill To)', L + 3, by);
    by += 4;

    setFont('bold', 9);
    txt(data.order.customer.name, L + 3, by);
    by += 4;

    setFont('normal', 8);
    txt(`Phone: ${data.order.customer.phone}`, L + 3, by);
    by += 3.5;
    if (data.order.customer.email) {
      txt(data.order.customer.email, L + 3, by);
    }

    // RIGHT: Rental details
    let ry = y + 4;
    setFont('bold', 8);
    txt('Rental Details', MID + 3, ry);
    ry += 4;

    setFont('normal', 8);
    txt(`Period: ${this.fmtDate(data.order.start_date)} to ${this.fmtDate(data.order.end_date)}`, MID + 3, ry);
    ry += 3.5;
    if (data.order.event_date) {
      txt(`Event Date: ${this.fmtDate(data.order.event_date)}`, MID + 3, ry);
    }

    y = buyerBottom;
    hLine(y);

    // ── 5. ITEMS TABLE ─────────────────────────────────────────────────────────
    // Column widths for Tally-style layout: S.No | Description | Qty | Rate | Amount
    const colSno = 12;
    const colQty = 18;
    const colRate = 30;
    const colAmount = 35;
    const colDesc = W - colSno - colQty - colRate - colAmount;

    // Column X positions (left edges)
    const xSno = L;
    const xDesc = xSno + colSno;
    const xQty = xDesc + colDesc;
    const xRate = xQty + colQty;
    const xAmt = xRate + colRate;

    const tableData = data.order.items.map((item, idx) => [
      String(idx + 1),
      this.getItemProductName(item),
      String(item.quantity || 0),
      this.fmt(item.price_per_day),
      this.fmt(item.total_price || (item.price_per_day || 0) * (item.quantity || 0)),
    ]);

    // Calculate how much vertical space we need for the footer
    // Footer = Amount in Words (8mm) + Terms/Signature (28mm) = ~36mm
    const footerReserve = 40;
    // Totals section = ~22mm
    const totalsReserve = 24;
    // Table must end before: B - footerReserve - totalsReserve
    const tableMaxY = B - footerReserve - totalsReserve;

    autoTable(doc, {
      startY: y,
      head: [['S.No', 'Description of Goods', 'Qty', 'Rate', 'Amount']],
      body: tableData,
      theme: 'grid',
      tableWidth: W,
      margin: { left: L, right: M },
      styles: {
        font: FONT,
        fontSize: 9,
        cellPadding: { top: 2, bottom: 2, left: 2, right: 2 },
        textColor: BLACK,
        lineColor: BLACK,
        lineWidth: THIN_W,
        fillColor: WHITE,
      },
      headStyles: {
        fillColor: WHITE,          // Tally: white header, not dark
        textColor: BLACK,
        fontStyle: 'bold',
        fontSize: 9,
        halign: 'center',
        lineColor: BLACK,
        lineWidth: THIN_W,
      },
      bodyStyles: {
        fillColor: WHITE,
      },
      alternateRowStyles: {
        fillColor: WHITE,          // Tally: no striping
      },
      columnStyles: {
        0: { cellWidth: colSno, halign: 'center' },
        1: { cellWidth: colDesc, halign: 'left' },
        2: { cellWidth: colQty, halign: 'center' },
        3: { cellWidth: colRate, halign: 'right' },
        4: { cellWidth: colAmount, halign: 'right' },
      },
      // STRICT: never break to a second page
      pageBreak: 'avoid',
      // After table draws, extend column lines down to the totals section
      didDrawPage: () => {
        // We'll draw the extended column lines after the table
      },
    });

    const tableEndY = (doc as any).lastAutoTable.finalY;

    // ── 6. EXTEND COLUMN LINES to create the Tally "full grid" effect ──────────
    // Draw vertical lines from table end down to the totals bottom
    const totalsBottom = tableEndY + totalsReserve;

    // Extend the outer left/right borders (already drawn by the main rect)
    // Extend the inner column dividers
    vLine(xDesc, tableEndY, totalsBottom);      // after S.No
    vLine(xQty, tableEndY, totalsBottom);        // after Description
    vLine(xRate, tableEndY, totalsBottom);       // after Qty
    vLine(xAmt, tableEndY, totalsBottom);        // after Rate

    // ── 7. TOTALS SECTION ──────────────────────────────────────────────────────
    y = tableEndY;

    const drawTotalLine = (label: string, value: string, bold: boolean = false) => {
      setFont(bold ? 'bold' : 'normal', bold ? 10 : 9);
      // Label in the Description column area
      txt(label, xAmt - 3, y + 4, { align: 'right' });
      // Value in the Amount column
      txt(value, R - 3, y + 4, { align: 'right' });
      y += 6;
    };

    // Subtotal
    drawTotalLine('Subtotal', this.fmt(data.order.subtotal));

    // GST
    if (Number(data.order.gst_amount) > 0) {
      drawTotalLine('GST', this.fmt(data.order.gst_amount));
    }

    // Discount
    if (Number(data.order.discount) > 0) {
      drawTotalLine('Discount', `(-) ${this.fmt(data.order.discount)}`);
    }

    // Late fee
    if (Number(data.order.late_fee) > 0) {
      drawTotalLine('Late Fee', this.fmt(data.order.late_fee));
    }

    // Damage charges
    if (Number(data.order.damage_charges_total) > 0) {
      drawTotalLine('Damage Charges', this.fmt(data.order.damage_charges_total));
    }

    // Grand Total — with double line above
    hLine(y, L, R);
    drawTotalLine('Total', this.fmt(data.order.total_amount), true);

    // Advance / Balance
    if (data.invoiceType === 'final') {
      const totalPaid = (data.payments || [])
        .filter((p) => p.payment_type !== 'refund')
        .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);

      if (totalPaid > 0) {
        drawTotalLine('Amount Paid', `(-) ${this.fmt(totalPaid)}`);
      }

      const balanceDue = Math.max(0, Number(data.order.total_amount || 0) - totalPaid);
      if (balanceDue > 0) {
        hLine(y, L, R);
        drawTotalLine('Balance Due', this.fmt(balanceDue), true);
      }
    }

    // Close the totals box
    hLine(y, L, R);

    // ── 8. AMOUNT IN WORDS ─────────────────────────────────────────────────────
    const wordsY = y;
    const wordsH = 8;
    setFont('italic', 8);
    txt('Amount Chargeable (in words)', L + 3, wordsY + 3.5);
    setFont('bold', 8);
    const totalAmount = Number(data.order.total_amount) || 0;
    const amountInWords = this.numberToWords(totalAmount);
    // Truncate if too long
    const maxWordsWidth = W - 8;
    const wordsText = doc.getTextWidth(amountInWords) > maxWordsWidth
      ? amountInWords.substring(0, 80) + '...'
      : amountInWords;
    txt(`E. & O.E`, R - 3, wordsY + 3.5, { align: 'right' });
    txt(wordsText, L + 3, wordsY + 7);
    y = wordsY + wordsH;
    hLine(y);

    // ── 9. FOOTER: Terms (left) + Signature (right) ────────────────────────────
    const footerY = y;
    const footerH = B - footerY;
    vLine(MID, footerY, B);

    // LEFT: Declaration / Terms
    let fy = footerY + 4;
    setFont('bold', 8);
    txt('Declaration / Terms & Conditions', L + 3, fy);
    fy += 4;

    if (data.settings.paymentTerms) {
      setFont('normal', 7);
      const termsMaxW = MID - L - 6;
      const termsMaxH = B - fy - 4;
      const termsLines = doc.splitTextToSize(data.settings.paymentTerms, termsMaxW);
      // Calculate how many lines fit
      const lineH = 3;
      const maxTermsLines = Math.floor(termsMaxH / lineH);
      const displayLines = termsLines.slice(0, maxTermsLines);
      if (termsLines.length > maxTermsLines && displayLines.length > 0) {
        displayLines[displayLines.length - 1] = displayLines[displayLines.length - 1].trim() + ' ...';
      }
      doc.text(displayLines, L + 3, fy);
    }

    // RIGHT: Signature block
    const sigX = MID + 3;
    setFont('bold', 9);
    txt(`for ${data.order.store?.name || 'Paris Bridals'}`, R - 3, footerY + 5, { align: 'right' });

    setFont('normal', 8);
    txt('Authorised Signatory', R - 3, B - 4, { align: 'right' });

    // ── DONE ───────────────────────────────────────────────────────────────────
    return doc.output('blob');
  }
}

// Singleton instance
export const invoiceService = new InvoiceService();
