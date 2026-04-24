/**
 * Banners REST API — Collection Endpoint
 *
 * Routes:
 *   GET    /api/banners           Fetch all banners
 *   POST   /api/banners           Create a new banner
 *   GET    /api/banners/counts    Get banner counts by type
 *   GET    /api/banners/remaining-slots  Get remaining slots by type
 *
 * GET Query Params:
 *   - is_active: boolean (optional)
 *   - redirect_type: string (optional)
 *   - banner_type: string (optional)
 *   - limit: number (optional)
 *   - offset: number (optional)
 *
 * POST body (JSON): CreateBannerDTO
 *
 * Responses:
 *   200 { banners: Banner[] } | { banner: Banner } | { counts: Record<BannerType, number> } | { remainingSlots: Record<BannerType, number> }
 *   400 { error }    (invalid payload)
 *   409 { error }    (limit exceeded)
 *   500 { error }    (server/database failure)
 *
 * @module app/api/banners/route
 */

import { NextRequest } from "next/server";
import { bannerService } from "@/services/bannerService";
import { apiGuard } from "@/lib/apiGuard";
import { getAuthUser } from "@/lib/auth";
import { apiSuccess, apiRepositoryError, apiInternalError } from "@/lib/apiResponse";

/** GET /api/banners — fetch all banners */
export async function GET(request: NextRequest) {
  try {
    const guard = await apiGuard(request, 'banners');
    if (guard.error) return guard.error;

    const searchParams = request.nextUrl.searchParams;
    const params = {
      is_active: searchParams.get('is_active') === 'true' ? true :
                 searchParams.get('is_active') === 'false' ? false : undefined,
      redirect_type: searchParams.get('redirect_type') as any || undefined,
      banner_type: searchParams.get('banner_type') as any || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined,
    };

    const result = await bannerService.getAllBanners(params);
    if (!result.success) {
      return apiRepositoryError(result.error, 'Failed to fetch banners');
    }
    return apiSuccess(result.data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return apiInternalError(message);
  }
}

/** POST /api/banners — create a new banner */
export async function POST(request: NextRequest) {
  try {
    const guard = await apiGuard(request, 'banners');
    if (guard.error) return guard.error;

    const authUser = await getAuthUser(request);
    bannerService.setUserContext(
      authUser?.staff_id || null, 
      authUser?.branch_id || null, 
      authUser?.store_id || null
    );

    const body = await request.json();
    const result = await bannerService.createBanner(body);

    if (!result.success) {
      return apiRepositoryError(result.error, 'Failed to create banner');
    }
    return apiSuccess(result.data, { status: 201, message: 'Banner created successfully' });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return apiInternalError(message);
  }
}
