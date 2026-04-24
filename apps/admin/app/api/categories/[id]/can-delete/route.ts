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
 *   200 { canDelete: boolean, productCount: number, childCount: number, reason?: string }
 *
 * @module app/api/categories/[id]/can-delete/route
 */

import { NextRequest, NextResponse } from "next/server";
import { categoryService } from "@/services/categoryService";
import { apiGuard } from "@/lib/apiGuard";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const guard = await apiGuard(request, 'categories');
    if (guard.error) return guard.error;

    const { id } = await params;
    const result = await categoryService.canDeleteCategory(id);
    
    if (!result.success) {
      return NextResponse.json({ 
        canDelete: false, 
        reason: result.error?.message,
        productCount: 0,
        childCount: 0
      });
    }

    return NextResponse.json(result.data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
