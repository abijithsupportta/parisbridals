-- Migration: Add financial tracking columns to orders table
-- Enables the Financial Receipt to display late fees, discounts, and total damage charges.
-- These were previously calculated on-the-fly during return processing but never persisted.

ALTER TABLE orders ADD COLUMN IF NOT EXISTS late_fee DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS damage_charges_total DECIMAL(10, 2) DEFAULT 0;

-- Extend payment_type to support adjustment entries
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_payment_type_check;
ALTER TABLE payments ADD CONSTRAINT payments_payment_type_check 
  CHECK (payment_type IN ('deposit', 'advance', 'final', 'refund', 'adjustment'));
