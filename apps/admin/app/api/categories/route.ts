/**
 * Categories REST API — Collection Endpoint
 *
 * Routes:
 *   GET  /api/categories       List all categories (super_admin, admin, manager)
 *   POST /api/categories       Create a new category (super_admin, admin, manager)
 *
 * Request body for POST (JSON):
 *   {
 *     name: string              (required)
 *     slug: string              (required, URL-safe)
 *     description?: string | null
 *     image_url?: string | null (R2 public URL)
 *     parent_id?: string | null (UUID of parent category; null for Main)
 *     is_global?: boolean       (default: true)
 *     is_active?: boolean       (default: true)
 *     sort_order?: number       (default: 0)
 *   }
 *
 * Responses (standardised envelope):
 *   200 { success: true, data: Category[] }             (GET)
 *   201 { success: true, data: Category }               (POST)
 *   400 { success: false, error: { message, code } }    (validation failure)
 *   500 { success: false, error: { message, code } }    (server/database failure)
 *
 * @module app/api/categories/route
 */

import { NextRequest } from "next/server";
import type { CreateCategoryDTO } from "@/domain";
import { categoryService } from "@/services/categoryService";
import { apiGuard } from "@/lib/apiGuard";
import { getAuthUser } from "@/lib/auth";
import { apiSuccess, apiRepositoryError, apiInternalError } from "@/lib/apiResponse";

const CREATE_FIELDS = [
  'name',
  'slug',
  'description',
  'image_url',
  'parent_id',
  'sort_order',
  'is_active',
  'is_global',
  'store_id',
] as const;

function pickCategoryFields(body: Record<string, unknown>) {
  return Object.fromEntries(
    CREATE_FIELDS
      .filter((field) => Object.prototype.hasOwnProperty.call(body, field))
      .map((field) => [field, body[field]])
  );
}

/** GET /api/categories — list all categories */
export async function GET(request: NextRequest) {
  try {
    // Super Admin, Admin, and Manager can view categories
    const guard = await apiGuard(request, 'categories');
    if (guard.error) return guard.error;

    const result = await categoryService.getAllCategories();
    console.log("[API /api/categories] Result:", JSON.stringify({ success: result.success, count: result.data?.length }));
    if (!result.success) {
      return apiRepositoryError(result.error, 'Failed to fetch categories');
    }
    return apiSuccess(result.data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return apiInternalError(message);
  }
}

/** POST /api/categories — create a new category */
export async function POST(request: NextRequest) {
  try {
    // Super Admin, Admin, and Manager can create categories
    const guard = await apiGuard(request, 'categories');
    if (guard.error) return guard.error;

    // Get authenticated user for audit fields
    const authUser = await getAuthUser(request);
    
    // Set user context in service
    categoryService.setUserContext(
      authUser?.staff_id || null, 
      authUser?.branch_id || null, 
      authUser?.store_id || null
    );

    const body = pickCategoryFields(await request.json()) as unknown as CreateCategoryDTO;

    const result = await categoryService.createCategory(body);
    if (!result.success) {
      return apiRepositoryError(result.error, 'Failed to create category');
    }
    return apiSuccess(result.data, { status: 201, message: 'Category created successfully' });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return apiInternalError(message);
  }
}
