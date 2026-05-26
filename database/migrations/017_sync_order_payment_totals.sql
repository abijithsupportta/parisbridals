-- Migration: Auto-sync orders.amount_paid from payments table
-- 
-- Problem: The application was failing to update orders.amount_paid when
-- recording payments, causing stale data in order list views.
--
-- Solution: A PostgreSQL trigger that automatically recalculates
-- amount_paid and payment_status whenever a payment is inserted,
-- updated, or deleted. This makes the payments table the single
-- source of truth — the order summary fields are always in sync.

-- 1. Create the trigger function
CREATE OR REPLACE FUNCTION sync_order_payment_totals()
RETURNS TRIGGER AS $$
DECLARE
  target_order_id UUID;
  total_paid DECIMAL(10, 2);
  order_total DECIMAL(10, 2);
  new_status VARCHAR(20);
BEGIN
  -- Determine which order_id to update
  IF TG_OP = 'DELETE' THEN
    target_order_id := OLD.order_id;
  ELSE
    target_order_id := NEW.order_id;
  END IF;

  -- Calculate total paid from all payment records for this order
  SELECT COALESCE(SUM(
    CASE WHEN payment_type = 'refund' THEN -amount ELSE amount END
  ), 0) INTO total_paid
  FROM payments
  WHERE order_id = target_order_id;

  -- Clamp to zero (in case refunds exceed payments)
  IF total_paid < 0 THEN
    total_paid := 0;
  END IF;

  -- Get the order's total_amount to determine payment_status
  SELECT total_amount INTO order_total
  FROM orders
  WHERE id = target_order_id;

  -- Determine payment status
  IF total_paid <= 0 THEN
    new_status := 'pending';
  ELSIF total_paid >= order_total THEN
    new_status := 'paid';
  ELSE
    new_status := 'partial';
  END IF;

  -- Update the order
  UPDATE orders
  SET amount_paid = total_paid,
      payment_status = new_status,
      updated_at = NOW()
  WHERE id = target_order_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 2. Create triggers on the payments table
DROP TRIGGER IF EXISTS sync_payment_insert ON payments;
CREATE TRIGGER sync_payment_insert
  AFTER INSERT ON payments
  FOR EACH ROW EXECUTE FUNCTION sync_order_payment_totals();

DROP TRIGGER IF EXISTS sync_payment_update ON payments;
CREATE TRIGGER sync_payment_update
  AFTER UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION sync_order_payment_totals();

DROP TRIGGER IF EXISTS sync_payment_delete ON payments;
CREATE TRIGGER sync_payment_delete
  AFTER DELETE ON payments
  FOR EACH ROW EXECUTE FUNCTION sync_order_payment_totals();

-- 3. One-time fix: Recalculate amount_paid for ALL existing orders
UPDATE orders o
SET amount_paid = COALESCE(sub.total_paid, 0),
    payment_status = CASE
      WHEN COALESCE(sub.total_paid, 0) <= 0 THEN 'pending'
      WHEN COALESCE(sub.total_paid, 0) >= o.total_amount THEN 'paid'
      ELSE 'partial'
    END,
    updated_at = NOW()
FROM (
  SELECT order_id,
         SUM(CASE WHEN payment_type = 'refund' THEN -amount ELSE amount END) AS total_paid
  FROM payments
  GROUP BY order_id
) sub
WHERE o.id = sub.order_id;
