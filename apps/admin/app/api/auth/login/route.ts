import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      console.error('[auth/login] Missing Supabase env vars');
      return NextResponse.json(
        { success: false, error: 'Server misconfigured: Supabase env vars missing' },
        { status: 500 }
      );
    }

    // Use a fresh anon-key client for sign-in (service-role client can interfere with auth)
    const authClient = createSupabaseClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await authClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user || !data.session) {
      return NextResponse.json(
        {
          success: false,
          error: error?.message || 'Invalid credentials',
        },
        { status: 401 }
      );
    }

    // Use admin client (service role) to look up staff record, bypassing RLS
    const adminClient = createAdminClient();
    const { data: staff, error: staffError } = await adminClient
      .from('staff')
      .select('id, role, branch_id, store_id')
      .eq('user_id', data.user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (staffError) {
      console.error('[auth/login] Staff lookup error:', staffError.message);
    }

    const role = staff?.role || data.user.user_metadata?.role || 'admin';
    const storeId = staff?.store_id || data.user.user_metadata?.store_id || null;
    const branchId = staff?.branch_id || null;
    const staffId = staff?.id || null;

    return NextResponse.json({
      success: true,
      data: {
        id: data.user.id,
        email: data.user.email,
        role,
        store_id: storeId,
        branch_id: branchId,
        staff_id: staffId,
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[auth/login] Unhandled error:', message);
    return NextResponse.json(
      { success: false, error: `Login failed: ${message}` },
      { status: 500 }
    );
  }
}
