-- Migration: 017_fix_settings_rls.sql
-- Re-enable RLS on the settings table.
--
-- Context: Migration 006 disabled RLS on settings because service_role bypasses
-- it anyway. However, Supabase flags any public table without RLS as a critical
-- security error — anonymous users can reach it via PostgREST without auth.
--
-- Fix: Re-enable RLS. No permissive policies are created, so anon/authenticated
-- roles are implicitly denied. Service_role continues to bypass RLS as always,
-- so all existing API routes remain completely unaffected.

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
