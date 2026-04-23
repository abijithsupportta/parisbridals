/**
 * Settings REST API — GST Configuration
 *
 * Routes:
 *   GET    /api/settings/gst   Get current GST percentage
 *   PATCH  /api/settings/gst   Update GST percentage (superadmin only)
 *
 * PATCH body (JSON): { percentage: number }
 *
 * Responses:
 *   200 { percentage: number }
 *   400 { error }    (invalid payload)
 *   403 { error }    (not authorized - superadmin only)
 *   500 { error }    (server/database failure)
 *
 * @module app/api/settings/gst/route
 */

import { NextRequest, NextResponse } from "next/server";
import { settingsService } from "@/services/settingsService";
import { apiGuard } from "@/lib/apiGuard";
import { getAuthUser } from "@/lib/auth";

/** GET /api/settings/gst — get current GST percentage */
export async function GET(request: NextRequest) {
  try {
    const guard = await apiGuard(request, 'settings');
    if (guard.error) return guard.error;

    const result = await settingsService.getGSTPercentage();
    if (!result.success) {
      return NextResponse.json({ error: result.error?.message }, { status: 500 });
    }
    return NextResponse.json({ percentage: result.data });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
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
      return NextResponse.json({ error: 'Only superadmin can update GST settings' }, { status: 403 });
    }

    const body = await request.json();
    const { percentage } = body;

    if (typeof percentage !== 'number') {
      return NextResponse.json({ error: 'Percentage must be a number' }, { status: 400 });
    }

    settingsService.setUserContext(authUser?.staff_id || null, authUser?.branch_id || null);
    const result = await settingsService.setGSTPercentage(percentage);
    
    if (!result.success || !result.data) {
      return NextResponse.json({ error: result.error?.message }, { status: 400 });
    }
    return NextResponse.json({ percentage: parseFloat(result.data.value) });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
