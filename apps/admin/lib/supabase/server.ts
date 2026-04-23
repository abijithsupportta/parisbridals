/**
 * Supabase Server Clients (Singleton)
 *
 * Cached clients — created once, reused everywhere.
 * - createClient: anon key (subject to RLS)
 * - createAdminClient: service role key (bypasses RLS)
 */

import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';

let _anonClient: SupabaseClient | null = null;
let _adminClient: SupabaseClient | null = null;

/**
 * Standard anon client (singleton). Subject to RLS.
 */
export function createClient(): SupabaseClient {
  if (_anonClient) return _anonClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Missing Supabase environment variables. Check .env.local for: ' +
      'NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }

  _anonClient = createSupabaseClient(url, anonKey);
  return _anonClient;
}

/**
 * Admin client (singleton). Bypasses RLS via service role key.
 * Falls back to anon key during build-time SSG.
 */
export function createAdminClient(): SupabaseClient {
  if (_adminClient) return _adminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL in .env.local');
  }

  const key = serviceRoleKey || anonKey;
  if (!key) {
    throw new Error(
      'Missing both SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
      'At least one must be set.'
    );
  }

  if (!serviceRoleKey) {
    console.warn(
      '[supabase] SUPABASE_SERVICE_ROLE_KEY not found — falling back to anon key.'
    );
  }

  _adminClient = createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return _adminClient;
}
