-- Add optional alternate phone number to customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS alt_phone VARCHAR(20);
