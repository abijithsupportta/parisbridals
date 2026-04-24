/**
 * Branch Inventory Repository
 *
 * Data access layer for branch inventory operations.
 *
 * @module repository/branchInventoryRepository
 */

import { BaseRepository, RepositoryResult } from './supabaseClient';
import { 
  BranchInventory, 
  CreateBranchInventoryDTO, 
  UpdateBranchInventoryDTO 
} from '@/domain';

export class BranchInventoryRepository extends BaseRepository {
  /**
   * Get branch inventory by ID
   */
  async getBranchInventoryById(id: string): Promise<RepositoryResult<BranchInventory>> {
    const { data, error } = await this.client
      .from('product_inventory')
      .select(`
        *,
        branch:branches(id, name),
        product:products(id, name, sku, images)
      `)
      .eq('id', id)
      .single();

    return this.handleResponse({ data: data as any, error });
  }

  /**
   * Get inventory for a specific branch
   */
  async getInventoryByBranch(branchId: string): Promise<RepositoryResult<BranchInventory[]>> {
    const { data, error } = await this.client
      .from('product_inventory')
      .select(`
        *,
        product:products(id, name, sku, images)
      `)
      .eq('branch_id', branchId)
      .order('created_at', { ascending: false });

    return this.handleResponse({ data: data as any, error });
  }

  /**
   * Get inventory for a specific product across all branches
   */
  async getInventoryByProduct(productId: string): Promise<RepositoryResult<BranchInventory[]>> {
    const { data, error } = await this.client
      .from('product_inventory')
      .select(`
        *,
        branch:branches(id, name)
      `)
      .eq('product_id', productId)
      .order('created_at', { ascending: false });

    return this.handleResponse({ data: data as any, error });
  }

  /**
   * Get specific branch inventory for a product
   */
  async getBranchProductInventory(branchId: string, productId: string): Promise<RepositoryResult<BranchInventory | null>> {
    const { data, error } = await this.client
      .from('product_inventory')
      .select('*')
      .eq('branch_id', branchId)
      .eq('product_id', productId)
      .maybeSingle();

    return this.handleResponse({ data: data as any, error });
  }

  /**
   * Create branch inventory
   */
  async createBranchInventory(inventory: CreateBranchInventoryDTO): Promise<RepositoryResult<BranchInventory>> {
    const { data, error } = await this.client
      .from('product_inventory')
      .insert({
        ...inventory,
        quantity: inventory.quantity ?? 0,
        available_quantity: inventory.available_quantity ?? 0,
        low_stock_threshold: inventory.low_stock_threshold ?? 5,
        is_active: inventory.is_active ?? true,
      })
      .select()
      .single();

    return this.handleResponse({ data: data as any, error });
  }

  /**
   * Update branch inventory
   */
  async updateBranchInventory(id: string, inventory: UpdateBranchInventoryDTO): Promise<RepositoryResult<BranchInventory>> {
    const { data, error } = await this.client
      .from('product_inventory')
      .update(inventory)
      .eq('id', id)
      .select()
      .single();

    return this.handleResponse({ data: data as any, error });
  }

  /**
   * Delete branch inventory
   */
  async deleteBranchInventory(id: string): Promise<RepositoryResult<null>> {
    const { error } = await this.client
      .from('product_inventory')
      .delete()
      .eq('id', id);

    return this.handleResponse({ data: null, error });
  }

  /**
   * Adjust inventory quantity
   */
  async adjustInventoryQuantity(
    branchId: string, 
    productId: string, 
    adjustment: number
  ): Promise<RepositoryResult<BranchInventory>> {
    // First get current inventory
    const currentResult = await this.getBranchProductInventory(branchId, productId);
    if (!currentResult.success || !currentResult.data) {
      return { success: false, data: null, error: { message: 'Inventory not found', code: 'NOT_FOUND' } as any };
    }

    const current = currentResult.data;
    const newQuantity = Math.max(0, current.quantity + adjustment);
    const newAvailable = Math.max(0, Math.min(current.available_quantity + adjustment, newQuantity));

    const { data, error } = await this.client
      .from('product_inventory')
      .update({
        quantity: newQuantity,
        available_quantity: newAvailable,
      })
      .eq('id', current.id)
      .select()
      .single();

    return this.handleResponse({ data: data as any, error });
  }

  /**
   * Get low stock items for a branch
   */
  async getLowStockItems(branchId: string): Promise<RepositoryResult<BranchInventory[]>> {
    const { data, error } = await this.client
      .from('product_inventory')
      .select(`
        *,
        product:products(id, name, sku, images)
      `)
      .eq('branch_id', branchId)
      .order('available_quantity', { ascending: true });

    if (error) return { success: false, data: [], error };
    
    // Filter low stock items in JavaScript
    const lowStockItems = (data as any[]).filter((item: any) => 
      item.available_quantity <= item.low_stock_threshold
    );
    
    return { success: true, data: lowStockItems as any, error: null };
  }

  /**
   * Get all branch inventory
   */
  async getAllBranchInventory(): Promise<RepositoryResult<BranchInventory[]>> {
    const { data, error } = await this.client
      .from('product_inventory')
      .select(`
        *,
        branch:branches(id, name),
        product:products(id, name, sku, images)
      `)
      .order('created_at', { ascending: false });

    return this.handleResponse({ data: data as any, error });
  }
}

// Singleton instance
export const branchInventoryRepository = new BranchInventoryRepository();
