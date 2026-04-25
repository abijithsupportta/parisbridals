import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase.rpc('run_sql', { 
    query: `ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_payment_type_check; ALTER TABLE payments ADD CONSTRAINT payments_payment_type_check CHECK (payment_type IN ('deposit', 'advance', 'final', 'refund'));` 
  });
  console.log('Result:', data, error);
}
run();
