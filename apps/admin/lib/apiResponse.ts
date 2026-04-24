/**
 * Standardized API Response Helpers
 *
 * Provides a unified response envelope for ALL API routes.
 * Every successful response follows: `{ success: true, data, message?, meta? }`
 * Every error response follows:     `{ success: false, error: { message, code?, details? } }`
 *
 * This eliminates the inconsistency where different routes returned
 * `{ categories: [...] }`, `{ success: true, data: [...] }`, or raw arrays.
 *
 * @module lib/apiResponse
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';

// ─── Response Types ────────────────────────────────────────────────────

/** Standard success envelope */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
  meta?: PaginationMeta;
}

/** Pagination metadata included in list responses */
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/** Standard error envelope */
export interface ApiErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    details?: Record<string, unknown> | unknown;
  };
}

/** Union type for all API responses */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// ─── Builder Functions ─────────────────────────────────────────────────

/**
 * Return a successful JSON response.
 */
export function apiSuccess<T>(
  data: T,
  options: {
    status?: number;
    message?: string;
    meta?: PaginationMeta;
  } = {},
): NextResponse<ApiSuccessResponse<T>> {
  const body: ApiSuccessResponse<T> = {
    success: true,
    data,
  };

  if (options.message) body.message = options.message;
  if (options.meta) body.meta = options.meta;

  return NextResponse.json(body, { status: options.status ?? 200 });
}

/**
 * Return an error JSON response.
 */
export function apiError(
  message: string,
  options: {
    status?: number;
    code?: string;
    details?: Record<string, unknown> | unknown;
  } = {},
): NextResponse<ApiErrorResponse> {
  const body: ApiErrorResponse = {
    success: false,
    error: {
      message,
    },
  };

  if (options.code) body.error.code = options.code;
  if (options.details) body.error.details = options.details;

  return NextResponse.json(body, { status: options.status ?? 500 });
}

// ─── Shorthand Helpers ─────────────────────────────────────────────────

/** 400 – Validation or bad-request error */
export function apiBadRequest(message: string, details?: unknown) {
  return apiError(message, { status: 400, code: 'BAD_REQUEST', details });
}

/** 401 – Authentication required */
export function apiUnauthorized(message = 'Authentication required. Please log in.') {
  return apiError(message, { status: 401, code: 'UNAUTHORIZED' });
}

/** 403 – Forbidden / insufficient permissions */
export function apiForbidden(message = 'Access denied. Insufficient permissions.') {
  return apiError(message, { status: 403, code: 'FORBIDDEN' });
}

/** 404 – Resource not found */
export function apiNotFound(resource: string) {
  return apiError(`${resource} not found`, { status: 404, code: 'NOT_FOUND' });
}

/** 409 – Conflict (e.g. delete blocked, duplicate) */
export function apiConflict(message: string, details?: unknown) {
  return apiError(message, { status: 409, code: 'CONFLICT', details });
}

/** 500 – Internal server error */
export function apiInternalError(message = 'Internal server error') {
  return apiError(message, { status: 500, code: 'INTERNAL_ERROR' });
}

/**
 * Convert a Zod validation error into a standardised 400 response.
 */
export function apiZodError(error: z.ZodError) {
  const fieldErrors = error.issues.reduce<Record<string, string>>((acc, issue) => {
    acc[issue.path.join('.')] = issue.message;
    return acc;
  }, {});

  return apiError('Validation failed', {
    status: 400,
    code: 'VALIDATION_ERROR',
    details: fieldErrors,
  });
}

/**
 * Convert a RepositoryResult error to an API error response.
 */
export function apiRepositoryError(
  error: { message?: string; code?: string; details?: unknown } | null,
  fallbackMessage: string,
) {
  const message = error?.message || fallbackMessage;
  const code = error?.code || 'UNKNOWN';

  // Map internal error codes → HTTP status
  const statusMap: Record<string, number> = {
    NOT_FOUND: 404,
    PRODUCT_NOT_FOUND: 404,
    CATEGORY_NOT_FOUND: 404,
    SLUG_EXISTS: 409,
    DUPLICATE_EMAIL: 409,
    CANNOT_DELETE: 409,
    DELETE_BLOCKED: 409,
    CIRCULAR_REFERENCE: 409,
    MAIN_BRANCH_LOCKED: 409,
    VALIDATION: 400,
    VALIDATION_ERROR: 400,
    INVALID_PARENT: 400,
    AUTH_ERROR: 400,
    AUTH_DELETE_FAILED: 400,
    LIMIT_EXCEEDED: 409,
    POSITION_TAKEN: 409,
  };

  const status = statusMap[code] ?? 400;

  return apiError(message, { status, code, details: error?.details });
}
