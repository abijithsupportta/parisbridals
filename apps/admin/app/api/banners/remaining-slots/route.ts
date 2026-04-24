/**
 * Banners Remaining Slots API
 *
 * GET /api/banners/remaining-slots — Get remaining slots by type
 *
 * Responses:
 *   200 { remainingSlots: Record<BannerType, number> }
 *   500 { error }    (server/database failure)
 *
 * @module app/api/banners/remaining-slots/route
 */

import { NextRequest, NextResponse } from "next/server";
import { bannerService } from "@/services/bannerService";
import { apiGuard } from "@/lib/apiGuard";

/** GET /api/banners/remaining-slots — get remaining slots by type */
export async function GET(request: NextRequest) {
  try {
    const guard = await apiGuard(request, 'banners');
    if (guard.error) return guard.error;

    const result = await bannerService.getRemainingSlots();

    if (!result.success) {
      return NextResponse.json({ error: result.error?.message }, { status: 500 });
    }

    return NextResponse.json({ remainingSlots: result.data });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
