/**
 * Branches API Route
 * GET  /api/branches — list all branches (all authenticated users can read)
 * POST /api/branches — create a new branch (super_admin and admin only)
 */

import { NextRequest } from 'next/server';
import { branchService } from '@/services/branchService';
import { adminOnly, apiGuard } from '@/lib/apiGuard';
import { getAuthUser } from '@/lib/auth';
import { apiSuccess, apiRepositoryError, apiInternalError } from '@/lib/apiResponse';

export async function GET(request: NextRequest) {
  try {
    // All roles can read branches (needed for branch switcher)
    const guard = await apiGuard(request, 'dashboard');
    if (guard.error) return guard.error;

    // Set user context in service to ensure store-scoped fetch
    branchService.setUserContext(
      guard.user.staff_id, 
      guard.user.branch_id, 
      guard.user.store_id
    );

    const simple = request.nextUrl.searchParams.get('simple') === 'true';
    const result = simple 
      ? await branchService.getSimpleBranches()
      : await branchService.getBranches();

    if (!result.success) {
      return apiRepositoryError(result.error, 'Failed to fetch branches');
    }
    return apiSuccess(result.data);
  } catch (error: any) {
    console.error('[API] GET /api/branches error:', error);
    return apiInternalError(error.message || 'Internal server error');
  }
}

export async function POST(request: NextRequest) {
  try {
    // Super Admin and Admin only — managers and staff cannot create branches
    const guard = await adminOnly(request);
    if (guard.error) return guard.error;
    
    // Set user context in service
    branchService.setUserContext(
      guard.user.staff_id, 
      guard.user.branch_id, 
      guard.user.store_id
    );

    const body = await request.json();
    const result = await branchService.createBranch(body);
    if (!result.success) {
      return apiRepositoryError(result.error, 'Failed to create branch');
    }
    return apiSuccess(result.data, { status: 201, message: 'Branch created successfully' });
  } catch (error: any) {
    console.error('[API] POST /api/branches error:', error);
    return apiInternalError(error.message || 'Internal server error');
  }
}
