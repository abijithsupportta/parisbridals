/**
 * Branch Inventory Service
 *
 * Business logic layer for branch inventory operations.
 *
 * @module services/branchInventoryService
 */

import { 
  branchInventoryRepository,
  branchRepository,
  productRepository,
  RepositoryResult 
} from '@/repository';
import { 
  BranchInventory,
  CreateBranchInventoryDTO,
  UpdateBranchInventoryDTO,
  InventoryAdjustment
} from '@/domain';
import { 
  CreateBranchInventorySchema,
  UpdateBranchInventorySchema,
  InventoryAdjustmentSchema
} from '@/domain/schemas';

export class BranchInventoryService {
  /**
   * Get branch inventory by ID
   */
  async getBranchInventoryById(id: string): Promise<RepositoryResult<BranchInventory>> {
    return branchInventoryRepository.getBranchInventoryById(id);
  }

  /**
   * Get inventory for a specific branch
   */
  async getInventoryByBranch(branchId: string): Promise<RepositoryResult<BranchInventory[]>> {
    return branchInventoryRepository.getInventoryByBranch(branchId);
  }

  /**
   * Get inventory for a specific product across all branches
   */
  async getInventoryByProduct(productId: string): Promise<RepositoryResult<BranchInventory[]>> {
    return branchInventoryRepository.getInventoryByProduct(productId);
  }

  /**
   * Get specific branch inventory for a product
   */
  async getBranchProductInventory(branchId: string, productId: string): Promise<RepositoryResult<BranchInventory | null>> {
    return branchInventoryRepository.getBranchProductInventory(branchId, productId);
  }

  /**
   * Create branch inventory
   */
  async createBranchInventory(inventory: CreateBranchInventoryDTO): Promise<RepositoryResult<BranchInventory>> {
    // Validate input
    const validationResult = CreateBranchInventorySchema.safeParse(inventory);
    if (!validationResult.success) {
      return {
        success: false,
        data: null,
        error: {
          message: 'Validation failed',
          details: validationResult.error.issues
        } as any
      };
    }

    // Check if inventory already exists for this branch-product combination
    const existingResult = await branchInventoryRepository.getBranchProductInventory(
      inventory.branch_id,
      inventory.product_id
    );
    if (existingResult.success && existingResult.data) {
      return {
        success: false,
        data: null,
        error: { message: 'Inventory already exists for this branch and product', code: 'INVENTORY_EXISTS' } as any
      };
    }

    return branchInventoryRepository.createBranchInventory(inventory);
  }

  /**
   * Update branch inventory
   */
  async updateBranchInventory(id: string, inventory: UpdateBranchInventoryDTO): Promise<RepositoryResult<BranchInventory>> {
    // Validate input
    const validationResult = UpdateBranchInventorySchema.safeParse(inventory);
    if (!validationResult.success) {
      return {
        success: false,
        data: null,
        error: {
          message: 'Validation failed',
          details: validationResult.error.issues
        } as any
      };
    }

    return branchInventoryRepository.updateBranchInventory(id, inventory);
  }

  /**
   * Delete branch inventory
   */
  async deleteBranchInventory(id: string): Promise<RepositoryResult<null>> {
    return branchInventoryRepository.deleteBranchInventory(id);
  }

  /**
   * Adjust inventory quantity
   */
  async adjustInventoryQuantity(adjustment: InventoryAdjustment): Promise<RepositoryResult<BranchInventory>> {
    // Validate input
    const validationResult = InventoryAdjustmentSchema.safeParse(adjustment);
    if (!validationResult.success) {
      return {
        success: false,
        data: null,
        error: {
          message: 'Validation failed',
          details: validationResult.error.issues
        } as any
      };
    }

    return branchInventoryRepository.adjustInventoryQuantity(
      adjustment.branch_id,
      adjustment.product_id,
      adjustment.quantity_adjustment
    );
  }

  /**
   * Get low stock items for a branch
   */
  async getLowStockItems(branchId: string): Promise<RepositoryResult<BranchInventory[]>> {
    return branchInventoryRepository.getLowStockItems(branchId);
  }

  /**
   * Get all branch inventory
   */
  async getAllBranchInventory(): Promise<RepositoryResult<BranchInventory[]>> {
    return branchInventoryRepository.getAllBranchInventory();
  }

  /**
   * Initialize inventory for a new product across all branches
   */
  async initializeProductInventory(productId: string): Promise<RepositoryResult<BranchInventory[]>> {
    // Get all branches - using a different approach since getAllBranches doesn't exist
    const branchesResult = await branchRepository.findAll('default');
    if (!branchesResult.success || !branchesResult.data) {
      return {
        success: false,
        data: [],
        error: { message: 'Failed to fetch branches' } as any
      };
    }

    const branches = branchesResult.data;
    const inventoryResults: BranchInventory[] = [];

    for (const branch of branches) {
      const createResult = await this.createBranchInventory({
        branch_id: branch.id,
        product_id: productId,
        quantity: 0,
        available_quantity: 0,
        low_stock_threshold: 5,
        is_active: true,
      });

      if (createResult.success && createResult.data) {
        inventoryResults.push(createResult.data);
      }
    }

    return {
      success: true,
      data: inventoryResults,
      error: null
    };
  }
}

// Singleton instance
export const branchInventoryService = new BranchInventoryService();
