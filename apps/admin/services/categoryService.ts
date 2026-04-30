/**
 * Category Service
 *
 * Business logic layer for category operations.
 *
 * @module services/categoryService
 */

import { 
  categoryRepository,
  productRepository,
  RepositoryResult
} from '@/repository';
import { 
  Category, 
  CreateCategoryDTO, 
  UpdateCategoryDTO, 
  CategoryWithRelations,
  CategoryLevel 
} from '@/domain';
import { 
  CategoryValidationResult,
  CategoryValidationError
} from '@/domain';
import { generateSlug } from '@/lib/shared-utils';

export class CategoryService {
  private currentUserId: string | null = null;
  private currentStoreId: string | null = null;
  private currentBranchId: string | null = null;
 
  /**
   * Set current user context for audit fields and multi-tenancy
   */
  setUserContext(userId: string | null, branchId: string | null, storeId: string | null = null) {
    this.currentUserId = userId;
    this.currentBranchId = branchId;
    this.currentStoreId = storeId;
    categoryRepository.setUserContext(userId, branchId);
  }

  /**
   * Get all categories
   */
  async getAllCategories(): Promise<RepositoryResult<Category[]>> {
    return await categoryRepository.findAll();
  }

  /**
   * Get category hierarchy
   */
  async getCategoryHierarchy(): Promise<RepositoryResult<Category[]>> {
    const result = await categoryRepository.findAll();
    
    if (!result.success || !result.data) {
      return result;
    }
    
    // Build hierarchy tree from flat list
    const hierarchy = this.buildHierarchyTree(result.data);
    
    return {
      success: true,
      data: hierarchy,
      error: null,
    };
  }

  /**
   * Build hierarchy tree from flat category list
   */
  private buildHierarchyTree(categories: Category[]): Category[] {
    const categoryMap = new Map<string, Category & { children?: Category[] }>();
    const rootCategories: (Category & { children?: Category[] })[] = [];

    // First pass: create map and identify roots
    categories.forEach(cat => {
      categoryMap.set(cat.id, { ...cat, children: [] });
    });

    // Second pass: build tree structure
    categories.forEach(cat => {
      if (cat.parent_id && categoryMap.has(cat.parent_id)) {
        const parent = categoryMap.get(cat.parent_id)!;
        parent.children!.push(categoryMap.get(cat.id)!);
      } else {
        rootCategories.push(categoryMap.get(cat.id)!);
      }
    });

    return rootCategories;
  }

  /**
   * Get category by ID with relations
   */
  async getCategoryById(id: string): Promise<RepositoryResult<CategoryWithRelations>> {
    return await categoryRepository.findById(id);
  }

  /**
   * Get direct children of a category
   */
  async getCategoryChildren(parentId: string): Promise<RepositoryResult<Category[]>> {
    return await categoryRepository.findChildren(parentId);
  }

  /**
   * Create a new category with validation
   */
  async createCategory(data: CreateCategoryDTO): Promise<RepositoryResult<CategoryWithRelations>> {
    // Validate input data
    const validation = this.validateCategoryData(data);
    if (!validation.is_valid) {
      return {
        data: null,
        error: {
          message: 'Validation failed',
          details: validation.errors,
          code: 'VALIDATION_ERROR'
        } as any,
        success: false,
      };
    }

    // Generate slug if not provided
    if (!data.slug) {
      data.slug = generateSlug(data.name);
    }

    // Check if slug already exists
    const slugCheck = await this.checkSlugAvailability(data.slug);
    if (!slugCheck.success || slugCheck.data) {
      return {
        data: null,
        error: {
          message: 'Category slug already exists',
          code: 'SLUG_EXISTS'
        } as any,
        success: false,
      };
    }

    // Validate parent category if provided
    if (data.parent_id) {
      const parentResult = await categoryRepository.findById(data.parent_id);
      if (!parentResult.success || !parentResult.data) {
        return {
          data: null,
          error: {
            message: 'Invalid parent category ID',
            code: 'INVALID_PARENT'
          } as any,
          success: false,
        };
      }

      // Check if parent is a variant (cannot have children)
      if (parentResult.data.level === 'variant') {
        return {
          data: null,
          error: {
            message: 'Cannot create subcategory under a variant category',
            code: 'INVALID_PARENT_LEVEL'
          } as any,
          success: false,
        };
      }
    }

    // Create category
    const createResult = await categoryRepository.create(data);
    
    if (!createResult.success || !createResult.data) {
      return {
        success: false,
        data: null,
        error: createResult.error
      };
    }

    // Return category with relations
    const categoryResult = await categoryRepository.findById(createResult.data.id);
    return categoryResult;
  }

