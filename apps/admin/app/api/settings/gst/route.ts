/**
 * Settings REST API — GST Configuration
 *
 * Routes:
 *   GET    /api/settings/gst   Get current GST percentage
 *   PATCH  /api/settings/gst   Update GST percentage (superadmin only)
 *
 * @module app/api/settings/gst/route
 */

import { NextRequest } from "next/server";
import { settingsService } from "@/services/settingsService";
import { apiGuard } from "@/lib/apiGuard";
import { getAuthUser } from "@/lib/auth";
import { apiSuccess, apiRepositoryError, apiBadRequest, apiForbidden, apiInternalError } from "@/lib/apiResponse";

/** GET /api/settings/gst — get current GST percentage */
export async function GET(request: NextRequest) {
  try {
    const guard = await apiGuard(request, 'settings');
    if (guard.error) return guard.error;

    const result = await settingsService.getGSTPercentage();
    if (!result.success) {
      return apiRepositoryError(result.error, 'Failed to fetch GST percentage');
    }
    return apiSuccess({ percentage: result.data });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return apiInternalError(message);
  }
}

/** PATCH /api/settings/gst — update GST percentage */
export async function PATCH(request: NextRequest) {
  try {
    const guard = await apiGuard(request, 'settings');
    if (guard.error) return guard.error;

    // Check if user is superadmin
    const authUser = await getAuthUser(request);
    if (!authUser || authUser.role !== 'admin') {
      return apiForbidden('Only superadmin can update GST settings');
    }

    const body = await request.json();
    const { percentage } = body;

    if (typeof percentage !== 'number') {
      return apiBadRequest('Percentage must be a number');
    }

    settingsService.setUserContext(authUser?.staff_id || null, authUser?.branch_id || null);
    const result = await settingsService.setGSTPercentage(percentage);
    
    if (!result.success || !result.data) {
      return apiRepositoryError(result.error, 'Failed to update GST percentage');
    }
    return apiSuccess({ percentage: parseFloat(result.data.value) }, { message: 'GST percentage updated' });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return apiInternalError(message);
  }
}
