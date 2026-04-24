/**
 * Branch Inventory API Routes
 *
 * REST API endpoints for branch inventory management.
 *
 * @module app/api/branch-inventory/route
 */

import { NextRequest } from 'next/server';
import { branchInventoryService } from '@/services';
import { apiGuard } from '@/lib/apiGuard';
import { apiSuccess, apiRepositoryError, apiInternalError } from '@/lib/apiResponse';

/**
 * GET /api/branch-inventory
 * List all branch inventory
 */
export async function GET(request: NextRequest) {
  try {
    const guard = await apiGuard(request, 'dashboard');
    if (guard.error) return guard.error;

    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branch_id');
    const productId = searchParams.get('product_id');

    let result;
    if (branchId) {
      result = await branchInventoryService.getInventoryByBranch(branchId);
    } else if (productId) {
      result = await branchInventoryService.getInventoryByProduct(productId);
    } else {
      result = await branchInventoryService.getAllBranchInventory();
    }

    if (!result.success) {
      return apiRepositoryError(result.error, 'Failed to fetch inventory');
    }

    return apiSuccess(result.data);
  } catch (error) {
    return apiInternalError();
  }
}

/**
 * POST /api/branch-inventory
 * Create branch inventory
 */
export async function POST(request: NextRequest) {
  try {
    const guard = await apiGuard(request, 'products');
    if (guard.error) return guard.error;

    const body = await request.json();
    const result = await branchInventoryService.createBranchInventory(body);

    if (!result.success) {
      return apiRepositoryError(result.error, 'Failed to create inventory');
    }

    return apiSuccess(result.data, { status: 201, message: 'Inventory created successfully' });
  } catch (error) {
    return apiInternalError();
  }
}
