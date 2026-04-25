

import { orderService } from '../services/orderService';
import { branchService } from '../services/branchService';
import { customerService } from '../services/customerService';
import { paymentService } from '../services/paymentService';
import { productRepository } from '../repository/productRepository';
import { categoryRepository } from '../repository/categoryRepository';
import { createAdminClient } from '../lib/supabase/server';
import { OrderStatus } from '../domain';
const supabase = createAdminClient();

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string, details?: any) {
    if (condition) {
        passCount++;
        console.log(`\x1b[32m[PASS]\x1b[0m ${testName}`);
    } else {
        failCount++;
        console.log(`\x1b[31m[FAIL]\x1b[0m ${testName}`);
        if (details) console.log(`       Details: ${JSON.stringify(details)}`);
    }
}

async function runTests() {
    console.log('\n=== Backend Order Service Tests (Bypassing API Guard) ===\n');

    // 1. SETUP
    // Try to find a store, branch, category, product, customer
    let store = (await supabase.from('stores').select('*').limit(1).single()).data;
    if (!store) {
        console.log('Creating mock store...');
        const res = await supabase.from('stores').insert({ name: 'Test Store', address: '123 St', phone: '111', email: 'test@s.com', is_active: true }).select().single();
        store = res.data;
    }

    let branch = (await supabase.from('branches').select('*').limit(1).single()).data;
    if (!branch) {
        console.log('Creating mock branch...');
        const res = await supabase.from('branches').insert({ name: 'Test Branch', address: '123 St', is_main: true, is_active: true, store_id: store!.id }).select().single();
        branch = res.data;
    }

    let customer = (await supabase.from('customers').select('*').limit(1).single()).data;
    if (!customer) {
        console.log('Creating mock customer...');
        const res = await supabase.from('customers').insert({ name: 'Test Customer', phone: '1234567890', status: 'active', store_id: store!.id }).select().single();
        customer = res.data;
    }

    let category = (await supabase.from('categories').select('*').limit(1).single()).data;
    if (!category) {
        console.log('Creating mock category...');
        const res = await supabase.from('categories').insert({ name: 'Test Category', slug: 'test-cat-' + Date.now(), is_active: true, sort_order: 1, store_id: store!.id }).select().single();
        category = res.data;
    }

    let product = (await supabase.from('products').select('*').limit(1).single()).data;
    if (!product) {
        console.log('Creating mock product...');
        const res = await productRepository.create({ 
            name: 'Test Product', 
            slug: 'test-prod-' + Date.now(), 
            category_id: category!.id,
            price_per_day: 500,
            security_deposit: 1000,
            quantity: 10,
            available_quantity: 10,
            branch_id: branch!.id,
            is_active: true,
        } as any);
        product = res.data;
    }

    console.log(`Using Store: ${store!.id}`);
    console.log(`Using Branch: ${branch!.id}`);
    console.log(`Using Customer: ${customer!.id}`);
    console.log(`Using Product: ${product!.id} (Available: ${product!.available_quantity})`);

    // Ensure user context is set for order service
    orderService.setUserContext(null, branch!.id);

    let createdOrderId: string | null = null;

    // Phase 1: Validation
    console.log('\n--- Phase 1: Validation ---');
    const badOrder1 = await orderService.createOrder({ branch_id: branch!.id } as any);
    assert(!badOrder1.success, 'Fails when missing customer_id');

    const badOrder2 = await orderService.createOrder({
        customer_id: customer!.id, branch_id: branch!.id,
        rental_start_date: '2026-05-05', rental_end_date: '2026-05-01',
        items: [{ product_id: product!.id, quantity: 1, price_per_day: 100 }]
    } as any);
    assert(!badOrder2.success, 'Fails when end_date < start_date');

    // Phase 2: Happy Path Create
    console.log('\n--- Phase 2: Create & Read ---');
    const createRes = await orderService.createOrder({
        customer_id: customer!.id,
        branch_id: branch!.id,
        rental_start_date: '2026-06-01T10:00:00Z',
        rental_end_date: '2026-06-05T10:00:00Z',
        security_deposit: 1000,
        items: [{ product_id: product!.id, quantity: 1, price_per_day: 500 }]
    } as any);
    assert(createRes.success, 'Creates order successfully', createRes.error);
    
    if (createRes.success) {
        createdOrderId = createRes.data!.id;
        assert(createRes.data!.status === OrderStatus.SCHEDULED, 'Order status is scheduled');

        const readRes = await orderService.getOrderById(createdOrderId);
        assert(readRes.success && readRes.data!.id === createdOrderId, 'Can fetch created order');
    }

    // Phase 3: Payments
    console.log('\n--- Phase 3: Payments ---');
    if (createdOrderId) {
        const depositRes = await paymentService.createPayment({
            order_id: createdOrderId,
            amount: 1000,
            payment_type: 'deposit',
            payment_mode: 'upi'
        } as any);
        assert(depositRes.success, 'Can record deposit payment', depositRes.error);

        const finalRes = await paymentService.createPayment({
            order_id: createdOrderId,
            amount: 2000, // 500 * 4 days
            payment_type: 'final',
            payment_mode: 'cash'
        } as any);
        assert(finalRes.success, 'Can record final payment', finalRes.error);

        // Fetch payments
        const payments = await supabase.from('payments').select('*').eq('order_id', createdOrderId);
        assert(payments.data?.length === 2, 'Order has exactly 2 payments recorded');
    }

    // Phase 4: Status & Stock Transitions
    console.log('\n--- Phase 4: Transitions & Inventory ---');
    if (createdOrderId) {
        const initialStock = product!.available_quantity;

        // Scheduled -> Ongoing
        const transition1 = await orderService.updateOrder(createdOrderId, { status: OrderStatus.ONGOING });
        assert(transition1.success, 'Transition to ONGOING successful', transition1.error);

        const prodOngoing = await productRepository.findById(product!.id);
        assert(prodOngoing.data!.available_quantity === initialStock - 1, 'Stock decreases by 1 on ONGOING');

        // Ongoing -> Returned (using processReturn instead of updateOrder)
        const orderData = (await orderService.getOrderById(createdOrderId)).data!;
        const orderItem = orderData.items[0];

        const transition2 = await orderService.processOrderReturn(createdOrderId, { 
            notes: 'Returned in good condition',
            items: [{
                item_id: orderItem.id,
                returned_quantity: 1,
                condition_rating: 5,
                damage_charges: 0
            }]
        } as any);
        assert(transition2.success, 'Transition to RETURNED successful via processReturn', transition2.error);

        const prodReturned = await productRepository.findById(product!.id);
        assert(prodReturned.data!.available_quantity === initialStock, 'Stock increases by 1 on RETURNED');
    }

    // Phase 5: List & Filter
    console.log('\n--- Phase 5: List & Filter ---');
    const listRes = await orderService.getAllOrders({ limit: 10 });
    assert(listRes.success && (listRes.data?.length || 0) > 0, 'Can list orders');

    const countRes = await orderService.countOrders({});
    assert(countRes.success && typeof countRes.data === 'number', 'Can count orders');

    // Phase 6: Deletion
    console.log('\n--- Phase 6: Deletion ---');
    if (createdOrderId) {
        // Returned orders cannot be deleted by design!
        const delRes = await orderService.deleteOrder(createdOrderId);
        assert(!delRes.success && delRes.error?.code === 'CANNOT_DELETE', 'System properly prevents deletion of RETURNED orders');
    }

    console.log(`\n=== RESULTS ===`);
    console.log(`Total: ${passCount + failCount}`);
    console.log(`Passed: \x1b[32m${passCount}\x1b[0m`);
    console.log(`Failed: \x1b[31m${failCount}\x1b[0m`);
    
    process.exit(failCount > 0 ? 1 : 0);
}

runTests().catch(e => {
    console.error('Fatal error running tests:', e);
    process.exit(1);
});
