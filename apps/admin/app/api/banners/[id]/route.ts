/**
 * Banners REST API — Single Resource Endpoint
 *
 * Routes:
 *   GET    /api/banners/:id   Fetch one banner by id
 *   PATCH  /api/banners/:id   Update a banner
 *   DELETE /api/banners/:id   Delete a banner
 *
 * PATCH body (JSON): any subset of UpdateBannerDTO fields.
 *
 * Responses:
 *   200 { banner } | { success: true }
 *   400 { error }    (invalid id / payload)
 *   404 { error }    (not found)
 *   500 { error }    (server/database failure)
 *
 * @module app/api/banners/[id]/route
 */

import { NextRequest, NextResponse } from "next/server";
import { bannerService } from "@/services/bannerService";
import { apiGuard } from "@/lib/apiGuard";
import { getAuthUser } from "@/lib/auth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** GET /api/banners/:id — fetch one banner */
export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const guard = await apiGuard(request, 'banners');
    if (guard.error) return guard.error;

    const { id } = await params;
    const result = await bannerService.getBannerById(id);
    if (!result.success || !result.data) {
      return NextResponse.json({ error: result.error?.message || "Banner not found" }, { status: 404 });
    }
    return NextResponse.json({ banner: result.data });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** PATCH /api/banners/:id — update a banner */
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const guard = await apiGuard(request, 'banners');
    if (guard.error) return guard.error;

    const authUser = await getAuthUser(request);
    bannerService.setUserContext(authUser?.staff_id || null, authUser?.branch_id || null);

    const { id } = await params;
    const body = await request.json();

    const result = await bannerService.updateBanner(id, body);
    if (!result.success) {
      const statusCode = result.error?.code === 'LIMIT_EXCEEDED' || result.error?.code === 'POSITION_TAKEN' ? 409 : 400;
      return NextResponse.json({ error: result.error?.message }, { status: statusCode });
    }
    return NextResponse.json({ banner: result.data });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** DELETE /api/banners/:id — delete a banner */
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const guard = await apiGuard(request, 'banners');
    if (guard.error) return guard.error;

    const authUser = await getAuthUser(request);
    bannerService.setUserContext(authUser?.staff_id || null, authUser?.branch_id || null);

    const { id } = await params;

    const result = await bannerService.deleteBanner(id);
    if (!result.success) {
      return NextResponse.json({ error: result.error?.message }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
