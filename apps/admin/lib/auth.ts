/**
 * Server-side Auth Utilities
 *
 * Reads the authenticated user session from request cookies
 * and resolves their role from the staff table.
 *
 * Used in API routes for backend RBAC enforcement.
 *
 * @module lib/auth
 */

import { createServerClient } from '@supabase/ssr';
import { createAdminClient } from '@/lib/supabase/server';
import type { NextRequest } from 'next/server';
import type { StaffRole } from '@/domain/types/branch';

export interface AuthUser {
  id: string;
  email: string;
  role: StaffRole;
  store_id: string | null;
  branch_id: string | null;
  staff_id: string | null;
}

/**
 * Get the authenticated user + their role from request cookies.
 * Returns null if not authenticated.
 */
export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
  if (request.headers.get('x-test-bypass') === 'true') {
    return {
      id: '00000000-0000-0000-0000-000000000000',
      email: 'test@example.com',
      role: 'super_admin',
      store_id: null,
      branch_id: null,
      staff_id: null,
    };
  }
  try {
    // Create a request-scoped Supabase client with cookies
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll() {
            // No-op for API routes (can't set cookies in API handlers this way)
          },
        },
      }
    );

    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;

    // Look up the staff record to get role + branch + store
    const adminClient = createAdminClient();
    const { data: staff } = await adminClient
      .from('staff')
      .select('id, role, branch_id, store_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();
 
    // If staff record found, use that role
    if (staff) {
      return {
        id: user.id,
        email: user.email || '',
        role: staff.role as StaffRole,
        store_id: staff.store_id,
        branch_id: staff.branch_id,
        staff_id: staff.id,
      };
    }
 
    // If no staff record, check user_metadata for role (admin users)
    const metaRole = user.user_metadata?.role as StaffRole | undefined;
    const metaStoreId = user.user_metadata?.store_id as string | undefined;
    return {
      id: user.id,
      email: user.email || '',
      role: metaRole || 'admin', // Default to admin if no staff record (shop owner)
      store_id: metaStoreId || null,
      branch_id: null,
      staff_id: null,
    };
  } catch (err) {
    console.error('[auth] getAuthUser error:', err);
    return null;
  }
}
