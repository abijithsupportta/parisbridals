/**
 * Orders REST API — Status History Endpoint
 *
 * Routes:
 *   GET    /api/orders/:id/history   Fetch order status history
 *
 * @module app/api/orders/[id]/history/route
 */

import { NextRequest } from "next/server";
import { orderService } from "@/services/orderService";
import { apiGuard } from "@/lib/apiGuard";
import { apiSuccess, apiNotFound, apiInternalError } from "@/lib/apiResponse";

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
      return apiNotFound('Order history');
    }
    return apiSuccess(result.data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return apiInternalError(message);
  }
}
