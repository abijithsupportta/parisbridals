/**
 * Auth Refresh Route
 *
 * POST /api/auth/refresh - Refresh an expired access token using a refresh token.
 * Used by the mobile app when the Supabase JWT expires (default 1 hour).
 *
 * @module app/api/auth/refresh/route
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refresh_token } = body;

    if (!refresh_token) {
      return NextResponse.json(
        { success: false, error: 'refresh_token is required' },
        { status: 400 }
      );
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      return NextResponse.json(
        { success: false, error: 'Server misconfigured' },
        { status: 500 }
      );
    }

    const authClient = createSupabaseClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await authClient.auth.refreshSession({
      refresh_token,
    });

    if (error || !data.session) {
      return NextResponse.json(
        { success: false, error: error?.message || 'Failed to refresh session' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[auth/refresh] Error:', message);
    return NextResponse.json(
      { success: false, error: `Token refresh failed: ${message}` },
      { status: 500 }
    );
  }
}
