-- Migration: Separate deposit_refund from rental refunds
--
-- Problem: Security deposit refunds were using payment_type='refund',
-- which the sync trigger and UI calculations treated as a rental
-- refund — incorrectly reducing amount_paid and causing "due" to
-- reappear.
--
-- Solution:
--   1. Add 'deposit_refund' as a new payment_type
--   2. Update the trigger to EXCLUDE deposit + deposit_refund from
--      the amount_paid / payment_status calculation
--   3. Reclassify any existing deposit refund records

-- 1. Allow the new payment type in the constraint
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_payment_type_check;
ALTER TABLE payments ADD CONSTRAINT payments_payment_type_check
  CHECK (payment_type IN ('deposit', 'advance', 'final', 'refund', 'adjustment', 'deposit_refund'));

-- 2. Reclassify existing deposit refunds (they have notes containing 'deposit')
UPDATE payments
SET payment_type = 'deposit_refund'
WHERE payment_type = 'refund'
  AND LOWER(notes) LIKE '%deposit%';

-- 3. Recreate the trigger function to EXCLUDE deposit-related payments
--    from amount_paid. Deposits and deposit_refunds are a separate financial
--    track managed via order.deposit_collected / deposit_returned flags.
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

  -- Calculate total paid from RENTAL payment records only.
  -- Exclude 'deposit' and 'deposit_refund' — they are tracked separately
  -- via orders.security_deposit / deposit_collected / deposit_returned.
  SELECT COALESCE(SUM(
    CASE WHEN payment_type = 'refund' THEN -amount ELSE amount END
  ), 0) INTO total_paid
  FROM payments
  WHERE order_id = target_order_id
    AND payment_type NOT IN ('deposit', 'deposit_refund');

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

-- 4. One-time fix: Recalculate amount_paid for ALL existing orders
--    excluding deposit-related payments.
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
  WHERE payment_type NOT IN ('deposit', 'deposit_refund')
  GROUP BY order_id
) sub
WHERE o.id = sub.order_id;
