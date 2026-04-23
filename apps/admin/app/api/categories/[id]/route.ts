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

import { NextResponse } from "next/server";
import {
  getCategoryById,
  updateCategory,
  deleteCategory,
  canDeleteCategory,
  type CategoryUpdateInput,
} from "@/lib/supabase/categories";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** GET /api/categories/:id — fetch one category */
export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const category = await getCategoryById(id);
    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }
    return NextResponse.json({ category });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** PATCH /api/categories/:id — update a category */
export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Whitelist only allowed fields to prevent malicious field injection
    const allowedKeys: (keyof CategoryUpdateInput)[] = [
      "name",
      "slug",
      "description",
      "image_url",
      "parent_id",
      "store_id",
      "is_global",
      "is_active",
      "sort_order",
    ];

    const input: CategoryUpdateInput = {};
    for (const key of allowedKeys) {
      if (key in body) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (input as any)[key] = body[key];
      }
    }

    if (Object.keys(input).length === 0) {
      return NextResponse.json(
        { error: "No valid fields provided for update" },
        { status: 400 }
      );
    }

    const category = await updateCategory(id, input);
    return NextResponse.json({ category });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** DELETE /api/categories/:id — delete a category with safety check */
export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;

    // Safety check: ensure no linked products and no child categories
    const check = await canDeleteCategory(id);
    if (!check.canDelete) {
      return NextResponse.json(
        {
          error: check.reason ?? "Cannot delete this category",
          productCount: check.productCount,
          childCount: check.childCount,
        },
        { status: 409 }
      );
    }

    await deleteCategory(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
