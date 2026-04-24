/**
 * Orders REST API — Status History Endpoint
 *
 * Routes:
 *   GET    /api/orders/:id/history   Fetch order status history
 *
 * Responses:
 *   200 { history: OrderStatusHistory[] }
 *   400 { error }    (invalid id / payload)
 *   404 { error }    (not found)
 *   500 { error }    (server/database failure)
 *
 * @module app/api/orders/[id]/history/route
 */

import { NextRequest, NextResponse } from "next/server";
import { orderService } from "@/services/orderService";
import { apiGuard } from "@/lib/apiGuard";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** GET /api/orders/:id/history — fetch order status history */
export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const guard = await apiGuard(request, 'orders');
    if (guard.error) return guard.error;

    const { id } = await params;
    const result = await orderService.getOrderStatusHistory(id);
    if (!result.success || !result.data) {
      return NextResponse.json({ error: result.error?.message || "History not found" }, { status: 404 });
    }
    return NextResponse.json({ history: result.data });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
