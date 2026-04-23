/**
 * Category Data Access Layer
 *
 * Encapsulates all database operations for the 3-level category hierarchy:
 *   - Main Category  (parent_id = null)
 *   - Sub Category   (parent_id = main.id)
 *   - Variant        (parent_id = sub.id)
 *
 * All operations use the admin (service role) client because these are
 * invoked from the trusted admin dashboard (server components + API routes).
 * The admin client bypasses RLS so staff can manage all categories
 * regardless of store_id / is_global filters. NEVER import this module
 * from client components — use the REST API at /api/categories instead.
 *
 * @module lib/supabase/categories
 */

import { createAdminClient } from "./server";

/**
 * Represents a category row from the `categories` table.
 * A category may be a Main, Sub, or Variant based on parent_id chain.
 */
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

/** Input payload for creating a new category (id and created_at are auto-generated). */
export type CategoryCreateInput = Omit<Category, "id" | "created_at">;

/** Input payload for updating a category. All fields optional. */
export type CategoryUpdateInput = Partial<CategoryCreateInput>;

/**
 * Determines the hierarchy level of a category based on parent chain.
 *
 * @param category - The category to classify
 * @param allCategories - The full list of categories for parent lookup
 * @returns "main" | "sub" | "variant"
 */
export function getCategoryLevel(
  category: Pick<Category, "id" | "parent_id">,
  allCategories: Pick<Category, "id" | "parent_id">[]
): "main" | "sub" | "variant" {
  if (!category.parent_id) return "main";
  const parent = allCategories.find((c) => c.id === category.parent_id);
  if (!parent?.parent_id) return "sub";
  return "variant";
}

// ─── READ OPERATIONS ────────────────────────────────────────────────────────

/**
 * Fetches all categories ordered by sort_order, then alphabetically.
 * Uses the admin client because this is called from the admin dashboard,
 * which should see all rows regardless of RLS policies.
 *
 * @returns Array of categories (empty array on error)
 */
export async function getCategories(): Promise<Category[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error("[getCategories] Error:", error.message);
    return [];
  }
  return data || [];
}

/**
 * Fetches a single category by its UUID. Uses the admin client.
 *
 * @param id - Category UUID
 * @returns The category, or null if not found / on error
 */
export async function getCategoryById(id: string): Promise<Category | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[getCategoryById] Error:", error.message);
    return null;
  }
  return data;
}

/**
 * Fetches all direct children of a category (one level deep).
 * For a Main category this returns Sub categories; for a Sub it returns Variants;
 * for a Variant it returns an empty array (variants cannot have children).
 *
 * @param parentId - Parent category UUID
 * @returns Array of child categories, ordered by sort_order, name
 */
export async function getCategoryChildren(parentId: string): Promise<Category[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("parent_id", parentId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error("[getCategoryChildren] Error:", error.message);
    return [];
  }
  return data || [];
}

/**
 * Counts how many products reference this category via any of:
 *   - category_id
 *   - subcategory_id
 *   - subvariant_id
 * Uses the admin client to see all products regardless of RLS.
 *
 * @param categoryId - Category UUID
 * @returns Count of products linked to this category
 */
export async function getCategoryProductCount(categoryId: string): Promise<number> {
  const supabase = createAdminClient();
  const { count, error } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .or(
      `category_id.eq.${categoryId},subcategory_id.eq.${categoryId},subvariant_id.eq.${categoryId}`
    );

  if (error) {
    console.error("[getCategoryProductCount] Error:", error.message);
    return 0;
  }
  return count || 0;
}

/**
 * Checks whether a category can be safely deleted (no linked products and no child categories).
 *
 * @param id - Category UUID
 * @returns Object with canDelete flag, product count, and child count
 */
export async function canDeleteCategory(id: string): Promise<{
  canDelete: boolean;
  productCount: number;
  childCount: number;
  reason?: string;
}> {
  const productCount = await getCategoryProductCount(id);

  // Also check for child categories
  const supabase = createAdminClient();
  const { count: childCount, error } = await supabase
    .from("categories")
    .select("*", { count: "exact", head: true })
    .eq("parent_id", id);

  if (error) {
    console.error("[canDeleteCategory] Error counting children:", error.message);
  }

  const children = childCount || 0;

  if (productCount > 0) {
    return {
      canDelete: false,
      productCount,
      childCount: children,
      reason: `${productCount} product(s) are linked to this category.`,
    };
  }
  if (children > 0) {
    return {
      canDelete: false,
      productCount,
      childCount: children,
      reason: `${children} child categor${children === 1 ? "y is" : "ies are"} nested under this category.`,
    };
  }

  return { canDelete: true, productCount: 0, childCount: 0 };
}

// ─── WRITE OPERATIONS ───────────────────────────────────────────────────────

/**
 * Creates a new category. Uses the admin (service role) client to bypass RLS.
 * ONLY call from server-side code (API routes / server actions).
 *
 * @param input - Category fields (without id and created_at)
 * @returns The newly created category
 * @throws Error with Supabase error details on failure
 */
export async function createCategory(input: CategoryCreateInput): Promise<Category> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("categories")
    .insert(input)
    .select()
    .single();

  if (error) {
    console.error("[createCategory] Error:", JSON.stringify(error, null, 2));
    throw new Error(
      `Failed to create category: ${error.message}` +
      (error.code ? ` (code: ${error.code})` : "")
    );
  }
  if (!data) {
    throw new Error("Category insert returned no data.");
  }
  return data;
}

/**
 * Updates a category by id. Uses the admin client to bypass RLS.
 * ONLY call from server-side code.
 *
 * @param id - Category UUID
 * @param input - Partial update payload
 * @returns The updated category
 * @throws Error with Supabase error details on failure
 */
export async function updateCategory(
  id: string,
  input: CategoryUpdateInput
): Promise<Category> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("categories")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[updateCategory] Error:", JSON.stringify(error, null, 2));
    throw new Error(
      `Failed to update category: ${error.message}` +
      (error.code ? ` (code: ${error.code})` : "")
    );
  }
  if (!data) {
    throw new Error(`Category with id ${id} not found.`);
  }
  return data;
}

/**
 * Deletes a category by id. Uses the admin client to bypass RLS.
 * ONLY call from server-side code. The caller is responsible for enforcing
 * the "no linked products and no children" safety check via canDeleteCategory().
 *
 * @param id - Category UUID
 * @throws Error with Supabase error details on failure
 */
export async function deleteCategory(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("categories").delete().eq("id", id);

  if (error) {
    console.error("[deleteCategory] Error:", JSON.stringify(error, null, 2));
    throw new Error(
      `Failed to delete category: ${error.message}` +
      (error.code ? ` (code: ${error.code})` : "")
    );
  }
}
