-- ============================================================================
-- Migration: Atomic RPC Functions
-- Date:      2026-04-24
-- Purpose:   Replaces fragile JavaScript-level sequential operations with
--            true PostgreSQL transactions that guarantee atomicity.
--
--            If any step fails the ENTIRE operation is rolled back — no
--            orphaned rows are left behind.
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1. create_staff_member
--
-- Atomically creates a Supabase Auth user AND a row in `public.staff`.
-- If the staff INSERT fails, the auth user is NOT left orphaned because
-- everything runs inside a single transaction.
--
-- Parameters:
--   p_email       — Email for the new auth user
--   p_password    — Password for the new auth user
--   p_name        — Display name
--   p_role        — Role enum ('admin', 'manager', 'staff')
--   p_branch_id   — UUID of the branch to assign
--   p_store_id    — UUID of the store (usually single-tenant default)
--   p_phone       — Optional phone number
--   p_is_active   — Whether the staff member is active (default: true)
--
-- Returns: JSON object with the new staff record
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_staff_member(
  p_email     TEXT,
  p_password  TEXT,
  p_name      TEXT,
  p_role      TEXT DEFAULT 'staff',
  p_branch_id UUID DEFAULT NULL,
  p_store_id  UUID DEFAULT NULL,
  p_phone     TEXT DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT TRUE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER          -- runs with the definer's privileges (service role)
SET search_path = public  -- prevent search_path injection
AS $$
DECLARE
  v_auth_uid UUID;
  v_staff    RECORD;
BEGIN
  -- Step 1: Create the auth user via Supabase's internal function
  v_auth_uid := (
    SELECT id FROM auth.users
    WHERE email = p_email
    LIMIT 1
  );

  -- If user already exists, raise an error
  IF v_auth_uid IS NOT NULL THEN
    RAISE EXCEPTION 'A user with email % already exists', p_email
      USING ERRCODE = '23505'; -- unique_violation
  END IF;

  -- Create the auth user using Supabase's admin API (via extension)
  -- Note: This uses the auth.users table directly since we're SECURITY DEFINER
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    p_email,
    crypt(p_password, gen_salt('bf')),
    NOW(),
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
    jsonb_build_object('name', p_name, 'role', p_role),
    NOW(),
    NOW(),
    '',
    ''
  )
  RETURNING id INTO v_auth_uid;

  -- Step 2: Create the staff record linked to the auth user
  INSERT INTO public.staff (
    id,
    auth_user_id,
    name,
    email,
    phone,
    role,
    branch_id,
    store_id,
    is_active,
    created_at,
    updated_at
  )
  VALUES (
    gen_random_uuid(),
    v_auth_uid,
    p_name,
    p_email,
    p_phone,
    p_role,
    p_branch_id,
    p_store_id,
    p_is_active,
    NOW(),
    NOW()
  )
  RETURNING * INTO v_staff;

  -- If we reach here, both operations succeeded — the transaction commits.
  RETURN to_jsonb(v_staff);

EXCEPTION
  WHEN OTHERS THEN
    -- Any error here causes a ROLLBACK of the entire transaction,
    -- including the auth.users INSERT if it succeeded.
    RAISE;
END;
$$;

