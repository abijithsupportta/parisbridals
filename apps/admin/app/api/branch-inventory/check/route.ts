/**
 * Branch Inventory Check API Route
 *
 * Check if inventory exists for a branch-product combination.
 *
 * @module app/api/branch-inventory/check/route
 */

import { NextRequest } from 'next/server';
import { branchInventoryRepository } from '@/repository';
import { apiSuccess, apiBadRequest, apiInternalError } from '@/lib/apiResponse';

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
      return apiBadRequest('branch_id and product_id are required');
    }

    const result = await branchInventoryRepository.getBranchProductInventory(branchId, productId);

    if (!result.success) {
      return apiInternalError('Failed to check inventory');
    }

    return apiSuccess({
      exists: !!result.data,
      id: result.data?.id || null,
    });
  } catch (error) {
    return apiInternalError();
  }
}
