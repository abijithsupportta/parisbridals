/**
 * Orders REST API — Single Resource Endpoint
 *
 * Routes:
 *   GET    /api/orders/:id   Fetch one order by id
 *   PATCH  /api/orders/:id   Update an order
 *   DELETE /api/orders/:id   Delete an order
 *
 * @module app/api/orders/[id]/route
 */

import { NextRequest } from "next/server";
import { orderService } from "@/services/orderService";
import { apiGuard } from "@/lib/apiGuard";
import { getAuthUser } from "@/lib/auth";
import { UpdateOrderSchema } from "@/domain";
import { apiSuccess, apiRepositoryError, apiNotFound, apiBadRequest, apiInternalError } from "@/lib/apiResponse";

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
      return apiNotFound('Order');
    }
    return apiSuccess(result.data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return apiInternalError(message);
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

    // Validate request body
    const validatedData = UpdateOrderSchema.safeParse(body);
    if (!validatedData.success) {
      return apiBadRequest('Validation failed', validatedData.error.format());
    }

    const result = await orderService.updateOrder(id, validatedData.data);
    if (!result.success) {
      return apiRepositoryError(result.error, 'Failed to update order');
    }
    return apiSuccess(result.data, { message: 'Order updated successfully' });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return apiInternalError(message);
  }
}

/** DELETE /api/orders/:id — delete an order */
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const guard = await apiGuard(request, 'orders');
    if (guard.error) return guard.error;

    const authUser = await getAuthUser(request);

    // Enforce role-based access for deletion (shop admin/owner only)
    if (!['admin', 'super_admin', 'owner'].includes(authUser?.role || '')) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized: Only shop admins and owners can delete orders.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    orderService.setUserContext(authUser?.staff_id || null, authUser?.branch_id || null);

    const { id } = await params;

    const result = await orderService.deleteOrder(id);
    if (!result.success) {
      return apiRepositoryError(result.error, 'Failed to delete order');
    }
    return apiSuccess(null, { message: 'Order deleted successfully' });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return apiInternalError(message);
  }
}
