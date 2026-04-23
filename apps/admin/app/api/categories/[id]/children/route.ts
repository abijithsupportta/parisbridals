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
 * Responses:
 *   200 { children: Category[], parent: Category, level: "main"|"sub"|"variant" }
 *   404 { error: "Category not found" }
 *   500 { error: string }
 *
 * @module app/api/categories/[id]/children/route
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
    const parentResult = await categoryService.getCategoryById(id);
    if (!parentResult.success || !parentResult.data) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    const childrenResult = await categoryService.getCategoryChildren(id);
    if (!childrenResult.success) {
      return NextResponse.json({ error: childrenResult.error?.message }, { status: 500 });
    }

    return NextResponse.json({ 
      parent: parentResult.data, 
      children: childrenResult.data || [],
      level: parentResult.data.level 
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
