/**
 * Branch Detail API Route
 * GET    /api/branches/[id] — get single branch (all authenticated)
 * PATCH  /api/branches/[id] — update branch (admin only)
 * DELETE /api/branches/[id] — delete branch (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { branchService } from '@/services/branchService';
import { apiGuard, adminOnly } from '@/lib/apiGuard';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await apiGuard(request, 'dashboard');
    if (guard.error) return guard.error;

    const { id } = await params;
    const result = await branchService.getBranchById(id);
    if (!result.success || !result.data) {
      return NextResponse.json(
        { error: result.error?.message || 'Branch not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(result.data);
  } catch (error: any) {
    console.error('[API] GET /api/branches/[id] error:', error);
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
    const result = await branchService.updateBranch(id, body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error?.message || 'Failed to update branch' },
        { status: 400 }
      );
    }
    return NextResponse.json(result.data);
  } catch (error: any) {
    console.error('[API] PATCH /api/branches/[id] error:', error);
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
    const result = await branchService.deleteBranch(id);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error?.message || 'Failed to delete branch' },
        { status: result.error?.code === 'DELETE_BLOCKED' ? 409 : 400 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API] DELETE /api/branches/[id] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
