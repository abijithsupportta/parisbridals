'use server';

import { getStoreByEmail, getStoreBySlug } from '@/lib/supabase/queries';

const PARIS_BRIDALS_EMAIL = 'parisbridals1@gmail.com';
const PARIS_BRIDALS_SLUG = 'paris-bridals';

/**
 * Get Paris Bridals store data
 * First tries by email, then by slug as fallback
 */
export async function getParisBridalsStore() {
  // Try to get by email first
  let store = await getStoreByEmail(PARIS_BRIDALS_EMAIL);
  
  // Fallback to slug
  if (!store) {
    store = await getStoreBySlug(PARIS_BRIDALS_SLUG);
  }
  
  return store;
}
