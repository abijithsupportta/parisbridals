/**
 * Tally-style Invoice PDF Component
 *
 * Renders a traditional Indian Tally ERP / Tally Prime Invoice
 * using @react-pdf/renderer with declarative React components and Flexbox.
 *
 * @module components/admin/orders/TallyInvoicePDF
 */

import React from 'react';
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
} from '@react-pdf/renderer';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface InvoiceItem {
  sno: number;
  name: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface TallyInvoiceProps {
  companyName: string;
  companyAddress?: string | null;
  companyPhone?: string | null;
  companyEmail?: string | null;
  companyGstin?: string | null;

  invoiceNumber: string;
  invoiceDate: string;
  invoiceType: 'deposit' | 'final';
  orderId: string;
  paymentMode?: string;

  buyerName: string;
  buyerPhone: string;
  buyerAltPhone?: string | null;
  buyerEmail?: string | null;

  rentalStart: string;
  rentalEnd: string;
  eventDate?: string | null;

  items: InvoiceItem[];

  subtotal: number;
  gstAmount: number;
  discount: number;
  lateFee: number;
  damageCharges: number;
  securityDeposit: number;
  totalAmount: number;
  totalPaid: number;
  balanceDue: number;

  termsAndConditions?: string;
}

// ─── Number to Words (Indian system) ────────────────────────────────────────

const ones = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen',
];
const tens = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety',
];

function toWords(n: number): string {
  if (n === 0) return '';
  if (n < 20) return ones[n];
  if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
  if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + toWords(n % 100) : '');
  if (n < 100000) return toWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + toWords(n % 1000) : '');
  if (n < 10000000) return toWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + toWords(n % 100000) : '');
  return toWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + toWords(n % 10000000) : '');
}

function numberToWords(num: number): string {
  if (num === 0) return 'Indian Rupees Zero Only';
  const whole = Math.floor(Math.abs(num));
  const paise = Math.round((Math.abs(num) - whole) * 100);
  let result = 'Indian Rupees ' + toWords(whole);
  if (paise > 0) result += ' and ' + toWords(paise) + ' Paise';
  return result + ' Only';
}

/** Format number with Rs. prefix and Indian locale */
function rs(val: number): string {
  return 'Rs. ' + val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const BORDER = '1pt solid #000';
const THIN = '0.5pt solid #000';

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    padding: 24,
    color: '#000',
  },

  // Outer border
  outerBox: {
    border: BORDER,
    flexGrow: 1,
  },

  // ── Title ──
  titleRow: {
    borderBottom: BORDER,
    paddingVertical: 5,
    alignItems: 'center',
  },
  titleText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 14,
    textAlign: 'center',
    letterSpacing: 1,
  },

  // ── Two-column row ──
  splitRow: {
    flexDirection: 'row' as const,
    borderBottom: BORDER,
  },
  halfLeft: {
    width: '50%',
    borderRight: BORDER,
    padding: 8,
  },
  halfRight: {
    width: '50%',
    padding: 0,
  },
  halfRightPadded: {
    width: '50%',
    padding: 8,
  },

  // ── Meta rows (right side of seller section) ──
  metaRow: {
    flexDirection: 'row' as const,
    borderBottom: THIN,
    minHeight: 17,
    alignItems: 'center',
  },
  metaRowLast: {
    flexDirection: 'row' as const,
    minHeight: 17,
    alignItems: 'center',
  },
  metaLabel: {
    width: 82,
    paddingLeft: 8,
    fontSize: 8,
    color: '#444',
  },
  metaValue: {
    flex: 1,
    paddingLeft: 4,
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
  },

  // ── Company / Buyer text ──
  companyName: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 12,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 8,
    lineHeight: 1.6,
    color: '#222',
  },
  infoTextBold: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    lineHeight: 1.6,
  },
  sectionLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    marginBottom: 4,
    color: '#555',
    textTransform: 'uppercase' as const,
  },
  buyerName: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    marginBottom: 3,
  },

  // ── Items Table ──
  tableHeader: {
    flexDirection: 'row' as const,
    borderBottom: BORDER,
    backgroundColor: '#fff',
  },
  tableRow: {
    flexDirection: 'row' as const,
    borderBottom: THIN,
    minHeight: 20,
    alignItems: 'center',
  },

  // Column widths — Description gets the lion's share
  colSno:  { width: '6%',  textAlign: 'center' as const, borderRight: THIN, paddingVertical: 4, paddingHorizontal: 3, fontSize: 8 },
  colDesc: { width: '52%', textAlign: 'left' as const,   borderRight: THIN, paddingVertical: 4, paddingHorizontal: 6, fontSize: 8 },
  colQty:  { width: '8%',  textAlign: 'center' as const, borderRight: THIN, paddingVertical: 4, paddingHorizontal: 3, fontSize: 8 },
  colRate: { width: '15%', textAlign: 'right' as const,  borderRight: THIN, paddingVertical: 4, paddingHorizontal: 6, fontSize: 8 },
  colAmt:  { width: '19%', textAlign: 'right' as const,  paddingVertical: 4, paddingHorizontal: 6, fontSize: 8 },

  thText: { fontFamily: 'Helvetica-Bold', fontSize: 9 },

  // ── Totals ──
  totalsBlock: {
    borderBottom: BORDER,
  },
  totalRow: {
    flexDirection: 'row' as const,
    minHeight: 17,
    alignItems: 'center',
    borderBottom: THIN,
  },
  totalRowGrand: {
    flexDirection: 'row' as const,
    minHeight: 22,
    alignItems: 'center',
    borderBottom: BORDER,
    backgroundColor: '#f5f5f5',
  },
  // Label takes 81% (= 6+52+8+15 = colSno+colDesc+colQty+colRate)
  // Value takes 19% (= colAmt) — perfect right-alignment with Amount column
  totalLabel: {
    width: '81%',
    textAlign: 'right' as const,
    paddingRight: 8,
    fontSize: 9,
  },
  totalLabelBold: {
    width: '81%',
    textAlign: 'right' as const,
    paddingRight: 8,
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
  },
  totalValue: {
    width: '19%',
    textAlign: 'right' as const,
    paddingRight: 6,
    fontSize: 9,
  },
  totalValueBold: {
    width: '19%',
    textAlign: 'right' as const,
    paddingRight: 6,
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
  },
  totalValueRed: {
    width: '19%',
    textAlign: 'right' as const,
    paddingRight: 6,
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#CC0000',
  },

  // ── Amount in words ──
  wordsRow: {
    borderBottom: BORDER,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  wordsLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Oblique',
    color: '#555',
  },
  wordsText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    marginTop: 2,
  },

  // ── Footer ──
  footerRow: {
    flexGrow: 1,
    padding: 8,
  },
  footerLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    marginBottom: 4,
    color: '#555',
    textTransform: 'uppercase' as const,
  },
  footerTerms: {
    fontSize: 7,
    lineHeight: 1.5,
    color: '#333',
  },
  eoe: {
    fontSize: 7,
    textAlign: 'right' as const,
    color: '#888',
  },
});

