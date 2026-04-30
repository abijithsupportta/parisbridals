/**
 * Categories REST API — Single Resource Endpoint
 *
 * Routes:
 *   GET    /api/categories/:id   Fetch one category by id
 *   PATCH  /api/categories/:id   Update a category (admin, bypasses RLS)
 *   DELETE /api/categories/:id   Delete a category (admin, enforces safety check)
 *
 * PATCH body (JSON): any subset of CategoryUpdateInput fields.
 *
 * Safety check on DELETE:
 *   - Refuses to delete if any products reference the category
 *     via category_id, subcategory_id, or subvariant_id.
 *   - Refuses to delete if any child categories are nested under it.
 *
 * Responses (standardised envelope):
 *   200 { success: true, data: Category }
 *   400 { success: false, error: { message, code } }
 *   404 { success: false, error: { message, code: "NOT_FOUND" } }
 *   409 { success: false, error: { message, code: "CANNOT_DELETE", details } }
 *   500 { success: false, error: { message, code } }
 *
 * @module app/api/categories/[id]/route
 */

import { NextRequest } from "next/server";
import type { UpdateCategoryDTO } from "@/domain";
import { categoryService } from "@/services/categoryService";
import { apiGuard } from "@/lib/apiGuard";
import { getAuthUser } from "@/lib/auth";
import { apiSuccess, apiRepositoryError, apiNotFound, apiInternalError } from "@/lib/apiResponse";

const UPDATE_FIELDS = [
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
    UPDATE_FIELDS
      .filter((field) => Object.prototype.hasOwnProperty.call(body, field))
      .map((field) => [field, body[field]])
  );
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** GET /api/categories/:id — fetch one category */
export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const guard = await apiGuard(request, 'categories');
    if (guard.error) return guard.error;

    const { id } = await params;
    const result = await categoryService.getCategoryById(id);
    if (!result.success || !result.data) {
      return apiNotFound('Category');
    }
    return apiSuccess(result.data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return apiInternalError(message);
  }
}

/** PATCH /api/categories/:id — update a category */
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const guard = await apiGuard(request, 'categories');
    if (guard.error) return guard.error;

    const authUser = await getAuthUser(request);
    categoryService.setUserContext(authUser?.staff_id || null, authUser?.branch_id || null);

    const { id } = await params;
    const body = pickCategoryFields(await request.json()) as UpdateCategoryDTO;

    const result = await categoryService.updateCategory(id, body);
    if (!result.success) {
      return apiRepositoryError(result.error, 'Failed to update category');
    }
    return apiSuccess(result.data, { message: 'Category updated successfully' });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return apiInternalError(message);
  }
}

/** DELETE /api/categories/:id — delete a category with safety check */
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const guard = await apiGuard(request, 'categories');
    if (guard.error) return guard.error;

    const authUser = await getAuthUser(request);
    categoryService.setUserContext(authUser?.staff_id || null, authUser?.branch_id || null);

    const { id } = await params;

    const result = await categoryService.deleteCategory(id);
    if (!result.success) {
      return apiRepositoryError(result.error, 'Failed to delete category');
    }
    return apiSuccess(null, { message: 'Category deleted successfully' });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return apiInternalError(message);
  }
}
