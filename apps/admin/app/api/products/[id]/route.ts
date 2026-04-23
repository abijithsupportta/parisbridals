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

import { NextRequest, NextResponse } from 'next/server';
import { Product, CreateProductDTO, UpdateProductDTO, ProductSearchSchema, CreateProductSchema, UpdateProductSchema } from '@/domain';
import { productService } from '@/services';
import { z } from 'zod';

/**
 * GET /api/products/[id]
 * 
 * Path parameters:
 * - id: Product ID
 * 
 * Returns a single product with relations.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate ID format
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Invalid product ID' 
        },
        { status: 400 }
      );
    }

    const result = await productService.getProductById(id);

    if (!result.success) {
      const status = result.error?.code === 'PRODUCT_NOT_FOUND' ? 404 : 500;
      return NextResponse.json(
        { 
          success: false, 
          message: result.error?.message || 'Failed to fetch product',
          error: result.error 
        },
        { status }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      message: 'Product retrieved successfully',
    });

  } catch (error) {
    console.error('Product API - GET Error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/products/[id]
 * 
 * Path parameters:
 * - id: Product ID
 * 
 * Request body: UpdateProductDTO
 * 
 * Updates an existing product with validation.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validate ID format
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Invalid product ID' 
        },
        { status: 400 }
      );
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
      const status = result.error?.code === 'PRODUCT_NOT_FOUND' ? 404 : 400;
      return NextResponse.json(
        { 
          success: false, 
          message: result.error?.message || 'Failed to update product',
          error: result.error 
        },
        { status }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      message: 'Product updated successfully',
    });

  } catch (error) {
    console.error('Product API - PATCH Error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Invalid request body',
          errors: error.issues.reduce((acc, issue) => {
            acc[issue.path.join('.')] = issue.message;
            return acc;
          }, {} as Record<string, string>) 
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/products/[id]
 * 
 * Path parameters:
 * - id: Product ID
 * 
 * Deletes a product with safety checks.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate ID format
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Invalid product ID' 
        },
        { status: 400 }
      );
    }

    const result = await productService.deleteProduct(id);

    if (!result.success) {
      const status = result.error?.code === 'PRODUCT_NOT_FOUND' ? 404 : 
                    result.error?.code === 'CANNOT_DELETE' ? 409 : 500;
      return NextResponse.json(
        { 
          success: false, 
          message: result.error?.message || 'Failed to delete product',
          error: result.error 
        },
        { status }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Product deleted successfully',
    });

  } catch (error) {
    console.error('Product API - DELETE Error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
