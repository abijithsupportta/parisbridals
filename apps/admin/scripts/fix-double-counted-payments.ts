/**
 * Fix Double-Counted amount_paid on Orders
 *
 * Bug: The POST /api/orders route was creating a DUPLICATE advance payment
 * record, causing amount_paid to be doubled. This script:
 *
 * 1. Fetches all orders from the database
 * 2. For each order, sums the ACTUAL payment records (excluding deposit/deposit_refund)
 * 3. Compares against the stored amount_paid
 * 4. If they don't match, updates the order's amount_paid and payment_status
 * 5. Also removes duplicate advance payment records
 *
 * Run: npx tsx scripts/fix-double-counted-payments.ts
 */

const SUPABASE_URL = 'https://oxydrjfvrlnfhntkzefj.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94eWRyamZ2cmxuZmhudGt6ZWZqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njg0MzIyMCwiZXhwIjoyMDkyNDE5MjIwfQ.ND0uzGs0qEwNjR4x0E5xDdZjGLDucfw_7AeT3gi1gyI';

const headers = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
};

async function supabaseGet(table: string, query: string = '') {
  const url = `${SUPABASE_URL}/rest/v1/${table}${query ? '?' + query : ''}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`GET ${table} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function supabasePatch(table: string, id: string, data: any) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`PATCH ${table}/${id} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function supabaseDelete(table: string, id: string) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`;
  const res = await fetch(url, { method: 'DELETE', headers });
  if (!res.ok) throw new Error(`DELETE ${table}/${id} failed: ${res.status} ${await res.text()}`);
}

async function main() {
  console.log('=== Fix Double-Counted Payments ===\n');

  // Step 1: Get all orders
  const orders: any[] = await supabaseGet('orders', 'select=id,total_amount,amount_paid,payment_status,advance_collected,advance_amount&order=created_at.desc');
  console.log(`Found ${orders.length} orders total.\n`);

  let fixedCount = 0;
  let duplicatesRemoved = 0;

  for (const order of orders) {
    // Step 2: Get all payments for this order
    const payments: any[] = await supabaseGet('payments', `order_id=eq.${order.id}&select=id,payment_type,amount,notes,created_at&order=created_at.asc`);

    // Step 3: Check for duplicate advance payments
    const advancePayments = payments.filter((p: any) => p.payment_type === 'advance');
    if (advancePayments.length > 1) {
      console.log(`⚠️  Order ${order.id}: Found ${advancePayments.length} advance payments (should be 1)`);
      // Keep the first one, delete the rest
      for (let i = 1; i < advancePayments.length; i++) {
        console.log(`   🗑️  Deleting duplicate advance payment ${advancePayments[i].id} (₹${advancePayments[i].amount})`);
        await supabaseDelete('payments', advancePayments[i].id);
        duplicatesRemoved++;
      }
      // Re-fetch payments after cleanup
      const cleanPayments: any[] = await supabaseGet('payments', `order_id=eq.${order.id}&select=id,payment_type,amount,notes,created_at&order=created_at.asc`);
      payments.length = 0;
      payments.push(...cleanPayments);
    }

    // Step 4: Calculate correct amount_paid from payment records
    // Only count rental payments (advance, partial, final, adjustment)
    // Exclude deposit and deposit_refund — they're a separate track
    let correctAmountPaid = 0;
    for (const p of payments) {
      if (p.payment_type === 'deposit' || p.payment_type === 'deposit_refund') {
        continue;
      }
      if (p.payment_type === 'refund') {
        correctAmountPaid -= p.amount;
      } else {
        correctAmountPaid += p.amount;
      }
    }
    correctAmountPaid = Math.max(0, correctAmountPaid);

    // Step 5: Compare and fix
    const storedAmountPaid = Number(order.amount_paid || 0);
    const totalAmount = Number(order.total_amount || 0);

    if (Math.abs(storedAmountPaid - correctAmountPaid) > 0.01) {
      const correctStatus = correctAmountPaid <= 0 ? 'pending'
        : correctAmountPaid >= totalAmount ? 'paid'
        : 'partial';

      console.log(`🔧 Order ${order.id}:`);
      console.log(`   amount_paid: ${storedAmountPaid} → ${correctAmountPaid}`);
      console.log(`   payment_status: ${order.payment_status} → ${correctStatus}`);
      console.log(`   total_amount: ${totalAmount}`);

      await supabasePatch('orders', order.id, {
        amount_paid: correctAmountPaid,
        payment_status: correctStatus,
        updated_at: new Date().toISOString(),
      });
      fixedCount++;
      console.log(`   ✅ Fixed!\n`);
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Orders scanned: ${orders.length}`);
  console.log(`Duplicate advance payments removed: ${duplicatesRemoved}`);
  console.log(`Orders with corrected amount_paid: ${fixedCount}`);
  console.log(`Orders already correct: ${orders.length - fixedCount}`);
}

main().catch(console.error);
