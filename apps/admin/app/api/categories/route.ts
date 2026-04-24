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
 * Responses:
 *   200 { categories: Category[] }      (GET)
 *   201 { category: Category }          (POST)
 *   400 { error: string }               (validation failure)
 *   500 { error: string }               (server/database failure)
 *
 * @module app/api/categories/route
 */

import { NextRequest, NextResponse } from "next/server";
import { categoryService } from "@/services/categoryService";
import { apiGuard } from "@/lib/apiGuard";
import { getAuthUser } from "@/lib/auth";

/** GET /api/categories — list all categories */
export async function GET(request: NextRequest) {
  try {
    // Super Admin, Admin, and Manager can view categories
    const guard = await apiGuard(request, 'categories');
    if (guard.error) return guard.error;

    const result = await categoryService.getAllCategories();
    if (!result.success) {
      return NextResponse.json(
        { error: result.error?.message || 'Failed to fetch categories' },
        { status: 400 }
      );
    }
    return NextResponse.json({ categories: result.data });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
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

    const body = await request.json();

    const result = await categoryService.createCategory(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error?.message || 'Failed to create category' },
        { status: 400 }
      );
    }
    return NextResponse.json({ category: result.data }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
