/**
 * Staff API Route
 * GET  /api/staff         — list all staff (super_admin and admin only)
 * GET  /api/staff?branch=x — list staff filtered by branch (super_admin and admin only)
 * POST /api/staff         — create staff with Supabase Auth user (super_admin and admin only)
 */

import { NextRequest } from 'next/server';
import { branchService } from '@/services/branchService';
import { adminOnly } from '@/lib/apiGuard';
import { getAuthUser } from '@/lib/auth';
import { apiSuccess, apiRepositoryError, apiInternalError } from '@/lib/apiResponse';

export async function GET(request: NextRequest) {
  try {
    // Super Admin and Admin only — staff and managers cannot view staff list
    const guard = await adminOnly(request);
    if (guard.error) return guard.error;

    const branchId = request.nextUrl.searchParams.get('branch');

    if (branchId) {
      const result = await branchService.getStaffByBranch(branchId);
      if (!result.success) {
        return apiRepositoryError(result.error, 'Failed to fetch staff');
      }
      return apiSuccess(result.data);
    }

    const result = await branchService.getStaff();
    if (!result.success) {
      return apiRepositoryError(result.error, 'Failed to fetch staff');
    }
    return apiSuccess(result.data);
  } catch (error: any) {
    console.error('[API] GET /api/staff error:', error);
    return apiInternalError(error.message);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Super Admin and Admin only — only admins can create staff accounts
    const guard = await adminOnly(request);
    if (guard.error) return guard.error;

    // Get authenticated user for audit fields
    const authUser = await getAuthUser(request);
    
    // Set user context in service
    branchService.setUserContext(
      authUser?.staff_id || null, 
      authUser?.branch_id || null, 
      authUser?.store_id || null
    );

    const body = await request.json();
    const result = await branchService.createStaff(body);
    if (!result.success) {
      return apiRepositoryError(result.error, 'Failed to create staff');
    }
    return apiSuccess(result.data, { status: 201, message: 'Staff member created successfully' });
  } catch (error: any) {
    console.error('[API] POST /api/staff error:', error);
    return apiInternalError(error.message);
  }
}
