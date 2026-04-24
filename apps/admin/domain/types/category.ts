/**
 * Category Domain Types
 *
 * Type definitions for the category domain following Domain-Driven Design principles.
 *
 * @module domain/types/category
 */

// Core Category Entity
export interface Category {
  readonly id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
  is_global: boolean;
  created_at: string;
  updated_at?: string;
  // Audit fields
  readonly created_by: string | null;
  readonly created_at_branch_id: string | null;
  readonly updated_by: string | null;
  readonly updated_at_branch_id: string | null;
}

// Category Level Enum
export enum CategoryLevel {
  MAIN = 'main',
  SUB = 'sub',
  VARIANT = 'variant',
}

// Category Create DTO
export interface CreateCategoryDTO {
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  parent_id?: string | null;
  sort_order?: number;
  is_active?: boolean;
  is_global?: boolean;
}

// Category Update DTO
export interface UpdateCategoryDTO {
  name?: string;
  slug?: string;
  description?: string;
  image_url?: string;
  parent_id?: string | null;
  sort_order?: number;
  is_active?: boolean;
  is_global?: boolean;
}

// Category with Relations
export interface CategoryWithRelations extends Category {
  parent?: Category | null;
  children?: Category[];
  product_count?: number;
  level: CategoryLevel;
  path: string; // e.g., "Jewelry > Earrings > Diamond"
}

// Category Hierarchy
export interface CategoryHierarchy {
  mains: Category[];
  subs: Category[];
  variants: Category[];
}

// Category Tree Node
export interface CategoryTreeNode {
  category: Category;
  children: CategoryTreeNode[];
  level: number;
  isExpanded: boolean;
  productCount: number;
}

// Category Validation
export interface CategoryValidationError {
  field: string;
  message: string;
  code: string;
}

export interface CategoryValidationResult {
  is_valid: boolean;
  errors: CategoryValidationError[];
  warnings: CategoryValidationError[];
}

// Type Guards
export const isValidCategory = (obj: any): obj is Category => {
  return obj && 
         typeof obj.id === 'string' &&
         typeof obj.name === 'string' &&
         typeof obj.slug === 'string';
};

export const isMainCategory = (category: Category): boolean => {
  return !category.parent_id;
};

export const isSubCategory = (category: Category, allCategories: Category[]): boolean => {
  if (!category.parent_id) return false;
  const parent = allCategories.find(c => c.id === category.parent_id);
  return parent ? !parent.parent_id : false;
};

export const isVariantCategory = (category: Category, allCategories: Category[]): boolean => {
  if (!category.parent_id) return false;
  const parent = allCategories.find(c => c.id === category.parent_id);
  return parent ? !!parent.parent_id : false;
};
