/**
 * Banners Reorder API
 * POST /api/banners/reorder — bulk update banner priorities or positions
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

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
