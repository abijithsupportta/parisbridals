/**
 * Supabase Client Repository
 *
 * Abstraction layer over Supabase client for consistent data access patterns.
 * Provides type-safe database operations with error handling.
 *
 * @module repository/supabaseClient
 */

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { createClient as createClientComponent } from '@/lib/supabase/client';
import { PostgrestError } from '@supabase/supabase-js';

// Repository response type
export interface RepositoryResult<T> {
  data: T | null;
  error: PostgrestError | null;
  success: boolean;
}

// Repository error types
export class RepositoryError extends Error implements PostgrestError {
  public hint: string;
  public details: any;

  constructor(
    message: string,
    public code: string,
    details?: any,
    hint?: string
  ) {
    super(message);
    this.name = 'RepositoryError';
    this.details = details;
    this.hint = hint || '';
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
      hint: this.hint,
    };
  }
}

// Base repository class
// Uses admin client (service_role key) which bypasses RLS.
// Clients are lazily initialized on first use, not at import time.
export abstract class BaseRepository {
  private _client: ReturnType<typeof createAdminClient> | null = null;
  private _clientComponent: ReturnType<typeof createClientComponent> | null = null;

  // Current user context for audit fields
  protected currentUserId: string | null = null;
  protected currentBranchId: string | null = null;
  
  // Configuration flag for multi-branch audit fields tracking
  protected useMultiBranchAuditFields: boolean = true;

  protected get client() {
    if (!this._client) this._client = createAdminClient();
    return this._client;
  }

  protected get clientComponent() {
    if (!this._clientComponent) this._clientComponent = createClientComponent();
    return this._clientComponent;
  }

  /**
   * Set current user context for audit fields
   */
  setUserContext(userId: string | null, branchId: string | null) {
    this.currentUserId = userId;
    this.currentBranchId = branchId;
  }

  /**
   * Get audit fields for create operations
   */
  protected getCreateAuditFields() {
    if (!this.useMultiBranchAuditFields) {
      return {
        created_by: this.currentUserId,
      };
    }

    return {
      created_by: this.currentUserId,
      created_at_branch_id: this.currentBranchId,
      updated_by: this.currentUserId,
      updated_at_branch_id: this.currentBranchId,
    };
  }

  /**
   * Get audit fields for update operations
   */
  protected getUpdateAuditFields() {
    if (!this.useMultiBranchAuditFields) {
      return {};
    }

    return {
      updated_by: this.currentUserId,
      updated_at_branch_id: this.currentBranchId,
    };
  }

  /**
   * Handle Supabase response and convert to RepositoryResult
   */
  protected handleResponse<T>(response: {
    data: T | null;
    error: PostgrestError | null;
  }): RepositoryResult<T> {
    if (response.error) {
      return {
        data: null,
        error: response.error,
        success: false,
      };
    }

    return {
      data: response.data,
      error: null,
      success: true,
    };
  }

  /**
   * Handle repository errors and throw appropriate exceptions
   */
  protected handleError(error: PostgrestError | any): RepositoryError {
    if (error?.code) {
      return new RepositoryError(
        error.message || 'Database operation failed',
        error.code,
        error.details
      );
    }

    return new RepositoryError(
      error?.message || 'Unknown repository error',
      'UNKNOWN_ERROR',
      error
    );
  }

  /**
   * Execute a database operation with error handling
   */
  protected async executeOperation<T>(
    operation: () => Promise<{
      data: T | null;
      error: PostgrestError | null;
    }>
  ): Promise<RepositoryResult<T>> {
    try {
      const response = await operation();
      return this.handleResponse(response);
    } catch (error) {
      return {
        data: null,
        error: error as PostgrestError,
        success: false,
      };
    }
  }

  /**
   * Check if a record exists
   */
  protected async exists(
    table: string,
    column: string,
    value: any
  ): Promise<boolean> {
    const { data, error } = await this.client
      .from(table)
      .select('id')
      .eq(column, value)
      .single();

    return !error && !!data;
  }

