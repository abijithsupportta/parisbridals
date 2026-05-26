-- ============================================================================
-- Migration: 015_barcode_unique.sql
-- Purpose: Add unique constraint on product barcode (case-insensitive)
-- ============================================================================

-- IMPORTANT: Before running this migration, manually resolve any existing
-- duplicate barcodes in the products table. You can find them with:
--   SELECT barcode, COUNT(*) FROM products 
--   WHERE barcode IS NOT NULL AND barcode != '' 
--   GROUP BY LOWER(barcode) HAVING COUNT(*) > 1;

-- Add a case-insensitive unique index on barcode
-- NULL and empty barcodes are allowed (multiple products can have no barcode)
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_barcode_unique 
ON products (LOWER(barcode)) 
WHERE barcode IS NOT NULL AND barcode != '';
