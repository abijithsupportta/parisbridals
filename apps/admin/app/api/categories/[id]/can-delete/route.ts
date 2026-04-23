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

import { NextResponse } from "next/server";
import { canDeleteCategory } from "@/lib/supabase/categories";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const result = await canDeleteCategory(id);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
