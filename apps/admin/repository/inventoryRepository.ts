/**
 * Product Inventory Repository
 *
 * Data access layer for per-branch product inventory.
 *
 * @module repository/inventoryRepository
 */

import { BaseRepository, RepositoryResult } from './supabaseClient';
import { 
  ProductInventory,
  ProductInventoryWithBranch,
  CreateProductInventoryDTO,
  UpdateProductInventoryDTO,
  ProductInventorySearchParams
} from '@/domain/types/inventory';

export class ProductInventoryRepository extends BaseRepository {
  private readonly tableName = 'product_inventory';

  /**
   * Find all inventory records with optional filtering
   */
  async findAll(params: ProductInventorySearchParams = {}): Promise<RepositoryResult<ProductInventoryWithBranch[]>> {
    const { product_id, branch_id } = params;

    let query = this.client
      .from(this.tableName)
      .select(`
        *,
        branch:branches(id, name),
        product:products(id, name, slug)
      `);

    if (product_id) {
      query = query.eq('product_id', product_id);
    }

    if (branch_id) {
      query = query.eq('branch_id', branch_id);
    }

    const { data, error } = await query.order('updated_at', { ascending: false });

    return this.handleResponse<ProductInventoryWithBranch[]>({ data, error });
  }

  /**
   * Find inventory by ID
   */
  async findById(id: string): Promise<RepositoryResult<ProductInventoryWithBranch>> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select(`
        *,
        branch:branches(id, name),
        product:products(id, name, slug)
      `)
      .eq('id', id)
      .single();

    return this.handleResponse<ProductInventoryWithBranch>({ data, error });
  }

  /**
   * Find inventory by product and branch
   */
  async findByProductAndBranch(productId: string, branchId: string): Promise<RepositoryResult<ProductInventory>> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('product_id', productId)
      .eq('branch_id', branchId)
      .maybeSingle();

    return this.handleResponse<ProductInventory>({ data, error });
  }

  /**
   * Find all inventory for a product across all branches
   */
  async findByProduct(productId: string): Promise<RepositoryResult<ProductInventoryWithBranch[]>> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select(`
        *,
        branch:branches(id, name)
      `)
      .eq('product_id', productId)
      .order('updated_at', { ascending: false });

    return this.handleResponse<ProductInventoryWithBranch[]>({ data, error });
  }

  /**
   * Find all inventory for a branch
   */
  async findByBranch(branchId: string): Promise<RepositoryResult<ProductInventoryWithBranch[]>> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select(`
        *,
        product:products(id, name, slug)
      `)
      .eq('branch_id', branchId)
      .order('updated_at', { ascending: false });

    return this.handleResponse<ProductInventoryWithBranch[]>({ data, error });
  }

  /**
   * Create inventory record
   */
  async create(data: CreateProductInventoryDTO): Promise<RepositoryResult<ProductInventory>> {
    const { data: inventory, error } = await this.client
      .from(this.tableName)
      .insert({
        ...data,
        ...this.getCreateAuditFields(),
      })
      .select()
      .single();

    return this.handleResponse<ProductInventory>({ data: inventory, error });
  }

  /**
   * Update inventory record
   */
  async update(id: string, data: UpdateProductInventoryDTO): Promise<RepositoryResult<ProductInventory>> {
    const { data: inventory, error } = await this.client
      .from(this.tableName)
      .update({
        ...data,
        updated_at: new Date().toISOString(),
        ...this.getUpdateAuditFields(),
      })
      .eq('id', id)
      .select()
      .single();

    return this.handleResponse<ProductInventory>({ data: inventory, error });
  }

  /**
   * Delete inventory record
   */
  async delete(id: string): Promise<RepositoryResult<boolean>> {
    const { error } = await this.client
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) return { data: null, error, success: false };
    return { data: true, error: null, success: true };
  }

  /**
   * Update available quantity for a product at a branch
   */
  async updateAvailableQuantity(
    productId: string,
    branchId: string,
    availableQuantity: number
  ): Promise<RepositoryResult<ProductInventory>> {
    // Try to find existing record first
    const existing = await this.findByProductAndBranch(productId, branchId);

    if (existing.success && existing.data) {
      // Update existing
      return this.update(existing.data.id, { available_quantity: availableQuantity });
    } else {
      // Create new record
      return this.create({
        product_id: productId,
        branch_id: branchId,
        quantity: availableQuantity,
        available_quantity: availableQuantity,
      });
    }
  }
}

export const inventoryRepository = new ProductInventoryRepository();
