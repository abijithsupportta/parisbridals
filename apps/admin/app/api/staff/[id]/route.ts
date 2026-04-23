/**
 * Staff Detail API Route
 * GET    /api/staff/[id] — get single staff member (admin only)
 * PATCH  /api/staff/[id] — update staff (admin only)
 * DELETE /api/staff/[id] — delete staff + auth user (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { branchService } from '@/services/branchService';
import { adminOnly } from '@/lib/apiGuard';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await adminOnly(request);
    if (guard.error) return guard.error;

    const { id } = await params;
    const result = await branchService.getStaffById(id);
    if (!result.success || !result.data) {
      return NextResponse.json(
        { error: result.error?.message || 'Staff not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(result.data);
  } catch (error: any) {
    console.error('[API] GET /api/staff/[id] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await adminOnly(request);
    if (guard.error) return guard.error;

    const { id } = await params;
    const body = await request.json();
    const result = await branchService.updateStaff(id, body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error?.message || 'Failed to update staff' },
        { status: 400 }
      );
    }
    return NextResponse.json(result.data);
  } catch (error: any) {
    console.error('[API] PATCH /api/staff/[id] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await adminOnly(request);
    if (guard.error) return guard.error;

    const { id } = await params;
    const result = await branchService.deleteStaff(id);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error?.message || 'Failed to delete staff' },
        { status: 400 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API] DELETE /api/staff/[id] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
