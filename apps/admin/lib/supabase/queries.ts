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
  created_at: string;
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
  created_at: string;
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
  track_inventory: boolean;
  low_stock_threshold: number;
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
  banner_type: 'hero' | 'editorial' | 'split';
  is_active: boolean;
  priority: number;
  start_date: string | null;
  end_date: string | null;
  alt_text: string | null;
  created_at: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  address: string | null;
  created_at: string;
}

export interface Order {
  id: string;
  customer_id: string;
  customer: Customer;
  items: OrderItem[];
  total_amount: number;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  rental_start_date: string;
  rental_end_date: string;
  notes: string | null;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product: Product;
  quantity: number;
  price_per_day: number;
}

// Store CRUD
export async function getStores(): Promise<Store[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching stores:', error);
    return [];
  }

  return data || [];
}

export async function createStore(store: Omit<Store, 'id' | 'created_at'>): Promise<Store | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('stores')
    .insert(store)
    .select()
    .single();

  if (error) {
    console.error('Error creating store:', error);
    return null;
  }

  return data;
}

export async function updateStore(id: string, store: Partial<Store>): Promise<Store | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('stores')
    .update(store)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating store:', error);
    return null;
  }

  return data;
}

export async function deleteStore(id: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from('stores')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting store:', error);
    return false;
  }

  return true;
}

// Category CRUD
export async function getCategories(): Promise<Category[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching categories:', error);
    return [];
  }

  return data || [];
}

export async function createCategory(category: Omit<Category, 'id' | 'created_at'>): Promise<Category | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('categories')
    .insert(category)
    .select()
    .single();

  if (error) {
    console.error('Error creating category:', error);
    return null;
  }

  return data;
}

export async function updateCategory(id: string, category: Partial<Category>): Promise<Category | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('categories')
    .update(category)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating category:', error);
    return null;
  }

  return data;
}

export async function deleteCategory(id: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting category:', error);
    return false;
  }

  return true;
}

// Product CRUD
export async function getProducts(): Promise<Product[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('products')
    .select('*, category:category_id(id, name)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching products:', error);
    return [];
  }

  return data || [];
}

export async function createProduct(product: Omit<Product, 'id' | 'created_at'>): Promise<Product | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('products')
    .insert(product)
    .select()
    .single();

  if (error) {
    console.error('Error creating product:', error);
    return null;
  }

  return data;
}

export async function updateProduct(id: string, product: Partial<Product>): Promise<Product | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('products')
    .update(product)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating product:', error);
    return null;
  }

  return data;
}

export async function deleteProduct(id: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting product:', error);
    return false;
  }

  return true;
}

// Banner CRUD
export async function getBanners(): Promise<Banner[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('banners')
    .select('*')
    .order('priority', { ascending: false });

  if (error) {
    console.error('Error fetching banners:', error);
    return [];
  }

  return data || [];
}

export async function createBanner(banner: Omit<Banner, 'id' | 'created_at'>): Promise<Banner | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('banners')
    .insert(banner)
    .select()
    .single();

  if (error) {
    console.error('Error creating banner:', error);
    return null;
  }

  return data;
}

export async function updateBanner(id: string, banner: Partial<Banner>): Promise<Banner | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('banners')
    .update(banner)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating banner:', error);
    return null;
  }

  return data;
}

export async function deleteBanner(id: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from('banners')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting banner:', error);
    return false;
  }

  return true;
}

// Customer CRUD
export async function getCustomers(): Promise<Customer[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching customers:', error);
    return [];
  }

  return data || [];
}

export async function getCustomerByPhone(phone: string): Promise<Customer | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('phone', phone)
    .single();

  if (error) {
    console.error('Error fetching customer by phone:', error);
    return null;
  }

  return data;
}

export async function createCustomer(customer: Omit<Customer, 'id' | 'created_at'>): Promise<Customer | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('customers')
    .insert(customer)
    .select()
    .single();

  if (error) {
    console.error('Error creating customer:', error);
    return null;
  }

  return data;
}

// Order CRUD
export async function getOrders(): Promise<Order[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('orders')
    .select('*, customer:customer_id(*), order_items(*, product:product_id(*))')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching orders:', error);
    return [];
  }

  return data || [];
}

export async function createOrder(order: Omit<Order, 'id' | 'created_at'>): Promise<Order | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('orders')
    .insert(order)
    .select()
    .single();

  if (error) {
    console.error('Error creating order:', error);
    return null;
  }

  return data;
}
