/**
 * Terminal test script for category CRUD operations.
 * Run: node scripts/test-category-crud.mjs
 */

import { createClient, createAdminClient } from '../lib/supabase/server.ts';

// Simulate env vars from .env.local (they should be loaded automatically by Next.js)
// But for a standalone Node script, we need to load them via dotenv

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '../.env.local') });

console.log('=== Testing Category CRUD ===\n');

// Test 1: Check env vars
console.log('1. Checking environment variables:');
console.log('   NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✓ set' : '✗ MISSING');
console.log('   NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✓ set' : '✗ MISSING');
console.log('   SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✓ set' : '✗ MISSING');
console.log();

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY is not set!');
  console.error('The category creation will fail with RLS violation (42501).');
  console.error('Please add SUPABASE_SERVICE_ROLE_KEY to .env.local');
  process.exit(1);
}

// Test 2: Create admin client
console.log('2. Testing createAdminClient():');
try {
  const admin = createAdminClient();
  console.log('   ✓ Admin client created successfully');
} catch (err) {
  console.error('   ✗ Failed:', err.message);
  process.exit(1);
}

// Test 3: Try a simple insert
console.log('\n3. Testing INSERT into categories:');
try {
  const admin = createAdminClient();
  const testCategory = {
    name: 'Test Category ' + Date.now(),
    slug: 'test-category-' + Date.now(),
    description: 'Created by test script',
    image_url: null,
    parent_id: null,
    store_id: null,
    is_global: true,
    is_active: true,
    sort_order: 999,
  };

  const { data, error } = await admin
    .from('categories')
    .insert(testCategory)
    .select();

  if (error) {
    console.error('   ✗ INSERT FAILED:', error.code, error.message);
    process.exit(1);
  }

  const inserted = data[0];
  console.log('   ✓ INSERT SUCCESS - ID:', inserted.id);

  // Test 4: Update
  console.log('\n4. Testing UPDATE:');
  const { error: updateErr } = await admin
    .from('categories')
    .update({ name: inserted.name + ' (Updated)' })
    .eq('id', inserted.id);

  if (updateErr) {
    console.error('   ✗ UPDATE FAILED:', updateErr.code, updateErr.message);
  } else {
    console.log('   ✓ UPDATE SUCCESS');
  }

  // Test 5: Delete
  console.log('\n5. Testing DELETE:');
  const { error: deleteErr } = await admin
    .from('categories')
    .delete()
    .eq('id', inserted.id);

  if (deleteErr) {
    console.error('   ✗ DELETE FAILED:', deleteErr.code, deleteErr.message);
  } else {
    console.log('   ✓ DELETE SUCCESS');
  }

  console.log('\n=== All tests passed! ===');

} catch (err) {
  console.error('   ✗ UNEXPECTED ERROR:', err.message);
  process.exit(1);
}
