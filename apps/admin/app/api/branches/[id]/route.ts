/**
 * Branch Detail API Route
 * GET    /api/branches/[id] — get single branch (all authenticated)
 * PATCH  /api/branches/[id] — update branch (admin only)
 * DELETE /api/branches/[id] — delete branch (admin only)
 */

import { NextRequest } from 'next/server';
import { branchService } from '@/services/branchService';
import { apiGuard, adminOnly } from '@/lib/apiGuard';
import { apiSuccess, apiRepositoryError, apiNotFound, apiInternalError } from '@/lib/apiResponse';

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
      return apiNotFound('Branch');
    }
    return apiSuccess(result.data);
  } catch (error: any) {
    console.error('[API] GET /api/branches/[id] error:', error);
    return apiInternalError(error.message);
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
      return apiRepositoryError(result.error, 'Failed to update branch');
    }
    return apiSuccess(result.data, { message: 'Branch updated successfully' });
  } catch (error: any) {
    console.error('[API] PATCH /api/branches/[id] error:', error);
    return apiInternalError(error.message);
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
      return apiRepositoryError(result.error, 'Failed to delete branch');
    }
    return apiSuccess(null, { message: 'Branch deleted successfully' });
  } catch (error: any) {
    console.error('[API] DELETE /api/branches/[id] error:', error);
    return apiInternalError(error.message);
  }
}
