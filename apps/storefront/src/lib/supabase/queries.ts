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

/** JSONB image object stored in products.images column */
export interface ProductImage {
  url: string;
  key?: string;
  is_primary?: boolean;
}

/**
 * Safely extract image URLs from a product's images field.
 * Handles both JSONB object format { url, key, is_primary } and legacy string[] format.
 */
export function getProductImageUrls(images: unknown): string[] {
  if (!images || !Array.isArray(images)) return [];
  return images
    .map((img) => {
      if (typeof img === 'string') return img;
      if (img && typeof img === 'object' && 'url' in img) return (img as ProductImage).url;
      return null;
    })
    .filter((url): url is string => !!url);
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
  // Stored as JSONB [{url, key, is_primary}] in DB — use getProductImageUrls() to extract URLs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  images: any[];
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
  banner_type: 'hero' | 'editorial' | 'split';
  position: string | null;
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
 * Resolve the correct link for a banner based on its redirect type and target ID.
 */
export function getBannerLink(banner: Banner): string | null {
  if (banner.redirect_type === "none") return null;

  if (banner.redirect_type === "url" && banner.redirect_url) {
    return banner.redirect_url;
  }

  if (banner.redirect_type === "category" && banner.redirect_target_id) {
    return `/collections?category_id=${banner.redirect_target_id}`;
  }

  if (banner.redirect_type === "product" && banner.redirect_target_id) {
    return `/product/${banner.redirect_target_id}`;
  }

  // Fallback for subcategories/subvariants if they use the same collection view
  if ((banner.redirect_type === "subcategory" || banner.redirect_type === "subvariant") && banner.redirect_target_id) {
    return `/collections?category_id=${banner.redirect_target_id}`;
  }

  // Legacy fallback
  if (banner.redirect_url) return banner.redirect_url;

  return null;
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
 * Get active banners (all types)
 */
export async function getBanners(): Promise<Banner[]> {
  const supabase = createClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('banners')
    .select('*')
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
 * Get active hero banners sorted by position (1-10)
 */
export async function getHeroBanners(): Promise<Banner[]> {
  const supabase = createClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('banners')
    .select('*')
    .eq('is_active', true)
    .eq('banner_type', 'hero')
    .or('start_date.is.null,start_date.lte.' + now)
    .or('end_date.is.null,end_date.gte.' + now)
    .order('position', { ascending: true });

  if (error) {
    console.error('Error fetching hero banners:', error);
    return [];
  }

  return (data || []).filter(b => b.web_image_url?.trim());
}

/**
 * Get active editorial banner (max 1)
 */
export async function getEditorialBanners(): Promise<Banner[]> {
  const supabase = createClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('banners')
    .select('*')
    .eq('is_active', true)
    .eq('banner_type', 'editorial')
    .or('start_date.is.null,start_date.lte.' + now)
    .or('end_date.is.null,end_date.gte.' + now)
    .order('priority', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error fetching editorial banners:', error);
    return [];
  }

  return (data || []).filter(b => b.web_image_url?.trim());
}

/**
 * Get active split banners sorted by position (left first, then right)
 */
export async function getSplitBanners(): Promise<Banner[]> {
  const supabase = createClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('banners')
    .select('*')
    .eq('is_active', true)
    .eq('banner_type', 'split')
    .or('start_date.is.null,start_date.lte.' + now)
    .or('end_date.is.null,end_date.gte.' + now)
    .order('position', { ascending: true });

  if (error) {
    console.error('Error fetching split banners:', error);
    return [];
  }

  return (data || []).filter(b => b.web_image_url?.trim());
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
