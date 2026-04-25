import { useQuery } from '@tanstack/react-query';
import { OrderWithRelations } from '@/domain/types/order';

interface CalendarFetchParams {
  branch_id?: string;
  start_date: string;
  end_date: string;
}

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    let errorMessage = body.error?.message || body.error || `Request failed (${res.status})`;
    throw new Error(errorMessage);
  }
  return res.json();
}

/**
 * Fetch orders for the calendar view.
 */
export function useCalendarOrders(params: CalendarFetchParams, options?: { enabled?: boolean }) {
  return useQuery<{ success: boolean; data: OrderWithRelations[] }>({
    queryKey: ['calendar', params.branch_id, params.start_date, params.end_date],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      searchParams.append('start_date', params.start_date);
      searchParams.append('end_date', params.end_date);
      if (params.branch_id) searchParams.append('branch_id', params.branch_id);
      
      const queryString = searchParams.toString();
      const url = `/api/calendar?${queryString}`;
      
      return await apiFetch<{ success: boolean; data: OrderWithRelations[] }>(url);
    },
    enabled: options?.enabled !== false && !!params.branch_id,
    staleTime: 5 * 60 * 1000,
  });
}