// ─── Component ──────────────────────────────────────────────────────────────

export function TallyInvoicePDF(props: TallyInvoiceProps) {
  const {
    companyName, companyAddress, companyPhone, companyEmail, companyGstin,
    invoiceNumber, invoiceDate, invoiceType, orderId, paymentMode,
    buyerName, buyerPhone, buyerAltPhone, buyerEmail,
    rentalStart, rentalEnd, eventDate,
    items,
    subtotal, gstAmount, discount, lateFee, damageCharges, securityDeposit,
    totalAmount, totalPaid, balanceDue,
    termsAndConditions,
  } = props;

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.outerBox}>
          {/* ── Title ── */}
          <View style={s.titleRow}>
            <Text style={s.titleText}>INVOICE</Text>
          </View>

          {/* ── Seller + Invoice Meta ── */}
          <View style={s.splitRow}>
            <View style={s.halfLeft}>
              <Text style={s.companyName}>{companyName}</Text>
              {companyAddress ? <Text style={s.infoText}>{companyAddress}</Text> : null}
              {companyPhone ? <Text style={s.infoText}>Phone: {companyPhone}</Text> : null}
              {companyEmail ? <Text style={s.infoText}>Email: {companyEmail}</Text> : null}
              {companyGstin ? <Text style={s.infoTextBold}>GSTIN: {companyGstin}</Text> : null}
            </View>

            <View style={s.halfRight}>
              <View style={s.metaRow}>
                <Text style={s.metaLabel}>Invoice No.</Text>
                <Text style={s.metaValue}>{invoiceNumber}</Text>
              </View>
              <View style={s.metaRow}>
                <Text style={s.metaLabel}>Dated</Text>
                <Text style={s.metaValue}>{invoiceDate}</Text>
              </View>
              <View style={s.metaRow}>
                <Text style={s.metaLabel}>Mode/Terms</Text>
                <Text style={s.metaValue}>{paymentMode || 'N/A'}</Text>
              </View>
              <View style={s.metaRowLast}>
                <Text style={s.metaLabel}>Reference No.</Text>
                <Text style={s.metaValue}>#{orderId}</Text>
              </View>
            </View>
          </View>

          {/* ── Buyer + Rental Info ── */}
          <View style={s.splitRow}>
            <View style={s.halfLeft}>
              <Text style={s.sectionLabel}>Buyer (Bill To)</Text>
              <Text style={s.buyerName}>{buyerName}</Text>
              <Text style={s.infoText}>Phone: {buyerPhone}</Text>
              {buyerAltPhone ? <Text style={s.infoText}>Alt Phone: {buyerAltPhone}</Text> : null}
              {buyerEmail ? <Text style={s.infoText}>{buyerEmail}</Text> : null}
            </View>

            <View style={s.halfRightPadded}>
              <Text style={s.sectionLabel}>Rental Details</Text>
              <Text style={s.infoText}>Period: {rentalStart} to {rentalEnd}</Text>
              {eventDate ? <Text style={s.infoText}>Event Date: {eventDate}</Text> : null}
            </View>
          </View>

          {/* ── Items Table Header ── */}
          <View style={s.tableHeader}>
            <Text style={{ ...s.colSno, ...s.thText }}>S.No</Text>
            <Text style={{ ...s.colDesc, ...s.thText }}>Description of Goods</Text>
            <Text style={{ ...s.colQty, ...s.thText }}>Qty</Text>
            <Text style={{ ...s.colRate, ...s.thText }}>Rate</Text>
            <Text style={{ ...s.colAmt, ...s.thText }}>Amount</Text>
          </View>

          {/* ── Items Table Body ── */}
          {items.map((item) => (
            <View key={item.sno} style={s.tableRow}>
              <Text style={s.colSno}>{item.sno}</Text>
              <Text style={s.colDesc}>{item.name}</Text>
              <Text style={s.colQty}>{item.quantity}</Text>
              <Text style={s.colRate}>{rs(item.rate)}</Text>
              <Text style={s.colAmt}>{rs(item.amount)}</Text>
            </View>
          ))}

          {/* ── Totals ── */}
          <View style={s.totalsBlock}>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Subtotal</Text>
              <Text style={s.totalValue}>{rs(subtotal)}</Text>
            </View>

            {gstAmount > 0 ? (
              <View style={s.totalRow}>
                <Text style={s.totalLabel}>GST</Text>
                <Text style={s.totalValue}>{rs(gstAmount)}</Text>
              </View>
            ) : null}

            {discount > 0 ? (
              <View style={s.totalRow}>
                <Text style={s.totalLabel}>Discount</Text>
                <Text style={s.totalValue}>(-) {rs(discount)}</Text>
              </View>
            ) : null}

            {lateFee > 0 ? (
              <View style={s.totalRow}>
                <Text style={s.totalLabel}>Late Fee</Text>
                <Text style={s.totalValue}>{rs(lateFee)}</Text>
              </View>
            ) : null}

            {damageCharges > 0 ? (
              <View style={s.totalRow}>
                <Text style={s.totalLabel}>Damage Charges</Text>
                <Text style={s.totalValue}>{rs(damageCharges)}</Text>
              </View>
            ) : null}

            {securityDeposit > 0 ? (
              <View style={s.totalRow}>
                <Text style={s.totalLabel}>Security Deposit</Text>
                <Text style={s.totalValue}>{rs(securityDeposit)}</Text>
              </View>
            ) : null}

            {/* Grand Total */}
            <View style={s.totalRowGrand}>
              <Text style={s.totalLabelBold}>Total</Text>
              <Text style={s.totalValueBold}>{rs(totalAmount)}</Text>
            </View>

            {invoiceType === 'final' && totalPaid > 0 ? (
              <View style={s.totalRow}>
                <Text style={s.totalLabel}>Amount Paid</Text>
                <Text style={s.totalValue}>(-) {rs(totalPaid)}</Text>
              </View>
            ) : null}

            {invoiceType === 'final' && balanceDue > 0 ? (
              <View style={s.totalRowGrand}>
                <Text style={s.totalLabelBold}>Balance Due</Text>
                <Text style={s.totalValueRed}>{rs(balanceDue)}</Text>
              </View>
            ) : null}
          </View>


          {/* ── Amount in Words ── */}
          <View style={s.wordsRow}>
            <View style={{ flexDirection: 'row' as const, justifyContent: 'space-between' as const }}>
              <Text style={s.wordsLabel}>Amount Chargeable (in words)</Text>
              <Text style={s.eoe}>E. & O.E</Text>
            </View>
            <Text style={s.wordsText}>{numberToWords(totalAmount)}</Text>
          </View>

          {/* ── Footer ── */}
          <View style={s.footerRow}>
            <Text style={s.footerLabel}>Terms & Conditions</Text>
            {termsAndConditions ? (
              <Text style={s.footerTerms}>{termsAndConditions}</Text>
            ) : null}
          </View>
        </View>
      </Page>
    </Document>
  );
}

export default TallyInvoicePDF;
