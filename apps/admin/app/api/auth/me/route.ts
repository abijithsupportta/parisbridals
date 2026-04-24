/**
 * Current User API Route
 * GET /api/auth/me — Get current authenticated user info
 */

import { NextRequest } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { apiSuccess, apiUnauthorized, apiInternalError } from '@/lib/apiResponse';

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    
    if (!authUser) {
      return apiUnauthorized('Not authenticated');
    }

    return apiSuccess({ user: authUser });
  } catch (error) {
    console.error('[API] GET /api/auth/me error:', error);
    return apiInternalError();
  }
}
