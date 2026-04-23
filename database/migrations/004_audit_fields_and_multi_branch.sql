-- Migration: Add audit fields, Super Admin role, and per-branch inventory
-- This migration adds comprehensive audit logging and multi-branch support

-- ═══════════════════════════════════════════════════════════════
-- 1. Add Super Admin role to staff table
-- ═══════════════════════════════════════════════════════════════
-- Drop existing check constraint
ALTER TABLE staff DROP CONSTRAINT IF EXISTS staff_role_check;

-- Add new check constraint with super_admin
ALTER TABLE staff 
ADD CONSTRAINT staff_role_check 
CHECK (role IN ('super_admin', 'admin', 'manager', 'staff'));

-- Update is_admin() function to include super_admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM staff 
    WHERE user_id = auth.uid() 
    AND role IN ('super_admin', 'admin')
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Add is_super_admin() helper function
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM staff 
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ═══════════════════════════════════════════════════════════════
-- 2. Add audit fields to all tables
-- ═══════════════════════════════════════════════════════════════

-- Branches
ALTER TABLE branches 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES staff(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS created_at_branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES staff(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS updated_at_branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;

-- Staff
ALTER TABLE staff 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES staff(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS created_at_branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES staff(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS updated_at_branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;

-- Categories
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES staff(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS created_at_branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES staff(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS updated_at_branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;

-- Products
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES staff(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS created_at_branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES staff(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS updated_at_branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;

-- Customers
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES staff(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS created_at_branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES staff(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS updated_at_branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;

-- Orders
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES staff(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS created_at_branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES staff(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS updated_at_branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;

-- Banners
ALTER TABLE banners 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES staff(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS created_at_branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES staff(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS updated_at_branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;

-- ═══════════════════════════════════════════════════════════════
-- 3. Change categories is_global default to true
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE categories ALTER COLUMN is_global SET DEFAULT true;

-- Update existing categories to be global
UPDATE categories SET is_global = true WHERE is_global = false;

-- ═══════════════════════════════════════════════════════════════
-- 4. Add per-branch inventory system
-- ═══════════════════════════════════════════════════════════════

-- Create product_inventory table for per-branch inventory
CREATE TABLE IF NOT EXISTS product_inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0,
  available_quantity INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(product_id, branch_id)
);

-- Add indexes for product_inventory
CREATE INDEX IF NOT EXISTS idx_product_inventory_product_id ON product_inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_product_inventory_branch_id ON product_inventory(branch_id);

-- Add trigger for updated_at on product_inventory
CREATE TRIGGER update_product_inventory_updated_at 
BEFORE UPDATE ON product_inventory
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Migrate existing product inventory to new table
INSERT INTO product_inventory (product_id, branch_id, quantity, available_quantity, low_stock_threshold)
SELECT 
  p.id as product_id,
  p.branch_id as branch_id,
  p.quantity as quantity,
  p.available_quantity as available_quantity,
  p.low_stock_threshold as low_stock_threshold
FROM products p
WHERE p.branch_id IS NOT NULL
ON CONFLICT (product_id, branch_id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 5. Update RLS policies to include super_admin
-- ═══════════════════════════════════════════════════════════════

-- Update branches policy
DROP POLICY IF EXISTS "branches_select_authenticated" ON branches;
CREATE POLICY "branches_select_authenticated" ON branches
  FOR SELECT TO authenticated
  USING (is_super_admin() OR is_admin() OR id = get_user_branch_id());

-- Update staff policy
DROP POLICY IF EXISTS "staff_select_authenticated" ON staff;
CREATE POLICY "staff_select_authenticated" ON staff
  FOR SELECT TO authenticated
  USING (is_super_admin() OR is_admin() OR user_id = auth.uid());

-- Update products policy
DROP POLICY IF EXISTS "products_select_authenticated" ON products;
CREATE POLICY "products_select_authenticated" ON products
  FOR SELECT TO authenticated
  USING (is_super_admin() OR is_admin() OR branch_id = get_user_branch_id() OR branch_id IS NULL);

-- Update orders policy
DROP POLICY IF EXISTS "orders_select_authenticated" ON orders;
CREATE POLICY "orders_select_authenticated" ON orders
  FOR SELECT TO authenticated
  USING (is_super_admin() OR is_admin() OR branch_id = get_user_branch_id());

-- Update order_items policy
DROP POLICY IF EXISTS "order_items_select_authenticated" ON order_items;
CREATE POLICY "order_items_select_authenticated" ON order_items
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM orders WHERE orders.id = order_items.order_id
    AND (is_super_admin() OR is_admin() OR orders.branch_id = get_user_branch_id())
  ));

-- Add RLS for product_inventory
ALTER TABLE product_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_inventory_select_authenticated" ON product_inventory
  FOR SELECT TO authenticated
  USING (is_super_admin() OR is_admin() OR branch_id = get_user_branch_id());

-- ═══════════════════════════════════════════════════════════════
-- 6. Add indexes for audit fields
-- ═══════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_branches_created_by ON branches(created_by);
CREATE INDEX IF NOT EXISTS idx_branches_created_at_branch_id ON branches(created_at_branch_id);
CREATE INDEX IF NOT EXISTS idx_staff_created_by ON staff(created_by);
CREATE INDEX IF NOT EXISTS idx_staff_created_at_branch_id ON staff(created_at_branch_id);
CREATE INDEX IF NOT EXISTS idx_categories_created_by ON categories(created_by);
CREATE INDEX IF NOT EXISTS idx_categories_created_at_branch_id ON categories(created_at_branch_id);
CREATE INDEX IF NOT EXISTS idx_products_created_by ON products(created_by);
CREATE INDEX IF NOT EXISTS idx_products_created_at_branch_id ON products(created_at_branch_id);
CREATE INDEX IF NOT EXISTS idx_customers_created_by ON customers(created_by);
CREATE INDEX IF NOT EXISTS idx_customers_created_at_branch_id ON customers(created_at_branch_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_by ON orders(created_by);
CREATE INDEX IF NOT EXISTS idx_orders_created_at_branch_id ON orders(created_at_branch_id);
CREATE INDEX IF NOT EXISTS idx_banners_created_by ON banners(created_by);
CREATE INDEX IF NOT EXISTS idx_banners_created_at_branch_id ON banners(created_at_branch_id);
