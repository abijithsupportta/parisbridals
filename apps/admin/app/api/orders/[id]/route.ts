/**
 * Orders REST API — Single Resource Endpoint
 *
 * Routes:
 *   GET    /api/orders/:id   Fetch one order by id
 *   PATCH  /api/orders/:id   Update an order
 *   DELETE /api/orders/:id   Delete an order
 *
 * PATCH body (JSON): any subset of UpdateOrderDTO fields.
 *
 * Responses:
 *   200 { order } | { success: true }
 *   400 { error }    (invalid id / payload)
 *   404 { error }    (not found)
 *   500 { error }    (server/database failure)
 *
 * @module app/api/orders/[id]/route
 */

import { NextRequest, NextResponse } from "next/server";
import { orderService } from "@/services/orderService";
import { apiGuard } from "@/lib/apiGuard";
import { getAuthUser } from "@/lib/auth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** GET /api/orders/:id — fetch one order */
export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const guard = await apiGuard(request, 'orders');
    if (guard.error) return guard.error;

    const { id } = await params;
    const result = await orderService.getOrderById(id);
    if (!result.success || !result.data) {
      return NextResponse.json({ error: result.error?.message || "Order not found" }, { status: 404 });
    }
    return NextResponse.json({ order: result.data });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** PATCH /api/orders/:id — update an order */
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const guard = await apiGuard(request, 'orders');
    if (guard.error) return guard.error;

    const authUser = await getAuthUser(request);
    orderService.setUserContext(authUser?.staff_id || null, authUser?.branch_id || null);

    const { id } = await params;
    const body = await request.json();

    const result = await orderService.updateOrder(id, body);
    if (!result.success) {
      return NextResponse.json({ error: result.error?.message }, { status: 400 });
    }
    return NextResponse.json({ order: result.data });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** DELETE /api/orders/:id — delete an order */
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const guard = await apiGuard(request, 'orders');
    if (guard.error) return guard.error;

    const authUser = await getAuthUser(request);
    orderService.setUserContext(authUser?.staff_id || null, authUser?.branch_id || null);

    const { id } = await params;

    const result = await orderService.deleteOrder(id);
    if (!result.success) {
      return NextResponse.json({ error: result.error?.message }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
