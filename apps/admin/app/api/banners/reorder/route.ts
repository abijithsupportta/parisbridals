/**
 * Banners Reorder API
 * POST /api/banners/reorder — bulk update banner priorities or positions
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

    // Update each banner's priority or position
    for (const banner of banners) {
      const updateData: any = {};
      if (banner.priority !== undefined) {
        updateData.priority = banner.priority;
      }
      if (banner.position !== undefined) {
        updateData.position = banner.position;
      }
      if (Object.keys(updateData).length > 0) {
        await bannerService.updateBanner(banner.id, updateData);
      }
    }

    return apiSuccess(null, { message: 'Banner order updated successfully' });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return apiInternalError(message);
  }
}
