-- Migration: Staff auth, RLS policies for all tables
-- Enable RLS on ALL tables with proper security policies

-- ═══════════════════════════════════════════════════════════════
-- 1. Add user_id to staff table for Supabase Auth linking
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE staff ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_staff_user_id ON staff(user_id);

-- ═══════════════════════════════════════════════════════════════
-- 2. Enable RLS on ALL tables
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════
-- 3. Service Role bypasses RLS automatically (no policy needed)
--    Admin panel uses service_role key via API routes.
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- 4. Authenticated user policies (for staff login)
--    Staff can READ data scoped to their branch.
--    Write operations go through API routes (service role).
-- ═══════════════════════════════════════════════════════════════

-- Helper: get current user's branch_id from staff table
CREATE OR REPLACE FUNCTION get_user_branch_id()
RETURNS UUID AS $$
  SELECT branch_id FROM staff WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Helper: get current user's role from staff table
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM staff WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Helper: check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS(SELECT 1 FROM staff WHERE user_id = auth.uid() AND role = 'admin');
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ─── Stores ──────────────────────────────────────────────────
-- All authenticated users can read stores
DROP POLICY IF EXISTS "stores_select_authenticated" ON stores;
CREATE POLICY "stores_select_authenticated" ON stores
  FOR SELECT TO authenticated USING (true);

-- Only service_role can mutate stores (no policy needed, bypasses RLS)

-- ─── Branches ────────────────────────────────────────────────
-- Admin: can see all branches. Staff: can see their own branch only.
DROP POLICY IF EXISTS "branches_select_authenticated" ON branches;
CREATE POLICY "branches_select_authenticated" ON branches
  FOR SELECT TO authenticated
  USING (is_admin() OR id = get_user_branch_id());

-- ─── Staff ───────────────────────────────────────────────────
-- Admin: can see all staff. Staff: can see own record only.
DROP POLICY IF EXISTS "staff_select_authenticated" ON staff;
CREATE POLICY "staff_select_authenticated" ON staff
  FOR SELECT TO authenticated
  USING (is_admin() OR user_id = auth.uid());

-- ─── Categories ──────────────────────────────────────────────
-- All authenticated users can read categories
DROP POLICY IF EXISTS "categories_select_authenticated" ON categories;
CREATE POLICY "categories_select_authenticated" ON categories
  FOR SELECT TO authenticated USING (true);

-- ─── Products ────────────────────────────────────────────────
-- Admin: all products. Staff: products in their branch only.
DROP POLICY IF EXISTS "products_select_authenticated" ON products;
CREATE POLICY "products_select_authenticated" ON products
  FOR SELECT TO authenticated
  USING (is_admin() OR branch_id = get_user_branch_id() OR branch_id IS NULL);

-- ─── Orders ──────────────────────────────────────────────────
-- Admin: all orders. Staff: orders in their branch only.
DROP POLICY IF EXISTS "orders_select_authenticated" ON orders;
CREATE POLICY "orders_select_authenticated" ON orders
  FOR SELECT TO authenticated
  USING (is_admin() OR branch_id = get_user_branch_id());

-- ─── Order Items ─────────────────────────────────────────────
-- Accessible if the parent order is accessible
DROP POLICY IF EXISTS "order_items_select_authenticated" ON order_items;
CREATE POLICY "order_items_select_authenticated" ON order_items
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM orders WHERE orders.id = order_items.order_id
    AND (is_admin() OR orders.branch_id = get_user_branch_id())
  ));
