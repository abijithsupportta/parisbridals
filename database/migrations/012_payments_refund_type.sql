-- Migration: Add 'refund' and 'advance' to payments_payment_type_check constraint
-- This enables tracking security deposit refunds and advance payments

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_payment_type_check;
ALTER TABLE payments ADD CONSTRAINT payments_payment_type_check 
  CHECK (payment_type IN ('deposit', 'advance', 'final', 'refund'));
