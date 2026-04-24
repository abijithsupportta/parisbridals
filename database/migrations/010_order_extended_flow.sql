-- Migration: Order Extended Flow (Deposits, Item Returns, New Statuses)
-- Adds detailed deposit tracking, item-level returns, and extended order statuses.

-- 1. Drop existing check constraints for status
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE order_status_history DROP CONSTRAINT IF EXISTS order_status_history_status_check;

-- 2. Add new check constraints with extended statuses
ALTER TABLE orders ADD CONSTRAINT orders_status_check 
  CHECK (status IN ('pending', 'confirmed', 'scheduled', 'delivered', 'in_use', 'ongoing', 'partial', 'returned', 'completed', 'cancelled', 'flagged', 'late_return'));

ALTER TABLE order_status_history ADD CONSTRAINT order_status_history_status_check 
  CHECK (status IN ('pending', 'confirmed', 'scheduled', 'delivered', 'in_use', 'ongoing', 'partial', 'returned', 'completed', 'cancelled', 'flagged', 'late_return'));

-- 3. Add Deposit tracking columns to orders
ALTER TABLE orders 
  ADD COLUMN IF NOT EXISTS deposit_collected BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS deposit_collected_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS deposit_payment_method VARCHAR(50) CHECK (deposit_payment_method IN ('cash', 'upi', 'bank_transfer', 'card', 'other'));

-- 4. Add Item-level return tracking to order_items
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS is_returned BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS returned_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS returned_quantity INTEGER DEFAULT 0;
