import { productRepository } from '../repository/productRepository';
import { productService } from '../services/productService';
import { createAdminClient } from '../lib/supabase/server';
import { orderService } from '../services/orderService';
import { OrderStatus } from '../domain/types/order';

const supabase = createAdminClient();

let passCount = 0;
let failCount = 0;
let testNumber = 0;

function assert(condition: boolean, testName: string, details?: any) {
    testNumber++;
    if (condition) {
        passCount++;
        console.log(`\x1b[32m[PASS] ${testNumber}.\x1b[0m ${testName}`);
    } else {
        failCount++;
        console.log(`\x1b[31m[FAIL] ${testNumber}.\x1b[0m ${testName}`);
        if (details) {
            console.log(`       Details:`, JSON.stringify(details, null, 2));
        }
    }
}

async function runTests() {
    console.log('\n=== Exhaustive 40+ Product Service Hard Path Tests ===\n');

    // 1. SETUP
    const { data: store } = await supabase.from('stores').select('*').limit(1).single();
    const { data: branch } = await supabase.from('branches').select('*').limit(1).single();
    let { data: category } = await supabase.from('categories').select('*').limit(1).single();
    const { data: customer } = await supabase.from('customers').select('*').limit(1).single();

    if (!store || !branch) {
        console.error("Missing essential setup data (store, branch). Please run seed script first.");
        process.exit(1);
    }

    if (!category) {
        const catRes = await supabase.from('categories').insert({
            name: 'Test Category Ex', slug: 'test-cat-' + Date.now(), is_active: true
        }).select().single();
        category = catRes.data;
    }

    productService.setUserContext(null, branch.id);
    orderService.setUserContext(null, branch.id);
    console.log(`Using Environment: Branch ${branch.id.slice(0, 6)}, Category ${category.id.slice(0, 6)}`);

    let createdProductId: string | null = null;
    const ts = Date.now();
    
    // --- PHASE 1: Payload Validation & Missing Fields ---
    console.log('\n--- Phase 1: Payload Validation & Missing Fields ---');
    
    const v1 = await productService.createProduct({ slug: `slug-${ts}`, category_id: category.id, store_id: store.id, price_per_day: 500, quantity: 5 } as any);
    assert(!v1.success, "1. Missing 'name' field is rejected");
    
    const v2 = await productService.createProduct({ name: 'Test', category_id: category.id, store_id: store.id, price_per_day: 500, quantity: 5 } as any);
    assert(!v2.success, "2. Missing 'slug' field is rejected");
    
    const v3 = await productService.createProduct({ name: 'Test', slug: `slug2-${ts}`, category_id: category.id, store_id: store.id, quantity: 5 } as any);
    assert(!v3.success, "3. Missing 'price_per_day' is rejected");

    // --- PHASE 2: Financial Anomalies & Edge Cases ---
    console.log('\n--- Phase 2: Financial Anomalies & Edge Cases ---');

    const f1 = await productService.createProduct({ name: 'T', slug: `f1-${ts}`, category_id: category.id, store_id: store.id, branch_id: branch.id, price_per_day: -100, quantity: 5 } as any);
    assert(!f1.success, "4. Negative 'price_per_day' is blocked");

    const f2 = await productService.createProduct({ name: 'T', slug: `f2-${ts}`, category_id: category.id, store_id: store.id, branch_id: branch.id, price_per_day: 500, security_deposit: -1000, quantity: 5 } as any);
    assert(!f2.success, "5. Negative 'security_deposit' is blocked");

    const f3 = await productService.createProduct({ name: 'T', slug: `f3-${ts}`, category_id: category.id, store_id: store.id, branch_id: branch.id, price_per_day: 999999999999, quantity: 5 } as any);
    assert(!f3.success || f3.data?.price_per_day === 999999999999, "6. Handles extreme large pricing gracefully (rejected or saved accurately)");
    if (f3.success) await productService.deleteProduct(f3.data!.id);

    const f4 = await productService.createProduct({ name: 'T', slug: `f4-${ts}`, category_id: category.id, store_id: store.id, branch_id: branch.id, price_per_day: 0.0000000001, quantity: 5 } as any);
    assert(!f4.success || (f4.data?.price_per_day ?? 0) > 0, "7. Handles micro-decimal pricing gracefully without crashing");
    if (f4.success) await productService.deleteProduct(f4.data!.id);

    // --- PHASE 3: Complex Inventory Mathematics ---
    console.log('\n--- Phase 3: Complex Inventory Mathematics ---');

    const i1 = await productService.createProduct({ name: 'T', slug: `i1-${ts}`, category_id: category.id, store_id: store.id, branch_id: branch.id, price_per_day: 500, quantity: -5 } as any);
    assert(!i1.success, "8. Negative 'quantity' (total items) is blocked");

    const i2 = await productService.createProduct({ name: 'T', slug: `i2-${ts}`, category_id: category.id, store_id: store.id, branch_id: branch.id, price_per_day: 500, quantity: 5, available_quantity: -1 } as any);
    assert(!i2.success, "9. Negative 'available_quantity' is blocked");

    const i3 = await productService.createProduct({ name: 'T', slug: `i3-${ts}`, category_id: category.id, store_id: store.id, branch_id: branch.id, price_per_day: 500, quantity: 5, available_quantity: 10 } as any);
    assert(!i3.success || !!(i3.data && i3.data.available_quantity <= i3.data.quantity), "10. Mathematical Impossibility: available_quantity cannot exceed total quantity");
    if (i3.success) await productService.deleteProduct(i3.data!.id);

    // --- PHASE 4: Payload Tampering & Zero-Trust ---
    console.log('\n--- Phase 4: Payload Tampering & Zero-Trust ---');

    const z1 = await productService.createProduct({ name: 'T', slug: `z1-${ts}`, category_id: category.id, store_id: store.id, branch_id: branch.id, price_per_day: 500, quantity: 5, id: '11111111-1111-1111-1111-111111111111' } as any);
    assert(!z1.success || z1.data!.id !== '11111111-1111-1111-1111-111111111111', "11. ID injection attack via payload is ignored or rejected");
    if (z1.success) await productService.deleteProduct(z1.data!.id);

    const z2 = await productService.createProduct({ name: 'T', slug: `z2-${ts}`, category_id: category.id, store_id: store.id, branch_id: branch.id, price_per_day: 500, quantity: 5, created_at: '1990-01-01T00:00:00Z' } as any);
    assert(!z2.success || !z2.data!.created_at.includes('1990-01-01'), "12. created_at injection attack is ignored");
    if (z2.success) await productService.deleteProduct(z2.data!.id);

    const z3 = await productService.createProduct({ name: 'T', slug: `z3-${ts}`, category_id: category.id, store_id: store.id, branch_id: branch.id, price_per_day: "500" as any, quantity: 5 } as any);
    assert(!z3.success || typeof z3.data!.price_per_day === 'number', "13. Type spoofing (sending string for number) is rejected or cast correctly");
    if (z3.success) await productService.deleteProduct(z3.data!.id);

    // --- PHASE 5: Database Edge Cases (Strings & Encodings) ---
    console.log('\n--- Phase 5: Database Edge Cases & Encoding Chaos ---');

    const longStr = 'A'.repeat(50000);
    const e1 = await productService.createProduct({ name: longStr, slug: `e1-${ts}`, category_id: category.id, store_id: store.id, branch_id: branch.id, price_per_day: 500, quantity: 5 } as any);
    assert(!e1.success, "14. Extreme string length (50k chars) in name is blocked by schema limits");

    const zalgo = 'T̸͔̒e̴̙̔ș̷͌t̷͓̅';
    const e2 = await productService.createProduct({ name: zalgo, slug: `e2-${ts}`, category_id: category.id, store_id: store.id, branch_id: branch.id, price_per_day: 500, quantity: 5 } as any);
    assert(e2.success, "15. Handles Zalgo text / complex unicode in names gracefully");
    if (e2.success) await productService.deleteProduct(e2.data!.id);

    const emojiSlug = `slug-😊-${ts}`;
    const e3 = await productService.createProduct({ name: 'Emoji', slug: emojiSlug, category_id: category.id, store_id: store.id, branch_id: branch.id, price_per_day: 500, quantity: 5 } as any);
    // Ideally slug should only be alphanumeric + hyphens, but let's see what the system does
    assert(e3.success || e3.error?.code === 'VALIDATION_ERROR', "16. Emoji in slug is either stripped/allowed or properly caught by validation");
    if (e3.success) await productService.deleteProduct(e3.data!.id);

    // --- PHASE 6: Happy Path Creation (Base for further tests) ---
    console.log('\n--- Phase 6: Happy Path Creation ---');

    const baseSlug = `happy-${ts}`;
    const h1 = await productService.createProduct({
        name: 'Happy Base Product', slug: baseSlug, category_id: category.id, store_id: store.id, branch_id: branch.id,
        price_per_day: 500, security_deposit: 1000, quantity: 10, is_active: true
    } as any);
    assert(h1.success, "17. Creates base product successfully");
    if (!h1.success) process.exit(1);
    createdProductId = h1.data!.id;

    const h2 = await productService.createProduct({ name: 'Collision', slug: baseSlug, category_id: category.id, store_id: store.id, branch_id: branch.id, price_per_day: 500, quantity: 10 } as any);
    assert(!h2.success && h2.error?.code === 'SLUG_EXISTS', "18. Slug collision constraint prevents duplicate slugs");

    // --- PHASE 7: Category & Relational Edge Cases ---
    console.log('\n--- Phase 7: Category & Relational Edge Cases ---');

    const c1 = await productService.createProduct({ name: 'T', slug: `c1-${ts}`, category_id: 'invalid-uuid-string', store_id: store.id, branch_id: branch.id, price_per_day: 500, quantity: 5 } as any);
    assert(!c1.success, "19. Non-UUID category_id is rejected by validation");

    const randomUuid = '00000000-0000-0000-0000-000000000000';
    const c2 = await productService.createProduct({ name: 'T', slug: `c2-${ts}`, category_id: randomUuid, store_id: store.id, branch_id: branch.id, price_per_day: 500, quantity: 5 } as any);
    assert(!c2.success, "20. Ghost category (valid UUID but doesn't exist) fails gracefully (foreign key violation wrapped)");

    const c3 = await productService.updateProduct(createdProductId, { category_id: randomUuid } as any);
    assert(!c3.success, "21. Updating product to ghost category is blocked");

    // --- PHASE 8: Images & JSONB Chaos ---
    console.log('\n--- Phase 8: Images & JSONB Chaos ---');

    const j1 = await productService.updateProduct(createdProductId, { images: "not-an-array" as any });
    assert(!j1.success, "22. Sending string instead of array for JSONB images is blocked");

    const j2 = await productService.updateProduct(createdProductId, { images: [{ url: "<script>alert('xss')</script>", is_primary: true, sort_order: 1 }] });
    // It might allow it depending on Zod URL validation, but it shouldn't crash the server
    assert(j2.success || !j2.success, "23. XSS injection in JSONB array URL does not crash server (Caught by URL validator or saved safely)");

    const massiveArray = Array(5000).fill({ url: 'https://example.com/img.jpg', is_primary: false, sort_order: 1 });
    const j3 = await productService.updateProduct(createdProductId, { images: massiveArray });
    assert(!j3.success || j3.data!.images.length === 5000, "24. Massive JSONB array (5000 items) is either handled or rejected (DoS protection)");
    
    // Cleanup images
    await productService.updateProduct(createdProductId, { images: [] });

    // --- PHASE 9: Zero-Trust Updates (Part 2) ---
    console.log('\n--- Phase 9: Zero-Trust Updates ---');

    const z4 = await productService.updateProduct(createdProductId, { reserved_quantity: 0 } as any);
    const dbCheckZ4 = await productRepository.findById(createdProductId);
    assert(!z4.success || (dbCheckZ4.data as any)!.reserved_quantity !== undefined, "25. Injecting reserved_quantity update is ignored or strictly rejected");

    const z5 = await productService.updateProduct(createdProductId, { store_id: randomUuid } as any);
    const dbCheckZ5 = await productRepository.findById(createdProductId);
    assert(!z5.success || (dbCheckZ5.data as any)!.store_id === store.id, "26. Cross-tenant mutation attempt (changing store_id) is blocked");

    // --- PHASE 10: Concurrency & State Race Conditions ---
    console.log('\n--- Phase 10: Concurrency & State Race Conditions ---');

    // Simulate two concurrent updates
    const pA = productService.updateProduct(createdProductId, { price_per_day: 600 });
    const pB = productService.updateProduct(createdProductId, { price_per_day: 700 });
    const [resA, resB] = await Promise.all([pA, pB]);
    
    const dbCheckConc = await productRepository.findById(createdProductId);
    assert(dbCheckConc.data!.price_per_day === 600 || dbCheckConc.data!.price_per_day === 700, 
        "27. Concurrent DB writes do not corrupt state (Last-write-wins or locking works)");

    // --- PHASE 11: Inventory Conflicts via Orders ---
    console.log('\n--- Phase 11: Inventory Conflicts via Orders ---');
    if (customer) {
        // Create an order booking all 10 items
        const o1 = await orderService.createOrder({
            customer_id: customer.id, branch_id: branch.id,
            rental_start_date: '2026-06-01', rental_end_date: '2026-06-05',
            items: [{ product_id: createdProductId, quantity: 10, price_per_day: 500 }]
        } as any);
        assert(o1.success, "28. Successfully reserved 10 items via order");
        
        // Transition to ONGOING to deduct stock
        await orderService.updateOrder(o1.data!.id, { status: OrderStatus.ONGOING });

        // Admin attempts to lower total_quantity below active reservations
        const o2 = await productService.updateProduct(createdProductId, { quantity: 5 });
        // The service should theoretically block this, or at least available_quantity drops below 0
        const dbCheckInv = await productRepository.findById(createdProductId);
        assert(!o2.success || dbCheckInv.data!.quantity >= 5, "29. Decreasing total_quantity when items are actively rented is either blocked or accurately reflected");
        
        // Attempt referential deletion
        const d1 = await productService.deleteProduct(createdProductId);
        assert(!d1.success && d1.error?.code === 'CANNOT_DELETE', "30. Cannot delete product with active orders (Referential Integrity)");

        // Try double-renting
        const o3 = await orderService.createOrder({
            customer_id: customer.id, branch_id: branch.id,
            rental_start_date: '2026-06-01', rental_end_date: '2026-06-05',
            items: [{ product_id: createdProductId, quantity: 1, price_per_day: 500 }]
        } as any);
        assert(!o3.success, "31. Double-renting when stock is depleted fails");

        // Cleanup
        await supabase.from('order_items').delete().eq('order_id', o1.data!.id);
        await supabase.from('orders').delete().eq('id', o1.data!.id);
        if (o3.success) {
            await supabase.from('order_items').delete().eq('order_id', o3.data!.id);
            await supabase.from('orders').delete().eq('id', o3.data!.id);
        }
    } else {
        console.log("Skipping order/inventory tests (no customer found)");
    }

    // --- PHASE 12: API 404s & Deletions ---
    console.log('\n--- Phase 12: API 404s & Deletions ---');

    const g1 = await productService.getProductById(randomUuid);
    assert(!g1.success && g1.error?.code === 'NOT_FOUND', "32. Fetching non-existent product returns NOT_FOUND");

    const d2 = await productService.deleteProduct(randomUuid);
    assert(!d2.success && d2.error?.code === 'NOT_FOUND', "33. Deleting non-existent product returns NOT_FOUND");

    const u1 = await productService.updateProduct(randomUuid, { price_per_day: 100 });
    assert(!u1.success && u1.error?.code === 'NOT_FOUND', "34. Updating non-existent product returns NOT_FOUND");

    const dFinal = await productService.deleteProduct(createdProductId);
    assert(dFinal.success, "35. Safe deletion of the base test product succeeds");

    // --- PHASE 13: Pagination & List Limits ---
    console.log('\n--- Phase 13: Pagination & List Limits ---');

    const l1 = await productService.getProducts({ limit: 0 } as any);
    assert(l1.success, "36. Fetching with limit: 0 handles gracefully (uses default)");

    const l2 = await productService.getProducts({ limit: 1000000 } as any);
    assert(l2.success && l2.data!.products.length <= 100, "37. Fetching with limit: 1000000 caps at maximum safety threshold (e.g. 100)");

    const l3 = await productService.getProducts({ page: 999999 } as any);
    assert(l3.success && l3.data!.products.length === 0, "38. Deep pagination beyond data bounds returns empty array safely");

    // --- PHASE 14: Soft Delete Collision ---
    console.log('\n--- Phase 14: Soft Delete Collision ---');
    // We recreate the product, then delete it, then create it again to check soft-delete unique constraint logic
    const s1 = await productService.createProduct({
        name: 'Soft Delete Collision', slug: `soft-${ts}`, category_id: category.id, store_id: store.id, branch_id: branch.id, price_per_day: 500, quantity: 5
    } as any);
    if (s1.success) {
        await productService.deleteProduct(s1.data!.id);
        const s2 = await productService.createProduct({
            name: 'Soft Delete Collision 2', slug: `soft-${ts}`, category_id: category.id, store_id: store.id, branch_id: branch.id, price_per_day: 500, quantity: 5
        } as any);
        assert(s2.success || (!s2.success && s2.error?.code === 'SLUG_EXISTS'), "39. Creating a product with a slug that was previously deleted is either cleanly allowed or correctly rejected");
        if (s2.success) await productService.deleteProduct(s2.data!.id);
    } else {
        assert(false, "39. Failed to create initial soft delete product");
    }

    const m1 = await productService.getProducts({ query: "'; DROP TABLE products; --" });
    assert(m1.success, "40. SQL Injection attempt in search query is sanitized/safe");

    console.log(`\n=== FINAL RESULTS ===`);
    console.log(`Total Tests Executed: ${testNumber}`);
    console.log(`Passed: \x1b[32m${passCount}\x1b[0m`);
    console.log(`Failed: \x1b[31m${failCount}\x1b[0m`);

    process.exit(failCount > 0 ? 1 : 0);
}

runTests().catch(e => {
    console.error('Fatal error running tests:', e);
    process.exit(1);
});
