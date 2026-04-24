/**
 * Branch Inventory Check API Route
 *
 * Check if inventory exists for a branch-product combination.
 *
 * @module app/api/branch-inventory/check/route
 */

import { NextRequest, NextResponse } from 'next/server';
import { branchInventoryRepository } from '@/repository';

/**
 * GET /api/branch-inventory/check?branch_id=xxx&product_id=xxx
 * Check if inventory exists for a branch-product combination
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branch_id');
    const productId = searchParams.get('product_id');

    if (!branchId || !productId) {
      return NextResponse.json(
        { success: false, error: 'branch_id and product_id are required' },
        { status: 400 }
      );
    }

    const result = await branchInventoryRepository.getBranchProductInventory(branchId, productId);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: 'Failed to check inventory' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      exists: !!result.data,
      id: result.data?.id || null,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
