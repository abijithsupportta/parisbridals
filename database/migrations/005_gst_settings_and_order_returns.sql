-- Migration: GST Settings and Order Returns Enhancement
-- This migration adds settings table for GST configuration and updates orders/order_items for return processing

-- Settings table for store-wide configuration
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  key VARCHAR(100) NOT NULL,
  value TEXT NOT NULL,
  updated_by UUID REFERENCES staff(id) ON DELETE SET NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(store_id, key)
);

-- Add missing columns to orders table
ALTER TABLE orders 
  ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gst_amount DECIMAL(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gst_percentage DECIMAL(5, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deposit_returned BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS deposit_returned_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS delivery_method VARCHAR(50) CHECK (delivery_method IN ('pickup', 'delivery')),
  ADD COLUMN IF NOT EXISTS delivery_address TEXT,
  ADD COLUMN IF NOT EXISTS pickup_address TEXT,
  ADD COLUMN IF NOT EXISTS event_date DATE;

-- Add missing columns to order_items table
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS condition_rating VARCHAR(20) CHECK (condition_rating IN ('excellent', 'good', 'fair', 'damaged')),
  ADD COLUMN IF NOT EXISTS damage_description TEXT,
  ADD COLUMN IF NOT EXISTS damage_charges DECIMAL(10, 2) DEFAULT 0;

-- Update order status check constraint to include new statuses
ALTER TABLE orders 
  DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE orders 
  ADD CONSTRAINT orders_status_check 
  CHECK (status IN ('pending', 'confirmed', 'delivered', 'in_use', 'returned', 'completed', 'cancelled', 'late_return'));

-- Update order_status_history status check constraint
ALTER TABLE order_status_history
  DROP CONSTRAINT IF EXISTS order_status_history_status_check;

ALTER TABLE order_status_history
  ADD CONSTRAINT order_status_history_status_check
  CHECK (status IN ('pending', 'confirmed', 'delivered', 'in_use', 'returned', 'completed', 'cancelled', 'late_return'));

-- Insert default GST setting for existing stores (18% default)
INSERT INTO settings (store_id, key, value, updated_by)
SELECT id, 'gst_percentage', '18.00', NULL
FROM stores
WHERE NOT EXISTS (
  SELECT 1 FROM settings s 
  WHERE s.store_id = stores.id AND s.key = 'gst_percentage'
);

-- Create indexes for settings table
CREATE INDEX IF NOT EXISTS idx_settings_store_id ON settings(store_id);
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);

-- Create index for orders delivery method
CREATE INDEX IF NOT EXISTS idx_orders_delivery_method ON orders(delivery_method);

-- Create index for orders deposit returned
CREATE INDEX IF NOT EXISTS idx_orders_deposit_returned ON orders(deposit_returned);

-- Create index for order_items condition rating
CREATE INDEX IF NOT EXISTS idx_order_items_condition_rating ON order_items(condition_rating);

-- Add updated_at trigger for settings table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_settings_updated_at'
    AND tgrelid = 'settings'::regclass
  ) THEN
    CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Enable RLS for settings table
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow admins to manage settings (SELECT, UPDATE, DELETE)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Admins can manage settings'
    AND tablename = 'settings'
  ) THEN
    CREATE POLICY "Admins can manage settings" ON settings
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM staff
          WHERE staff.id = auth.uid()
          AND staff.role = 'admin'
        )
      );
  END IF;
END $$;

-- RLS Policy: Allow admins to insert settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Admins can insert settings'
    AND tablename = 'settings'
  ) THEN
    CREATE POLICY "Admins can insert settings" ON settings
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM staff
          WHERE staff.id = auth.uid()
          AND staff.role = 'admin'
        )
      );
  END IF;
END $$;

-- RLS Policy: Allow service role to bypass RLS (for admin operations)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Service role bypass'
    AND tablename = 'settings'
  ) THEN
    CREATE POLICY "Service role bypass" ON settings
      FOR ALL
      USING (auth.role() = 'service_role');
  END IF;
END $$;
