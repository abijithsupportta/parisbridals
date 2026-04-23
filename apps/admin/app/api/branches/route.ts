/**
 * Branches API Route
 * GET  /api/branches — list all branches with staff count
 * POST /api/branches — create a new branch
 */

import { NextRequest, NextResponse } from 'next/server';
import { branchService } from '@/services/branchService';

export async function GET() {
  try {
    const result = await branchService.getBranches();
    if (!result.success) {
      return NextResponse.json(
        { error: result.error?.message || 'Failed to fetch branches' },
        { status: 400 }
      );
    }
    return NextResponse.json(result.data);
  } catch (error: any) {
    console.error('[API] GET /api/branches error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await branchService.createBranch(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error?.message || 'Failed to create branch' },
        { status: 400 }
      );
    }
    return NextResponse.json(result.data, { status: 201 });
  } catch (error: any) {
    console.error('[API] POST /api/branches error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
