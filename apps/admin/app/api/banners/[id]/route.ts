/**
 * Banners REST API — Single Resource Endpoint
 *
 * Routes:
 *   GET    /api/banners/:id   Fetch one banner by id
 *   PATCH  /api/banners/:id   Update a banner
 *   DELETE /api/banners/:id   Delete a banner
 *
 * @module app/api/banners/[id]/route
 */

import { NextRequest } from "next/server";
import { bannerService } from "@/services/bannerService";
import { apiGuard } from "@/lib/apiGuard";
import { getAuthUser } from "@/lib/auth";
import { apiSuccess, apiRepositoryError, apiNotFound, apiInternalError } from "@/lib/apiResponse";

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
      return apiNotFound('Banner');
    }
    return apiSuccess(result.data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return apiInternalError(message);
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
      return apiRepositoryError(result.error, 'Failed to update banner');
    }
    return apiSuccess(result.data, { message: 'Banner updated successfully' });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return apiInternalError(message);
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
      return apiRepositoryError(result.error, 'Failed to delete banner');
    }
    return apiSuccess(null, { message: 'Banner deleted successfully' });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return apiInternalError(message);
  }
}
