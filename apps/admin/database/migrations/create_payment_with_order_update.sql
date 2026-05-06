-- Database function to create payment and update order amount in a transaction
CREATE OR REPLACE FUNCTION create_payment_with_order_update(
    p_order_id UUID,
    p_payment_type TEXT,
    p_amount DECIMAL,
    p_payment_mode TEXT,
    p_transaction_id TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    order_id UUID,
    payment_type TEXT,
    amount DECIMAL,
    payment_mode TEXT,
    transaction_id TEXT,
    payment_date TIMESTAMP,
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_payment_id UUID;
    v_current_amount_paid DECIMAL;
    v_new_amount_paid DECIMAL;
BEGIN
    -- Get current amount paid for the order
    SELECT COALESCE(amount_paid, 0) INTO v_current_amount_paid
    FROM orders
    WHERE id = p_order_id;
    
    -- Calculate new amount paid
    v_new_amount_paid := v_current_amount_paid + p_amount;
    
    -- Create the payment
    INSERT INTO payments (
        order_id,
        payment_type,
        amount,
        payment_mode,
        transaction_id,
        payment_date,
        notes,
        created_by,
        created_at,
        updated_at
    ) VALUES (
        p_order_id,
        p_payment_type,
        p_amount,
        p_payment_mode,
        p_transaction_id,
        CURRENT_TIMESTAMP,
        p_notes,
        p_created_by,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ) RETURNING id INTO v_payment_id;
    
    -- Update the order's amount_paid
    UPDATE orders
    SET amount_paid = v_new_amount_paid,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_order_id;
    
    -- Return the created payment
    RETURN QUERY
    SELECT 
        p.id,
        p.order_id,
        p.payment_type,
        p.amount,
        p.payment_mode,
        p.transaction_id,
        p.payment_date,
        p.notes,
        p.created_by,
        p.created_at,
        p.updated_at
    FROM payments p
    WHERE p.id = v_payment_id;
    
    RETURN;
END;
$$;
