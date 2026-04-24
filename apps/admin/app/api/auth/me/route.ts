/**
 * Current User API Route
 * GET /api/auth/me — Get current authenticated user info
 */

import { NextRequest } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { apiSuccess, apiUnauthorized, apiInternalError } from '@/lib/apiResponse';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    
    if (!user) {
      return apiUnauthorized('Not authenticated');
    }

    return apiSuccess({
      id: user.id,
      email: user.email,
      role: user.role,
      branch_id: user.branch_id,
      staff_id: user.staff_id,
    });
  } catch (error) {
    console.error('[API] GET /api/auth/me error:', error);
    return apiInternalError();
  }
}
