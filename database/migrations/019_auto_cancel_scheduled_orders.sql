-- Migration 019: Auto-cancel expired scheduled orders support
-- Creates the database function for restoring stock when an order is cancelled.

-- Function: restore_cancelled_order_stock
-- When an order is cancelled, its reserved stock needs to be released:
--   reserved_quantity -= quantity
--   available_quantity += quantity
CREATE OR REPLACE FUNCTION restore_cancelled_order_stock(
  p_product_id UUID,
  p_quantity INT
) RETURNS VOID AS $$
BEGIN
  UPDATE products
  SET
    reserved_quantity = GREATEST(0, reserved_quantity - p_quantity),
    available_quantity = available_quantity + p_quantity,
    updated_at = NOW()
  WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql;
