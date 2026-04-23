-- Migration 002: Fix products.images from TEXT[] to JSONB
-- The app code treats images as JSONB objects {url, alt, is_primary, sort_order}
-- The DB currently has TEXT[] which causes a schema mismatch

-- Step 1: Drop old default first (prevents cast conflict)
ALTER TABLE products ALTER COLUMN images DROP DEFAULT;

-- Step 2: Alter type from TEXT[] to JSONB
ALTER TABLE products 
  ALTER COLUMN images TYPE JSONB 
  USING CASE 
    WHEN images IS NULL OR array_length(images, 1) IS NULL THEN '[]'::JSONB
    ELSE to_jsonb(images)
  END;

-- Step 3: Set new JSONB default
ALTER TABLE products ALTER COLUMN images SET DEFAULT '[]'::JSONB;
