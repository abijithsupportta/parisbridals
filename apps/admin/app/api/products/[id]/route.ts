/**
 * Product API Route
 *
 * REST API endpoints for individual product operations.
 * GET /api/products/[id] - Get a single product
 * PATCH /api/products/[id] - Update a product
 * DELETE /api/products/[id] - Delete a product
 *
 * @module app/api/products/[id]/route
 */

import { NextRequest } from 'next/server';
import { CreateProductDTO, UpdateProductDTO, UpdateProductSchema } from '@/domain';
import { productService } from '@/services';
import { z } from 'zod';
import { apiSuccess, apiRepositoryError, apiBadRequest, apiZodError, apiInternalError } from '@/lib/apiResponse';

/**
 * GET /api/products/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || typeof id !== 'string') {
      return apiBadRequest('Invalid product ID');
    }

    const result = await productService.getProductById(id);

    if (!result.success) {
      return apiRepositoryError(result.error, 'Failed to fetch product');
    }

    return apiSuccess(result.data);

  } catch (error) {
    console.error('Product API - GET Error:', error);
    return apiInternalError();
  }
}

/**
 * PATCH /api/products/[id]
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!id || typeof id !== 'string') {
      return apiBadRequest('Invalid product ID');
    }

    // Validate request body
    const validatedData = UpdateProductSchema.parse(body);

    // Convert null values to undefined for type compatibility
    const updateData: UpdateProductDTO = {
      ...validatedData,
      category_id: validatedData.category_id === null ? null : validatedData.category_id || undefined,
      subcategory_id: validatedData.subcategory_id === null ? null : validatedData.subcategory_id || undefined,
      subvariant_id: validatedData.subvariant_id === null ? null : validatedData.subvariant_id || undefined,
    };

    const result = await productService.updateProduct(id, updateData);

    if (!result.success) {
      return apiRepositoryError(result.error, 'Failed to update product');
    }

    return apiSuccess(result.data, { message: 'Product updated successfully' });

  } catch (error) {
    console.error('Product API - PATCH Error:', error);
    
    if (error instanceof z.ZodError) {
      return apiZodError(error);
    }

    return apiInternalError();
  }
}

/**
 * DELETE /api/products/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || typeof id !== 'string') {
      return apiBadRequest('Invalid product ID');
    }

    const result = await productService.deleteProduct(id);

    if (!result.success) {
      return apiRepositoryError(result.error, 'Failed to delete product');
    }

    return apiSuccess(null, { message: 'Product deleted successfully' });

  } catch (error) {
    console.error('Product API - DELETE Error:', error);
    return apiInternalError();
  }
}
