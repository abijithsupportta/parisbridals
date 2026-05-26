/**
 * Invoice Service
 *
 * Service for generating PDF invoices for orders.
 * Uses @react-pdf/renderer with a declarative Tally-style component.
 *
 * @module services/invoiceService
 */

import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { OrderWithRelations } from '@/domain/types/order';
import { settingsService } from './settingsService';
import { paymentService } from './paymentService';
import { orderService } from './orderService';
import {
  TallyInvoicePDF,
  type TallyInvoiceProps,
  type InvoiceItem,
} from '@/components/admin/orders/TallyInvoicePDF';

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

export class InvoiceService {
  /**
   * Generate invoice PDF and return as a Buffer.
   */
  async generateInvoice(orderId: string, invoiceType: 'deposit' | 'final'): Promise<Buffer> {
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

    // Build props for the React PDF component
    const props = this.buildInvoiceProps(order, invoiceType, invoiceNumber, invoiceDate, payments, settings);

    // Render the React component to a PDF buffer
    // Cast needed because renderToBuffer expects ReactElement<DocumentProps>
    // but our component wraps <Document> internally — this is safe.
    const element = React.createElement(TallyInvoicePDF, props) as any;
    const buffer = await renderToBuffer(element);

    return buffer;
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

  /** Format date to DD-MMM-YYYY */
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
   * Map raw order data into the flat props shape that TallyInvoicePDF expects.
   */
  private buildInvoiceProps(
    order: OrderWithRelations,
    invoiceType: 'deposit' | 'final',
    invoiceNumber: string,
    invoiceDate: string,
    payments: any[],
    settings: { invoicePrefix: string; paymentTerms: string; authorizedSignature: string },
  ): TallyInvoiceProps {
    // Build line items
    const items: InvoiceItem[] = order.items.map((item, idx) => ({
      sno: idx + 1,
      name: this.getItemProductName(item),
      quantity: item.quantity || 0,
      rate: item.price_per_day || 0,
      amount: item.total_price || (item.price_per_day || 0) * (item.quantity || 0),
    }));

    // Payment calculations — only count rental payments (exclude deposit,
    // deposit_refund, and refund)
    const totalPaid = payments
      .filter((p) => !['refund', 'deposit', 'deposit_refund'].includes(p.payment_type))
      .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
    const balanceDue = Math.max(0, Number(order.total_amount || 0) - totalPaid);

    // Find payment mode
    const depositPayment = payments.find((p) => p.payment_type === 'deposit');
    const paymentMode = depositPayment?.payment_mode?.toUpperCase() || undefined;


    return {
      companyName: order.store?.name || 'Paris Bridals',
      companyAddress: order.store?.address,
      companyPhone: order.store?.phone,
      companyEmail: order.store?.email,
      companyGstin: order.store?.gstin,

      invoiceNumber,
      invoiceDate,
      invoiceType,
      orderId: order.id.slice(0, 8).toUpperCase(),
      paymentMode,

      buyerName: order.customer.name,
      buyerPhone: order.customer.phone,
      buyerAltPhone: (order.customer as any).alt_phone,
      buyerEmail: order.customer.email,

      rentalStart: this.fmtDate(order.start_date),
      rentalEnd: this.fmtDate(order.end_date),
      eventDate: order.event_date ? this.fmtDate(order.event_date) : null,

      items,

      subtotal: Number(order.subtotal) || 0,
      gstAmount: Number(order.gst_amount) || 0,
      discount: Number(order.discount) || 0,
      lateFee: Number(order.late_fee) || 0,
      damageCharges: Number(order.damage_charges_total) || 0,
      securityDeposit: Number(order.security_deposit) || 0,
      totalAmount: Number(order.total_amount) || 0,
      totalPaid,
      balanceDue,

      termsAndConditions: settings.paymentTerms || undefined,
    };
  }
}

// Singleton instance
export const invoiceService = new InvoiceService();