-- Grant execute to the service role (admin client uses this)
GRANT EXECUTE ON FUNCTION public.create_staff_member TO service_role;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. delete_staff_member
--
-- Atomically deletes a staff record AND its associated auth user.
-- Prevents orphaned auth users if the staff delete succeeds but auth delete
-- would have failed in the old sequential approach.
--
-- Parameters:
--   p_staff_id — UUID of the staff record to delete
--
-- Returns: JSON object with success status
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.delete_staff_member(
  p_staff_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_uid UUID;
  v_staff_name TEXT;
BEGIN
  -- Step 1: Get the auth_user_id from staff record
  SELECT auth_user_id, name INTO v_auth_uid, v_staff_name
  FROM public.staff
  WHERE id = p_staff_id;

  IF v_auth_uid IS NULL THEN
    RAISE EXCEPTION 'Staff member not found'
      USING ERRCODE = 'P0002'; -- no_data_found
  END IF;

  -- Step 2: Delete the staff record first (may have FK constraints)
  DELETE FROM public.staff WHERE id = p_staff_id;

  -- Step 3: Delete the auth user
  DELETE FROM auth.users WHERE id = v_auth_uid;

  RETURN jsonb_build_object(
    'success', true,
    'deleted_staff_id', p_staff_id,
    'deleted_auth_id', v_auth_uid,
    'name', v_staff_name
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_staff_member TO service_role;

-- ────────────────────────────────────────────────────────────────────────────
-- 3. create_order_with_items
--
-- Atomically creates an order, its order_items, status history entry,
-- and decrements product inventory — all in a single transaction.
--
-- Parameters:
--   p_order_data — JSONB object with order fields
--   p_items      — JSONB array of order item objects
--
-- Returns: JSON object with the created order ID
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_order_with_items(
  p_order_data JSONB,
  p_items      JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id   UUID;
  v_item       JSONB;
  v_product_id UUID;
  v_quantity   INT;
  v_available  INT;
BEGIN
  -- Step 1: Insert the order
  INSERT INTO public.orders (
    id,
    customer_id,
    branch_id,
    store_id,
    status,
    start_date,
    end_date,
    total_days,
    subtotal,
    security_deposit,
    discount_amount,
    gst_amount,
    total_amount,
    notes,
    created_by,
    created_at,
    updated_at
  )
  VALUES (
    COALESCE((p_order_data->>'id')::UUID, gen_random_uuid()),
    (p_order_data->>'customer_id')::UUID,
    (p_order_data->>'branch_id')::UUID,
    (p_order_data->>'store_id')::UUID,
    COALESCE(p_order_data->>'status', 'pending'),
    (p_order_data->>'start_date')::DATE,
    (p_order_data->>'end_date')::DATE,
    COALESCE((p_order_data->>'total_days')::INT, 1),
    COALESCE((p_order_data->>'subtotal')::NUMERIC, 0),
    COALESCE((p_order_data->>'security_deposit')::NUMERIC, 0),
    COALESCE((p_order_data->>'discount_amount')::NUMERIC, 0),
    COALESCE((p_order_data->>'gst_amount')::NUMERIC, 0),
    COALESCE((p_order_data->>'total_amount')::NUMERIC, 0),
    p_order_data->>'notes',
    (p_order_data->>'created_by')::UUID,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_order_id;

  -- Step 2: Insert each order item and decrement inventory
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_quantity   := COALESCE((v_item->>'quantity')::INT, 1);

    -- Check available inventory
    SELECT available_quantity INTO v_available
    FROM public.products
    WHERE id = v_product_id
    FOR UPDATE; -- Row-level lock to prevent race conditions

    IF v_available IS NULL THEN
      RAISE EXCEPTION 'Product % not found', v_product_id
        USING ERRCODE = 'P0002';
    END IF;

    IF v_available < v_quantity THEN
      RAISE EXCEPTION 'Insufficient inventory for product %. Available: %, Requested: %',
        v_product_id, v_available, v_quantity
        USING ERRCODE = '23514'; -- check_violation
    END IF;

    -- Insert the order item
    INSERT INTO public.order_items (
      id,
      order_id,
      product_id,
      quantity,
      price_per_day,
      subtotal,
      created_at
    )
    VALUES (
      gen_random_uuid(),
      v_order_id,
      v_product_id,
      v_quantity,
      COALESCE((v_item->>'price_per_day')::NUMERIC, 0),
      COALESCE((v_item->>'subtotal')::NUMERIC, 0),
      NOW()
    );

    -- Decrement available inventory, increment reserved
    UPDATE public.products
    SET
      available_quantity = available_quantity - v_quantity,
      reserved_quantity  = reserved_quantity + v_quantity,
      updated_at         = NOW()
    WHERE id = v_product_id;
  END LOOP;

  -- Step 3: Create initial status history entry
  INSERT INTO public.order_status_history (
    id,
    order_id,
    status,
    changed_by,
    notes,
    created_at
  )
  VALUES (
    gen_random_uuid(),
    v_order_id,
    COALESCE(p_order_data->>'status', 'pending'),
    (p_order_data->>'created_by')::UUID,
    'Order created',
    NOW()
  );

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_order_with_items TO service_role;
