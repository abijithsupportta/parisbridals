/**
 * Categories REST API — Collection Endpoint
 *
 * Routes:
 *   GET  /api/categories       List all categories (anon, read-only, RLS-gated)
 *   POST /api/categories       Create a new category (admin, bypasses RLS)
 *
 * Request body for POST (JSON):
 *   {
 *     name: string              (required)
 *     slug: string              (required, URL-safe)
 *     description?: string | null
 *     image_url?: string | null (R2 public URL)
 *     parent_id?: string | null (UUID of parent category; null for Main)
 *     store_id?: string | null  (UUID of store; null for global)
 *     is_global?: boolean       (default: false)
 *     is_active?: boolean       (default: true)
 *     sort_order?: number       (default: 0)
 *   }
 *
 * Responses:
 *   200 { categories: Category[] }      (GET)
 *   201 { category: Category }          (POST)
 *   400 { error: string }               (validation failure)
 *   500 { error: string }               (server/database failure)
 *
 * @module app/api/categories/route
 */

import { NextResponse } from "next/server";
import {
  getCategories,
  createCategory,
  type CategoryCreateInput,
} from "@/lib/supabase/categories";

/** GET /api/categories — list all categories */
export async function GET() {
  try {
    const categories = await getCategories();
    return NextResponse.json({ categories });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** POST /api/categories — create a new category */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.name || typeof body.name !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'name' field (string required)" },
        { status: 400 }
      );
    }
    if (!body.slug || typeof body.slug !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'slug' field (string required)" },
        { status: 400 }
      );
    }

    // Coerce into strict input shape with sensible defaults
    const input: CategoryCreateInput = {
      name: body.name,
      slug: body.slug,
      description: body.description ?? null,
      image_url: body.image_url ?? null,
      parent_id: body.parent_id ?? null,
      store_id: body.store_id ?? null,
      is_global: body.is_global ?? false,
      is_active: body.is_active ?? true,
      sort_order: typeof body.sort_order === "number" ? body.sort_order : 0,
    };

    const category = await createCategory(input);
    return NextResponse.json({ category }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
