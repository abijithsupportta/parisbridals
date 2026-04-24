/**
 * Banners Reorder API
 * POST /api/banners/reorder — bulk update banner priorities
 */

import { NextRequest } from "next/server";
import { bannerService } from "@/services/bannerService";
import { apiGuard } from "@/lib/apiGuard";
import { getAuthUser } from "@/lib/auth";
import { apiSuccess, apiBadRequest, apiInternalError } from "@/lib/apiResponse";

export async function POST(request: NextRequest) {
  try {
    const guard = await apiGuard(request, 'banners');
    if (guard.error) return guard.error;

    const authUser = await getAuthUser(request);
    bannerService.setUserContext(authUser?.staff_id || null, authUser?.branch_id || null);

    const { banners } = await request.json();
    
    if (!Array.isArray(banners)) {
      return apiBadRequest('Invalid payload — banners must be an array');
    }

    // Update each banner's priority
    for (const banner of banners) {
      await bannerService.updateBanner(banner.id, { priority: banner.priority });
    }

    return apiSuccess(null, { message: 'Banner order updated successfully' });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return apiInternalError(message);
  }
}
