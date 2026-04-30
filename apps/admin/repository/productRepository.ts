/**
 * Product Repository
 *
 * Data access layer for product entities using Supabase.
 * Implements repository pattern for clean separation of concerns.
 *
 * @module repository/productRepository
 */

import { BaseRepository, RepositoryResult } from './supabaseClient';
import { 
  Product, 
  CreateProductDTO, 
  UpdateProductDTO, 
  ProductSearchParams, 
  ProductSearchResult,
  ProductWithRelations,
  BulkProductOperation,
  BulkOperationResult
} from '@/domain';

export class ProductRepository extends BaseRepository {
  private readonly tableName = 'products';

  /**
   * Find all products with optional filtering
   */
  async findAll(params: ProductSearchParams = {}): Promise<RepositoryResult<ProductSearchResult>> {
    const {
      query,
      category_id,
      store_id,
      branch_id,
      status,
      is_featured,
      min_price,
      max_price,
      in_stock,
      sort_by = 'created_at',
      sort_order = 'desc',
      page = 1,
      limit = 20,
    } = params;

    const offset = (page - 1) * limit;

    // Build filters
    const filters: Record<string, any> = {};
    if (category_id) filters.category_id = category_id;
    if (store_id) filters.store_id = store_id;
    if (status !== undefined) filters.is_active = status === 'active';
    if (is_featured !== undefined) filters.is_featured = is_featured;
    if (in_stock !== undefined) {
      if (in_stock) {
        filters.available_quantity = { gt: 0 };
      } else {
        filters.available_quantity = 0;
      }
    }

    // Build the main query
    let selectQuery = this.buildQuery(this.tableName, {
      select: `
        *,
        category:category_id(id, name, slug),
        branch:branch_id(id, name),
        product_inventory(id, product_id, branch_id, quantity, available_quantity, low_stock_threshold, created_at, updated_at, branches:branch_id(id, name))
      `,
      filters,
      orderBy: { column: sort_by, ascending: sort_order === 'asc' },
      limit,
      offset,
    });

    // Apply additional filters using proper Supabase syntax
    if (query) {
      selectQuery = (selectQuery as any).or(`name.ilike.%${query}%,slug.ilike.%${query}%,sku.ilike.%${query}%,barcode.ilike.%${query}%`);
    }
    
    if (branch_id) {
      selectQuery = (selectQuery as any).or(`branch_id.eq.${branch_id},branch_id.is.null`);
    }

    if (min_price !== undefined) {
      selectQuery = (selectQuery as any).gte('price_per_day', min_price);
    }

    if (max_price !== undefined) {
      selectQuery = (selectQuery as any).lte('price_per_day', max_price);
    }

    // Get total count for pagination - simplified approach
    let countQuery = this.client.from(this.tableName).select('*', { count: 'exact', head: true });
    
    // Apply basic filters to count query
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          countQuery = (countQuery as any).eq(key, value);
        }
      });
    }
    
    if (query) {
      countQuery = (countQuery as any).or(`name.ilike.%${query}%,slug.ilike.%${query}%,sku.ilike.%${query}%,barcode.ilike.%${query}%`);
    }
    if (branch_id) {
      countQuery = (countQuery as any).or(`branch_id.eq.${branch_id},branch_id.is.null`);
    }

    const { count: totalCount } = await countQuery;

    // Execute main query
    const response = await selectQuery;
    const { data, error } = response as any;
    const result = this.handleResponse<ProductWithRelations[]>({ data, error });

    if (!result.success || !result.data) {
      return {
        data: null,
        error: result.error,
        success: false,
      };
    }

    const total = totalCount || 0;
    const totalPages = Math.ceil(total / limit);

    const searchResult: ProductSearchResult = {
      products: result.data,
      total,
      page,
      limit,
      total_pages: totalPages,
      has_next: page < totalPages,
      has_prev: page > 1,
    };

    return {
      data: searchResult,
      error: null,
      success: true,
    };
  }

  /**
   * Find product by ID
   */
  async findById(id: string): Promise<RepositoryResult<ProductWithRelations>> {
    const response = await this.client
      .from(this.tableName)
      .select(`
        *,
        category:category_id(id, name, slug),
        branch:branch_id(id, name),
        product_inventory(id, product_id, branch_id, quantity, available_quantity, low_stock_threshold, created_at, updated_at, branches:branch_id(id, name))
      `)
      .eq('id', id)
      .single();

    return this.handleResponse<ProductWithRelations>(response);
  }

  /**
   * Find products by category ID
   */
  async findByCategory(categoryId: string): Promise<RepositoryResult<Product[]>> {
    const response = await this.client
      .from(this.tableName)
      .select('*')
      .eq('category_id', categoryId)
      .order('created_at', { ascending: false });

    return this.handleResponse<Product[]>(response);
  }

  /**
   * Find products by store ID
   */
  async findByStore(storeId: string): Promise<RepositoryResult<Product[]>> {
    const response = await this.client
      .from(this.tableName)
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });

    return this.handleResponse<Product[]>(response);
  }

  /**
   * Search products by text query
   */
  async search(query: string, limit: number = 10): Promise<RepositoryResult<Product[]>> {
    const response = await this.client
      .from(this.tableName)
      .select('*')
      .or(`name.ilike.%${query}%,slug.ilike.%${query}%,sku.ilike.%${query}%,description.ilike.%${query}%,barcode.ilike.%${query}%`)
      .limit(limit)
      .order('created_at', { ascending: false });

    return this.handleResponse<Product[]>(response);
  }

  /**
   * Find product by barcode (case-insensitive)
   * Used for barcode scanner lookup in order forms.
   */
  async findByBarcode(barcode: string): Promise<RepositoryResult<ProductWithRelations>> {
    const response = await this.client
      .from(this.tableName)
      .select('*')
      .ilike('barcode', barcode)
      .eq('is_active', true)
      .limit(1);

    if (response.error) {
      return this.handleResponse<ProductWithRelations>(response as any);
    }

    const product = response.data?.[0] || null;
    if (!product) {
      return {
        data: null,
        error: { message: 'No product found with this barcode', code: 'NOT_FOUND' } as any,
        success: false,
      };
    }

    return { data: product as ProductWithRelations, error: null, success: true };
  }

  /**
   * Check if a barcode is unique (case-insensitive).
   * @param barcode - The barcode to check
   * @param excludeProductId - Optional product ID to exclude (for edit mode)
   * @returns true if barcode is available, false if already taken
   */
  async isBarcodeUnique(barcode: string, excludeProductId?: string): Promise<{ unique: boolean; existingProductName?: string }> {
    let query = this.client
      .from(this.tableName)
      .select('id, name')
      .ilike('barcode', barcode);

    if (excludeProductId) {
      query = query.neq('id', excludeProductId);
    }

    const { data, error } = await query.limit(1);

    if (error || !data || data.length === 0) {
      return { unique: true };
    }

    return { unique: false, existingProductName: data[0].name };
  }

  /**
   * Create a new product
   */
  async create(data: CreateProductDTO): Promise<RepositoryResult<Product>> {
    const response = await this.client
      .from(this.tableName)
      .insert({
        ...data,
        ...this.getCreateAuditFields(),
      })
      .select()
      .single();

    return this.handleResponse<Product>(response);
  }

  /**
   * Update an existing product
   */
  async update(id: string, data: UpdateProductDTO): Promise<RepositoryResult<Product>> {
    const response = await this.client
      .from(this.tableName)
      .update({
        ...data,
        updated_at: new Date().toISOString(),
        ...this.getUpdateAuditFields(),
      })
      .eq('id', id)
      .select()
      .single();

    return this.handleResponse<Product>(response);
  }

  /**
   * Delete a product
   */
  async delete(id: string): Promise<RepositoryResult<void>> {
    const response = await this.client
      .from(this.tableName)
      .delete()
      .eq('id', id);

    return this.handleResponse<void>(response);
  }

  /**
   * Check if product can be deleted (safety checks)
   */
  async canDelete(id: string): Promise<RepositoryResult<{
    canDelete: boolean;
    reason?: string;
    relatedData?: {
      ordersCount: number;
      activeRentalCount: number;
    };
  }>> {
    try {
      // Check if product exists
      const productResult = await this.findById(id);
      if (!productResult.success || !productResult.data) {
        return {
          data: { canDelete: false, reason: 'Product not found' },
          error: null,
          success: true,
        };
      }

      // Check for order_items referencing this product
      const { count: ordersCount } = await this.client
        .from('order_items')
        .select('*', { count: 'exact', head: true })
        .eq('product_id', id);

      const safeCount = ordersCount ?? 0;
      const canDelete = safeCount === 0;
      const reason = canDelete ? undefined : `Product has ${safeCount} order(s) referencing it`;

      return {
        data: { canDelete, reason, relatedData: { ordersCount: safeCount, activeRentalCount: safeCount } },
        error: null,
        success: true,
      };
    } catch (error) {
      // On error, allow delete (don't block admin actions due to query issues)
      return {
        data: { canDelete: true },
        error: null,
        success: true,
      };
    }
  }

  /**
   * Perform bulk operations on products
   */
  async bulkOperation(operation: BulkProductOperation): Promise<RepositoryResult<BulkOperationResult>> {
    const { product_ids, operation: opType, data } = operation;
    const successful: string[] = [];
    const failed: Array<{ product_id: string; error: string }> = [];

    for (const productId of product_ids) {
      try {
        let result: RepositoryResult<any>;

        switch (opType) {
          case 'activate':
            result = await this.update(productId, { is_active: true });
            break;
          case 'deactivate':
            result = await this.update(productId, { is_active: false });
            break;
          case 'feature':
            result = await this.update(productId, { is_featured: true });
            break;
          case 'unfeature':
            result = await this.update(productId, { is_featured: false });
            break;
          case 'update_price':
            result = await this.update(productId, data as UpdateProductDTO);
            break;
          case 'delete':
            // Check if can delete first
            const canDeleteResult = await this.canDelete(productId);
            if (canDeleteResult.success && canDeleteResult.data?.canDelete) {
              result = await this.delete(productId);
            } else {
              failed.push({
                product_id: productId,
                error: canDeleteResult.data?.reason || 'Cannot delete product',
              });
              continue;
            }
            break;
          default:
            failed.push({
              product_id: productId,
              error: 'Unknown operation',
            });
            continue;
        }

        if (result.success) {
          successful.push(productId);
        } else {
          failed.push({
            product_id: productId,
            error: result.error?.message || 'Operation failed',
          });
        }
      } catch (error) {
        failed.push({
          product_id: productId,
          error: (error as Error).message || 'Unexpected error',
        });
      }
    }

    const operationResult: BulkOperationResult = {
      successful,
      failed,
      total_processed: product_ids.length,
      total_successful: successful.length,
      total_failed: failed.length,
    };

    return {
      data: operationResult,
      error: null,
      success: true,
    };
  }

  /**
   * Get product count by filters
   */
  async getProductCount(filters: Record<string, any> = {}): Promise<RepositoryResult<number>> {
    try {
      let query = this.client.from(this.tableName);
      
      // Apply filters
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (typeof value === 'object' && value.ne) {
              query = (query as any).not(key, 'eq', value.ne);
            } else {
              query = (query as any).eq(key, value);
            }
          }
        });
      }
      
      const { count, error } = await query.select('*', { count: 'exact', head: true });
      
      if (error) {
        return {
          data: null,
          error: this.handleError(error),
          success: false,
        };
      }
      
      return {
        data: count || 0,
        error: null,
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        error: this.handleError(error),
        success: false,
      };
    }
  }

  /**
   * Update product inventory
   */
  async updateInventory(
    id: string, 
    availableQuantity: number
  ): Promise<RepositoryResult<Product>> {
    const response = await this.client
      .from(this.tableName)
      .update({ 
        available_quantity: availableQuantity,
        updated_at: new Date().toISOString(),
        ...this.getUpdateAuditFields(),
      })
      .eq('id', id)
      .select()
      .single();

    return this.handleResponse<Product>(response);
  }

  /**
   * Get featured products
   */
  async getFeatured(limit: number = 10): Promise<RepositoryResult<Product[]>> {
    const response = await this.client
      .from(this.tableName)
      .select('*')
      .eq('is_featured', true)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    return this.handleResponse<Product[]>(response);
  }

  /**
   * Get low stock products
   */
  async getLowStock(): Promise<RepositoryResult<Product[]>> {
    const response = await this.client
      .from(this.tableName)
      .select('*')
      .eq('track_inventory', true)
      .lt('available_quantity', 'low_stock_threshold')
      .gt('available_quantity', 0)
      .order('available_quantity', { ascending: true });

    return this.handleResponse<Product[]>(response);
  }
}

// Export singleton instance
export const productRepository = new ProductRepository();
