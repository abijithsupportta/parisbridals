/**
 * API Route Guard
 *
 * Backend RBAC enforcement for API routes.
 * Checks the user's session and role before allowing access.
 *
 * Usage in API routes:
 *   const guard = await apiGuard(request, 'branches');
 *   if (guard.error) return guard.error;
 *   // guard.user is available
 *
 * @module lib/apiGuard
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, type AuthUser } from '@/lib/auth';
import { hasPermission, type Permission } from '@/lib/permissions';

interface GuardSuccess {
  user: AuthUser;
  error: null;
}

interface GuardError {
  user: null;
  error: NextResponse;
}

type GuardResult = GuardSuccess | GuardError;

/**
 * Guard an API route by checking authentication and role permissions.
 *
 * @param request - The incoming request
 * @param permission - The permission required (e.g. 'branches', 'staff', 'products')
 * @returns The authenticated user or an error response
 */
export async function apiGuard(
  request: NextRequest,
  permission: Permission
): Promise<GuardResult> {
  // 1. Check authentication
  const user = await getAuthUser(request);
  if (!user) {
    return {
      user: null,
      error: NextResponse.json(
        { error: 'Authentication required. Please log in.' },
        { status: 401 }
      ),
    };
  }

  // 2. Check role permission
  if (!hasPermission(user.role, permission)) {
    return {
      user: null,
      error: NextResponse.json(
        { error: `Access denied. ${user.role} role does not have '${permission}' permission.` },
        { status: 403 }
      ),
    };
  }

  return { user, error: null };
}

/**
 * Guard for admin-only routes (branches, staff, settings).
 */
export async function adminOnly(request: NextRequest): Promise<GuardResult> {
  const user = await getAuthUser(request);
  if (!user) {
    return {
      user: null,
      error: NextResponse.json(
        { error: 'Authentication required. Please log in.' },
        { status: 401 }
      ),
    };
  }

  if (user.role !== 'admin' && user.role !== 'super_admin') {
    return {
      user: null,
      error: NextResponse.json(
        { error: 'Access denied. Admin privileges required.' },
        { status: 403 }
      ),
    };
  }

  return { user, error: null };
}
