/**
 * Categories REST API — Pre-Delete Safety Check
 *
 * Route: GET /api/categories/:id/can-delete
 *
 * Reports whether a category can be safely deleted.
 * Used by the admin UI to show a confirmation dialog with context
 * before calling DELETE /api/categories/:id.
 *
 * Response:
 *   200 { success: true, data: { canDelete, productCount, childCount, reason? } }
 *
 * @module app/api/categories/[id]/can-delete/route
 */

import { NextRequest } from "next/server";
import { categoryService } from "@/services/categoryService";
import { apiGuard } from "@/lib/apiGuard";
import { apiSuccess, apiInternalError } from "@/lib/apiResponse";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const guard = await apiGuard(request, 'categories');
    if (guard.error) return guard.error;

    const { id } = await params;
    const result = await categoryService.canDeleteCategory(id);
    
    if (!result.success || !result.data) {
      return apiSuccess({
        canDelete: false,
        reason: result.error?.message || 'Unable to verify delete safety',
        productCount: 0,
        childCount: 0,
      });
    }

    return apiSuccess({
      canDelete: result.data.canDelete,
      reason: result.data.reason,
      productCount: result.data.relatedData?.productCount ?? 0,
      childCount: result.data.relatedData?.childCount ?? 0,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return apiInternalError(message);
  }
}
