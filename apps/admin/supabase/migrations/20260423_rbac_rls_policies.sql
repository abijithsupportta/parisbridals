-- ============================================================
-- RBAC RLS Policies for Branches & Staff
-- Run this in your Supabase SQL Editor
--
-- Enforces role-based access at the DATABASE level:
-- - Admin: full CRUD on branches and staff
-- - Manager: read-only on branches, no access to staff
-- - Staff: read-only on their own branch, no access to staff table
-- ============================================================

-- ─── Helper Functions ────────────────────────────────────────

-- Get the current user's role from the staff table
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    (SELECT role FROM public.staff WHERE user_id = auth.uid() AND is_active = true LIMIT 1),
    (auth.jwt() ->> 'role')::text,
    'admin'  -- fallback for shop owner (no staff record)
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Get the current user's branch_id from the staff table
CREATE OR REPLACE FUNCTION public.get_user_branch_id()
RETURNS UUID AS $$
  SELECT branch_id FROM public.staff WHERE user_id = auth.uid() AND is_active = true LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if the current user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT get_user_role() = 'admin';
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if the current user is a manager or admin
CREATE OR REPLACE FUNCTION public.is_manager_or_admin()
RETURNS BOOLEAN AS $$
  SELECT get_user_role() IN ('admin', 'manager');
$$ LANGUAGE sql SECURITY DEFINER STABLE;


-- ─── Enable RLS ──────────────────────────────────────────────

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;


-- ─── Drop existing policies (safe to re-run) ────────────────

DROP POLICY IF EXISTS "branches_select_authenticated" ON public.branches;
DROP POLICY IF EXISTS "branches_insert_admin" ON public.branches;
DROP POLICY IF EXISTS "branches_update_admin" ON public.branches;
DROP POLICY IF EXISTS "branches_delete_admin" ON public.branches;

DROP POLICY IF EXISTS "staff_select_admin" ON public.staff;
DROP POLICY IF EXISTS "staff_insert_admin" ON public.staff;
DROP POLICY IF EXISTS "staff_update_admin" ON public.staff;
DROP POLICY IF EXISTS "staff_delete_admin" ON public.staff;
DROP POLICY IF EXISTS "staff_select_self" ON public.staff;


-- ─── Branches Policies ──────────────────────────────────────

-- All authenticated users can read branches (needed for branch switcher)
CREATE POLICY "branches_select_authenticated" ON public.branches
  FOR SELECT TO authenticated
  USING (true);

-- Only admins can create branches
CREATE POLICY "branches_insert_admin" ON public.branches
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

-- Only admins can update branches
CREATE POLICY "branches_update_admin" ON public.branches
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Only admins can delete branches
CREATE POLICY "branches_delete_admin" ON public.branches
  FOR DELETE TO authenticated
  USING (is_admin());


-- ─── Staff Policies ─────────────────────────────────────────

-- Admins can see all staff
CREATE POLICY "staff_select_admin" ON public.staff
  FOR SELECT TO authenticated
  USING (is_admin());

-- Staff can read their own record (for profile/settings)
CREATE POLICY "staff_select_self" ON public.staff
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Only admins can create staff
CREATE POLICY "staff_insert_admin" ON public.staff
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

-- Only admins can update staff
CREATE POLICY "staff_update_admin" ON public.staff
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Only admins can delete staff
CREATE POLICY "staff_delete_admin" ON public.staff
  FOR DELETE TO authenticated
  USING (is_admin());


-- ─── Grant access to the service role ────────────────────────
-- (service_role bypasses RLS by default, but explicit for clarity)
GRANT ALL ON public.branches TO service_role;
GRANT ALL ON public.staff TO service_role;

-- ─── Verify ──────────────────────────────────────────────────
-- Run: SELECT * FROM pg_policies WHERE tablename IN ('branches', 'staff');
