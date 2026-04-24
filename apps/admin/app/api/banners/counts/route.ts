/**
 * Banners Counts API
 *
 * GET /api/banners/counts — Get banner counts by type
 *
 * Responses:
 *   200 { counts: Record<BannerType, number> }
 *   500 { error }    (server/database failure)
 *
 * @module app/api/banners/counts/route
 */

import { NextRequest, NextResponse } from "next/server";
import { bannerService } from "@/services/bannerService";
import { apiGuard } from "@/lib/apiGuard";

/** GET /api/banners/counts — get banner counts by type */
export async function GET(request: NextRequest) {
  try {
    const guard = await apiGuard(request, 'banners');
    if (guard.error) return guard.error;

    const heroCount = await bannerService.countBanners({ banner_type: 'hero' as any });
    const editorialCount = await bannerService.countBanners({ banner_type: 'editorial' as any });
    const splitCount = await bannerService.countBanners({ banner_type: 'split' as any });

    if (!heroCount.success || !editorialCount.success || !splitCount.success) {
      return NextResponse.json({ error: 'Failed to fetch banner counts' }, { status: 500 });
    }

    const counts = {
      hero: heroCount.data || 0,
      editorial: editorialCount.data || 0,
      split: splitCount.data || 0,
    };

    return NextResponse.json({ counts });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
