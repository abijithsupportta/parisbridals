import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = envContent.split('\n').reduce((acc: any, line) => {
  const [key, ...value] = line.split('=');
  if (key && value) {
    acc[key.trim()] = value.join('=').trim().replace(/^"|"$/g, '');
  }
  return acc;
}, {});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY'];

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('categories').select('*').limit(1);
  console.log('Categories data:', data?.length);
  if (error) console.error('Error:', error);
  
  const { data: pData, error: pError } = await supabase.from('products').select('*').limit(1);
  console.log('Products data:', pData?.length);
  if (pError) console.error('Error:', pError);
}
run();
