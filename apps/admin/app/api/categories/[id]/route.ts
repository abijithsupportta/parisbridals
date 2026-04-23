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
 * Responses:
 *   200 { category } | { success: true }
 *   400 { error }    (invalid id / payload)
 *   404 { error }    (not found)
 *   409 { error, reason, productCount, childCount }  (delete blocked by safety check)
 *   500 { error }    (server/database failure)
 *
 * @module app/api/categories/[id]/route
 */

import { NextRequest, NextResponse } from "next/server";
import { categoryService } from "@/services/categoryService";
import { apiGuard } from "@/lib/apiGuard";
import { getAuthUser } from "@/lib/auth";

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
      return NextResponse.json({ error: result.error?.message || "Category not found" }, { status: 404 });
    }
    return NextResponse.json({ category: result.data });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
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
    const body = await request.json();

    const result = await categoryService.updateCategory(id, body);
    if (!result.success) {
      return NextResponse.json({ error: result.error?.message }, { status: 400 });
    }
    return NextResponse.json({ category: result.data });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
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
      const error = result.error as any;
      if (error.code === 'CANNOT_DELETE') {
        return NextResponse.json(
          {
            error: error.message,
            productCount: error.details?.productCount || 0,
            childCount: error.details?.childCount || 0,
          },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
