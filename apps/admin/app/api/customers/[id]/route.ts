/**
 * Customers REST API — Single Resource Endpoint
 *
 * Routes:
 *   GET    /api/customers/:id   Fetch one customer by id
 *   PATCH  /api/customers/:id   Update a customer
 *   DELETE /api/customers/:id   Delete a customer
 *
 * PATCH body (JSON): any subset of UpdateCustomerDTO fields.
 *
 * Responses:
 *   200 { customer } | { success: true }
 *   400 { error }    (invalid id / payload)
 *   404 { error }    (not found)
 *   500 { error }    (server/database failure)
 *
 * @module app/api/customers/[id]/route
 */

import { NextRequest, NextResponse } from "next/server";
import { customerService } from "@/services/customerService";
import { apiGuard } from "@/lib/apiGuard";
import { getAuthUser } from "@/lib/auth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** GET /api/customers/:id — fetch one customer */
export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const guard = await apiGuard(request, 'customers');
    if (guard.error) return guard.error;

    const { id } = await params;
    const result = await customerService.getCustomerById(id);
    if (!result.success || !result.data) {
      return NextResponse.json({ error: result.error?.message || "Customer not found" }, { status: 404 });
    }
    return NextResponse.json({ customer: result.data });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { UpdateCustomerSchema } from "@/domain";
import { z } from "zod";

/** PATCH /api/customers/:id — update a customer */
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const guard = await apiGuard(request, 'customers');
    if (guard.error) return guard.error;

    const authUser = await getAuthUser(request);
    customerService.setUserContext(authUser?.staff_id || null, authUser?.branch_id || null);

    const { id } = await params;
    const body = await request.json();

    const validatedData = UpdateCustomerSchema.parse(body);

    const result = await customerService.updateCustomer(id, validatedData);
    if (!result.success) {
      return NextResponse.json({ error: result.error?.message }, { status: 400 });
    }
    return NextResponse.json({ customer: result.data });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid request body',
          details: err.issues.map(i => `${i.path.join('.')}: ${i.message}`) 
        },
        { status: 400 }
      );
    }
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** DELETE /api/customers/:id — delete a customer */
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const guard = await apiGuard(request, 'customers');
    if (guard.error) return guard.error;

    const authUser = await getAuthUser(request);
    customerService.setUserContext(authUser?.staff_id || null, authUser?.branch_id || null);

    const { id } = await params;

    const result = await customerService.deleteCustomer(id);
    if (!result.success) {
      return NextResponse.json({ error: result.error?.message }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
