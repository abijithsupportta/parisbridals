/**
 * Product Can Delete API Route
 *
 * GET /api/products/[id]/can-delete
 * 
 * READ-ONLY safety check — verifies whether a product can be deleted
 * by checking for dependent records (orders, rentals, etc.) WITHOUT
 * actually performing any deletion.
 *
 * @module app/api/products/[id]/can-delete/route
 */

import { NextRequest } from 'next/server';
import { productRepository } from '@/repository';
import { apiGuard } from '@/lib/apiGuard';
import { apiSuccess, apiBadRequest, apiInternalError } from '@/lib/apiResponse';

/**
 * GET /api/products/[id]/can-delete
 * 
 * Returns deletion safety information including:
 * - canDelete: boolean indicating if deletion is safe
 * - reason: string explaining why deletion is not safe (if applicable)
 * - relatedData: object with counts of dependent records
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await apiGuard(request, 'products');
    if (guard.error) return guard.error;

    const { id } = await params;

    if (!id || typeof id !== 'string') {
      return apiBadRequest('Invalid product ID');
    }

    // Read-only check — does NOT delete anything
    const result = await productRepository.canDelete(id);

    if (!result.success) {
      return apiInternalError(result.error?.message || 'Failed to check deletion safety');
    }

    return apiSuccess({
      canDelete: result.data?.canDelete ?? false,
      reason: result.data?.reason,
      relatedData: result.data?.relatedData || {},
    });
  } catch (error) {
    console.error('Product Can Delete API - GET Error:', error);
    return apiInternalError();
  }
}
