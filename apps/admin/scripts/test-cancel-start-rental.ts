/**
 * Order Cancel & Start Rental — Service Layer Test Suite (14 Tests)
 *
 * Tests backend enforcement of:
 *   - Cancel scheduled/ongoing orders (stock impacts)
 *   - Start rental (scheduled → ongoing) transitions & stock decrement
 *   - Invalid transitions from terminal states
 *   - Double-cancel prevention
 *   - Status history tracking
 *
 * Usage:
 *   npx tsx scripts/test-cancel-start-rental.ts
 */

// Load .env.local before any imports that need env vars
import fs from 'fs';
const envConfig = fs.readFileSync('.env.local', 'utf-8');
for (const line of envConfig.split('\n')) {
  if (line.trim() && !line.startsWith('#')) {
    const [key, ...vals] = line.split('=');
    if (key && vals.length > 0) {
      process.env[key.trim()] = vals.join('=').trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
    }
  }
}

import { orderService } from '../services/orderService';
import { productRepository } from '../repository/productRepository';
import { createAdminClient } from '../lib/supabase/server';
import { OrderStatus } from '../domain/types/order';

const supabase = createAdminClient();

let passCount = 0;
let failCount = 0;
let testNumber = 0;
const cleanupOrderIds: string[] = [];

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
  console.log('\n=== Cancel & Start Rental — Backend Service Tests (14 Cases) ===\n');

  // ─── SETUP ──────────────────────────────────────────────
  const { data: branch } = await supabase.from('branches').select('*').limit(1).single();
  const { data: customer } = await supabase.from('customers').select('*').limit(1).single();
  const { data: store } = await supabase.from('stores').select('*').limit(1).single();
  const { data: category } = await supabase.from('categories').select('*').limit(1).single();

  if (!branch || !customer || !store || !category) {
    console.error('Missing essential setup data (branch, customer, store, category). Please seed the DB first.');
    process.exit(1);
  }

  // Create a dedicated test product so we don't pollute real data
  const pRes = await productRepository.create({
    name: 'Test Cancel StartRental',
    slug: 'test-cancel-sr-' + Date.now(),
    category_id: category.id,
    price_per_day: 500,
    security_deposit: 1000,
    quantity: 10,
    available_quantity: 10,
    branch_id: branch.id,
    store_id: store.id,
    is_active: true,
  } as any);

  if (!pRes.success || !pRes.data) {
    console.error('Failed to create test product:', pRes.error);
    process.exit(1);
  }
  const product = pRes.data;

  console.log(`Test Environment: Branch ${branch.id.slice(0, 6)}, Customer ${customer.id.slice(0, 6)}, Product ${product.id.slice(0, 6)} (stock: ${product.available_quantity})\n`);

  orderService.setUserContext(null, branch.id);

  // Future and today dates
  const futureDate = '2026-06-15';
  const futureEndDate = '2026-06-20';
  const todayDate = new Date().toISOString().split('T')[0];
  const todayEndDate = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];

  // ─── TEST 1: Create scheduled order (future start) ──────
  console.log('--- Phase 1: Order Creation (Scheduled vs Ongoing) ---');

  const res1 = await orderService.createOrder({
    customer_id: customer.id,
    branch_id: branch.id,
    rental_start_date: futureDate,
    rental_end_date: futureEndDate,
    items: [{ product_id: product.id, quantity: 1, price_per_day: 500 }],
  });
  const order1Id = res1.data?.id;
  if (order1Id) cleanupOrderIds.push(order1Id);
  assert(res1.success && res1.data?.status === OrderStatus.SCHEDULED,
    'Create order with future date → status = "scheduled"',
    { success: res1.success, status: res1.data?.status });

  // ─── TEST 2: Stock NOT decremented for scheduled order ──
  const prodAfterScheduled = await productRepository.findById(product.id);
  assert(prodAfterScheduled.data!.available_quantity === 10,
    'Stock unchanged after creating scheduled order (no decrement)',
    { stock: prodAfterScheduled.data!.available_quantity });

  // ─── TEST 3: Cancel scheduled order → success ───────────
  console.log('\n--- Phase 2: Cancel Scheduled Order ---');

  const res3 = await orderService.updateOrder(order1Id!, { status: OrderStatus.CANCELLED });
  assert(res3.success && res3.data?.status === OrderStatus.CANCELLED,
    'PATCH scheduled → cancelled → success',
    { success: res3.success, status: res3.data?.status });

  // ─── TEST 4: Stock still unchanged after cancelling a scheduled order ──
  const prodAfterCancelSched = await productRepository.findById(product.id);
  assert(prodAfterCancelSched.data!.available_quantity === 10,
    'Stock still 10 after cancelling scheduled order (never decremented)',
    { stock: prodAfterCancelSched.data!.available_quantity });

  // ─── TEST 5: Cancelled order CANNOT transition to anything ──
  console.log('\n--- Phase 3: Terminal State Enforcement ---');

  const res5a = await orderService.updateOrder(order1Id!, { status: OrderStatus.ONGOING });
  assert(!res5a.success,
    'Cancelled → ongoing → BLOCKED',
    { success: res5a.success, error: res5a.error?.message });

  const res5b = await orderService.updateOrder(order1Id!, { status: OrderStatus.SCHEDULED });
  assert(!res5b.success,
    'Cancelled → scheduled → BLOCKED',
    { success: res5b.success, error: res5b.error?.message });

  // ─── TEST 6: Double cancel → BLOCKED ────────────────────
  const res6 = await orderService.updateOrder(order1Id!, { status: OrderStatus.CANCELLED });
  assert(!res6.success,
    'Double cancel (cancelled → cancelled) → BLOCKED',
    { success: res6.success, error: res6.error?.message });

  // ─── TEST 7: Start Rental (scheduled → ongoing) ────────
  console.log('\n--- Phase 4: Start Rental (scheduled → ongoing) ---');

  const res7Create = await orderService.createOrder({
    customer_id: customer.id,
    branch_id: branch.id,
    rental_start_date: futureDate,
    rental_end_date: futureEndDate,
    items: [{ product_id: product.id, quantity: 2, price_per_day: 500 }],
  });
  const order2Id = res7Create.data?.id;
  if (order2Id) cleanupOrderIds.push(order2Id);

  const stockBeforeStart = (await productRepository.findById(product.id)).data!.available_quantity;

  const res7 = await orderService.updateOrder(order2Id!, { status: OrderStatus.ONGOING });
  assert(res7.success && res7.data?.status === OrderStatus.ONGOING,
    'Start Rental: scheduled → ongoing → success',
    { success: res7.success, status: res7.data?.status });

  // ─── TEST 8: Stock decremented by order quantity on start ──
  const stockAfterStart = (await productRepository.findById(product.id)).data!.available_quantity;
  assert(stockAfterStart === stockBeforeStart - 2,
    `Stock decreased by 2 on start rental (${stockBeforeStart} → ${stockAfterStart})`,
    { before: stockBeforeStart, after: stockAfterStart });

  // ─── TEST 9: Cancel ongoing order → stock restored ─────
  console.log('\n--- Phase 5: Cancel Ongoing Order & Stock Restoration ---');

  const res9 = await orderService.updateOrder(order2Id!, { status: OrderStatus.CANCELLED });
  assert(res9.success && res9.data?.status === OrderStatus.CANCELLED,
    'Cancel ongoing order → success',
    { success: res9.success, status: res9.data?.status });

  const stockAfterCancelOngoing = (await productRepository.findById(product.id)).data!.available_quantity;
  assert(stockAfterCancelOngoing === stockBeforeStart,
    `Stock restored after cancelling ongoing order (back to ${stockBeforeStart})`,
    { before: stockBeforeStart, after: stockAfterCancelOngoing });

  // ─── TEST 10: Returned → scheduled is BLOCKED ──────────
  console.log('\n--- Phase 6: Invalid Transitions from Terminal/Non-schedulable States ---');

  const res10Create = await orderService.createOrder({
    customer_id: customer.id,
    branch_id: branch.id,
    rental_start_date: todayDate,
    rental_end_date: todayEndDate,
    items: [{ product_id: product.id, quantity: 1, price_per_day: 500 }],
  });
  const order3Id = res10Create.data?.id;
  if (order3Id) cleanupOrderIds.push(order3Id);

  // ongoing → returned
  await orderService.updateOrder(order3Id!, { status: OrderStatus.RETURNED });

  const res10 = await orderService.updateOrder(order3Id!, { status: OrderStatus.SCHEDULED });
  assert(!res10.success,
    'Returned → scheduled → BLOCKED',
    { success: res10.success, error: res10.error?.message });

  // ─── TEST 11: Completed → ongoing is BLOCKED ───────────
  // returned → completed first
  await orderService.updateOrder(order3Id!, { status: OrderStatus.COMPLETED });

  const res11 = await orderService.updateOrder(order3Id!, { status: OrderStatus.ONGOING });
  assert(!res11.success,
    'Completed → ongoing → BLOCKED',
    { success: res11.success, error: res11.error?.message });

  // ─── TEST 12: Status history correctness ────────────────
  console.log('\n--- Phase 7: Status History Validation ---');

  const histRes = await supabase
    .from('order_status_history')
    .select('status')
    .eq('order_id', order2Id!)
    .order('created_at', { ascending: true });

  const historyStatuses = histRes.data?.map(h => h.status) || [];
  // order2 went: scheduled → ongoing → cancelled
  const expectedSequence = ['scheduled', 'ongoing', 'cancelled'];
  const sequenceMatch = JSON.stringify(historyStatuses) === JSON.stringify(expectedSequence);

  assert(sequenceMatch,
    `Status history for order2: [${expectedSequence.join(' → ')}]`,
    { expected: expectedSequence, got: historyStatuses });

  // ─── TEST 13: Full lifecycle: create scheduled → cancel → verify no stock impact
  console.log('\n--- Phase 8: Full Cancel Lifecycle (E2E) ---');

  const stockBefore13 = (await productRepository.findById(product.id)).data!.available_quantity;
  
  const res13 = await orderService.createOrder({
    customer_id: customer.id,
    branch_id: branch.id,
    rental_start_date: futureDate,
    rental_end_date: futureEndDate,
    items: [{ product_id: product.id, quantity: 3, price_per_day: 500 }],
  });
  const order4Id = res13.data?.id;
  if (order4Id) cleanupOrderIds.push(order4Id);

  assert(res13.data?.status === OrderStatus.SCHEDULED, 'E2E: Created as scheduled');

  // Cancel it immediately
  const res13cancel = await orderService.updateOrder(order4Id!, { status: OrderStatus.CANCELLED });
  assert(res13cancel.success, 'E2E: Cancel succeeded');

  const stockAfter13 = (await productRepository.findById(product.id)).data!.available_quantity;
  assert(stockAfter13 === stockBefore13,
    `E2E: Stock unchanged through create-scheduled-then-cancel cycle (${stockBefore13} → ${stockAfter13})`);

  // ─── CLEANUP ────────────────────────────────────────────
  console.log('\n--- Cleanup ---');
  for (const oid of cleanupOrderIds) {
    await supabase.from('order_status_history').delete().eq('order_id', oid);
    await supabase.from('order_items').delete().eq('order_id', oid);
    await supabase.from('orders').delete().eq('id', oid);
  }
  await supabase.from('products').delete().eq('id', product.id);
  console.log(`Cleaned up ${cleanupOrderIds.length} test orders + test product.`);

  // ─── RESULTS ────────────────────────────────────────────
  console.log(`\n=== RESULTS ===`);
  console.log(`Total Tests: ${testNumber}`);
  console.log(`Passed: \x1b[32m${passCount}\x1b[0m`);
  console.log(`Failed: \x1b[31m${failCount}\x1b[0m`);

  if (failCount > 0) {
    console.log(`\n\x1b[31m${failCount} TEST(S) FAILED!\x1b[0m`);
  } else {
    console.log(`\n\x1b[32mALL TESTS PASSED!\x1b[0m`);
  }

  process.exit(failCount > 0 ? 1 : 0);
}

runTests().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
