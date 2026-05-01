-- Migration: 018_fix_function_search_paths.sql
-- Fixes two categories of Supabase security warnings:
--
-- 1. Mutable search_path: All SECURITY DEFINER functions are recreated with
--    SET search_path = public to prevent schema injection attacks.
--
-- 2. Anon-executable SECURITY DEFINER functions: Revoke EXECUTE from anon
--    (and authenticated where appropriate) so these internal functions cannot
--    be called directly via the PostgREST REST API without a service_role key.
--
-- NOTE: RLS policies that internally call these functions (is_admin, get_user_role,
-- etc.) are NOT affected — RLS policy checks run under the function owner's
-- privileges, not the calling role's privileges.
-- Service_role key usage in Next.js API routes is also NOT affected.

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. Fix search_path for all helper functions
-- ═══════════════════════════════════════════════════════════════════════════════

-- update_updated_at_column (trigger function, used on all tables)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- get_user_branch_id (used in RLS policies)
CREATE OR REPLACE FUNCTION public.get_user_branch_id()
RETURNS UUID AS $$
  SELECT branch_id FROM staff WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE
SET search_path = public;

-- get_user_role (used in RLS policies)
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM staff WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE
SET search_path = public;

-- is_admin (used in RLS policies)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM staff
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin')
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE
SET search_path = public;

-- is_super_admin (used in RLS policies)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM staff
    WHERE user_id = auth.uid()
    AND role = 'super_admin'
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE
SET search_path = public;

-- is_manager_or_admin (used in RLS policies)
CREATE OR REPLACE FUNCTION public.is_manager_or_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM staff
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin', 'manager')
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE
SET search_path = public;

-- update_branch_inventory_updated_at (trigger function)
CREATE OR REPLACE FUNCTION public.update_branch_inventory_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. Revoke EXECUTE from PUBLIC
--    In PostgreSQL, functions are granted EXECUTE to PUBLIC by default.
--    Revoking from individual roles (anon, authenticated) has no effect because
--    those roles inherit the grant from PUBLIC. We must revoke from PUBLIC itself.
--    Service_role bypasses EXECUTE grants entirely and is unaffected.
-- ═══════════════════════════════════════════════════════════════════════════════

-- Internal RLS helper functions
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_super_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_manager_or_admin() FROM PUBLIC;

-- Role/branch getters
REVOKE EXECUTE ON FUNCTION public.get_user_role() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_branch_id() FROM PUBLIC;

-- rls_auto_enable — utility function, should never be callable externally
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC;

-- Staff mutation functions — called from Next.js API via service_role only
REVOKE EXECUTE ON FUNCTION public.create_staff_member(uuid, text, text, text, uuid, uuid, text, boolean) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_staff_member(uuid) FROM PUBLIC;

-- Order creation function — called from Next.js API via service_role only
REVOKE EXECUTE ON FUNCTION public.create_order_with_items(jsonb, jsonb) FROM PUBLIC;
