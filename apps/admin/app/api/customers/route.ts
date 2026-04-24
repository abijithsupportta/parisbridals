/**
 * Customers REST API — Collection Endpoint
 *
 * Routes:
 *   GET    /api/customers   Fetch all customers
 *   POST   /api/customers   Create a new customer
 *
 * GET Query Params:
 *   - query: string (optional)
 *   - limit: number (optional)
 *   - offset: number (optional)
 *
 * POST body (JSON): CreateCustomerDTO
 *
 * Responses:
 *   200 { customers: Customer[] } | { customer: Customer }
 *   400 { error }    (invalid payload)
 *   500 { error }    (server/database failure)
 *
 * @module app/api/customers/route
 */

import { NextRequest, NextResponse } from "next/server";
import { customerService } from "@/services/customerService";
import { apiGuard } from "@/lib/apiGuard";
import { getAuthUser } from "@/lib/auth";

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
      return NextResponse.json({ error: result.error?.message }, { status: 500 });
    }
    
    // Result.data is already CustomerSearchResult containing { customers, total, page, etc. }
    return NextResponse.json(result.data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
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
      return NextResponse.json({ error: result.error?.message }, { status: 400 });
    }
    return NextResponse.json({ customer: result.data });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
