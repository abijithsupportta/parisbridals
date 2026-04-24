-- ============================================================
-- Banners Table Migration
-- Creates the banners table for promotional banners
-- ============================================================

-- Create banners table
CREATE TABLE IF NOT EXISTS public.banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID,
  title TEXT,
  subtitle TEXT,
  description TEXT,
  call_to_action TEXT,
  web_image_url TEXT NOT NULL,
  mobile_image_url TEXT,
  redirect_type TEXT NOT NULL DEFAULT 'none',
  redirect_target_id UUID,
  redirect_url TEXT,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  start_date DATE,
  end_date DATE,
  alt_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  created_at_branch_id UUID,
  updated_by UUID,
  updated_at_branch_id UUID
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_banners_is_active ON public.banners(is_active);
CREATE INDEX IF NOT EXISTS idx_banners_priority ON public.banners(priority DESC);
CREATE INDEX IF NOT EXISTS idx_banners_redirect_type ON public.banners(redirect_type);
CREATE INDEX IF NOT EXISTS idx_banners_dates ON public.banners(start_date, end_date);

-- Add updated_at trigger
DROP TRIGGER IF EXISTS update_banners_updated_at ON public.banners;
CREATE TRIGGER update_banners_updated_at
  BEFORE UPDATE ON public.banners
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "banners_select_authenticated" ON public.banners;
DROP POLICY IF EXISTS "banners_insert_admin_manager" ON public.banners;
DROP POLICY IF EXISTS "banners_update_admin_manager" ON public.banners;
DROP POLICY IF EXISTS "banners_delete_admin" ON public.banners;

-- RLS Policies
-- All authenticated users can read banners
CREATE POLICY "banners_select_authenticated" ON public.banners
  FOR SELECT TO authenticated
  USING (true);

-- Only admins and managers can create banners
CREATE POLICY "banners_insert_admin_manager" ON public.banners
  FOR INSERT TO authenticated
  WITH CHECK (is_manager_or_admin());

-- Only admins and managers can update banners
CREATE POLICY "banners_update_admin_manager" ON public.banners
  FOR UPDATE TO authenticated
  USING (is_manager_or_admin())
  WITH CHECK (is_manager_or_admin());

-- Only admins can delete banners
CREATE POLICY "banners_delete_admin" ON public.banners
  FOR DELETE TO authenticated
  USING (is_admin());

-- Grant access to service role
GRANT ALL ON public.banners TO service_role;