  /**
   * Update an existing category with validation
   */
  async updateCategory(id: string, data: UpdateCategoryDTO): Promise<RepositoryResult<CategoryWithRelations>> {
    // Check if category exists
    const existingCategory = await categoryRepository.findById(id);
    if (!existingCategory.success || !existingCategory.data) {
      return {
        data: null,
        error: {
          message: 'Category not found',
          code: 'CATEGORY_NOT_FOUND'
        } as any,
        success: false,
      };
    }

    // Validate input data
    const validation = this.validateCategoryData(data, existingCategory.data);
    if (!validation.is_valid) {
      return {
        data: null,
        error: {
          message: 'Validation failed',
          details: validation.errors,
          code: 'VALIDATION_ERROR'
        } as any,
        success: false,
      };
    }

    // Generate slug if name changed and slug not provided
    if (data.name && !data.slug && data.name !== existingCategory.data.name) {
      data.slug = generateSlug(data.name);
    }

    // Check slug availability if changed
    if (data.slug && data.slug !== existingCategory.data.slug) {
      const slugCheck = await this.checkSlugAvailability(data.slug, id);
      if (!slugCheck.success || slugCheck.data) {
        return {
          data: null,
          error: {
            message: 'Category slug already exists',
            code: 'SLUG_EXISTS'
          } as any,
          success: false,
        };
      }
    }

    // Validate parent category if changed
    if (data.parent_id !== undefined) {
      if (data.parent_id) {
        // Check if parent exists
        const parentResult = await categoryRepository.findById(data.parent_id);
        if (!parentResult.success || !parentResult.data) {
          return {
            data: null,
            error: {
              message: 'Invalid parent category ID',
              code: 'INVALID_PARENT'
            } as any,
            success: false,
          };
        }

        // Check if parent is a variant (cannot have children)
        if (parentResult.data.level === 'variant') {
          return {
            data: null,
            error: {
              message: 'Cannot set variant category as parent',
              code: 'INVALID_PARENT_LEVEL'
            } as any,
            success: false,
          };
        }

        // Check if parent would create a circular reference
        if (data.parent_id === id) {
          return {
            data: null,
            error: {
              message: 'Category cannot be its own parent',
              code: 'CIRCULAR_REFERENCE'
            } as any,
            success: false,
          };
        }

        // Check for circular reference in hierarchy
        const wouldCreateCircular = await this.wouldCreateCircularReference(id, data.parent_id);
        if (wouldCreateCircular) {
          return {
            data: null,
            error: {
              message: 'Would create circular reference in category hierarchy',
              code: 'CIRCULAR_REFERENCE'
            } as any,
            success: false,
          };
        }
      }
    }

    // Update category
    const updateResult = await categoryRepository.update(id, data);
    
    if (!updateResult.success || !updateResult.data) {
      return {
        success: false,
        data: null,
        error: updateResult.error
      };
    }

    // Return updated category with relations
    const categoryResult = await categoryRepository.findById(id);
    return categoryResult;
  }

  /**
   * Delete a category with safety checks
   */
  async deleteCategory(id: string): Promise<RepositoryResult<void>> {
    // Check if category can be deleted
    const canDeleteResult = await categoryRepository.canDelete(id);
    
    if (!canDeleteResult.success) {
      return {
        success: false,
        error: canDeleteResult.error,
        data: null,
      };
    }

    if (!canDeleteResult.data || !canDeleteResult.data.canDelete) {
      return {
        data: null,
        error: {
          message: canDeleteResult.data?.reason || 'Cannot delete category',
          code: 'CANNOT_DELETE'
        } as any,
        success: false,
      };
    }

    // Delete category
    return await categoryRepository.delete(id);
  }

  /**
   * Get product count for a category
   */
  async getCategoryProductCount(id: string): Promise<RepositoryResult<number>> {
    return await categoryRepository.getProductCount(id);
  }

  /**
   * Check if category can be deleted
   */
  async canDeleteCategory(id: string): Promise<RepositoryResult<{
    canDelete: boolean;
    reason?: string;
    relatedData?: {
      productCount: number;
      childCount: number;
    };
  }>> {
    return await categoryRepository.canDelete(id);
  }

