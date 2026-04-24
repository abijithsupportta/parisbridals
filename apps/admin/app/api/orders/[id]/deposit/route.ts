/**
 * Orders REST API — Deposit Return
 *
 * Routes:
 *   PATCH  /api/orders/:id/deposit   Mark deposit as returned
 *
 * @module app/api/orders/[id]/deposit/route
 */

import { NextRequest } from "next/server";
import { orderService } from "@/services/orderService";
import { apiGuard } from "@/lib/apiGuard";
import { getAuthUser } from "@/lib/auth";
import { apiSuccess, apiRepositoryError, apiInternalError } from "@/lib/apiResponse";

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
      return apiRepositoryError(result.error, 'Failed to mark deposit as returned');
    }
    return apiSuccess(result.data, { message: 'Deposit marked as returned' });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return apiInternalError(message);
  }
}
