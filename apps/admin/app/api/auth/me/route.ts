import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    return NextResponse.json({ user: authUser });
  } catch (error: any) {
    console.error('[API] GET /api/auth/me error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
