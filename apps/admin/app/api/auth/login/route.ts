import { NextRequest, NextResponse } from 'next/server';
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

    const supabase = createAdminClient();

    // Sign in with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Get user session
    const { data: sessionData } = await supabase.auth.getSession();
    
    // Look up staff record to get role
    const { data: staff } = await supabase
      .from('staff')
      .select('id, role, branch_id, store_id')
      .eq('user_id', data.user.id)
      .eq('is_active', true)
      .maybeSingle();

    const role = staff?.role || data.user.user_metadata?.role || 'admin';
    const storeId = staff?.store_id || data.user.user_metadata?.store_id || null;
    const branchId = staff?.branch_id || null;
    const staffId = staff?.id || null;

    return NextResponse.json({
      success: true,
      data: {
        id: data.user.id,
        email: data.user.email,
        role: role,
        store_id: storeId,
        branch_id: branchId,
        staff_id: staffId,
        access_token: sessionData?.session?.access_token || '',
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'Login failed' },
      { status: 500 }
    );
  }
}
