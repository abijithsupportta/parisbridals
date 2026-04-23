-- Migration: Drop restrictive RLS policies from settings table
-- Service role bypasses RLS automatically, so explicit policies are not needed
-- API routes already have auth guards (apiGuard, adminOnly)

-- Drop RLS policies from settings table
DROP POLICY IF EXISTS "Admins can manage settings" ON settings;
DROP POLICY IF EXISTS "Admins can insert settings" ON settings;
DROP POLICY IF EXISTS "Service role bypass" ON settings;

-- Disable RLS for settings table (service role bypasses it anyway)
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;
