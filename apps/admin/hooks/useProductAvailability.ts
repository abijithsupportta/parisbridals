/**
 * Product Availability Hooks
 *
 * TanStack Query hooks for interval-based product availability.
 * Powers the product detail calendar and order form availability checks.
 *
 * @module hooks/useProductAvailability
 */

import { useQuery } from '@tanstack/react-query';
import type {
  AvailabilityCalendarResponse,
  BatchAvailabilityResponse,
} from '@/domain/types/order';

const availabilityKeys = {
  all: ['availability'] as const,
  calendar: (productId: string, start: string, end: string) =>
    [...availabilityKeys.all, 'calendar', productId, start, end] as const,
  check: (items: any[], start: string, end: string) =>
    [...availabilityKeys.all, 'check', JSON.stringify(items), start, end] as const,
};

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error?.message || body.error || `Request failed (${res.status})`);
  }
  return res.json();
}

/**
 * Fetch per-day availability calendar for a product.
 * Used by ProductAvailabilityCalendar component.
 */
export function useProductAvailabilityCalendar(
  productId: string,
  startDate: string,
  endDate: string,
  enabled: boolean = true,
) {
  return useQuery<{ success: boolean; data: AvailabilityCalendarResponse }>({
    queryKey: availabilityKeys.calendar(productId, startDate, endDate),
    queryFn: async () => {
      return apiFetch(
        `/api/products/${productId}/availability?start=${startDate}&end=${endDate}`
      );
    },
    enabled: enabled && !!productId && !!startDate && !!endDate,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * Batch-check availability for order form items.
 * Calls POST /api/orders/check-availability
 */
export function useCheckOrderAvailability(
  items: { product_id: string; quantity: number; product_name?: string }[],
  startDate: string,
  endDate: string,
  branchId?: string,
  excludeOrderId?: string,
  enabled: boolean = true,
) {
  return useQuery<{ success: boolean; data: BatchAvailabilityResponse }>({
    queryKey: availabilityKeys.check(items, startDate, endDate),
    queryFn: async () => {
      return apiFetch('/api/orders/check-availability', {
        method: 'POST',
        body: JSON.stringify({
          items,
          start_date: startDate,
          end_date: endDate,
          branch_id: branchId,
          exclude_order_id: excludeOrderId,
        }),
      });
    },
    enabled: enabled && items.length > 0 && !!startDate && !!endDate,
    staleTime: 30 * 1000, // 30 seconds — more aggressive for real-time feedback
    gcTime: 60 * 1000,
  });
}
