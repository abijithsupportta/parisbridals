/**
 * Orders REST API — Deposit Return
 *
 * Routes:
 *   PATCH  /api/orders/:id/deposit   Mark deposit as returned
 *
 * Responses:
 *   200 { order }
 *   400 { error }    (invalid status)
 *   404 { error }    (order not found)
 *   500 { error }    (server/database failure)
 *
 * @module app/api/orders/[id]/deposit/route
 */

import { NextRequest, NextResponse } from "next/server";
import { orderService } from "@/services/orderService";
import { apiGuard } from "@/lib/apiGuard";
import { getAuthUser } from "@/lib/auth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** PATCH /api/orders/:id/deposit — mark deposit as returned */
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const guard = await apiGuard(request, 'orders');
    if (guard.error) return guard.error;

    const authUser = await getAuthUser(request);
    orderService.setUserContext(authUser?.staff_id || null, authUser?.branch_id || null);

    const { id } = await params;

    const result = await orderService.markDepositReturned(id);
    if (!result.success) {
      return NextResponse.json({ error: result.error?.message }, { status: 400 });
    }
    return NextResponse.json({ order: result.data });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
