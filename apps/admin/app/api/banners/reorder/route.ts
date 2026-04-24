/**
 * Banners Reorder API
 * POST /api/banners/reorder — bulk update banner priorities
 */

import { NextRequest, NextResponse } from "next/server";
import { bannerService } from "@/services/bannerService";
import { apiGuard } from "@/lib/apiGuard";
import { getAuthUser } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const guard = await apiGuard(request, 'banners');
    if (guard.error) return guard.error;

    const authUser = await getAuthUser(request);
    bannerService.setUserContext(authUser?.staff_id || null, authUser?.branch_id || null);

    const { banners } = await request.json();
    
    if (!Array.isArray(banners)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Update each banner's priority
    for (const banner of banners) {
      await bannerService.updateBanner(banner.id, { priority: banner.priority });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
