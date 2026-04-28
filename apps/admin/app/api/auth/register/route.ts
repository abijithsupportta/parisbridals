import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, role = 'admin', storeId } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Create user in Supabase Auth with auto-confirmation
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role,
          store_id: storeId,
        },
        emailRedirectTo: undefined,
      },
    });

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    // Auto-confirm the user using admin client
    if (data.user) {
      await supabase.auth.admin.updateUserById(data.user.id, {
        email_confirm: true,
      });
    }

    // Create staff record if role is staff/manager
    if (role !== 'admin' && data.user) {
      const { error: staffError } = await supabase
        .from('staff')
        .insert({
          user_id: data.user.id,
          email,
          role,
          is_active: true,
          store_id: storeId || null,
        });

      if (staffError) {
        console.error('Staff creation error:', staffError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      data: {
        id: data.user?.id,
        email: data.user?.email,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { success: false, error: 'Registration failed' },
      { status: 500 }
    );
  }
}
