/**
 * Invoice Service
 *
 * Service for generating PDF invoices for orders.
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

  /**
   * Generate PDF from invoice data
   */
  private generatePDF(data: InvoiceData): Blob {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 20;

    // Add title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(data.invoiceType === 'deposit' ? 'DEPOSIT INVOICE' : 'FINAL INVOICE', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    // Invoice number and date
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Invoice No: ${data.invoiceNumber}`, 20, yPosition);
    doc.text(`Date: ${data.invoiceDate}`, pageWidth - 20, yPosition, { align: 'right' });
    yPosition += 10;

    // Store information
    if (data.order.store) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(data.order.store.name, 20, yPosition);
      yPosition += 7;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      if (data.order.store.address) {
        doc.text(data.order.store.address, 20, yPosition);
        yPosition += 5;
      }
      if (data.order.store.phone) {
        doc.text(`Phone: ${data.order.store.phone}`, 20, yPosition);
        yPosition += 5;
      }
      if (data.order.store.email) {
        doc.text(`Email: ${data.order.store.email}`, 20, yPosition);
        yPosition += 5;
      }
      if (data.order.store.gstin) {
        doc.text(`GSTIN: ${data.order.store.gstin}`, 20, yPosition);
        yPosition += 5;
      }
    }
    yPosition += 10;

    // Customer information
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Bill To:', 20, yPosition);
    yPosition += 7;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(data.order.customer.name, 20, yPosition);
    yPosition += 5;
    doc.text(`Phone: ${data.order.customer.phone}`, 20, yPosition);
    yPosition += 5;
    if (data.order.customer.email) {
      doc.text(`Email: ${data.order.customer.email}`, 20, yPosition);
      yPosition += 5;
    }
    yPosition += 10;

    // Order details
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Order ID: #${data.order.id.slice(0, 8)}`, 20, yPosition);
    yPosition += 5;
    doc.text(`Rental Period: ${new Date(data.order.start_date).toLocaleDateString()} - ${new Date(data.order.end_date).toLocaleDateString()}`, 20, yPosition);
    yPosition += 5;
    if (data.order.event_date) {
      doc.text(`Event Date: ${new Date(data.order.event_date).toLocaleDateString()}`, 20, yPosition);
      yPosition += 5;
    }
    yPosition += 10;

    // Items table
    const tableData = data.order.items.map((item) => [
      item.product_id.slice(0, 8),
      item.quantity.toString(),
      `₹${item.price_per_day.toLocaleString()}`,
      `₹${item.total_price.toLocaleString()}`,
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Item ID', 'Qty', 'Price/Day', 'Total']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [66, 66, 66] },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;

    // Payment breakdown
    if (data.invoiceType === 'final') {
      // Final invoice with full breakdown
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Payment Breakdown:', 20, yPosition);
      yPosition += 8;

      doc.setFont('helvetica', 'normal');
      doc.text(`Subtotal: ₹${data.order.subtotal?.toLocaleString() || '0'}`, 20, yPosition);
      yPosition += 5;
      doc.text(`GST: ₹${data.order.gst_amount?.toLocaleString() || '0'}`, 20, yPosition);
      yPosition += 5;
      doc.setFont('helvetica', 'bold');
      doc.text(`Total: ₹${data.order.total_amount.toLocaleString()}`, 20, yPosition);
      yPosition += 8;

      // Show deposit already paid
      const depositPayment = data.payments?.find((p) => p.payment_type === 'deposit');
      if (depositPayment) {
        doc.setFont('helvetica', 'normal');
        doc.text(`Security Deposit Paid: ₹${depositPayment.amount.toLocaleString()}`, 20, yPosition);
        yPosition += 5;
        doc.setFont('helvetica', 'bold');
        doc.text(`Balance Due: ₹${(data.order.total_amount - depositPayment.amount).toLocaleString()}`, 20, yPosition);
        yPosition += 8;
      }
    } else {
      // Deposit invoice
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Security Deposit:', 20, yPosition);
      yPosition += 8;

      doc.setFont('helvetica', 'normal');
      const totalDeposit = data.order.items.reduce((sum, item) => sum + (item.price_per_day * item.quantity), 0);
      doc.text(`Amount: ₹${totalDeposit.toLocaleString()}`, 20, yPosition);
      yPosition += 8;
    }

    // Payment details
    if (data.payments && data.payments.length > 0) {
      const relevantPayment = data.payments.find(
        (p) => p.payment_type === (data.invoiceType === 'deposit' ? 'deposit' : 'final')
      );

      if (relevantPayment) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Payment Details:', 20, yPosition);
        yPosition += 8;

        doc.setFont('helvetica', 'normal');
        doc.text(`Payment Mode: ${relevantPayment.payment_mode.toUpperCase()}`, 20, yPosition);
        yPosition += 5;
        if (relevantPayment.transaction_id) {
          doc.text(`Transaction ID: ${relevantPayment.transaction_id}`, 20, yPosition);
          yPosition += 5;
        }
        doc.text(`Payment Date: ${new Date(relevantPayment.payment_date).toLocaleDateString()}`, 20, yPosition);
        yPosition += 8;
      }
    }

    // Terms and conditions
    if (data.settings.paymentTerms) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      const terms = doc.splitTextToSize(data.settings.paymentTerms, pageWidth - 40);
      doc.text(terms, 20, yPosition);
      yPosition += terms.length * 4 + 10;
    }

    // Signature
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Authorized Signature:', pageWidth - 80, pageHeight - 30);
    doc.text(data.settings.authorizedSignature, pageWidth - 80, pageHeight - 20);

    return doc.output('blob');
  }
}

// Singleton instance
export const invoiceService = new InvoiceService();
