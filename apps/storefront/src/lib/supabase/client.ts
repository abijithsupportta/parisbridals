import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

let supabaseInstance: ReturnType<typeof createSupabaseClient> | null = null;

export function createClient() {
  if (typeof window === 'undefined') {
    // Server-side: Always return a new client or use the server-side patterns
    return createSupabaseClient(supabaseUrl, supabaseAnonKey);
  }

  // Client-side: Singleton pattern
  if (!supabaseInstance) {
    supabaseInstance = createSupabaseClient(supabaseUrl, supabaseAnonKey);
  }

  return supabaseInstance;
}
