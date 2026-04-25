/**
 * Products API Route
 *
 * REST API endpoints for product operations.
 * GET /api/products - List products with search and filtering (super_admin, admin, manager)
 * POST /api/products - Create a new product (super_admin, admin, manager)
 *
 * @module app/api/products/route
 */

import { NextRequest } from 'next/server';
import { productService } from '@/services';
import { CreateProductDTO, ProductSearchSchema, ClientCreateProductSchema } from '@/domain';
import { z } from 'zod';
import { apiGuard } from '@/lib/apiGuard';
import { getAuthUser } from '@/lib/auth';
import { apiSuccess, apiRepositoryError, apiZodError, apiInternalError, apiBadRequest } from '@/lib/apiResponse';

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
      branch_id: searchParams.get('branch_id') || undefined,
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
      return apiRepositoryError(result.error, 'Failed to fetch products');
    }

    return apiSuccess(result.data);

  } catch (error) {
    console.error('Products API - GET Error:', error);
    
    if (error instanceof z.ZodError) {
      return apiZodError(error);
    }

    return apiInternalError();
  }
}

/**
 * POST /api/products
 * 
 * Request body: ClientCreateProductInput (no store_id required)
 * 
 * The server injects store_id from the authenticated session cookie.
 * This implements Server-Authoritative Identity Injection (Zero-Trust):
 * the client can never influence which store a product belongs to.
 */
export async function POST(request: NextRequest) {
  try {
    // Super Admin, Admin, and Manager can create products
    const guard = await apiGuard(request, 'products');
    if (guard.error) return guard.error;

    // ── Step 1: Extract identity from encrypted auth cookie ──────────
    // This is the Zero-Trust layer. We NEVER trust JSON body for identity.
    const authUser = await getAuthUser(request);
    
    // Reject early if we cannot determine store context
    if (!authUser?.store_id) {
      return apiBadRequest('Cannot determine store context. Please log out and log back in.');
    }

    // Set user context in service for audit fields
    productService.setUserContext(
      authUser.staff_id, 
      authUser.branch_id, 
      authUser.store_id
    );

    // ── Step 2: Validate client input using CLIENT schema ───────────
    // ClientCreateProductSchema has NO store_id — the client doesn't
    // need to know about it. This is Boundary Separation in action.
    const body = await request.json();
    const clientInput = ClientCreateProductSchema.parse(body);

    // ── Step 3: Merge server context into validated data ─────────────
    // The server forcefully injects store_id from the auth cookie.
    // Even if a malicious client tried to send store_id, it's ignored
    // because ClientCreateProductSchema strips unknown fields.
    const productData: CreateProductDTO = {
      ...clientInput,
      store_id: authUser.store_id,
      category_id: clientInput.category_id || undefined,
      subcategory_id: clientInput.subcategory_id || undefined,
      subvariant_id: clientInput.subvariant_id || undefined,
    };

    // ── Step 4: Execute business logic ──────────────────────────────
    const result = await productService.createProduct(productData, authUser.role || 'staff');

    if (!result.success) {
      return apiRepositoryError(result.error, 'Failed to create product');
    }

    return apiSuccess(result.data, { status: 201, message: 'Product created successfully' });

  } catch (error) {
    console.error('Products API - POST Error:', error);
    
    if (error instanceof z.ZodError) {
      return apiZodError(error);
    }

    return apiInternalError();
  }
}
