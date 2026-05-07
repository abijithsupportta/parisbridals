/**
 * Orders REST API — Collection Endpoint
 *
 * Routes:
 *   GET    /api/orders   Fetch all orders (paginated)
 *   POST   /api/orders   Create a new order
 *
 * GET Query Params:
 *   - customer_id: string (optional)
 *   - branch_id: string (optional)
 *   - status: string (optional)
 *   - query: string (optional)
 *   - limit: number (optional)
 *   - page: number (optional)
 *
 * POST body (JSON): CreateOrderDTO
 *
 * @module app/api/orders/route
 */

import { NextRequest } from "next/server";
import { orderService } from "@/services/orderService";
import { apiGuard } from "@/lib/apiGuard";
import { getAuthUser } from "@/lib/auth";
import { CreateOrderSchema } from "@/domain";
import { apiSuccess, apiRepositoryError, apiBadRequest, apiInternalError } from "@/lib/apiResponse";

// Auto-cancel: runs at most once per 24 hours (not once per cold start).
// On Railway (always-on), the server can stay up for weeks — a one-time flag
// would never re-run. This time-based approach ensures daily execution.
let _lastAutoCancelRun = 0;
const AUTO_CANCEL_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

/** GET /api/orders — fetch all orders */
export async function GET(request: NextRequest) {
  try {
    const guard = await apiGuard(request, 'orders');
    if (guard.error) return guard.error;

    // Fire-and-forget: auto-cancel expired scheduled orders (once per 24h)
    const now = Date.now();
    if (now - _lastAutoCancelRun > AUTO_CANCEL_INTERVAL_MS) {
      _lastAutoCancelRun = now;
      orderService.autoCancelExpiredScheduledOrders().catch((err) =>
        console.error('[orders/GET] Background auto-cancel failed:', err)
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 25;
    
    const params = {
      customer_id: searchParams.get('customer_id') || undefined,
      branch_id: searchParams.get('branch_id') || undefined,
      status: searchParams.get('status') as any || undefined,
      query: searchParams.get('query') || undefined,
      date_filter: searchParams.get('date_filter') as any || undefined,
      date_from: searchParams.get('date_from') || undefined,
      date_to: searchParams.get('date_to') || undefined,
      limit,
      offset: (page - 1) * limit,
    };

    const result = await orderService.getAllOrders(params);
    const countResult = await orderService.countOrders(params);

    if (!result.success || !countResult.success) {
      return apiRepositoryError(result.error, 'Failed to fetch orders');
    }

    const total = countResult.data || 0;
    const totalPages = Math.ceil(total / limit);

    return apiSuccess(result.data, {
      meta: {
        total,
        totalPages,
        page,
        limit,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return apiInternalError(message);
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
    
    // Validate request body
    const validatedData = CreateOrderSchema.safeParse(body);
    if (!validatedData.success) {
      return apiBadRequest('Validation failed', validatedData.error.format());
    }

    const result = await orderService.createOrder(validatedData.data);
    
    if (!result.success) {
      return apiRepositoryError(result.error, 'Failed to create order');
    }

    // NOTE: Advance and deposit payment records are already created by
    // orderRepository.create(). Do NOT create them again here — doing so
    // would double-count amount_paid and break the financial card.

    return apiSuccess(result.data, { status: 201, message: 'Order created successfully' });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return apiInternalError(message);
  }
}
