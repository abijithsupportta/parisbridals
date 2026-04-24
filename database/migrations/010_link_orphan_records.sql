-- Migration 010: Link orphan categories and banners to the main store
-- Several records were found with NULL store_id, which prevents them
-- from showing up in the tenant-filtered storefront.

DO $$ 
DECLARE 
    main_store_id UUID;
BEGIN
    -- Get the ID of the Paris Bridals store
    SELECT id INTO main_store_id FROM stores WHERE slug = 'paris-bridals' LIMIT 1;

    IF main_store_id IS NOT NULL THEN
        -- Update categories
        UPDATE categories SET store_id = main_store_id WHERE store_id IS NULL;
        
        -- Update banners
        UPDATE banners SET store_id = main_store_id WHERE store_id IS NULL;
        
        -- Update products (just in case)
        UPDATE products SET store_id = main_store_id WHERE store_id IS NULL;
        
        RAISE NOTICE 'Linked orphan records to store ID: %', main_store_id;
    ELSE
        RAISE WARNING 'Main store (paris-bridals) not found. Skipping link.';
    END IF;
END $$;
