/**
 * Invoice API Route
 * GET /api/orders/:id/invoice?type=deposit|final — generate and download invoice PDF
 *
 * Uses @react-pdf/renderer (via InvoiceService) to produce the PDF buffer
 * and streams it back as a downloadable attachment.
 */

import { NextRequest, NextResponse } from 'next/server';
import { invoiceService } from '@/services/invoiceService';
import { apiGuard } from '@/lib/apiGuard';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await apiGuard(request, 'orders');
    if (guard.error) return guard.error;

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const invoiceType = searchParams.get('type') || 'final';

    if (invoiceType !== 'deposit' && invoiceType !== 'final') {
      return NextResponse.json(
        { error: 'Invalid invoice type. Must be "deposit" or "final"' },
        { status: 400 }
      );
    }

    // generateInvoice now returns a Buffer (from @react-pdf/renderer)
    const pdfBuffer = await invoiceService.generateInvoice(id, invoiceType as 'deposit' | 'final');

    const invoiceNumber = `INV-${id.slice(0, 8).toUpperCase()}-${invoiceType.toUpperCase()}`;
    const filename = `${invoiceNumber}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(pdfBuffer.length),
      },
    });
  } catch (error: any) {
    console.error('[API] GET /api/orders/:id/invoice error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate invoice' },
      { status: 500 }
    );
  }
}
