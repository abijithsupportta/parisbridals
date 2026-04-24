/**
 * Payment API Route (Individual)
 * GET    /api/payments/:id — get a single payment
 * PATCH  /api/payments/:id — update a payment
 * DELETE /api/payments/:id — delete a payment
 */

import { NextRequest, NextResponse } from 'next/server';
import { paymentService } from '@/services/paymentService';
import { adminOnly } from '@/lib/apiGuard';
import { getAuthUser } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const guard = await adminOnly(request);
    if (guard.error) return guard.error;

    const result = await paymentService.getPayment(params.id);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error?.message || 'Failed to fetch payment' },
        { status: 404 }
      );
    }
    return NextResponse.json(result.data);
  } catch (error: any) {
    console.error('[API] GET /api/payments/:id error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const guard = await adminOnly(request);
    if (guard.error) return guard.error;

    const authUser = await getAuthUser(request);
    paymentService.setUserContext(authUser?.staff_id || null, authUser?.branch_id || null);

    const body = await request.json();
    const result = await paymentService.updatePayment(params.id, body);
    
    if (!result.success || !result.data) {
      return NextResponse.json(
        { error: result.error?.message || 'Failed to update payment' },
        { status: 400 }
      );
    }
    return NextResponse.json(result.data);
  } catch (error: any) {
    console.error('[API] PATCH /api/payments/:id error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const guard = await adminOnly(request);
    if (guard.error) return guard.error;

    const result = await paymentService.deletePayment(params.id);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error?.message || 'Failed to delete payment' },
        { status: 400 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API] DELETE /api/payments/:id error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
