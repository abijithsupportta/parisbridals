-- Migration: Add extended fields to customers table
-- This migration adds fields for photo, ID details, and documents

-- 1. Add fields to customers table
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS photo_url VARCHAR(255),
ADD COLUMN IF NOT EXISTS id_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS id_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS id_documents JSONB DEFAULT '[]'::jsonb;

-- 2. Add constraint for id_type to ensure valid values
ALTER TABLE customers DROP CONSTRAINT IF EXISTS check_customer_id_type;
ALTER TABLE customers ADD CONSTRAINT check_customer_id_type 
  CHECK (id_type IS NULL OR id_type IN ('Aadhaar', 'PAN', 'Driving Licence', 'Passport', 'Others'));

-- 3. Update existing customers with empty array for id_documents if null
UPDATE customers SET id_documents = '[]'::jsonb WHERE id_documents IS NULL;
