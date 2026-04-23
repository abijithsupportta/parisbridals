-- Migration: Payments Table and Invoice Settings
-- This migration adds payment tracking and invoice configuration

-- Payments table to track security deposit and final payment
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  payment_type VARCHAR(20) NOT NULL CHECK (payment_type IN ('deposit', 'final')),
  amount DECIMAL(10, 2) NOT NULL,
  payment_mode VARCHAR(50) NOT NULL CHECK (payment_mode IN ('cash', 'upi', 'card', 'bank_transfer', 'cheque')),
  transaction_id VARCHAR(100),
  payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  created_by UUID REFERENCES staff(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default invoice settings for existing stores
INSERT INTO settings (store_id, key, value, updated_at)
SELECT 
  id,
  'invoice_prefix',
  'INV-',
  NOW()
FROM stores
ON CONFLICT (store_id, key) DO NOTHING;

INSERT INTO settings (store_id, key, value, updated_at)
SELECT 
  id,
  'payment_terms',
  'Payment must be made before or at the time of delivery. Security deposit is refundable upon return of items in good condition.',
  NOW()
FROM stores
ON CONFLICT (store_id, key) DO NOTHING;

INSERT INTO settings (store_id, key, value, updated_at)
SELECT 
  id,
  'authorized_signature',
  'Authorized Signatory',
  NOW()
FROM stores
ON CONFLICT (store_id, key) DO NOTHING;

-- Create indexes for payments table
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_type ON payments(payment_type);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);

-- Drop trigger if exists (for idempotent migration)
DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;

-- Add updated_at trigger for payments table
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
