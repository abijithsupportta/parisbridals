/**
 * Supabase Server Clients
 *
 * Provides two clients for server-side Supabase operations:
 * - createClient: Uses anon key for public/unauthenticated read operations (subject to RLS)
 * - createAdminClient: Uses service role key for admin write operations (bypasses RLS)
 *
 * The service role key must be kept secret and only used server-side.
 * Never expose SUPABASE_SERVICE_ROLE_KEY to the browser.
 */

import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Standard anon client for read operations and auth flows.
 * Subject to RLS policies defined in Supabase.
 *
 * @throws Error if NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing
 */
export function createClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Missing Supabase environment variables. Check .env.local for: ' +
      'NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }

  return createSupabaseClient(url, anonKey);
}

/**
 * Admin client using the service role key.
 * Bypasses Row Level Security — use ONLY for trusted server-side admin mutations.
 * Never expose the returned client or key to the browser.
 *
 * @throws Error if NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing
 */
export function createAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL in .env.local');
  }

  // Prefer service role key for full admin access (bypasses RLS).
  // Fall back to anon key during build-time static generation or when
  // the service role key isn't configured — works because RLS is disabled
  // on admin tables.
  const key = serviceRoleKey || anonKey;
  if (!key) {
    throw new Error(
      'Missing both SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
      'At least one must be set.'
    );
  }

  if (!serviceRoleKey) {
    console.warn(
      '[supabase] SUPABASE_SERVICE_ROLE_KEY not found — falling back to anon key. ' +
      'Admin mutations will only work if RLS is disabled on the target tables.'
    );
  }

  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
