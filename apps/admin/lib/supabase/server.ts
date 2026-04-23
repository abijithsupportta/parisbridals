/**
 * Supabase Server Clients
 *
 * Provides two singleton clients for server-side Supabase operations:
 * - createClient: Uses anon key for read operations (subject to RLS)
 * - createAdminClient: Uses service role key for admin mutations (bypasses RLS)
 *
 * Clients are cached as singletons to prevent the
 * "Multiple GoTrueClient instances" warning.
 */

import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';

let anonClient: SupabaseClient | null = null;
let adminClient: SupabaseClient | null = null;

/**
 * Standard anon client for read operations and auth flows.
 * Subject to RLS policies defined in Supabase.
 *
 * @throws Error if NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing
 */
export function createClient(): SupabaseClient {
  if (anonClient) return anonClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Missing Supabase environment variables. Check .env.local for: ' +
      'NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }

  anonClient = createSupabaseClient(url, anonKey);
  return anonClient;
}

/**
 * Admin client using the service role key.
 * Bypasses Row Level Security — use ONLY for trusted server-side admin mutations.
 * Never expose the returned client or key to the browser.
 *
 * @throws Error if NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing
 */
export function createAdminClient(): SupabaseClient {
  if (adminClient) return adminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL in .env.local');
  }
  if (!serviceRoleKey) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY in .env.local. ' +
      'This key is required for admin mutations that bypass RLS. ' +
      'Find it in Supabase Dashboard > Project Settings > API > service_role.'
    );
  }

  adminClient = createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return adminClient;
}
