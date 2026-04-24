/**
 * Orders REST API — Return Processing
 *
 * Routes:
 *   PATCH  /api/orders/:id/return   Process order return with condition assessment
 *
 * PATCH body (JSON): ReturnOrderDTO
 *
 * @module app/api/orders/[id]/return/route
 */

import { NextRequest } from "next/server";
import { orderService } from "@/services/orderService";
import { apiGuard } from "@/lib/apiGuard";
import { getAuthUser } from "@/lib/auth";
import { apiSuccess, apiRepositoryError, apiInternalError } from "@/lib/apiResponse";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** PATCH /api/orders/:id/return — process order return */
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const guard = await apiGuard(request, 'orders');
    if (guard.error) return guard.error;

    const authUser = await getAuthUser(request);
    orderService.setUserContext(authUser?.staff_id || null, authUser?.branch_id || null);

    const { id } = await params;
    const body = await request.json();

    const result = await orderService.processOrderReturn(id, body);
    if (!result.success) {
      return apiRepositoryError(result.error, 'Failed to process return');
    }
    return apiSuccess(result.data, { message: 'Order return processed successfully' });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return apiInternalError(message);
  }
}
