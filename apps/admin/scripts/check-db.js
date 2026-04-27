import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const { data, error } = await supabase.from('categories').select('count');
  console.log('Categories count:', data, error);
  const { data: pData, error: pError } = await supabase.from('products').select('count');
  console.log('Products count:', pData, pError);
}

run();
