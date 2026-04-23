/**
 * Product Inventory Domain Types
 *
 * Type definitions for per-branch product inventory.
 *
 * @module domain/types/inventory
 */

// Core ProductInventory Entity
export interface ProductInventory {
  readonly id: string;
  readonly product_id: string;
  readonly branch_id: string;
  quantity: number;
  available_quantity: number;
  low_stock_threshold: number;
  created_at: string;
  updated_at?: string;
  // Audit fields
  readonly created_by: string | null;
  readonly created_at_branch_id: string | null;
  readonly updated_by: string | null;
  readonly updated_at_branch_id: string | null;
}

// ProductInventory with Relations
export interface ProductInventoryWithBranch extends ProductInventory {
  branch?: {
    id: string;
    name: string;
  };
  product?: {
    id: string;
    name: string;
    slug: string;
  };
}

// ProductInventory Create DTO
export interface CreateProductInventoryDTO {
  product_id: string;
  branch_id: string;
  quantity: number;
  available_quantity?: number;
  low_stock_threshold?: number;
}

// ProductInventory Update DTO
export interface UpdateProductInventoryDTO {
  quantity?: number;
  available_quantity?: number;
  low_stock_threshold?: number;
}

// ProductInventory Search Parameters
export interface ProductInventorySearchParams {
  product_id?: string;
  branch_id?: string;
  limit?: number;
  offset?: number;
}
