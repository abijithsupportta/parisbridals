/**
 * Products API Route
 *
 * REST API endpoints for product operations.
 * GET /api/products - List products with search and filtering (super_admin, admin, manager)
 * POST /api/products - Create a new product (super_admin, admin, manager)
 *
 * @module app/api/products/route
 */

import { NextRequest, NextResponse } from 'next/server';
import { productService } from '@/services';
import { Product, CreateProductDTO, ProductSearchSchema, CreateProductSchema } from '@/domain';
import { z } from 'zod';
import { apiGuard } from '@/lib/apiGuard';
import { getAuthUser } from '@/lib/auth';

/**
 * GET /api/products
 * 
 * Query parameters:
 * - query: Search query string
 * - category_id: Filter by category
 * - store_id: Filter by store
 * - status: Filter by status (active/inactive)
 * - is_featured: Filter featured products
 * - min_price: Minimum price filter
 * - max_price: Maximum price filter
 * - in_stock: Filter in-stock products
 * - sort_by: Sort field (name/price/created_at/stock)
 * - sort_order: Sort order (asc/desc)
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 */
export async function GET(request: NextRequest) {
  try {
    // Super Admin, Admin, and Manager can view products
    const guard = await apiGuard(request, 'products');
    if (guard.error) return guard.error;

    const { searchParams } = new URL(request.url);
    
    // Parse and validate query parameters
    const params = ProductSearchSchema.parse({
      query: searchParams.get('query') || undefined,
      category_id: searchParams.get('category_id') || undefined,
      store_id: searchParams.get('store_id') || undefined,
      status: searchParams.get('status') || undefined,
      is_featured: searchParams.get('is_featured') === 'true' ? true : 
                   searchParams.get('is_featured') === 'false' ? false : undefined,
      min_price: searchParams.get('min_price') ? 
                parseFloat(searchParams.get('min_price')!) : undefined,
      max_price: searchParams.get('max_price') ? 
                parseFloat(searchParams.get('max_price')!) : undefined,
      in_stock: searchParams.get('in_stock') === 'true' ? true : 
                searchParams.get('in_stock') === 'false' ? false : undefined,
      sort_by: searchParams.get('sort_by') || undefined,
      sort_order: searchParams.get('sort_order') as 'asc' | 'desc' || undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
    });

    const result = await productService.getProducts(params);

    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          message: result.error?.message || 'Failed to fetch products',
          error: result.error 
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      message: 'Products retrieved successfully',
    });

  } catch (error) {
    console.error('Products API - GET Error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Invalid query parameters',
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
 * POST /api/products
 * 
 * Request body: CreateProductDTO
 * 
 * Creates a new product with validation and business logic.
 */
export async function POST(request: NextRequest) {
  try {
    // Super Admin, Admin, and Manager can create products
    const guard = await apiGuard(request, 'products');
    if (guard.error) return guard.error;

    // Get authenticated user for audit fields
    const authUser = await getAuthUser(request);
    
    // Set user context in service
    productService.setUserContext(authUser?.staff_id || null, authUser?.branch_id || null);

    const body = await request.json();
    
    // Validate request body
    const validatedData = CreateProductSchema.parse(body);

    // Convert null values to undefined for type compatibility
    const productData: CreateProductDTO = {
      ...validatedData,
      category_id: validatedData.category_id || undefined,
      subcategory_id: validatedData.subcategory_id || undefined,
      subvariant_id: validatedData.subvariant_id || undefined,
    };

    // Pass user role to service for "all branches" logic
    const result = await productService.createProduct(productData, authUser?.role || 'staff');

    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          message: result.error?.message || 'Failed to create product',
          error: result.error 
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      message: 'Product created successfully',
    }, { status: 201 });

  } catch (error) {
    console.error('Products API - POST Error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Invalid product data',
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