  /**
   * Move category to new parent
   */
  async moveCategory(id: string, newParentId: string | null): Promise<RepositoryResult<CategoryWithRelations>> {
    return await this.updateCategory(id, { parent_id: newParentId });
  }

  /**
   * Reorder categories within the same parent
   */
  async reorderCategories(categoryIds: string[]): Promise<RepositoryResult<Category[]>> {
    const results: Category[] = [];
    const errors: any[] = [];

    for (let i = 0; i < categoryIds.length; i++) {
      const categoryId = categoryIds[i];
      const updateResult = await categoryRepository.update(categoryId, { sort_order: i });
      
      if (updateResult.success && updateResult.data) {
        results.push(updateResult.data);
      } else {
        errors.push(updateResult.error);
      }
    }

    if (errors.length > 0) {
      return {
        data: null,
        error: errors[0],
        success: false,
      };
    }

    return {
      data: results,
      error: null,
      success: true,
    };
  }

  /**
   * Validate category data
   */
  private validateCategoryData(
    data: CreateCategoryDTO | UpdateCategoryDTO,
    existingCategory?: Category
  ): CategoryValidationResult {
    const errors: CategoryValidationError[] = [];
    const warnings: CategoryValidationError[] = [];
    const isCreate = !existingCategory;

    // Name validation
    if (isCreate || 'name' in data) {
      if (!data.name || data.name.trim().length === 0) {
        errors.push({
          field: 'name',
          message: 'Category name is required',
          code: 'NAME_REQUIRED',
        });
      } else if (data.name.length > 100) {
        errors.push({
          field: 'name',
          message: 'Category name must be less than 100 characters',
          code: 'NAME_TOO_LONG',
        });
      }
    }

    // Slug validation
    if ('slug' in data && data.slug) {
      if (!/^[a-z0-9-]+$/.test(data.slug)) {
        errors.push({
          field: 'slug',
          message: 'Slug must contain only lowercase letters, numbers, and hyphens',
          code: 'INVALID_SLUG_FORMAT',
        });
      }
    }

    // Description validation
    if ('description' in data && data.description && data.description.length > 1000) {
      errors.push({
        field: 'description',
        message: 'Description must be less than 1000 characters',
        code: 'DESCRIPTION_TOO_LONG',
      });
    }

    // Sort order validation
    if ('sort_order' in data && data.sort_order !== undefined && data.sort_order < 0) {
      errors.push({
        field: 'sort_order',
        message: 'Sort order must be a non-negative number',
        code: 'INVALID_SORT_ORDER',
      });
    }

    // Warnings
    if ('description' in data && !data.description) {
      warnings.push({
        field: 'description',
        message: 'No description provided - consider adding one for better SEO',
        code: 'NO_DESCRIPTION',
      });
    }

    if ('image_url' in data && !data.image_url) {
      warnings.push({
        field: 'image_url',
        message: 'No image provided - categories with images perform better',
        code: 'NO_IMAGE',
      });
    }

    return {
      is_valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Check if slug is available
   */
  private async checkSlugAvailability(slug: string, excludeId?: string): Promise<RepositoryResult<boolean>> {
    return await categoryRepository.slugExists(slug, excludeId);
  }

  /**
   * Check if moving category would create circular reference
   */
  private async wouldCreateCircularReference(categoryId: string, newParentId: string): Promise<boolean> {
    // Get all descendants of the category being moved
    const descendants = await this.getAllDescendants(categoryId);
    
    if (!descendants.success) {
      return true; // Assume circular reference on error
    }

    // Check if new parent is in the descendants
    return descendants.data ? descendants.data.some(descendant => descendant.id === newParentId) : true;
  }

  /**
   * Get all descendants of a category
   */
  private async getAllDescendants(categoryId: string): Promise<RepositoryResult<Category[]>> {
    const allDescendants: Category[] = [];
    
    const getDescendantsRecursive = async (parentId: string): Promise<void> => {
      const childrenResult = await categoryRepository.findChildren(parentId);
      
      if (childrenResult.success && childrenResult.data) {
        for (const child of childrenResult.data) {
          allDescendants.push(child);
          await getDescendantsRecursive(child.id);
        }
      }
    };

    await getDescendantsRecursive(categoryId);
    
    return {
      data: allDescendants,
      error: null,
      success: true,
    };
  }
}

// Export singleton instance
export const categoryService = new CategoryService();

