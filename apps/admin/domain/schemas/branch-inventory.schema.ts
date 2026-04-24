/**
 * Branch Inventory Validation Schemas
 *
 * Zod schemas for branch inventory validation.
 */

import { z } from 'zod';

export const CreateBranchInventorySchema = z.object({
  branch_id: z.string().uuid('Invalid branch ID format'),
  product_id: z.string().uuid('Invalid product ID format'),
  quantity: z.number().int().min(0, 'Quantity must be non-negative').optional(),
  available_quantity: z.number().int().min(0, 'Available quantity must be non-negative').optional(),
  low_stock_threshold: z.number().int().min(0, 'Low stock threshold must be non-negative').optional(),
  is_active: z.boolean().optional(),
});

export const UpdateBranchInventorySchema = z.object({
  quantity: z.number().int().min(0, 'Quantity must be non-negative').optional(),
  available_quantity: z.number().int().min(0, 'Available quantity must be non-negative').optional(),
  low_stock_threshold: z.number().int().min(0, 'Low stock threshold must be non-negative').optional(),
  is_active: z.boolean().optional(),
}).refine((data) => {
  if (data.available_quantity !== undefined && data.quantity !== undefined) {
    return data.available_quantity <= data.quantity;
  }
  return true;
}, {
  message: 'Available quantity cannot exceed total quantity',
});

export const InventoryAdjustmentSchema = z.object({
  branch_id: z.string().uuid('Invalid branch ID format'),
  product_id: z.string().uuid('Invalid product ID format'),
  quantity_adjustment: z.number().int('Quantity adjustment must be an integer'),
  reason: z.string().max(500, 'Reason must be less than 500 characters').optional(),
});

export type CreateBranchInventoryInput = z.infer<typeof CreateBranchInventorySchema>;
export type UpdateBranchInventoryInput = z.infer<typeof UpdateBranchInventorySchema>;
export type InventoryAdjustmentInput = z.infer<typeof InventoryAdjustmentSchema>;
