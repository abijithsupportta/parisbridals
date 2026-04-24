-- Branch-specific inventory table
-- This table allows each branch to have its own inventory levels for each product

CREATE TABLE IF NOT EXISTS branch_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  available_quantity INTEGER NOT NULL DEFAULT 0 CHECK (available_quantity >= 0),
  low_stock_threshold INTEGER NOT NULL DEFAULT 5 CHECK (low_stock_threshold >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_by UUID REFERENCES staff(id),
  updated_by UUID REFERENCES staff(id),
  UNIQUE(branch_id, product_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_branch_inventory_branch_id ON branch_inventory(branch_id);
CREATE INDEX IF NOT EXISTS idx_branch_inventory_product_id ON branch_inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_branch_inventory_branch_product ON branch_inventory(branch_id, product_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_branch_inventory_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER branch_inventory_updated_at
  BEFORE UPDATE ON branch_inventory
  FOR EACH ROW
  EXECUTE FUNCTION update_branch_inventory_updated_at();

-- Enable Row Level Security
ALTER TABLE branch_inventory ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow staff to read inventory for their branch
CREATE POLICY "Staff can read inventory for their branch"
  ON branch_inventory
  FOR SELECT
  USING (
    branch_id IN (
      SELECT branch_id FROM staff WHERE id = auth.uid()
    )
  );

-- Allow managers and admins to read all inventory
CREATE POLICY "Managers and admins can read all inventory"
  ON branch_inventory
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

-- Allow managers and admins to insert inventory
CREATE POLICY "Managers and admins can insert inventory"
  ON branch_inventory
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

-- Allow managers and admins to update inventory
CREATE POLICY "Managers and admins can update inventory"
  ON branch_inventory
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

-- Allow managers and admins to delete inventory
CREATE POLICY "Managers and admins can delete inventory"
  ON branch_inventory
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

-- Add comment
COMMENT ON TABLE branch_inventory IS 'Branch-specific inventory levels for products';
