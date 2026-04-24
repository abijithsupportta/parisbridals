/**
 * Banners Remaining Slots API
 *
 * GET /api/banners/remaining-slots — Get remaining slots by type
 *
 * @module app/api/banners/remaining-slots/route
 */

import { NextRequest } from "next/server";
import { bannerService } from "@/services/bannerService";
import { apiGuard } from "@/lib/apiGuard";
import { apiSuccess, apiInternalError, apiRepositoryError } from "@/lib/apiResponse";

/** GET /api/banners/remaining-slots — get remaining slots by type */
export async function GET(request: NextRequest) {
  try {
    const guard = await apiGuard(request, 'banners');
    if (guard.error) return guard.error;

    const result = await bannerService.getRemainingSlots();

    if (!result.success) {
      return apiRepositoryError(result.error, 'Failed to fetch remaining slots');
    }

    return apiSuccess(result.data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return apiInternalError(message);
  }
}