  /**
   * Get count of records
   */
  protected async getCount(
    table: string,
    filters: Record<string, any> = {}
  ): Promise<number> {
    let query = this.client.from(table);

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = (query as any).eq(key, value);
      }
    });

    const { count, error } = await query.select('*', { count: 'exact', head: true });

    if (error) {
      throw this.handleError(error);
    }

    return count || 0;
  }

  /**
   * Build query with filters and sorting
   */
  protected buildQuery(
    table: string,
    options: {
      select?: string;
      filters?: Record<string, any>;
      orderBy?: { column: string; ascending?: boolean };
      limit?: number;
      offset?: number;
    } = {}
  ) {
    let query = this.client.from(table);

    // Select columns
    if (options.select) {
      query = (query as any).select(options.select);
    }

    // Apply filters
    if (options.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            query = (query as any).in(key, value);
          } else {
            query = (query as any).eq(key, value);
          }
        }
      });
    }

    // Apply ordering
    if (options.orderBy) {
      query = (query as any).order(options.orderBy.column, { ascending: options.orderBy.ascending });
    }

    // Apply pagination
    if (options.limit) {
      query = (query as any).limit(options.limit);
    }

    if (options.offset) {
      query = (query as any).range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    return query;
  }

  /**
   * @deprecated — This method runs operations sequentially in JavaScript and
   * provides NO true database-level atomicity. If operation 1 succeeds and
   * operation 2 fails, operation 1 is **already committed** — there is no
   * rollback. Do NOT use for multi-table writes.
   *
   * Instead, use `rpc()` to call a Supabase PostgreSQL function that wraps
   * the operations in a real `BEGIN / COMMIT / ROLLBACK` block.
   *
   * Kept for backwards compatibility — will be removed in a future release.
   */
  protected async transaction<T>(
    operations: (() => Promise<RepositoryResult<any>>)[]
  ): Promise<RepositoryResult<T[]>> {
    console.warn(
      '[BaseRepository.transaction] ⚠️  This method is non-atomic. ' +
      'Use rpc() with a PostgreSQL function for true transactional safety.'
    );

    const results: T[] = [];
    const errors: PostgrestError[] = [];

    for (const operation of operations) {
      try {
        const result = await operation();
        if (result.success && result.data) {
          results.push(result.data);
        } else if (result.error) {
          errors.push(result.error);
        }
      } catch (error) {
        errors.push(error as PostgrestError);
      }
    }

    if (errors.length > 0) {
      return {
        data: null,
        error: errors[0], // Return first error
        success: false,
      };
    }

    return {
      data: results,
      error: null,
      success: true,
    };
  }

  /**
   * Execute a Supabase RPC (PostgreSQL function) for truly atomic operations.
   *
   * Use this instead of `transaction()` whenever you need multiple tables
   * modified atomically. The PostgreSQL function runs inside a single
   * transaction — if any step fails, all changes are rolled back.
   *
   * @example
   * ```ts
   * const result = await this.rpc<Staff>('create_staff_member', {
   *   p_email: 'user@example.com',
   *   p_password: 'securePass123',
   *   p_name: 'John Doe',
   *   p_role: 'staff',
   *   p_branch_id: branchId,
   * });
   * ```
   *
   * @param functionName — Name of the PostgreSQL function (no schema prefix)
   * @param params       — Key-value arguments matching the function's parameters
   * @returns            — RepositoryResult wrapping the function's return value
   */
  protected async rpc<T>(
    functionName: string,
    params: Record<string, unknown> = {},
  ): Promise<RepositoryResult<T>> {
    try {
      const { data, error } = await this.client.rpc(functionName, params);

      if (error) {
        return {
          data: null,
          error: error as PostgrestError,
          success: false,
        };
      }

      return {
        data: data as T,
        error: null,
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        error: error as PostgrestError,
        success: false,
      };
    }
  }
}

// Utility functions
export const createRepositoryResult = <T>(
  data: T | null,
  error: PostgrestError | null = null
): RepositoryResult<T> => ({
  data,
  error,
  success: !error,
});

export const isRepositorySuccess = <T>(result: RepositoryResult<T>): result is RepositoryResult<T> & { data: T } => {
  return result.success && result.data !== null;
};

export const isRepositoryError = <T>(result: RepositoryResult<T>): boolean => {
  return !result.success || result.error !== null;
};
