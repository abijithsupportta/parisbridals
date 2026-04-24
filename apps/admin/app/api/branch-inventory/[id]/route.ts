/**
 * Branch Inventory API Routes - Individual Item
 *
 * REST API endpoints for individual branch inventory operations.
 *
 * @module app/api/branch-inventory/[id]/route
 */

import { NextRequest, NextResponse } from 'next/server';
import { branchInventoryService } from '@/services';
import { apiGuard } from '@/lib/apiGuard';

/**
 * GET /api/branch-inventory/[id]
 * Get branch inventory by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await apiGuard(request, 'dashboard');
    if (guard.error) return guard.error;

    const { id } = await params;
    const result = await branchInventoryService.getBranchInventoryById(id);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error?.message || 'Failed to fetch inventory' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/branch-inventory/[id]
 * Update branch inventory
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await apiGuard(request, 'products');
    if (guard.error) return guard.error;

    const { id } = await params;
    const body = await request.json();
    const result = await branchInventoryService.updateBranchInventory(id, body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error?.message || 'Failed to update inventory' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/branch-inventory/[id]
 * Delete branch inventory
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await apiGuard(request, 'products');
    if (guard.error) return guard.error;

    const { id } = await params;
    const result = await branchInventoryService.deleteBranchInventory(id);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error?.message || 'Failed to delete inventory' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: null,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
