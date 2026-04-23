/**
 * Orders REST API — Collection Endpoint
 *
 * Routes:
 *   GET    /api/orders   Fetch all orders
 *   POST   /api/orders   Create a new order
 *
 * GET Query Params:
 *   - customer_id: string (optional)
 *   - branch_id: string (optional)
 *   - status: string (optional)
 *   - query: string (optional)
 *   - limit: number (optional)
 *   - offset: number (optional)
 *
 * POST body (JSON): CreateOrderDTO
 *
 * Responses:
 *   200 { orders: OrderWithRelations[] } | { order: OrderWithRelations }
 *   400 { error }    (invalid payload)
 *   500 { error }    (server/database failure)
 *
 * @module app/api/orders/route
 */

import { NextRequest, NextResponse } from "next/server";
import { orderService } from "@/services/orderService";
import { apiGuard } from "@/lib/apiGuard";
import { getAuthUser } from "@/lib/auth";

/** GET /api/orders — fetch all orders */
export async function GET(request: NextRequest) {
  try {
    const guard = await apiGuard(request, 'orders');
    if (guard.error) return guard.error;

    const searchParams = request.nextUrl.searchParams;
    const params = {
      customer_id: searchParams.get('customer_id') || undefined,
      branch_id: searchParams.get('branch_id') || undefined,
      status: searchParams.get('status') as any || undefined,
      query: searchParams.get('query') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined,
    };

    const result = await orderService.getAllOrders(params);
    if (!result.success) {
      return NextResponse.json({ error: result.error?.message }, { status: 500 });
    }
    return NextResponse.json({ orders: result.data });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** POST /api/orders — create a new order */
export async function POST(request: NextRequest) {
  try {
    const guard = await apiGuard(request, 'orders');
    if (guard.error) return guard.error;

    const authUser = await getAuthUser(request);
    orderService.setUserContext(authUser?.staff_id || null, authUser?.branch_id || null);

    const body = await request.json();
    const result = await orderService.createOrder(body);
    
    if (!result.success) {
      return NextResponse.json({ error: result.error?.message }, { status: 400 });
    }
    return NextResponse.json({ order: result.data });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
