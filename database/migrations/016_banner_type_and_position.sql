-- Migration 016: Add banner_type and position columns to banners table
--
-- These columns are required for the banner module to correctly categorize
-- banners into hero (carousel), editorial (single), and split (side-by-side) types.
-- Without them, all banners are treated as generic and cannot be filtered by type.

-- Add banner_type column: hero, editorial, or split
ALTER TABLE banners
  ADD COLUMN IF NOT EXISTS banner_type VARCHAR(20) DEFAULT 'hero'
    CHECK (banner_type IN ('hero', 'editorial', 'split'));

-- Add position column: numeric string (1-10) for hero, 'left'/'right' for split, null for editorial
ALTER TABLE banners
  ADD COLUMN IF NOT EXISTS position VARCHAR(20);

-- Create index for efficient type-based queries
CREATE INDEX IF NOT EXISTS idx_banners_banner_type ON banners(banner_type);

-- Backfill: set existing banners without banner_type to 'hero'
UPDATE banners SET banner_type = 'hero' WHERE banner_type IS NULL;
