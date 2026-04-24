/**
 * Branch Inventory Types
 *
 * Types for branch-specific product inventory management.
 */

export interface BranchInventory {
  id: string;
  branch_id: string;
  product_id: string;
  quantity: number;
  available_quantity: number;
  low_stock_threshold: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface CreateBranchInventoryDTO {
  branch_id: string;
  product_id: string;
  quantity?: number;
  available_quantity?: number;
  low_stock_threshold?: number;
  is_active?: boolean;
}

export interface UpdateBranchInventoryDTO {
  quantity?: number;
  available_quantity?: number;
  low_stock_threshold?: number;
  is_active?: boolean;
}

export interface BranchInventoryWithRelations extends BranchInventory {
  branch?: {
    id: string;
    name: string;
  };
  product?: {
    id: string;
    name: string;
    sku?: string;
    images?: string[];
  };
}

export interface InventoryAdjustment {
  branch_id: string;
  product_id: string;
  quantity_adjustment: number; // Positive for additions, negative for subtractions
  reason?: string;
}
