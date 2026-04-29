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
import { paymentService } from "@/services/paymentService";
import { apiGuard } from "@/lib/apiGuard";
import { getAuthUser } from "@/lib/auth";
import { CreateOrderSchema } from "@/domain";
import { PaymentType } from "@/domain/types/payment";
import { apiSuccess, apiRepositoryError, apiBadRequest, apiInternalError } from "@/lib/apiResponse";

/** GET /api/orders — fetch all orders */
export async function GET(request: NextRequest) {
  try {
    const guard = await apiGuard(request, 'orders');
    if (guard.error) return guard.error;

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

    // Create advance payment record if advance was collected
    if (result.data && validatedData.data.advance_collected && (validatedData.data.advance_amount || 0) > 0) {
      paymentService.setUserContext(authUser?.staff_id || null, authUser?.branch_id || null);
      await paymentService.createPayment({
        order_id: result.data.id,
        payment_type: PaymentType.ADVANCE,
        amount: validatedData.data.advance_amount!,
        payment_mode: (validatedData.data.advance_payment_method as any) || 'cash',
        notes: 'Advance payment collected at order creation',
      });
    }

    return apiSuccess(result.data, { status: 201, message: 'Order created successfully' });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return apiInternalError(message);
  }
}
