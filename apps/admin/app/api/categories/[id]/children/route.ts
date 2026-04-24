/**
 * Categories REST API — Children Endpoint
 *
 * Route: GET /api/categories/:id/children
 *
 * Returns the direct children of the given category:
 *   - Main category  → sub categories
 *   - Sub category   → variants
 *   - Variant        → [] (variants are leaf nodes)
 *
 * Response:
 *   200 { success: true, data: { children, parent, level } }
 *   404 { success: false, error: { message, code: "NOT_FOUND" } }
 *
 * @module app/api/categories/[id]/children/route
 */

import { NextRequest } from "next/server";
import { categoryService } from "@/services/categoryService";
import { apiGuard } from "@/lib/apiGuard";
import { apiSuccess, apiNotFound, apiInternalError } from "@/lib/apiResponse";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const guard = await apiGuard(request, 'categories');
    if (guard.error) return guard.error;

    const { id } = await params;
    const parentResult = await categoryService.getCategoryById(id);
    if (!parentResult.success || !parentResult.data) {
      return apiNotFound('Category');
    }

    const childrenResult = await categoryService.getCategoryChildren(id);
    if (!childrenResult.success) {
      return apiInternalError(childrenResult.error?.message || 'Failed to fetch children');
    }

    return apiSuccess({ 
      parent: parentResult.data, 
      children: childrenResult.data || [],
      level: parentResult.data.level 
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return apiInternalError(message);
  }
}
