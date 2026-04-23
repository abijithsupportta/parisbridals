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

import { NextResponse } from "next/server";
import {
  getCategoryById,
  getCategoryChildren,
  getCategories,
  getCategoryLevel,
} from "@/lib/supabase/categories";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const parent = await getCategoryById(id);
    if (!parent) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    const [children, all] = await Promise.all([
      getCategoryChildren(id),
      getCategories(),
    ]);
    const level = getCategoryLevel(parent, all);

    return NextResponse.json({ parent, children, level });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
