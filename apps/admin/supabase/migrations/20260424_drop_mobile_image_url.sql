-- ============================================================
-- Drop Mobile Image URL Column
-- Removes the mobile_image_url column as we now use web_image_url for both web and mobile
-- ============================================================

-- Drop the mobile_image_url column
ALTER TABLE public.banners
DROP COLUMN IF EXISTS mobile_image_url;
