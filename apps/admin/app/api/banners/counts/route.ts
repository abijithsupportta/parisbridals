/**
 * Banners Counts API
 *
 * GET /api/banners/counts — Get banner counts by type
 *
 * @module app/api/banners/counts/route
 */

import { NextRequest } from "next/server";
import { bannerService } from "@/services/bannerService";
import { apiGuard } from "@/lib/apiGuard";
import { apiSuccess, apiInternalError } from "@/lib/apiResponse";

/** GET /api/banners/counts — get banner counts by type */
export async function GET(request: NextRequest) {
  try {
    const guard = await apiGuard(request, 'banners');
    if (guard.error) return guard.error;

    const heroCount = await bannerService.countBanners({ banner_type: 'hero' as any });
    const editorialCount = await bannerService.countBanners({ banner_type: 'editorial' as any });
    const splitCount = await bannerService.countBanners({ banner_type: 'split' as any });

    if (!heroCount.success || !editorialCount.success || !splitCount.success) {
      return apiInternalError('Failed to fetch banner counts');
    }

    const counts = {
      hero: heroCount.data || 0,
      editorial: editorialCount.data || 0,
      split: splitCount.data || 0,
    };

    return apiSuccess(counts);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return apiInternalError(message);
  }
}
