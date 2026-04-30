/**
 * Barcode Uniqueness Check API
 *
 * GET /api/products/check-barcode?code=XXXXX&exclude=<product-id>
 *
 * Returns whether a barcode is available for use.
 * Used by ProductForm for real-time validation.
 *
 * @module app/api/products/check-barcode/route
 */

import { NextRequest } from 'next/server';
import { productRepository } from '@/repository';
import { apiGuard } from '@/lib/apiGuard';
import { apiSuccess, apiBadRequest, apiInternalError } from '@/lib/apiResponse';

export async function GET(request: NextRequest) {
  try {
    const guard = await apiGuard(request, 'products');
    if (guard.error) return guard.error;

    const code = request.nextUrl.searchParams.get('code');
    const excludeId = request.nextUrl.searchParams.get('exclude') || undefined;

    if (!code || code.trim().length === 0) {
      return apiBadRequest('Barcode code is required');
    }

    const result = await productRepository.isBarcodeUnique(code.trim(), excludeId);

    return apiSuccess({
      unique: result.unique,
      existing_product: result.existingProductName || null,
    });
  } catch (error) {
    console.error('Barcode uniqueness check error:', error);
    return apiInternalError();
  }
}
