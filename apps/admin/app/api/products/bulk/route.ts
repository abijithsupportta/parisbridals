/**
 * Products Bulk Operations API Route
 *
 * POST /api/products/bulk
 * 
 * Handles bulk operations on multiple products:
 * - activate/deactivate
 * - feature/unfeature
 * - delete
 * - update_price
 *
 * @module app/api/products/bulk/route
 */

import { NextRequest } from 'next/server';
import { productService } from '@/services';
import { BulkProductOperationSchema } from '@/domain';
import { z } from 'zod';
import { apiGuard } from '@/lib/apiGuard';
import { apiSuccess, apiRepositoryError, apiZodError, apiInternalError } from '@/lib/apiResponse';

/**
 * POST /api/products/bulk
 * 
 * Request body: BulkProductOperation
 * 
 * Performs bulk operations on multiple products with validation.
 */
export async function POST(request: NextRequest) {
  try {
    const guard = await apiGuard(request, 'products');
    if (guard.error) return guard.error;

    const body = await request.json();
    
    // Validate request body
    const validatedData = BulkProductOperationSchema.parse(body);

    const result = await productService.performBulkOperation(validatedData);

    if (!result.success) {
      return apiRepositoryError(result.error, 'Bulk operation failed');
    }

    return apiSuccess(result.data, { message: 'Bulk operation completed successfully' });

  } catch (error) {
    console.error('Products Bulk API - POST Error:', error);
    
    if (error instanceof z.ZodError) {
      return apiZodError(error);
    }

    return apiInternalError();
  }
}
