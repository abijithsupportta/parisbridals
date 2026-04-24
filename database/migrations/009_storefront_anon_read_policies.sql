-- Migration 009: Add anonymous read policies for storefront
-- These policies allow the storefront (which uses the anon key) to read
-- public data. This does NOT affect the admin side which uses authenticated
-- or service_role keys.

-- ═══════════════════════════════════════════════════════════════
-- 1. Enable RLS on tables (idempotent — safe to re-run)
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════
-- 2. Anonymous read policies for storefront
--    Only active records are visible to the public
-- ═══════════════════════════════════════════════════════════════

-- Stores: anon can read active stores
DROP POLICY IF EXISTS "stores_anon_select" ON stores;
CREATE POLICY "stores_anon_select" ON stores
  FOR SELECT TO anon
  USING (is_active = true);

-- Categories: anon can read active categories
DROP POLICY IF EXISTS "categories_anon_select" ON categories;
CREATE POLICY "categories_anon_select" ON categories
  FOR SELECT TO anon
  USING (is_active = true);

-- Products: anon can read active products
DROP POLICY IF EXISTS "products_anon_select" ON products;
CREATE POLICY "products_anon_select" ON products
  FOR SELECT TO anon
  USING (is_active = true);

-- Banners: anon can read active banners
DROP POLICY IF EXISTS "banners_anon_select" ON banners;
CREATE POLICY "banners_anon_select" ON banners
  FOR SELECT TO anon
  USING (is_active = true);

-- ═══════════════════════════════════════════════════════════════
-- 3. Ensure authenticated users can still read all data
--    (preserves admin/manager/staff access)
-- ═══════════════════════════════════════════════════════════════

-- Stores: authenticated can read all stores
DROP POLICY IF EXISTS "stores_authenticated_select" ON stores;
CREATE POLICY "stores_authenticated_select" ON stores
  FOR SELECT TO authenticated
  USING (true);

-- Categories: authenticated can read all categories
DROP POLICY IF EXISTS "categories_authenticated_select" ON categories;
CREATE POLICY "categories_authenticated_select" ON categories
  FOR SELECT TO authenticated
  USING (true);

-- NOTE: products and banners already have authenticated policies
-- from migration 004. We don't touch those.
