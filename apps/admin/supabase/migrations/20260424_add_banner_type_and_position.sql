-- ============================================================
-- Add Banner Type and Position Fields
-- Adds banner_type (hero, editorial, split) and position fields
-- ============================================================

-- Add banner_type column
ALTER TABLE public.banners 
ADD COLUMN IF NOT EXISTS banner_type TEXT NOT NULL DEFAULT 'hero';

-- Add check constraint for banner_type
ALTER TABLE public.banners 
DROP CONSTRAINT IF EXISTS banners_banner_type_check;
ALTER TABLE public.banners 
ADD CONSTRAINT banners_banner_type_check 
CHECK (banner_type IN ('hero', 'editorial', 'split'));

-- Add position column
ALTER TABLE public.banners 
ADD COLUMN IF NOT EXISTS position TEXT;

-- Add index for banner_type filtering
CREATE INDEX IF NOT EXISTS idx_banners_banner_type ON public.banners(banner_type);

-- Add composite index for ordering by type and position
CREATE INDEX IF NOT EXISTS idx_banners_type_position ON public.banners(banner_type, position);

-- Update existing banners to default to hero type
UPDATE public.banners 
SET banner_type = 'hero' 
WHERE banner_type IS NULL OR banner_type = '';
