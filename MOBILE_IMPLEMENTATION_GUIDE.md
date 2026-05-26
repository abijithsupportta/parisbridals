# Paris Bridals - Mobile Implementation Guide (A to Z)

> Comprehensive analysis of the Admin Dashboard architecture for implementing identical functionality in the Flutter Mobile App.

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Monorepo Structure](#monorepo-structure)
3. [Admin App Architecture](#admin-app-architecture)
4. [Domain Layer Analysis](#domain-layer-analysis)
5. [Repository Layer Analysis](#repository-layer-analysis)
6. [Service Layer Analysis](#service-layer-analysis)
7. [Hooks Layer Analysis](#hooks-layer-analysis)
8. [API Routes Analysis](#api-routes-analysis)
9. [Component Patterns](#component-patterns)
10. [Mobile App Structure](#mobile-app-structure)
11. [Implementation Mapping](#implementation-mapping)
12. [Feature Implementation Checklist](#feature-implementation-checklist)

---

## Project Overview

**Business**: Paris Bridals - Single-shop jewellery rental business (NOT multi-tenant SaaS)

**Tech Stack**:
- **Admin**: Next.js 16, React 19, TypeScript, Tailwind CSS 4, Supabase, Cloudflare R2, shadcn/ui
- **Mobile**: Flutter, Riverpod, Dio, Isar (offline-first)
- **Database**: Supabase (PostgreSQL)
- **Storage**: Cloudflare R2
- **Build System**: Turborepo + pnpm workspaces

**Apps**:
- `admin` (Port 3001) - Admin dashboard for managing categories, products, banners, orders, customers
- `storefront` (Port 3002) - Customer-facing rental storefront
- `mobile` - Flutter mobile app (thin client)

**Shared Packages**:
- `shared-api` - Reusable API functions (queries, mutations, Supabase client)
- `shared-types` - TypeScript types & interfaces
- `shared-ui` - Reusable shadcn/ui components
- `shared-utils` - Utility functions

---

## Monorepo Structure

```
parisbridals/
├── apps/
│   ├── admin/              # Next.js Admin Dashboard
│   ├── storefront/        # Next.js Customer Storefront
│   └── mobile/            # Flutter Mobile App
├── packages/
│   ├── shared-api/        # Shared API utilities
│   ├── shared-types/      # Shared TypeScript types
│   ├── shared-ui/         # Shared UI components
│   └── shared-utils/      # Shared utility functions
├── database/              # Supabase migrations
├── supabase/              # Supabase config
├── package.json           # Root package.json
├── pnpm-workspace.yaml    # Workspace configuration
└── turbo.json             # Turborepo configuration
```

**Key Commands**:
```bash
pnpm dev          # Start all apps via Turborepo
pnpm build        # Build all apps
pnpm lint         # Lint all apps
pnpm format       # Prettier format
```

---

## Admin App Architecture

The admin app follows a **strict 5-layer architecture**:

```
Domain → Repository → Service → Hooks → Components/Pages
```

### Layer Responsibilities

| Layer | Directory | Responsibility | Imports From |
|-------|-----------|---------------|--------------|
| **Domain** | `domain/` | Types, interfaces, enums, Zod schemas, type guards | Nothing (pure types) |
| **Repository** | `repository/` | Raw Supabase CRUD operations, extends `BaseRepository` | `domain/`, `lib/supabase/` |
| **Service** | `services/` | Business logic, validation, orchestration | `repository/`, `domain/` |
| **Hooks** | `hooks/` | TanStack Query hooks wrapping services, cache management | `services/`, `domain/`, `stores/` |
| **Components** | `components/` | React components (UI + admin feature components) | `hooks/`, `domain/`, `stores/` |

### Layer Rules

1. **Domain layer** is pure — NO imports from other layers.
2. **Repository layer** — raw database access only. No business logic. Returns `RepositoryResult<T>`.
3. **Service layer** — ALL business logic lives here (validation, slug checks, circular reference detection, safety checks).
4. **Hooks layer** — wraps services with TanStack Query. Handles cache invalidation via `queryUtils`. Shows notifications via `useAppStore`.
5. **Components** — NEVER import from `repository/` or `lib/supabase/` directly. Always use hooks.
6. **Client components** call REST API via `fetch()` — they do NOT import server-only Supabase code.
7. **Server components** (pages) can call service/data-access functions directly.

### Singleton Pattern

Each repository and service exports both the class AND a singleton instance:

```typescript
export class CategoryRepository extends BaseRepository { ... }
export const categoryRepository = new CategoryRepository();
```

### Barrel Exports

Every layer has an `index.ts` that re-exports everything. Always import from the barrel:

```typescript
// ✅ Correct
import { Category, CreateCategoryDTO } from '@/domain';
import { categoryService } from '@/services';
import { useCategories } from '@/hooks';

// ❌ Wrong
import { Category } from '@/domain/types/category';
```

---

## Domain Layer Analysis

### Location: `apps/admin/domain/`

**Structure**:
```
domain/
├── index.ts              # Barrel export
├── types/                # Core entity types
│   ├── index.ts          # Type barrel export
│   ├── category.ts       # Category types
│   ├── product.ts        # Product types
│   ├── order.ts          # Order types
│   ├── customer.ts       # Customer types
│   ├── branch.ts         # Branch types
│   ├── banner.ts         # Banner types
│   ├── inventory.ts      # Inventory types
│   ├── payment.ts        # Payment types
│   ├── settings.ts       # Settings types
│   └── common.ts         # Common/shared types
└── schemas/              # Zod validation schemas
    ├── index.ts
    ├── product.schema.ts
    ├── order.schema.ts
    ├── customer.schema.ts
    ├── branch.schema.ts
    └── common.schema.ts
```

### Type Definition Patterns

#### Core Entity Pattern
```typescript
export interface Category {
  readonly id: string;
  readonly store_id: string | null;
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
```

**Key Characteristics**:
- `readonly` for immutable fields (id, timestamps, audit fields)
- Nullable fields for optional data
- Audit fields for multi-branch tracking
- Timestamps as ISO strings

#### DTO Pattern
```typescript
// Create DTO - all required fields
export interface CreateCategoryDTO {
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  parent_id?: string | null;
  sort_order?: number;
  is_active?: boolean;
  is_global?: boolean;
  store_id?: string;
}

// Update DTO - all fields optional
export interface UpdateCategoryDTO {
  name?: string;
  slug?: string;
  description?: string;
  image_url?: string;
  parent_id?: string | null;
  sort_order?: number;
  is_active?: boolean;
  is_global?: boolean;
  store_id?: string;
}
```

#### Relations Pattern
```typescript
export interface CategoryWithRelations extends Category {
  parent?: Category | null;
  children?: Category[];
  product_count?: number;
  level: CategoryLevel;
  path: string; // e.g., "Jewelry > Earrings > Diamond"
}
```

#### Enum Pattern
```typescript
export enum CategoryLevel {
  MAIN = 'main',
  SUB = 'sub',
  VARIANT = 'variant',
}

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  SCHEDULED = 'scheduled',
  DELIVERED = 'delivered',
  IN_USE = 'in_use',
  ONGOING = 'ongoing',
  PARTIAL = 'partial',
  RETURNED = 'returned',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  FLAGGED = 'flagged',
  LATE_RETURN = 'late_return',
}
```

#### Type Guards Pattern
```typescript
export const isValidCategory = (obj: any): obj is Category => {
  return obj && 
         typeof obj.id === 'string' &&
         typeof obj.name === 'string' &&
         typeof obj.slug === 'string';
};

export const isMainCategory = (category: Category): boolean => {
  return !category.parent_id;
};
```

#### Validation Result Pattern
```typescript
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
```

### Zod Schema Patterns

#### Create Schema
```typescript
export const CreateCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Invalid slug format'),
  description: z.string().max(1000).optional(),
  image_url: z.string().url().optional(),
  parent_id: z.string().uuid().nullable().optional(),
  sort_order: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
  is_global: z.boolean().optional(),
});

export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;
```

#### Update Schema
```typescript
export const UpdateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().max(1000).optional(),
  image_url: z.string().url().optional(),
  parent_id: z.string().uuid().nullable().optional(),
  sort_order: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
  is_global: z.boolean().optional(),
});

export type UpdateCategoryInput = z.infer<typeof UpdateCategorySchema>;
```

#### Cross-Field Validation
```typescript
export const CreateProductSchema = z.object({
  name: z.string().min(1),
  price_per_day: z.number().positive(),
  quantity: z.number().int().min(0),
  available_quantity: z.number().int().min(0),
}).refine(
  (data) => data.available_quantity <= data.quantity,
  {
    message: 'Available quantity cannot exceed total quantity',
    path: ['available_quantity'],
  }
);
```

---

## Repository Layer Analysis

### Location: `apps/admin/repository/`

**Structure**:
```
repository/
├── index.ts                    # Barrel export
├── supabaseClient.ts           # BaseRepository + utilities
├── categoryRepository.ts
├── productRepository.ts
├── orderRepository.ts
├── customerRepository.ts
├── branchRepository.ts
├── bannerRepository.ts
├── paymentRepository.ts
├── settingsRepository.ts
├── staffRepository.ts
├── uploadRepository.ts
└── branchInventoryRepository.ts
```

### BaseRepository Pattern

```typescript
export abstract class BaseRepository {
  private _client: ReturnType<typeof createAdminClient> | null = null;
  protected currentUserId: string | null = null;
  protected currentBranchId: string | null = null;
  protected useMultiBranchAuditFields: boolean = true;

  protected get client() {
    if (!this._client) this._client = createAdminClient();
    return this._client;
  }

  setUserContext(userId: string | null, branchId: string | null) {
    this.currentUserId = userId;
    this.currentBranchId = branchId;
  }

  protected getCreateAuditFields() {
    if (!this.useMultiBranchAuditFields) {
      return { created_by: this.currentUserId };
    }
    return {
      created_by: this.currentUserId,
      created_at_branch_id: this.currentBranchId,
      updated_by: this.currentUserId,
      updated_at_branch_id: this.currentBranchId,
    };
  }

  protected getUpdateAuditFields() {
    if (!this.useMultiBranchAuditFields) return {};
    return {
      updated_by: this.currentUserId,
      updated_at_branch_id: this.currentBranchId,
    };
  }

  protected handleResponse<T>(response: {
    data: T | null;
    error: PostgrestError | null;
  }): RepositoryResult<T> {
    if (response.error) {
      return { data: null, error: response.error, success: false };
    }
    return { data: response.data, error: null, success: true };
  }

  protected async executeOperation<T>(
    operation: () => Promise<{ data: T | null; error: PostgrestError | null }>
  ): Promise<RepositoryResult<T>> {
    try {
      const response = await operation();
      return this.handleResponse(response);
    } catch (error) {
      return { data: null, error: error as PostgrestError, success: false };
    }
  }
}
```

### RepositoryResult Pattern

```typescript
export interface RepositoryResult<T> {
  data: T | null;
  error: PostgrestError | null;
  success: boolean;
}
```

**Usage**: All repository methods MUST return `RepositoryResult<T>`. Never throw from repository methods.

### Repository Method Patterns

#### Find All with Filtering
```typescript
async findAll(params: ProductSearchParams = {}): Promise<RepositoryResult<ProductSearchResult>> {
  const { query, category_id, status, page = 1, limit = 20 } = params;
  const offset = (page - 1) * limit;

  let selectQuery = this.client
    .from(this.tableName)
    .select(`
      *,
      category:category_id(id, name, slug),
      branch:branch_id(id, name)
    `)
    .order('created_at', { ascending: false });

  // Apply filters
  if (category_id) selectQuery = selectQuery.eq('category_id', category_id);
  if (query) selectQuery = selectQuery.or(`name.ilike.%${query}%,slug.ilike.%${query}%`);
  
  // Pagination
  selectQuery = selectQuery.range(offset, offset + limit - 1);

  const response = await selectQuery;
  return this.handleResponse<ProductSearchResult>(response);
}
```

#### Find by ID with Relations
```typescript
async findById(id: string): Promise<RepositoryResult<CategoryWithRelations>> {
  const response = await this.client
    .from(this.tableName)
    .select(`
      *,
      parent:parent_id(id, name, slug)
    `)
    .eq('id', id)
    .single();

  return this.handleResponse<CategoryWithRelations>(response);
}
```

#### Create with Audit Fields
```typescript
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
```

#### Update with Audit Fields
```typescript
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
```

#### Delete
```typescript
async delete(id: string): Promise<RepositoryResult<void>> {
  const response = await this.client
    .from(this.tableName)
    .delete()
    .eq('id', id);

  return this.handleResponse<void>(response);
}
```

#### Safety Check Before Delete
```typescript
async canDelete(id: string): Promise<RepositoryResult<{
  canDelete: boolean;
  reason?: string;
  relatedData?: { productCount: number; childCount: number };
}>> {
  const childrenResult = await this.findChildren(id);
  const childCount = childrenResult.success ? childrenResult.data?.length || 0 : 0;

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
    data: { canDelete, reason, relatedData: { productCount: productCount || 0, childCount } },
    error: null,
    success: true,
  };
}
```

#### Atomic Operations via RPC
```typescript
protected async rpc<T>(
  functionName: string,
  params: Record<string, unknown> = {}
): Promise<RepositoryResult<T>> {
  try {
    const { data, error } = await this.client.rpc(functionName, params);

    if (error) {
      return { data: null, error: error as PostgrestError, success: false };
    }

    return { data: data as T, error: null, success: true };
  } catch (error) {
    return { data: null, error: error as PostgrestError, success: false };
  }
}
```

---

## Service Layer Analysis

### Location: `apps/admin/services/`

**Structure**:
```
services/
├── index.ts
├── categoryService.ts
├── productService.ts
├── orderService.ts
├── customerService.ts
├── branchService.ts
├── bannerService.ts
├── paymentService.ts
├── settingsService.ts
├── uploadService.ts
├── dashboardService.ts
└── invoiceService.ts
```

### Service Pattern

```typescript
export class CategoryService {
  private currentUserId: string | null = null;
  private currentStoreId: string | null = null;
  private currentBranchId: string | null = null;

  setUserContext(userId: string | null, branchId: string | null, storeId: string | null = null) {
    this.currentUserId = userId;
    this.currentBranchId = branchId;
    this.currentStoreId = storeId;
    categoryRepository.setUserContext(userId, branchId);
  }

  async getAllCategories(): Promise<RepositoryResult<Category[]>> {
    return await categoryRepository.findAll();
  }

  async createCategory(data: CreateCategoryDTO): Promise<RepositoryResult<CategoryWithRelations>> {
    // 1. Validate input data
    const validation = this.validateCategoryData(data);
    if (!validation.is_valid) {
      return {
        data: null,
        error: { message: 'Validation failed', details: validation.errors, code: 'VALIDATION_ERROR' } as any,
        success: false,
      };
    }

    // 2. Generate slug if not provided
    if (!data.slug) {
      data.slug = generateSlug(data.name);
    }

    // 3. Check if slug already exists
    const slugCheck = await this.checkSlugAvailability(data.slug);
    if (!slugCheck.success || slugCheck.data) {
      return {
        data: null,
        error: { message: 'Category slug already exists', code: 'SLUG_EXISTS' } as any,
        success: false,
      };
    }

    // 4. Validate parent category if provided
    if (data.parent_id) {
      const parentResult = await categoryRepository.findById(data.parent_id);
      if (!parentResult.success || !parentResult.data) {
        return {
          data: null,
          error: { message: 'Invalid parent category ID', code: 'INVALID_PARENT' } as any,
          success: false,
        };
      }

      // Check if parent is a variant (cannot have children)
      if (parentResult.data.level === 'variant') {
        return {
          data: null,
          error: { message: 'Cannot create subcategory under a variant category', code: 'INVALID_PARENT_LEVEL' } as any,
          success: false,
        };
      }
    }

    // 5. Create category
    const createResult = await categoryRepository.create(data);
    
    if (!createResult.success || !createResult.data) {
      return { success: false, data: null, error: createResult.error };
    }

    // 6. Return category with relations
    const categoryResult = await categoryRepository.findById(createResult.data.id);
    return categoryResult;
  }

  private validateCategoryData(
    data: CreateCategoryDTO | UpdateCategoryDTO,
    existingCategory?: Category
  ): CategoryValidationResult {
    const errors: CategoryValidationError[] = [];
    const warnings: CategoryValidationError[] = [];

    // Name validation
    if ('name' in data) {
      if (!data.name || data.name.trim().length === 0) {
        errors.push({ field: 'name', message: 'Category name is required', code: 'NAME_REQUIRED' });
      } else if (data.name.length > 100) {
        errors.push({ field: 'name', message: 'Category name must be less than 100 characters', code: 'NAME_TOO_LONG' });
      }
    }

    // Slug validation
    if ('slug' in data && data.slug) {
      if (!/^[a-z0-9-]+$/.test(data.slug)) {
        errors.push({ field: 'slug', message: 'Slug must contain only lowercase letters, numbers, and hyphens', code: 'INVALID_SLUG_FORMAT' });
      }
    }

    return { is_valid: errors.length === 0, errors, warnings };
  }

  private async checkSlugAvailability(slug: string, excludeId?: string): Promise<RepositoryResult<boolean>> {
    return await categoryRepository.slugExists(slug, excludeId);
  }
}

export const categoryService = new CategoryService();
```

### Business Logic Examples

#### Circular Reference Detection
```typescript
private async wouldCreateCircularReference(categoryId: string, newParentId: string): Promise<boolean> {
  const descendants = await this.getAllDescendants(categoryId);
  
  if (!descendants.success) {
    return true; // Assume circular reference on error
  }

  return descendants.data ? descendants.data.some(descendant => descendant.id === newParentId) : true;
}

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
  
  return { data: allDescendants, error: null, success: true };
}
```

#### Status Transition Validation
```typescript
async updateOrder(id: string, data: UpdateOrderDTO): Promise<RepositoryResult<OrderWithRelations>> {
  if (data.status) {
    const currentStatus = existingOrder.data.status;
    const newStatus = data.status;

    const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.SCHEDULED, OrderStatus.CANCELLED],
      [OrderStatus.CONFIRMED]: [OrderStatus.DELIVERED, OrderStatus.SCHEDULED, OrderStatus.CANCELLED],
      [OrderStatus.SCHEDULED]: [OrderStatus.DELIVERED, OrderStatus.ONGOING, OrderStatus.CANCELLED],
      // ... more transitions
    };

    if (!allowedTransitions[currentStatus].includes(newStatus)) {
      return {
        data: null,
        error: { message: `Cannot transition from ${currentStatus} to ${newStatus}`, code: 'INVALID_STATUS_TRANSITION' } as any,
        success: false,
      };
    }
  }

  return await orderRepository.update(id, data);
}
```

#### Availability Check (Sweep Line Algorithm)
```typescript
async checkAvailability(
  productId: string,
  startDate: string,
  endDate: string,
  branchId?: string,
  excludeOrderId?: string
): Promise<RepositoryResult<{ available: number; total: number; peakReserved: number }>> {
  // Get product total quantity
  const productResponse = await this.client
    .from('products')
    .select('quantity')
    .eq('id', productId)
    .single();

  const totalQuantity = productResponse.data?.quantity || 0;

  // Fetch all active order items for this product
  const ordersResponse = await this.client
    .from('order_items')
    .select('quantity, returned_quantity, order_id, orders!inner(start_date, end_date, status)')
    .eq('product_id', productId)
    .in('orders.status', ['pending', 'confirmed', 'scheduled', 'ongoing', 'in_use']);

  // Sweep Line Algorithm
  const events: { time: number; delta: number }[] = [];
  for (const item of ordersResponse.data || []) {
    const order = item.orders;
    if (excludeOrderId && order.id === excludeOrderId) continue;

    const unreturned = item.quantity - (item.returned_quantity || 0);
    if (unreturned > 0) {
      events.push({ time: new Date(order.start_date).getTime(), delta: +unreturned });
      events.push({ time: new Date(order.end_date).getTime() + 86400000, delta: -unreturned });
    }
  }

  events.sort((a, b) => a.time - b.time || a.delta - b.delta);

  let currentUsage = 0;
  let peakUsage = 0;
  const reqStart = new Date(startDate).getTime();
  const reqEnd = new Date(endDate).getTime();

  for (const event of events) {
    if (event.time > reqEnd + 86400000) break;
    currentUsage += event.delta;
    if (event.time >= reqStart && event.time <= reqEnd) {
      peakUsage = Math.max(peakUsage, currentUsage);
    }
  }

  const availableQuantity = Math.max(0, totalQuantity - peakUsage);

  return {
    data: { available: availableQuantity, total: totalQuantity, peakReserved: peakUsage },
    error: null,
    success: true,
  };
}
```

---

## Hooks Layer Analysis

### Location: `apps/admin/hooks/`

**Structure**:
```
hooks/
├── index.ts
├── useCategories.ts
├── useProducts.ts
├── useOrders.ts
├── useCustomers.ts
├── useBanners.ts
├── useBranches.ts
├── usePayments.ts
├── useSettings.ts
├── useStaff.ts
├── useUpload.ts
├── useCalendar.ts
├── useProductAvailability.ts
└── usePermissions.ts
```

### Query Key Factory Pattern

```typescript
const categoryKeys = {
  all: ['categories'] as const,
  detail: (id: string) => ['categories', id] as const,
  children: (id: string) => ['categories', id, 'children'] as const,
  hierarchy: ['categories-hierarchy'] as const,
};
```

### API Fetch Helper

```typescript
async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error?.message || body.error || `Request failed (${res.status})`);
  }
  return res.json();
}
```

### Query Hook Pattern

```typescript
export function useCategories() {
  const query = useQuery({
    queryKey: categoryKeys.all,
    queryFn: async () => {
      const response = await apiFetch<ApiSuccessResponse<Category[]>>('/api/categories');
      return response.data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  return {
    ...query,
    categories: query.data || [],
    isLoading: query.isLoading || query.isFetching,
  };
}
```

### Mutation Hook Pattern

```typescript
export function useCreateCategory() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useAppStore();

  const mutation = useMutation({
    mutationFn: (data: CreateCategoryDTO) =>
      apiFetch('/api/categories', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
      showSuccess('Category created successfully');
    },
    onError: (error) => showError('Failed to create category', error.message),
  });

  return {
    ...mutation,
    createCategory: mutation.mutate,
    isLoading: mutation.isPending,
  };
}
```

### Optimistic Updates Pattern

```typescript
export function useCreateProduct() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useAppStore();

  const mutation = useMutation({
    mutationFn: (data: CreateProductDTO) =>
      apiFetch<ApiSuccessResponse<ProductWithRelations>>('/api/products', { method: 'POST', body: JSON.stringify(data) }),
    onMutate: async (newProduct) => {
      await queryClient.cancelQueries({ queryKey: productKeys.all });
      const previousQueries = queryClient.getQueriesData<ProductSearchResult>({ queryKey: productKeys.all });

      queryClient.setQueriesData<ProductSearchResult>({ queryKey: productKeys.all }, (old) => {
        if (!old || !Array.isArray(old.products)) return old;

        const optimisticId = `temp-${Date.now()}`;
        const optimisticProduct = {
           id: optimisticId,
           ...newProduct,
           created_at: new Date().toISOString(),
        } as unknown as Product;

        return {
          ...old,
          products: [optimisticProduct, ...old.products],
          total: old.total + 1,
        };
      });

      return { previousQueries };
    },
    onSuccess: (res) => {
      showSuccess('Product created successfully');
      queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
    onError: (error, newProduct, context) => {
      if (context?.previousQueries) {
        for (const [key, data] of context.previousQueries) {
          queryClient.setQueryData(key, data);
        }
      }
    },
  });

  return {
    ...mutation,
    createProduct: mutation.mutateAsync,
    isLoading: mutation.isPending,
  };
}
```

### Cache Invalidation Pattern

```typescript
const queryUtils = {
  invalidateCategories: () => queryClient.invalidateQueries({ queryKey: categoryKeys.all }),
  invalidateProducts: () => queryClient.invalidateQueries({ queryKey: productKeys.all }),
  invalidateProduct: (id: string) => queryClient.invalidateQueries({ queryKey: productKeys.detail(id) }),
};
```

---

## API Routes Analysis

### Location: `apps/admin/app/api/`

**Structure**:
```
app/api/
├── auth/
├── banners/
│   ├── [id]/
│   └── route.ts
├── branch-inventory/
├── branches/
├── calendar/
├── categories/
│   ├── [id]/
│   │   ├── can-delete/
│   │   ├── children/
│   │   └── route.ts
│   └── route.ts
├── customers/
├── orders/
│   ├── [id]/
│   │   ├── return/
│   │   ├── status-history/
│   │   └── route.ts
│   ├── check-availability/
│   └── route.ts
├── payments/
├── products/
│   ├── [id]/
│   │   ├── can-delete/
│   │   └── route.ts
│   ├── bulk/
│   └── route.ts
├── settings/
├── staff/
└── upload/
```

### REST API Pattern

#### Collection Endpoint (GET/POST)
```typescript
// GET /api/categories
export async function GET(request: NextRequest) {
  try {
    const guard = await apiGuard(request, 'categories');
    if (guard.error) return guard.error;

    const result = await categoryService.getAllCategories();
    if (!result.success) {
      return apiRepositoryError(result.error, 'Failed to fetch categories');
    }
    return apiSuccess(result.data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return apiInternalError(message);
  }
}

// POST /api/categories
export async function POST(request: NextRequest) {
  try {
    const guard = await apiGuard(request, 'categories');
    if (guard.error) return guard.error;

    const authUser = await getAuthUser(request);
    categoryService.setUserContext(
      authUser?.staff_id || null,
      authUser?.branch_id || null,
      authUser?.store_id || null
    );

    const body = await request.json();
    const result = await categoryService.createCategory(body);
    if (!result.success) {
      return apiRepositoryError(result.error, 'Failed to create category');
    }
    return apiSuccess(result.data, { status: 201, message: 'Category created successfully' });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return apiInternalError(message);
  }
}
```

#### Single Resource Endpoint (GET/PATCH/DELETE)
```typescript
// GET /api/categories/[id]
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const guard = await apiGuard(request, 'categories');
    if (guard.error) return guard.error;

    const result = await categoryService.getCategoryById(params.id);
    if (!result.success) {
      return apiRepositoryError(result.error, 'Failed to fetch category');
    }
    return apiSuccess(result.data);
  } catch (err) {
    return apiInternalError(err instanceof Error ? err.message : String(err));
  }
}

// PATCH /api/categories/[id]
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const guard = await apiGuard(request, 'categories');
    if (guard.error) return guard.error;

    const authUser = await getAuthUser(request);
    categoryService.setUserContext(authUser?.staff_id || null, authUser?.branch_id || null);

    const body = await request.json();
    const result = await categoryService.updateCategory(params.id, body);
    if (!result.success) {
      return apiRepositoryError(result.error, 'Failed to update category');
    }
    return apiSuccess(result.data);
  } catch (err) {
    return apiInternalError(err instanceof Error ? err.message : String(err));
  }
}

// DELETE /api/categories/[id]
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const guard = await apiGuard(request, 'categories');
    if (guard.error) return guard.error;

    const result = await categoryService.deleteCategory(params.id);
    if (!result.success) {
      return apiRepositoryError(result.error, 'Failed to delete category');
    }
    return apiSuccess(null, { message: 'Category deleted successfully' });
  } catch (err) {
    return apiInternalError(err instanceof Error ? err.message : String(err));
  }
}
```

#### Safety Check Endpoint
```typescript
// GET /api/categories/[id]/can-delete
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const guard = await apiGuard(request, 'categories');
    if (guard.error) return guard.error;

    const result = await categoryService.canDeleteCategory(params.id);
    if (!result.success) {
      return apiRepositoryError(result.error, 'Failed to check delete safety');
    }
    return apiSuccess(result.data);
  } catch (err) {
    return apiInternalError(err instanceof Error ? err.message : String(err));
  }
}
```

#### Response Format

```typescript
// Success response
{
  "success": true,
  "data": { ... },
  "message": "Operation successful" // optional
}

// Error response
{
  "success": false,
  "error": {
    "message": "Error message",
    "code": "ERROR_CODE",
    "details": { ... } // optional
  }
}
```

### RBAC (Role-Based Access Control)

```typescript
// apiGuard enforces RBAC
const guard = await apiGuard(request, 'categories');
if (guard.error) return guard.error;
```

**Roles**:
- `super_admin` - Full access
- `admin` - Full access
- `manager` - Can view and create/edit/delete
- `staff` - View only

### Server-Authoritative Identity Injection

```typescript
// POST /api/products
export async function POST(request: NextRequest) {
  const authUser = await getAuthUser(request);
  
  if (!authUser?.store_id) {
    return apiBadRequest('Cannot determine store context');
  }

  productService.setUserContext(authUser.staff_id, authUser.branch_id, authUser.store_id);

  const body = await request.json();
  const clientInput = ClientCreateProductSchema.parse(body);

  // Server forcefully injects store_id from auth cookie
  const productData: CreateProductDTO = {
    ...clientInput,
    store_id: authUser.store_id, // Injected by server
  };

  const result = await productService.createProduct(productData, authUser.role || 'staff');
  return apiSuccess(result.data, { status: 201 });
}
```

---

## Component Patterns

### Location: `apps/admin/components/`

**Structure**:
```
components/
├── admin/
│   ├── AddButton.tsx
│   ├── CategoryForm.tsx
│   ├── CategoryTree.tsx
│   ├── ProductForm.tsx
│   ├── OrderForm.tsx
│   ├── OrderDetailsView.tsx
│   ├── Modal.tsx
│   ├── Sidebar.tsx
│   └── ...
├── providers/
│   ├── QueryProvider.tsx
│   └── ThemeProvider.tsx
└── ui/
    ├── button.tsx
    ├── input.tsx
    ├── select.tsx
    ├── dialog.tsx
    └── ... (shadcn/ui components)
```

### Form Pattern (React Hook Form + Zod)

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateCategorySchema } from '@/domain';

export function CategoryForm() {
  const { createCategory, isLoading } = useCreateCategory();

  const form = useForm<CreateCategoryInput>({
    resolver: zodResolver(CreateCategorySchema),
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      is_active: true,
      is_global: true,
    },
  });

  const onSubmit = (data: CreateCategoryInput) => {
    createCategory(data);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <Input {...form.register('name')} placeholder="Category name" />
      <Input {...form.register('slug')} placeholder="Slug" />
      <Textarea {...form.register('description')} placeholder="Description" />
      <Switch {...form.register('is_active')} />
      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Creating...' : 'Create Category'}
      </Button>
    </form>
  );
}
```

### Modal Pattern

```typescript
export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">{title}</h2>
        {children}
        <button onClick={onClose} className="absolute top-4 right-4">✕</button>
      </div>
    </div>
  );
}
```

### Data Table Pattern

```typescript
export function ProductTable() {
  const { products, isLoading } = useProducts();

  if (isLoading) return <Skeleton />;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>SKU</TableHead>
          <TableHead>Price</TableHead>
          <TableHead>Stock</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((product) => (
          <TableRow key={product.id}>
            <TableCell>{product.name}</TableCell>
            <TableCell>{product.sku}</TableCell>
            <TableCell>₹{product.price_per_day}</TableCell>
            <TableCell>{product.available_quantity}/{product.quantity}</TableCell>
            <TableCell>
              <Button onClick={() => openEditModal(product)}>Edit</Button>
              <Button onClick={() => openDeleteModal(product)}>Delete</Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

---

## Mobile App Structure

### Location: `apps/mobile/`

**Architecture**: Feature-First (Screaming Architecture)

```
lib/
├── core/                    # Shared resources
│   ├── api_client.dart      # Dio HTTP client
│   ├── main_layout.dart     # Main app layout
│   ├── theme.dart           # App theme
│   ├── responsive.dart      # Responsive utilities
│   └── upload_repository.dart
├── features/                # Business domains
│   ├── auth/
│   │   ├── models/          # Data models
│   │   ├── repositories/    # API calls via Dio
│   │   ├── providers/       # Riverpod state
│   │   └── views/           # UI screens
│   ├── categories/
│   │   ├── models/
│   │   │   └── category.dart
│   │   ├── repositories/
│   │   │   └── category_repository.dart
│   │   ├── providers/
│   │   │   └── category_provider.dart
│   │   └── views/
│   │       ├── categories_view.dart
│   │       ├── category_detail_view.dart
│   │       └── category_form_view.dart
│   ├── products/
│   ├── orders/
│   ├── dashboard/
│   └── calendar/
└── main.dart
```

### Mobile Rules (from AGENTS.md)

1. **Feature-First Architecture** - Group by domain, not by type
2. **Riverpod for State Management** - Use `flutter_riverpod` with code generation
3. **Isar for Offline-First** - Complex caching with Isar, simple prefs with shared_preferences
4. **Error Handling** - Custom AppException classes, never leak raw exceptions
5. **UI/Business Logic Separation** - Widgets only for layout, delegate to providers
6. **Backend Integration** - Use Dio to call Next.js API, NEVER direct Supabase

### API Client Pattern

```dart
import 'package:dio/dio.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

class ApiClient {
  static final ApiClient _instance = ApiClient._internal();
  late Dio dio;

  factory ApiClient() {
    return _instance;
  }

  ApiClient._internal() {
    final baseUrl = dotenv.env['API_BASE_URL'] ?? 'https://parisbridals-admin.vercel.app/api';
    
    dio = Dio(
      BaseOptions(
        baseUrl: baseUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 15),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          // Inject auth token from secure storage
          // final token = await secureStorage.read(key: 'auth_token');
          // if (token != null) {
          //   options.headers['Authorization'] = 'Bearer $token';
          // }
          return handler.next(options);
        },
        onError: (DioException e, handler) {
          // Custom error handling
          return handler.next(e);
        },
      ),
    );
  }
}

final apiClient = ApiClient().dio;
```

### Model Pattern (Matching Admin Types)

```dart
class Category {
  final String id;
  final String name;
  final String slug;
  final String? description;
  final String? imageUrl;
  final String? parentId;
  final int sortOrder;
  final bool isActive;
  final bool isGlobal;
  final String createdAt;
  final String? updatedAt;

  // Relations
  final Category? parent;
  final List<Category>? children;
  final int? productCount;

  Category({
    required this.id,
    required this.name,
    required this.slug,
    this.description,
    this.imageUrl,
    this.parentId,
    this.sortOrder = 0,
    this.isActive = true,
    this.isGlobal = false,
    required this.createdAt,
    this.updatedAt,
    this.parent,
    this.children,
    this.productCount,
  });

  bool get isMain => parentId == null;

  factory Category.fromJson(Map<String, dynamic> json) {
    return Category(
      id: json['id'] as String,
      name: json['name'] as String,
      slug: json['slug'] as String,
      description: json['description'] as String?,
      imageUrl: json['image_url'] as String?,
      parentId: json['parent_id'] as String?,
      sortOrder: json['sort_order'] ?? 0,
      isActive: json['is_active'] ?? true,
      isGlobal: json['is_global'] ?? false,
      createdAt: json['created_at'] as String,
      updatedAt: json['updated_at'] as String?,
      parent: json['parent'] != null ? Category.fromJson(json['parent']) : null,
      children: json['children'] != null
          ? (json['children'] as List).map((c) => Category.fromJson(c)).toList()
          : null,
      productCount: json['product_count'] as int?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'slug': slug,
      'description': description,
      'image_url': imageUrl,
      'parent_id': parentId,
      'sort_order': sortOrder,
      'is_active': isActive,
      'is_global': isGlobal,
      'created_at': createdAt,
      'updated_at': updatedAt,
    };
  }
}
```

### Repository Pattern (Mirroring Admin API)

```dart
class CategoryRepository {
  final Dio _client = apiClient;

  Future<List<Category>> getCategories() async {
    final response = await _client.get('/categories');

    if (response.statusCode == 200) {
      final data = response.data;
      final list = data['data'] as List; // Admin API returns { success: true, data: [...] }
      return list.map((e) => Category.fromJson(e)).toList();
    }
    throw Exception('Failed to load categories');
  }

  Future<Category> getCategoryById(String id) async {
    final response = await _client.get('/categories/$id');

    if (response.statusCode == 200) {
      final data = response.data;
      return Category.fromJson(data['data']);
    }
    throw Exception('Failed to load category');
  }

  Future<Category> createCategory(Map<String, dynamic> body) async {
    final response = await _client.post('/categories', data: body);

    if (response.statusCode == 200 || response.statusCode == 201) {
      final data = response.data;
      return Category.fromJson(data['data']);
    }
    throw Exception('Failed to create category');
  }

  Future<Category> updateCategory(String id, Map<String, dynamic> body) async {
    final response = await _client.patch('/categories/$id', data: body);

    if (response.statusCode == 200) {
      final data = response.data;
      return Category.fromJson(data['data']);
    }
    throw Exception('Failed to update category');
  }

  Future<void> deleteCategory(String id) async {
    final response = await _client.delete('/categories/$id');

    if (response.statusCode != 200) {
      final msg = response.data?['error']?['message'] ?? 'Failed to delete category';
      throw Exception(msg);
    }
  }
}
```

### Provider Pattern (Riverpod)

```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';

// Repository provider
final categoryRepositoryProvider = Provider<CategoryRepository>((ref) {
  return CategoryRepository();
});

// Fetch all categories
final categoriesProvider = FutureProvider<List<Category>>((ref) async {
  ref.keepAlive();
  final repo = ref.read(categoryRepositoryProvider);
  return repo.getCategories();
});

// Fetch single category by ID
final categoryByIdProvider = FutureProvider.family<Category, String>((ref, id) async {
  final repo = ref.read(categoryRepositoryProvider);
  return repo.getCategoryById(id);
});

// Derived: Main categories only
final mainCategoriesProvider = Provider<AsyncValue<List<Category>>>((ref) {
  return ref.watch(categoriesProvider).whenData(
    (categories) => categories.where((c) => c.parentId == null).toList(),
  );
});

// Derived: Sub-categories for a parent
final subCategoriesProvider = Provider.family<AsyncValue<List<Category>>, String>((ref, parentId) {
  return ref.watch(categoriesProvider).whenData(
    (categories) => categories.where((c) => c.parentId == parentId).toList(),
  );
});
```

### View Pattern

```dart
class CategoriesView extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final categoriesAsync = ref.watch(categoriesProvider);

    return Scaffold(
      appBar: AppBar(title: Text('Categories')),
      body: categoriesAsync.when(
        data: (categories) => ListView.builder(
          itemCount: categories.length,
          itemBuilder: (context, index) {
            final category = categories[index];
            return ListTile(
              title: Text(category.name),
              subtitle: Text(category.slug),
              trailing: IconButton(
                icon: Icon(Icons.chevron_right),
                onPressed: () => Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => CategoryDetailView(categoryId: category.id),
                  ),
                ),
              ),
            );
          },
        ),
        loading: () => Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text('Failed to load categories'),
              ElevatedButton(
                onPressed: () => ref.refresh(categoriesProvider),
                child: Text('Retry'),
              ),
            ],
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => Navigator.push(
          context,
          MaterialPageRoute(builder: (context) => CategoryFormView()),
        ),
        child: Icon(Icons.add),
      ),
    );
  }
}
```

---

## Implementation Mapping

### Admin → Mobile Layer Mapping

| Admin Layer | Mobile Equivalent | Notes |
|-------------|------------------|-------|
| Domain (types) | Models (Dart classes) | Match field names exactly (snake_case → camelCase) |
| Repository | Repository (Dio HTTP calls) | Call Next.js API, not Supabase directly |
| Service | Provider (Riverpod) | Business logic in providers or separate service layer |
| Hooks | Providers (Riverpod) | TanStack Query → Riverpod FutureProvider/AsyncNotifier |
| Components | Views (Flutter widgets) | React components → Flutter widgets |
| API Routes | (Not needed) | Mobile calls existing admin API routes |

### Data Flow Comparison

**Admin**:
```
UI Component → Hook → fetch('/api/endpoint') → API Route → Service → Repository → Supabase
```

**Mobile**:
```
View → Provider → Repository (Dio) → fetch('/api/endpoint') → API Route → Service → Repository → Supabase
```

**Key Difference**: Mobile skips the API Route layer on the client side and calls the existing Next.js API directly.

### Type Mapping

| TypeScript | Dart |
|------------|------|
| `string` | `String` |
| `number` | `double` or `int` |
| `boolean` | `bool` |
| `Date` (ISO string) | `String` (parse with DateTime.parse) |
| `enum` | `enum` |
| `interface` | `class` |
| `interface?` (nullable) | `String?` (nullable) |
| `T[]` (array) | `List<T>` |
| `Record<string, T>` | `Map<String, T>` |
| `readonly` | `final` |

### Field Name Mapping

| TypeScript (snake_case in DB) | Dart (camelCase) |
|-------------------------------|-----------------|
| `image_url` | `imageUrl` |
| `parent_id` | `parentId` |
| `sort_order` | `sortOrder` |
| `is_active` | `isActive` |
| `is_global` | `isGlobal` |
| `created_at` | `createdAt` |
| `updated_at` | `updatedAt` |
| `created_by` | `createdBy` |

---

## Feature Implementation Checklist

### Categories Feature

**Admin Components**:
- [x] Domain: `domain/types/category.ts`
- [x] Repository: `repository/categoryRepository.ts`
- [x] Service: `services/categoryService.ts`
- [x] Hooks: `hooks/useCategories.ts`
- [x] API: `app/api/categories/route.ts`
- [x] Components: `components/admin/CategoryForm.tsx`, `CategoryTree.tsx`

**Mobile Implementation**:
- [ ] Models: `lib/features/categories/models/category.dart`
- [ ] Repository: `lib/features/categories/repositories/category_repository.dart`
- [ ] Provider: `lib/features/categories/providers/category_provider.dart`
- [ ] Views: `lib/features/categories/views/categories_view.dart`
- [ ] Views: `lib/features/categories/views/category_detail_view.dart`
- [ ] Views: `lib/features/categories/views/category_form_view.dart`
- [ ] Isar Schema: Add Isar collection for offline caching
- [ ] Error Handling: Custom exceptions for category operations

### Products Feature

**Admin Components**:
- [x] Domain: `domain/types/product.ts`, `domain/schemas/product.schema.ts`
- [x] Repository: `repository/productRepository.ts`
- [x] Service: `services/productService.ts`
- [x] Hooks: `hooks/useProducts.ts`
- [x] API: `app/api/products/route.ts`
- [x] Components: `components/admin/ProductForm.tsx`

**Mobile Implementation**:
- [ ] Models: `lib/features/products/models/product.dart`
- [ ] Repository: `lib/features/products/repositories/product_repository.dart`
- [ ] Provider: `lib/features/products/providers/product_provider.dart`
- [ ] Views: `lib/features/products/views/products_view.dart`
- [ ] Views: `lib/features/products/views/product_detail_view.dart`
- [ ] Views: `lib/features/products/views/product_form_view.dart`
- [ ] Isar Schema: Add Isar collection for offline caching
- [ ] Image Upload: Integrate with upload repository

### Orders Feature

**Admin Components**:
- [x] Domain: `domain/types/order.ts`, `domain/schemas/order.schema.ts`
- [x] Repository: `repository/orderRepository.ts`
- [x] Service: `services/orderService.ts`
- [x] Hooks: `hooks/useOrders.ts`
- [x] API: `app/api/orders/route.ts`
- [x] Components: `components/admin/OrderForm.tsx`, `OrderDetailsView.tsx`, `OrderReturnModal.tsx`

**Mobile Implementation**:
- [ ] Models: `lib/features/orders/models/order.dart`
- [ ] Repository: `lib/features/orders/repositories/order_repository.dart`
- [ ] Provider: `lib/features/orders/providers/order_provider.dart`
- [ ] Views: `lib/features/orders/views/orders_view.dart`
- [ ] Views: `lib/features/orders/views/order_detail_view.dart`
- [ ] Views: `lib/features/orders/views/order_form_view.dart`
- [ ] Availability Check: Implement Sweep Line algorithm in provider
- [ ] Calendar View: Integrate calendar for date selection

### Customers Feature

**Admin Components**:
- [x] Domain: `domain/types/customer.ts`
- [x] Repository: `repository/customerRepository.ts`
- [x] Service: `services/customerService.ts`
- [x] Hooks: `hooks/useCustomers.ts`
- [x] API: `app/api/customers/route.ts`
- [x] Components: `components/admin/CustomerForm.tsx`

**Mobile Implementation**:
- [ ] Models: `lib/features/customers/models/customer.dart`
- [ ] Repository: `lib/features/customers/repositories/customer_repository.dart`
- [ ] Provider: `lib/features/customers/providers/customer_provider.dart`
- [ ] Views: `lib/features/customers/views/customers_view.dart`
- [ ] Views: `lib/features/customers/views/customer_detail_view.dart`
- [ ] Views: `lib/features/customers/views/customer_form_view.dart`

### Banners Feature

**Admin Components**:
- [x] Domain: `domain/types/banner.ts`
- [x] Repository: `repository/bannerRepository.ts`
- [x] Service: `services/bannerService.ts`
- [x] Hooks: `hooks/useBanners.ts`
- [x] API: `app/api/banners/route.ts`
- [x] Components: `components/admin/BannerForm.tsx`

**Mobile Implementation**:
- [ ] Models: `lib/features/banners/models/banner.dart`
- [ ] Repository: `lib/features/banners/repositories/banner_repository.dart`
- [ ] Provider: `lib/features/banners/providers/banner_provider.dart`
- [ ] Views: `lib/features/banners/views/banners_view.dart` (read-only for mobile)
- [ ] Views: Display banners in storefront/home

### Branches Feature

**Admin Components**:
- [x] Domain: `domain/types/branch.ts`
- [x] Repository: `repository/branchRepository.ts`
- [x] Service: `services/branchService.ts`
- [x] Hooks: `hooks/useBranches.ts`
- [x] API: `app/api/branches/route.ts`

**Mobile Implementation**:
- [ ] Models: `lib/features/branches/models/branch.dart`
- [ ] Repository: `lib/features/branches/repositories/branch_repository.dart`
- [ ] Provider: `lib/features/branches/providers/branch_provider.dart`
- [ ] Views: Branch switcher in settings
- [ ] Context: Filter data by selected branch

### Settings Feature

**Admin Components**:
- [x] Domain: `domain/types/settings.ts`
- [x] Repository: `repository/settingsRepository.ts`
- [x] Service: `services/settingsService.ts`
- [x] Hooks: `hooks/useSettings.ts`
- [x] API: `app/api/settings/route.ts`

**Mobile Implementation**:
- [ ] Models: `lib/features/settings/models/settings.dart`
- [ ] Repository: `lib/features/settings/repositories/settings_repository.dart`
- [ ] Provider: `lib/features/settings/providers/settings_provider.dart`
- [ ] Views: Settings screen with GST configuration, store settings

### Auth Feature

**Admin Components**:
- [x] Auth: `lib/auth.ts`, `middleware.ts`
- [x] API: `app/api/auth/route.ts`

**Mobile Implementation**:
- [ ] Models: `lib/features/auth/models/user.dart`
- [ ] Repository: `lib/features/auth/repositories/auth_repository.dart`
- [ ] Provider: `lib/features/auth/providers/auth_provider.dart`
- [ ] Views: Login screen, OTP verification
- [ ] Secure Storage: Store auth token in flutter_secure_storage
- ] Session Management: Auto-refresh tokens, handle expiry

### Common Infrastructure

**Mobile Implementation**:
- [ ] Error Handling: Custom AppException classes
- [ ] Offline Sync: Isar + background sync logic
- [ ] Loading States: Shimmer widgets
- [ ] Empty States: Empty list widgets
- [ ] Error States: Retry widgets
- [ ] Pagination: Infinite scroll with Riverpod
- [ ] Image Caching: cached_network_image
- [ ] Form Validation: Build validation helpers
- [ ] Date Pickers: Custom date picker widgets
- [ ] Navigation: GoRouter or auto_route
- [ ] Theme: Dark/Light mode support
- [ ] Localization: i18n support

---

## Implementation Priorities

### Phase 1: Core Infrastructure (Week 1)
1. Setup API client with auth token injection
2. Implement error handling with custom exceptions
3. Setup Isar database for offline caching
4. Create base repository pattern
5. Setup navigation structure

### Phase 2: Categories (Week 2)
1. Implement Category model matching admin types
2. Implement CategoryRepository with all CRUD operations
3. Implement CategoryProvider with Riverpod
4. Implement CategoriesView with list and search
5. Implement CategoryDetailView with hierarchy
6. Implement CategoryFormView with validation
7. Add Isar caching for categories

### Phase 3: Products (Week 3-4)
1. Implement Product model (complex with images, variants)
2. Implement ProductRepository with filtering and search
3. Implement ProductProvider with pagination
4. Implement ProductsView with grid/list toggle
5. Implement ProductDetailView with full details
6. Implement ProductFormView with image upload
7. Add Isar caching for products
8. Implement product availability check

### Phase 4: Orders (Week 5-6)
1. Implement Order model with items
2. Implement OrderRepository with date filtering
3. Implement OrderProvider with status management
4. Implement OrdersView with filters
5. Implement OrderDetailView with timeline
6. Implement OrderFormView with availability check
7. Implement OrderReturnModal with condition rating
8. Add Isar caching for orders

### Phase 5: Customers (Week 7)
1. Implement Customer model
2. Implement CustomerRepository
3. Implement CustomerProvider
4. Implement CustomersView with search
5. Implement CustomerDetailView
6. Implement CustomerFormView with ID validation

### Phase 6: Auth & Settings (Week 8)
1. Implement Auth model and repository
2. Implement AuthProvider with session management
3. Implement Login screen
4. Implement Settings screen
5. Implement branch switcher
6. Implement profile management

### Phase 7: Polish & Testing (Week 9-10)
1. Add offline sync logic
2. Add loading shimmer everywhere
3. Add empty states
4. Add error retry logic
5. Test all flows end-to-end
6. Performance optimization
7. Bug fixes

---

## Key Implementation Notes

### 1. Always Match Admin API Response Format

Admin API returns:
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional message"
}
```

Mobile repository must parse this format:
```dart
if (response.statusCode == 200) {
  final data = response.data;
  if (data['success'] == true) {
    return Category.fromJson(data['data']);
  }
  throw Exception(data['error']['message']);
}
```

### 2. Handle Audit Fields

Admin automatically injects audit fields (`created_by`, `created_at_branch_id`, etc.). Mobile should:
- Send these fields in create/update if needed
- Or rely on server-side injection (recommended)

### 3. Date Handling

Admin uses ISO string format: `"2024-01-15T10:30:00.000Z"`

Mobile should:
```dart
DateTime.parse(apiDateString);
// When sending to API
dateTime.toIso8601String();
```

### 4. Pagination

Admin uses `page` and `limit` query params.

Mobile should implement:
```dart
Future<List<Product>> getProducts({int page = 1, int limit = 20}) async {
  final response = await _client.get('/products', queryParameters: {
    'page': page,
    'limit': limit,
  });
  // Parse response with pagination metadata
}
```

### 5. File Upload

Admin uses Cloudflare R2 via upload service.

Mobile should:
1. Use `image_picker` to select image
2. Call `/api/upload` endpoint to get presigned URL or upload directly
3. Get R2 URL back
4. Include URL in create/update payload

### 6. RBAC

Mobile should respect role permissions:
- Staff: View only
- Manager: Create/Edit
- Admin: Full access including delete

Implement permission checks in providers or use a permission provider.

### 7. Offline-First Strategy

1. **Read**: Always read from Isar first, then fetch from API in background
2. **Write**: Write to API first, then update Isar on success
3. **Sync**: Background sync when connectivity restored
4. **Conflict**: Last-write-wins or manual resolution

### 8. Error Handling Pattern

```dart
class AppException implements Exception {
  final String message;
  final String? code;
  
  AppException(this.message, {this.code});
  
  @override
  String toString() => message;
}

class NetworkException extends AppException {
  NetworkException(String message) : super(message, code: 'NETWORK_ERROR');
}

class ValidationException extends AppException {
  ValidationException(String message) : super(message, code: 'VALIDATION_ERROR');
}

// In repository
try {
  final response = await _client.get('/categories');
  if (response.statusCode != 200) {
    throw NetworkException('Failed to load categories');
  }
  return parseResponse(response);
} on DioException catch (e) {
  throw NetworkException('Network error: ${e.message}');
}
```

---

## Conclusion

This guide provides a comprehensive A-to-Z analysis of the Paris Bridals admin dashboard architecture and maps it to the Flutter mobile implementation. The key principles are:

1. **Match the domain types exactly** - Field names, structure, relations
2. **Follow the layered architecture** - Models → Repositories → Providers → Views
3. **Reuse the existing API** - Mobile calls the same Next.js API routes
4. **Implement offline-first** - Isar for caching, sync when online
5. **Handle errors gracefully** - Custom exceptions, user-friendly messages
6. **Respect RBAC** - Permission checks based on user role
7. **Follow Flutter best practices** - Riverpod, clean architecture, feature-first

By following this guide, the mobile app will have feature parity with the admin dashboard while adhering to Flutter best practices and the specific rules outlined in `AGENTS.md`.
