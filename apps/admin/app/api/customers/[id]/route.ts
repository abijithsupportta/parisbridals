/**
 * Customers REST API — Single Resource Endpoint
 *
 * Routes:
 *   GET    /api/customers/:id   Fetch one customer by id
 *   PATCH  /api/customers/:id   Update a customer
 *   DELETE /api/customers/:id   Delete a customer
 *
 * @module app/api/customers/[id]/route
 */

import { NextRequest } from "next/server";
import { customerService } from "@/services/customerService";
import { apiGuard } from "@/lib/apiGuard";
import { getAuthUser } from "@/lib/auth";
import { UpdateCustomerSchema } from "@/domain";
import { z } from "zod";
import { apiSuccess, apiRepositoryError, apiNotFound, apiZodError, apiInternalError } from "@/lib/apiResponse";

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
      return apiNotFound('Customer');
    }
    return apiSuccess(result.data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return apiInternalError(message);
  }
}

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
      return apiRepositoryError(result.error, 'Failed to update customer');
    }
    return apiSuccess(result.data, { message: 'Customer updated successfully' });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return apiZodError(err);
    }
    const message = err instanceof Error ? err.message : String(err);
    return apiInternalError(message);
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
      return apiRepositoryError(result.error, 'Failed to delete customer');
    }
    return apiSuccess(null, { message: 'Customer deleted successfully' });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return apiInternalError(message);
  }
}
