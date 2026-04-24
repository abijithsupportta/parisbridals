/**
 * Customers REST API — Collection Endpoint
 *
 * Routes:
 *   GET    /api/customers   Fetch all customers
 *   POST   /api/customers   Create a new customer
 *
 * @module app/api/customers/route
 */

import { NextRequest } from "next/server";
import { customerService } from "@/services/customerService";
import { apiGuard } from "@/lib/apiGuard";
import { getAuthUser } from "@/lib/auth";
import { apiSuccess, apiRepositoryError, apiInternalError } from "@/lib/apiResponse";

/** GET /api/customers — fetch all customers */
export async function GET(request: NextRequest) {
  try {
    const guard = await apiGuard(request, 'customers');
    if (guard.error) return guard.error;

    const searchParams = request.nextUrl.searchParams;
    const params = {
      query: searchParams.get('query') || undefined,
      phone: searchParams.get('phone') || undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
      sort_by: searchParams.get('sort_by') || 'created_at',
      sort_order: (searchParams.get('sort_order') as 'asc' | 'desc') || 'desc',
    };

    const result = await customerService.getAllCustomers(params);
    if (!result.success) {
      return apiRepositoryError(result.error, 'Failed to fetch customers');
    }
    
    // Result.data is already CustomerSearchResult containing { customers, total, page, etc. }
    return apiSuccess(result.data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return apiInternalError(message);
  }
}

/** POST /api/customers — create a new customer */
export async function POST(request: NextRequest) {
  try {
    const guard = await apiGuard(request, 'customers');
    if (guard.error) return guard.error;

    const authUser = await getAuthUser(request);
    customerService.setUserContext(authUser?.staff_id || null, authUser?.branch_id || null);

    const body = await request.json();
    const result = await customerService.createCustomer(body);
    
    if (!result.success) {
      return apiRepositoryError(result.error, 'Failed to create customer');
    }
    return apiSuccess(result.data, { status: 201, message: 'Customer created successfully' });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return apiInternalError(message);
  }
}
