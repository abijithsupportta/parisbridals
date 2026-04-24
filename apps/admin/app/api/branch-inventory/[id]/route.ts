/**
 * Branch Inventory API Routes - Individual Item
 *
 * REST API endpoints for individual branch inventory operations.
 *
 * @module app/api/branch-inventory/[id]/route
 */

import { NextRequest } from 'next/server';
import { branchInventoryService } from '@/services';
import { apiGuard } from '@/lib/apiGuard';
import { apiSuccess, apiRepositoryError, apiNotFound, apiInternalError } from '@/lib/apiResponse';

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

    if (!result.success || !result.data) {
      return apiNotFound('Branch inventory');
    }

    return apiSuccess(result.data);
  } catch (error) {
    return apiInternalError();
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
      return apiRepositoryError(result.error, 'Failed to update inventory');
    }

    return apiSuccess(result.data, { message: 'Inventory updated successfully' });
  } catch (error) {
    return apiInternalError();
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
      return apiRepositoryError(result.error, 'Failed to delete inventory');
    }

    return apiSuccess(null, { message: 'Inventory deleted successfully' });
  } catch (error) {
    return apiInternalError();
  }
}
