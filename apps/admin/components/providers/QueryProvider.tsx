/**
 * Query Provider Component
 *
 * Provides TanStack Query client to the entire application.
 * Should be wrapped around the app in the layout.
 *
 * @module components/providers/QueryProvider
 */

"use client";

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from '@/lib/query-client';

interface QueryProviderProps {
  children: React.ReactNode;
}

/**
 * QueryProvider component that wraps the app with TanStack Query
 * Includes React Query Devtools in development mode
 *
 * @param props - Component props
 * @param props.children - Child components to wrap
 */
export default function QueryProvider({ children }: QueryProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools 
          initialIsOpen={false}
          buttonPosition="bottom-left"
        />
      )}
    </QueryClientProvider>
  );
}
