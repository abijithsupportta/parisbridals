/**
 * Product Barcode Lookup API
 *
 * GET /api/products/by-barcode?code=XXXXX
 *
 * Looks up a product by its barcode value.
 * Used by the barcode scanner in order forms.
 *
 * @module app/api/products/by-barcode/route
 */

import { NextRequest } from 'next/server';
import { productService } from '@/services';
import { apiGuard } from '@/lib/apiGuard';
import { apiSuccess, apiBadRequest, apiInternalError } from '@/lib/apiResponse';
import { NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const guard = await apiGuard(request, 'products');
    if (guard.error) return guard.error;

    const code = request.nextUrl.searchParams.get('code');

    if (!code || code.trim().length === 0) {
      return apiBadRequest('Barcode code is required');
    }

    const result = await productService.getProductByBarcode(code.trim());

    if (!result.success || !result.data) {
      return NextResponse.json(
        { success: false, error: 'Product not available' },
        { status: 404 }
      );
    }

    return apiSuccess(result.data);
  } catch (error) {
    console.error('Product barcode lookup error:', error);
    return apiInternalError();
  }
}
