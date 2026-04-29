/**
 * Staff Detail API Route
 * GET    /api/staff/[id] — get single staff member (admin only)
 * PATCH  /api/staff/[id] — update staff (admin only)
 * DELETE /api/staff/[id] — delete staff + auth user (admin only)
 */

import { NextRequest } from 'next/server';
import { staffService } from '@/services/staffService';
import { adminOnly } from '@/lib/apiGuard';
import { getAuthUser } from '@/lib/auth';
import { apiSuccess, apiRepositoryError, apiNotFound, apiInternalError } from '@/lib/apiResponse';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await adminOnly(request);
    if (guard.error) return guard.error;

    staffService.setUserContext(
      guard.user.staff_id,
      guard.user.branch_id,
      guard.user.store_id
    );

    const { id } = await params;
    const result = await staffService.getStaffById(id);
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

    staffService.setUserContext(
      guard.user.staff_id,
      guard.user.branch_id,
      guard.user.store_id
    );

    const { id } = await params;
    const body = await request.json();

    // Field whitelisting — prevent mass-assignment
    const allowedFields = ['name', 'email', 'phone', 'role', 'branch_id', 'is_active'];
    const sanitized: Record<string, any> = {};
    for (const key of allowedFields) {
      if (key in body) sanitized[key] = body[key];
    }

    const result = await staffService.updateStaff(id, sanitized);
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

    staffService.setUserContext(
      guard.user.staff_id,
      guard.user.branch_id,
      guard.user.store_id
    );

    const { id } = await params;
    const result = await staffService.deactivateStaff(id);
    if (!result.success) {
      return apiRepositoryError(result.error, 'Failed to deactivate staff');
    }
    return apiSuccess(null, { message: 'Staff member deactivated successfully' });
  } catch (error: any) {
    console.error('[API] DELETE /api/staff/[id] error:', error);
    return apiInternalError(error.message);
  }
}
