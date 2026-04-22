import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function createClient() {
  // Return a mock client during build time if env vars are missing
  if (!supabaseUrl || !supabaseAnonKey) {
    if (typeof window === 'undefined') {
      // Server-side during build - return a minimal mock
      return createSupabaseClient('https://mock.supabase.co', 'mock-key');
    }
    throw new Error(
      'Missing Supabase environment variables. Please check your .env.local file.\n' +
      'Required: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }
  return createSupabaseClient(supabaseUrl!, supabaseAnonKey!);
}
