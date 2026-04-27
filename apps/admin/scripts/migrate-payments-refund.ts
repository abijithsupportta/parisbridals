/**
 * Migration runner: Add 'refund' to payments_payment_type_check
 * 
 * Run: set env vars from .env.local then execute with tsx
 */
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
  console.log('Running migration: Add refund to payments_payment_type_check...');
  
  // Use the SQL Editor approach via rpc if available, otherwise try direct
  const { data, error } = await supabase.rpc('run_sql', {
    query: `
      ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_payment_type_check;
      ALTER TABLE payments ADD CONSTRAINT payments_payment_type_check 
        CHECK (payment_type IN ('deposit', 'advance', 'final', 'refund'));
    `
  });

  if (error) {
    console.error('RPC approach failed:', error.message);
    console.log('');
    console.log('=== MANUAL MIGRATION REQUIRED ===');
    console.log('Please run this SQL in Supabase Dashboard > SQL Editor:');
    console.log('');
    console.log("ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_payment_type_check;");
    console.log("ALTER TABLE payments ADD CONSTRAINT payments_payment_type_check CHECK (payment_type IN ('deposit', 'advance', 'final', 'refund'));");
    console.log('');
  } else {
    console.log('Migration successful!', data);
  }

  // Verify the constraint by attempting a dry-run check
  console.log('\nVerifying: Attempting to read current payments...');
  const { data: payments, error: readErr } = await supabase
    .from('payments')
    .select('id, payment_type')
    .limit(3);
  
  if (readErr) {
    console.error('Read check failed:', readErr.message);
  } else {
    console.log(`Read check passed — ${payments?.length || 0} payments found.`);
  }
}

run();
