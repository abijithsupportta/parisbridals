/**
 * Category Repository
 *
 * Data access layer for category entities using Supabase.
 *
 * @module repository/categoryRepository
 */

import { BaseRepository, RepositoryResult } from './supabaseClient';
import { 
  Category, 
  CreateCategoryDTO, 
  UpdateCategoryDTO,
  CategoryWithRelations,
  CategoryHierarchy,
  CategoryLevel
} from '@/domain';

export class CategoryRepository extends BaseRepository {
  private readonly tableName = 'categories';

  /**
   * Find all categories
   */
  async findAll(): Promise<RepositoryResult<Category[]>> {
    const response = await this.client
      .from(this.tableName)
      .select('*')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    return this.handleResponse<Category[]>(response);
  }

  /**
   * Find category by ID
   */
  async findById(id: string): Promise<RepositoryResult<CategoryWithRelations>> {
    const response = await this.client
      .from(this.tableName)
      .select(`
        *,
        parent:parent_id(id, name, slug)
      `)
      .eq('id', id)
      .single();

    const result = this.handleResponse<Category & { parent?: Category | null }>(response);
    
    if (!result.success || !result.data) {
      return {
        data: null,
        error: result.error,
        success: false,
      };
    }

    // Determine level and add to result
    const allCategories = await this.findAll();
    if (!allCategories.success || !allCategories.data) {
      return {
        data: null,
        error: allCategories.error,
        success: false,
      };
    }

    const level = this.getCategoryLevel(result.data, allCategories.data);
    
    const categoryWithRelations: CategoryWithRelations = {
      ...result.data,
      level,
      path: this.buildCategoryPath(result.data, allCategories.data),
    };

    return {
      data: categoryWithRelations,
      error: null,
      success: true,
    };
  }

  /**
   * Find direct children of a category
   */
  async findChildren(parentId: string): Promise<RepositoryResult<Category[]>> {
    const response = await this.client
      .from(this.tableName)
      .select('*')
      .eq('parent_id', parentId)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    return this.handleResponse<Category[]>(response);
  }

  /**
   * Get category hierarchy
   */
  async getHierarchy(): Promise<RepositoryResult<CategoryHierarchy>> {
    const allCategoriesResult = await this.findAll();
    if (!allCategoriesResult.success || !allCategoriesResult.data) {
      return {
        data: { mains: [], subs: [], variants: [] },
        error: allCategoriesResult.error,
        success: false,
      };
    }

    const all = allCategoriesResult.data;
    const hierarchy = this.buildHierarchy(all);

    return {
      data: hierarchy,
      error: null,
      success: true,
    };
  }

  /**
   * Create a new category
   */
  async create(data: CreateCategoryDTO): Promise<RepositoryResult<Category>> {
    const response = await this.client
      .from(this.tableName)
      .insert({
        ...data,
        ...this.getCreateAuditFields(),
      })
      .select()
      .single();

    return this.handleResponse<Category>(response);
  }

  /**
   * Update an existing category
   */
  async update(id: string, data: UpdateCategoryDTO): Promise<RepositoryResult<Category>> {
    const response = await this.client
      .from(this.tableName)
      .update({
        ...data,
        updated_at: new Date().toISOString(),
        ...this.getUpdateAuditFields(),
      })
      .eq('id', id)
      .select()
      .single();

    return this.handleResponse<Category>(response);
  }

  /**
   * Delete a category
   */
  async delete(id: string): Promise<RepositoryResult<void>> {
    const response = await this.client
      .from(this.tableName)
      .delete()
      .eq('id', id);

    return this.handleResponse<void>(response);
  }

  /**
   * Check if category can be deleted
   */
  async canDelete(id: string): Promise<RepositoryResult<{
    canDelete: boolean;
    reason?: string;
    relatedData?: {
      productCount: number;
      childCount: number;
    };
  }>> {
    try {
      // Check for child categories
      const childrenResult = await this.findChildren(id);
      const childCount = childrenResult.success ? childrenResult.data?.length || 0 : 0;

      // Check for products
      const { count: productCount } = await this.client
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', id);

      const canDelete = childCount === 0 && (productCount || 0) === 0;
      let reason: string | undefined;

      if (!canDelete) {
        if (childCount > 0 && productCount! > 0) {
          reason = 'Category has child categories and products';
        } else if (childCount > 0) {
          reason = 'Category has child categories';
        } else if (productCount! > 0) {
          reason = 'Category has products';
        }
      }

      return {
        data: {
          canDelete,
          reason,
          relatedData: {
            productCount: productCount || 0,
            childCount,
          },
        },
        error: null,
        success: true,
      };
    } catch (error) {
      return {
        data: { canDelete: false, reason: 'Error checking delete safety' },
        error: error as any,
        success: false,
      };
    }
  }

  /**
   * Get product count for a category
   */
  async getProductCount(id: string): Promise<RepositoryResult<number>> {
    try {
      const { count } = await this.client
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', id);

      return {
        data: count || 0,
        error: null,
        success: true,
      };
    } catch (error) {
      return {
        data: 0,
        error: error as any,
        success: false,
      };
    }
  }

  /**
   * Check if slug exists
   */
  async slugExists(slug: string, excludeId?: string): Promise<RepositoryResult<boolean>> {
    let query = this.client
      .from(this.tableName)
      .select('id')
      .eq('slug', slug);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data } = await query.limit(1);
    const exists = !!data && data.length > 0;

    return {
      data: exists,
      error: null,
      success: true,
    };
  }

  /**
   * Helper method to determine category level
   */
  private getCategoryLevel(category: Category, allCategories: Category[]): CategoryLevel {
    if (!category.parent_id) {
      return CategoryLevel.MAIN;
    }

    const parent = allCategories.find(c => c.id === category.parent_id);
    if (!parent) {
      return CategoryLevel.MAIN;
    }

    if (!parent.parent_id) {
      return CategoryLevel.SUB;
    }

    return CategoryLevel.VARIANT;
  }

  /**
   * Helper method to build category hierarchy
   */
  private buildHierarchy(categories: Category[]): CategoryHierarchy {
    const mains = categories.filter(c => !c.parent_id);
    const subs = categories.filter(c => {
      const parent = categories.find(p => p.id === c.parent_id);
      return parent && !parent.parent_id;
    });
    const variants = categories.filter(c => {
      const parent = categories.find(p => p.id === c.parent_id);
      return parent && parent.parent_id;
    });

    return { mains, subs, variants };
  }

  /**
   * Helper method to build category path
   */
  private buildCategoryPath(category: Category, allCategories: Category[]): string {
    const path: string[] = [];
    let current: Category | undefined = category;

    while (current) {
      path.unshift(current.name);
      if (current.parent_id) {
        current = allCategories.find(c => c.id === current!.parent_id);
      } else {
        current = undefined;
      }
    }

    return path.join(' > ');
  }
}

// Export singleton instance
export const categoryRepository = new CategoryRepository();
