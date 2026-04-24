/**
 * Staff Detail API Route
 * GET    /api/staff/[id] — get single staff member (admin only)
 * PATCH  /api/staff/[id] — update staff (admin only)
 * DELETE /api/staff/[id] — delete staff + auth user (admin only)
 */

import { NextRequest } from 'next/server';
import { branchService } from '@/services/branchService';
import { adminOnly } from '@/lib/apiGuard';
import { apiSuccess, apiRepositoryError, apiNotFound, apiInternalError } from '@/lib/apiResponse';

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
      return apiNotFound('Staff member');
    }
    return apiSuccess(result.data);
  } catch (error: any) {
    console.error('[API] GET /api/staff/[id] error:', error);
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
    const result = await branchService.updateStaff(id, body);
    if (!result.success) {
      return apiRepositoryError(result.error, 'Failed to update staff');
    }
    return apiSuccess(result.data, { message: 'Staff member updated successfully' });
  } catch (error: any) {
    console.error('[API] PATCH /api/staff/[id] error:', error);
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
    const result = await branchService.deleteStaff(id);
    if (!result.success) {
      return apiRepositoryError(result.error, 'Failed to delete staff');
    }
    return apiSuccess(null, { message: 'Staff member deleted successfully' });
  } catch (error: any) {
    console.error('[API] DELETE /api/staff/[id] error:', error);
    return apiInternalError(error.message);
  }
}
