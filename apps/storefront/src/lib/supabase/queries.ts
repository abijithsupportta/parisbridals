import { createClient } from './server';

export interface Store {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
  subscription_status: string;
  is_active: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  parent_id: string | null;
  store_id: string | null;
  is_global: boolean;
  is_active: boolean;
  sort_order: number;
}

export interface Product {
  id: string;
  store_id: string;
  category_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  sku: string | null;
  price_per_day: number;
  security_deposit: number;
  quantity: number;
  available_quantity: number;
  images: string[];
  sizes: string[];
  colors: string[];
  is_active: boolean;
  is_featured: boolean;
  created_at: string;
  subcategory_id: string | null;
  subvariant_id: string | null;
  track_inventory: boolean;
  low_stock_threshold: number;
  total_rentals: number;
  total_revenue: number;
  avg_rating: number;
  reviews_count: number;
  last_rented_at: string | null;
  barcode: string | null;
}

export interface Banner {
  id: string;
  store_id: string | null;
  title: string | null;
  subtitle: string | null;
  description: string | null;
  call_to_action: string | null;
  web_image_url: string;
  mobile_image_url: string | null;
  redirect_type: 'none' | 'category' | 'subcategory' | 'subvariant' | 'product' | 'url';
  redirect_target_id: string | null;
  redirect_url: string | null;
  is_active: boolean;
  priority: number;
  start_date: string | null;
  end_date: string | null;
  alt_text: string | null;
  created_at: string;
}

/**
 * Get store by email
 */
export async function getStoreByEmail(email: string): Promise<Store | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (error) {
    console.error('Error fetching store:', error);
    return null;
  }

  return data;
}

/**
 * Get store by slug
 */
export async function getStoreBySlug(slug: string): Promise<Store | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    console.error('Error fetching store:', error);
    return null;
  }

  return data;
}

/**
 * Get categories for a store (both global and store-specific)
 */
export async function getCategories(storeId: string): Promise<Category[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('store_id', storeId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching categories:', error);
    return [];
  }

  return data || [];
}

/**
 * Get featured products for a store
 */
export async function getFeaturedProducts(storeId: string, limit = 8): Promise<Product[]> {
  const supabase = createClient();
  
  // First try to get featured products
  let { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('store_id', storeId)
    .eq('is_active', true)
    .eq('is_featured', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching featured products:', error);
  }

  // If no featured products, get all active products
  if (!data || data.length === 0) {
    const result = await supabase
      .from('products')
      .select('*')
      .eq('store_id', storeId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    data = result.data;
    error = result.error;
  }

  if (error) {
    console.error('Error fetching products:', error);
    return [];
  }

  return data || [];
}

/**
 * Get new arrivals (latest products) for a store
 */
export async function getNewArrivals(storeId: string, limit = 10): Promise<Product[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('store_id', storeId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching new arrivals:', error);
    return [];
  }

  return data || [];
}

/**
 * Get active banners for a store
 */
export async function getBanners(storeId: string): Promise<Banner[]> {
  const supabase = createClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('banners')
    .select('*')
    .eq('store_id', storeId)
    .eq('is_active', true)
    .or('start_date.is.null,start_date.lte.' + now)
    .or('end_date.is.null,end_date.gte.' + now)
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching banners:', error);
    return [];
  }

  return data || [];
}

/**
 * Get a single product with category
 */
export async function getProductById(id: string): Promise<(Product & { category: { id: string; name: string; slug: string } | null }) | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('products')
    .select('*, category:category_id(id, name, slug)')
    .eq('id', id)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    console.error('Error fetching product:', error);
    return null;
  }

  return data as (Product & { category: { id: string; name: string; slug: string } | null }) | null;
}

/**
 * Get related products (same category, excluding current)
 */
export async function getRelatedProducts(
  storeId: string,
  categoryId: string | null,
  excludeId: string,
  limit = 4
): Promise<Product[]> {
  const supabase = createClient();

  let query = supabase
    .from('products')
    .select('*')
    .eq('store_id', storeId)
    .eq('is_active', true)
    .neq('id', excludeId);

  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching related products:', error);
    return [];
  }

  // If no products in same category, fall back to other active products
  if (!data || data.length === 0) {
    const { data: fallback } = await supabase
      .from('products')
      .select('*')
      .eq('store_id', storeId)
      .eq('is_active', true)
      .neq('id', excludeId)
      .order('created_at', { ascending: false })
      .limit(limit);
    return fallback || [];
  }

  return data;
}

/**
 * Get all products for a store (with pagination)
 */
export async function getProducts(
  storeId: string,
  options: {
    categoryId?: string;
    limit?: number;
    offset?: number;
    featured?: boolean;
    search?: string;
  } = {}
): Promise<{ products: Product[]; total: number }> {
  const supabase = createClient();
  let query = supabase
    .from("products")
    .select("*", { count: "exact" })
    .eq("store_id", storeId)
    .eq("is_active", true);

  if (options.categoryId) {
    query = query.eq("category_id", options.categoryId);
  }

  if (options.featured !== undefined) {
    query = query.eq("is_featured", options.featured);
  }

  if (options.search) {
    query = query.ilike("name", `%${options.search}%`);
  }

  query = query.order('created_at', { ascending: false });

  if (options.limit) {
    query = query.limit(options.limit);
  }

  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching products:', error);
    return { products: [], total: 0 };
  }

  return { products: data || [], total: count || 0 };
}
