const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Extract env from .env.local
const envContent = fs.readFileSync(path.join(__dirname, '../apps/storefront/.env.local'), 'utf8');
const env = Object.fromEntries(envContent.split('\n').filter(l => l.includes('=')).map(l => l.split('=').map(s => s.trim())));

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const STORE_SLUG = 'paris-bridals';
const STORE_EMAIL = 'parisbridals1@gmail.com';

async function checkData() {
  console.log('--- Checking Store ---');
  const { data: store, error: storeError } = await supabase
    .from('stores')
    .select('*')
    .or(`slug.eq.${STORE_SLUG},email.eq.${STORE_EMAIL}`)
    .maybeSingle();

  if (storeError) {
    console.error('Store Error:', storeError);
    return;
  }

  if (!store) {
    console.error('No store found for:', { STORE_SLUG, STORE_EMAIL });
    // Let's check all stores to see what exists
    const { data: allStores } = await supabase.from('stores').select('id, name, slug, email');
    console.log('Available Stores:', allStores);
    return;
  }

  console.log('Found Store:', { id: store.id, name: store.name, slug: store.slug });

  console.log('\n--- Checking Banners ---');
  const { data: banners, count: bannerCount, error: bannerError } = await supabase
    .from('banners')
    .select('*', { count: 'exact' })
    .eq('store_id', store.id);
  
  if (bannerError) console.error('Banner Error:', bannerError);
  console.log(`Total Banners for this store: ${bannerCount}`);
  if (banners) {
    console.log('Banner count by active status:', {
      active: banners.filter(b => b.is_active).length,
      inactive: banners.filter(b => !b.is_active).length
    });
    if (banners.length > 0) {
        console.log('Sample Banner:', { id: banners[0].id, title: banners[0].title, is_active: banners[0].is_active });
    }
  }

  console.log('\n--- Checking Categories ---');
  const { data: categories, count: catCount, error: catError } = await supabase
    .from('categories')
    .select('*', { count: 'exact' })
    .eq('store_id', store.id);

  if (catError) console.error('Category Error:', catError);
  console.log(`Total Categories for this store: ${catCount}`);
  if (categories) {
    console.log('Category count by active status:', {
      active: categories.filter(c => c.is_active).length,
      inactive: categories.filter(c => !c.is_active).length
    });
  }
}

checkData();
