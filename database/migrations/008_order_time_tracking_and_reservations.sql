-- Migration: Order Time Tracking and Inventory Reservations
-- This migration adds pickup/return time tracking and inventory reservation system

-- Add pickup_time and return_time to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS pickup_time TIME,
ADD COLUMN IF NOT EXISTS return_time TIME;

-- Add pickup_branch_id to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS pickup_branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;

-- Create order_reservations table for tracking inventory by date range
CREATE TABLE IF NOT EXISTS order_reservations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  reserved_from DATE NOT NULL,
  reserved_to DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_date_range CHECK (reserved_to >= reserved_from)
);

-- Create indexes for order_reservations
CREATE INDEX IF NOT EXISTS idx_order_reservations_product ON order_reservations(product_id);
CREATE INDEX IF NOT EXISTS idx_order_reservations_branch ON order_reservations(branch_id);
CREATE INDEX IF NOT EXISTS idx_order_reservations_date_range ON order_reservations(reserved_from, reserved_to);
CREATE INDEX IF NOT EXISTS idx_order_reservations_order ON order_reservations(order_id);

-- Drop trigger if exists (for idempotent migration)
DROP TRIGGER IF EXISTS update_order_reservations_updated_at ON order_reservations;

-- Add updated_at trigger for order_reservations table
CREATE TRIGGER update_order_reservations_updated_at BEFORE UPDATE ON order_reservations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comment to document the changes
COMMENT ON COLUMN orders.pickup_time IS 'Time when customer picks up the items';
COMMENT ON COLUMN orders.return_time IS 'Time when customer returns the items';
COMMENT ON COLUMN orders.pickup_branch_id IS 'Branch where items are picked up from';
COMMENT ON TABLE order_reservations IS 'Tracks inventory reservations by date range to prevent double-booking';
