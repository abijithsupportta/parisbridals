# AGENTS.md — Paris Bridals Development Rules

> This document serves as the single source of truth for AI agents working on the Paris Bridals monorepo. Read this BEFORE writing any code.

---

## 🚨 MANDATORY: Post-Work Build Verification

**After EVERY code change, the agent MUST:**

1. Run `flutter analyze --no-pub` (for Flutter/Dart) or the equivalent lint/build command
2. Fix ALL `error` and `warning` level issues before delivering to the user
3. `info` level hints are acceptable but should be minimized
4. Never deliver code that has compilation errors

**This is non-negotiable. Every single change must be verified.**

---

## 1. Project Overview

**Business**: Paris Bridals — a single-shop jewellery rental business (NOT multi-tenant SaaS).
**Monorepo**: pnpm workspaces + Turborepo
**Tech Stack**: Next.js 16, React 19, TypeScript (strict), Tailwind CSS 4, Supabase, Cloudflare R2, shadcn/ui (new-york style)

### Apps
| App | Port | Purpose | Directory |
|-----|------|---------|-----------| 
| `admin` | 3001 | Admin dashboard for managing categories, products, banners, orders, customers | `apps/admin/` |
| `storefront` | 3002 | Customer-facing rental storefront | `apps/storefront/` |
| `mobile` | — | Flutter mobile app (thin client) | `apps/mobile/` |

### Shared Packages (`packages/`)
| Package | Purpose |
|---------|---------|
| `shared-api` | Reusable API functions (queries, mutations, Supabase client) |
| `shared-types` | TypeScript types & interfaces |
| `shared-ui` | Reusable shadcn/ui components |
| `shared-utils` | Utility functions |

### Commands
```bash
pnpm dev          # Start all apps via Turborepo
pnpm build        # Build all apps
pnpm lint         # Lint all apps
pnpm format       # Prettier format
```

---

## 2. Architecture Rules

### Next.js Admin (apps/admin) — MANDATORY LAYERED PATTERN

The admin app follows a **strict 5-layer architecture**. All new features MUST follow this pattern:

```
Domain → Repository → Service → Hooks → Components/Pages
```

#### Layer Responsibilities

| Layer | Directory | Responsibility | Imports From |
|-------|-----------|---------------|--------------|
| **Domain** | `domain/` | Types, interfaces, enums, Zod schemas, type guards | Nothing (pure types) |
| **Repository** | `repository/` | Raw Supabase CRUD operations, extends `BaseRepository` | `domain/`, `lib/supabase/` |
| **Service** | `services/` | Business logic, validation, orchestration | `repository/`, `domain/` |
| **Hooks** | `hooks/` | TanStack Query hooks wrapping services, cache management | `services/`, `domain/`, `stores/` |
| **Components** | `components/` | React components (UI + admin feature components) | `hooks/`, `domain/`, `stores/` |

#### Layer Rules

1. **Domain layer** is pure — NO imports from other layers.
2. **Repository layer** — raw database access only. No business logic. Returns `RepositoryResult<T>`.
3. **Service layer** — ALL business logic lives here (validation, slug checks, circular reference detection, safety checks).
4. **Hooks layer** — wraps services with TanStack Query. Handles cache invalidation via `queryUtils`. Shows notifications via `useAppStore`.
5. **Components** — NEVER import from `repository/` or `lib/supabase/` directly. Always use hooks.
6. **Client components** call REST API via `fetch()` — they do NOT import server-only Supabase code.
7. **Server components** (pages) can call service/data-access functions directly.

#### Singleton Pattern
Each repository and service exports both the class AND a singleton instance:
```typescript
export class CategoryRepository extends BaseRepository { ... }
export const categoryRepository = new CategoryRepository();
```

#### Barrel Exports
Every layer has an `index.ts` that re-exports everything. Always import from the barrel:
```typescript
// ✅ Correct
import { Category, CreateCategoryDTO } from '@/domain';
import { categoryService } from '@/services';
import { useCategories } from '@/hooks';

// ❌ Wrong
import { Category } from '@/domain/types/category';
```

### Flutter Mobile (apps/mobile)
```
View (widget) → Provider (Riverpod) → Repository → Dio HTTP → Next.js API
```
- Flutter is a **thin client** — it NEVER talks to Supabase directly
- All business logic, validation, and RBAC enforcement lives on the Next.js server
- Providers are the equivalent of React hooks
- Repositories encapsulate all HTTP calls via Dio

### Module Folder Structure (Flutter)
Every feature module MUST follow this structure:
```
features/<module_name>/
├── models/           # Data classes (fromJson/toJson)
├── repositories/     # HTTP calls via Dio to Next.js API
├── providers/        # Riverpod providers (state management)
└── views/            # UI widgets and screens
```

**No shortcuts.** Providers must never call Dio directly — always go through a repository.

---

## 3. Domain Layer Patterns

### Type Definitions
- **Core Entity**: `Category`, `Product` — mirrors DB table columns with `readonly id: string`
- **DTOs**: `CreateCategoryDTO`, `UpdateCategoryDTO` — all fields optional in update DTO
- **Relations**: `CategoryWithRelations extends Category` — adds computed fields like `level`, `path`
- **Enums**: Use TypeScript `enum` (e.g., `CategoryLevel.MAIN`, `ProductStatus.ACTIVE`)
- **Type Guards**: Export `isValidCategory()`, `isMainCategory()` type guard functions
- **Validation**: `CategoryValidationResult` with `is_valid`, `errors[]`, `warnings[]`

### Zod Schemas (`domain/schemas/`)
- Every entity has a Create and Update Zod schema
- Use `.refine()` for cross-field validation
- Export inferred types: `export type CreateProductInput = z.infer<typeof CreateProductSchema>`
- Slug validation: `/^[a-z0-9-]+$/`

---

## 4. Repository Layer Patterns

### BaseRepository (`repository/supabaseClient.ts`)
All repositories extend `BaseRepository` which provides:
- `handleResponse<T>()` — converts Supabase response to `RepositoryResult<T>`
- `handleError()` — converts errors to `RepositoryError`
- `executeOperation<T>()` — wraps operations with try/catch
- `exists()`, `getCount()`, `buildQuery()`, `transaction()` — helper methods

### RepositoryResult<T>
```typescript
interface RepositoryResult<T> {
  data: T | null;
  error: PostgrestError | null;
  success: boolean;
}
```
ALL repository methods MUST return `RepositoryResult<T>`. Never throw from repository methods — use the result pattern.

### Supabase Client Usage
- **`createClient()`** — anon key, subject to RLS. For public reads.
- **`createAdminClient()`** — service role key, bypasses RLS. For admin mutations.
- Admin dashboard uses the anon client via `BaseRepository.client` since it operates in a trusted server context.
- **NEVER hardcode Supabase keys.** All credentials come from `.env.local`.

---

## 5. Service Layer Patterns

### Business Logic
Services contain ALL business logic:
- Input validation (using domain `validateCategoryData()`)
- Slug generation and uniqueness checks
- Parent/hierarchy validation (prevent circular references, max 3 levels)
- Delete safety checks (check for children + linked products before deleting)
- Ordering/reordering logic

### Error Handling in Services
Return `RepositoryResult` with meaningful error codes:
```typescript
return {
  data: null,
  error: { message: 'Category slug already exists', code: 'SLUG_EXISTS' } as any,
  success: false,
};
```

Common error codes: `VALIDATION_ERROR`, `SLUG_EXISTS`, `INVALID_PARENT`, `CIRCULAR_REFERENCE`, `CANNOT_DELETE`, `CATEGORY_NOT_FOUND`

---

## 6. Hooks Layer Patterns (TanStack Query)

### Query Key Factory (`lib/query-client.ts`)
ALWAYS use the centralized `queryKeys` factory:
```typescript
queryKeys.categories          // ['categories']
queryKeys.category(id)        // ['categories', id]
queryKeys.categoryChildren(id)// ['categories', id, 'children']
queryKeys.products            // ['products']
queryKeys.product(id)         // ['products', id]
```

### Query Defaults
- `staleTime`: 5–10 minutes
- `gcTime`: 10 minutes
- `refetchOnWindowFocus`: false
- `refetchOnMount`: false
- Don't retry on 4xx errors (client errors)

### Cache Invalidation
Use `queryUtils` for consistent cache management:
```typescript
queryUtils.invalidateCategories()
queryUtils.invalidateProducts()
queryUtils.invalidateProduct(id)
```

### Hook Structure Pattern
```typescript
export function useCreateCategory() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useAppStore();

  const mutation = useMutation({
    mutationFn: (data: CreateCategoryDTO) => categoryService.createCategory(data),
    onSuccess: (result) => {
      if (result.success) {
        queryUtils.invalidateCategories();
        showSuccess('Category created successfully');
      } else {
        showError('Failed to create category', result.error?.message);
      }
    },
    onError: (error) => {
      showError('Failed to create category', error.message);
    },
  });

  return {
    ...mutation,
    createCategory: mutation.mutate,
    isLoading: mutation.isPending,
  };
}
```

---

## 7. State Management

### Zustand Stores (`stores/`)
- **`appStore`**: Global UI state — sidebar, theme, notifications, breadcrumbs, global search
- **`productStore`**: Product UI state — filters, selection, modals, view mode, sort

### When to Use Which
| State Type | Use |
|-----------|-----|
| Server data (products, categories) | TanStack Query hooks |
| UI state (modals, filters, sidebar) | Zustand stores |
| Form state | React Hook Form (with Zod resolvers) |
| Component-local state | `useState` / `useReducer` |

### Store Patterns
- Use `devtools` + `subscribeWithSelector` middleware
- Export a selectors object for optimized re-renders:
```typescript
export const useProductSelectors = {
  selectedProducts: () => useProductStore((state) => state.selectedProducts),
  filters: () => useProductStore((state) => state.filters),
};
```
- Export `appUtils` for non-React contexts (e.g., `appUtils.showSuccess('Saved!')`)

### Notification System
Use `useAppStore().showSuccess()` / `showError()` inside hooks. Use `appUtils.showSuccess()` outside React components.

---

## 8. API Routes (Next.js App Router)

### REST API Pattern
- Routes under `app/api/<entity>/`
- HTTP methods: GET (list/fetch), POST (create), PATCH (update), DELETE
- Dynamic routes: `app/api/<entity>/[id]/route.ts`
- Sub-resources: `app/api/<entity>/[id]/children/route.ts`

### Safety Endpoints
- `GET /api/categories/:id/can-delete` — pre-delete check returning `{ canDelete, reason, productCount, childCount }`
- Delete returns **HTTP 409** when blocked (has children or linked products)

### PATCH Field Whitelisting
PATCH endpoints use a field whitelist to prevent mass-assignment:
```typescript
const allowedFields = ['name', 'slug', 'description', 'image_url', 'parent_id', 'sort_order', 'is_active'];
```

---

## 9. RBAC (Role-Based Access Control)

| Role    | Can View | Can Create/Edit/Delete |
|---------|----------|------------------------|
| Admin   | ✅       | ✅                     |
| Manager | ✅       | ✅                     |
| Staff   | ✅       | ❌                     |

- Use `canManageProvider` to conditionally show/hide add/edit/delete UI
- Staff users can only view data and access the orders module
- Category and Product management is admin/manager only

---

## 10. Category System — 3-Level Hierarchy

```
Main Category (parent_id = null)
├── Sub Category (parent_id = main.id)
│   └── Variant (parent_id = sub.id)      ← LEAF NODE, no children
```

### Rules
- Maximum 3 levels deep. Variants (level 3) cannot have children.
- Level is determined by traversing `parent_id` chain, NOT stored in DB.
- Slug auto-generates from name (lowercase, hyphenated). User can override.
- Delete is blocked if category has children OR linked products.

---

## 11. Image Upload (Cloudflare R2)

### R2 Configuration
- Client: `lib/r2.ts` — lazy-initialized S3-compatible client
- Env vars: `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`
- Upload endpoint: `POST /api/upload` — accepts multipart form data, returns `{ url, key }`

### Upload Layer Architecture
- **Repository**: `uploadRepository.ts` — raw R2 operations
- **Service**: `uploadService.ts` — validation, file type checks
- **Hooks**: `useUpload.ts` — `useUploadFile`, `useUploadMultipleFiles`, `useUploadProductImages`, `useUploadCategoryImage`, `useImageUploadWithPreview`

---

## 12. Responsive Design Rules (Flutter Mobile)

- **ALL sizes must use `Responsive.*` helpers** — no hardcoded pixel values
- `Responsive.sp()` for font sizes
- `Responsive.icon()` for icon sizes
- `Responsive.w()` for widths and horizontal spacing
- `Responsive.h()` for heights and vertical spacing
- `Responsive.r()` for border radii
- `Responsive.all()`, `Responsive.symmetric()`, `Responsive.only()` for padding
- Base design: 375 × 812 (iPhone X)

---

## 13. 🛡️ Flutter Responsive UI — Golden Rules

> **THE GOLDEN RULE: Never give a child a fixed size inside a parent with constrained space.**
> Always use `Expanded`, `Flexible`, `FittedBox`, or percentage-based sizing so the child
> *negotiates* with its parent rather than demanding space.

### 1. FittedBox — Auto-Shrink
- Wrap any widget that could exceed its parent in a `FittedBox` so it **scales down** automatically.
- Use on titles, price labels, and any text inside a bounded container.
- Example: `FittedBox(fit: BoxFit.scaleDown, child: Text(...))`.

### 2. Flexible / Expanded — Space Sharing
- Inside every `Row` or `Column`, at least one child MUST be `Expanded` or `Flexible`.
- Text-heavy children should always be `Expanded` so they take remaining space.
- Badges, icons, and fixed-width elements can stay un-wrapped but should be minimal.

### 3. TextOverflow.ellipsis + maxLines
- Every `Text` widget that could grow unbounded MUST have `maxLines` and `overflow: TextOverflow.ellipsis`.
- Single-line labels: `maxLines: 1`. Descriptions: `maxLines: 2` or `3`.

### 4. LayoutBuilder — Adaptive Layout
- Use `LayoutBuilder` when content needs to change shape based on available space.
- Example: show 2-column grid on small screens, 3-column on wider screens.
- Access `constraints.maxWidth` to make decisions.

### 5. MediaQuery + Clamped Scale Factors
- The `Responsive` class already handles this via `_scaleText.clamp(0.8, 1.4)`.
- Never let scale factors grow unbounded — always clamp.
- Use comfortable base sizes (sp(13-14) body, sp(16-18) titles) and let the scaler adjust.

### 6. Wrap instead of Row
- When placing multiple chips, badges, or tags horizontally, use `Wrap` instead of `Row`.
- `Wrap` automatically flows items to the next line when space runs out.
- Always set `spacing` and `runSpacing` using `Responsive.w()` and `Responsive.h()`.

### Sizing Guidelines (Base at 375px width)
| Element              | Recommended sp/w/h | Notes                          |
|----------------------|---------------------|--------------------------------|
| Body text            | sp(13)              | Comfortable reading size       |
| Card titles          | sp(14)              | Slightly larger than body      |
| Section headers      | sp(15)              | Clear hierarchy                |
| Page titles          | sp(16-18)           | Prominent but not oversized    |
| Icons (inline)       | icon(18-20)         | Matches body text height       |
| Icons (action)       | icon(22-24)         | Tap-friendly                   |
| Card padding         | all(12)             | Breathable without waste       |
| List item spacing    | h(8-10)             | Tight but readable             |
| Thumbnails           | w(64-72)            | Visible without dominating     |
| Border radii         | r(10-12)            | Modern, consistent curves      |

---

## 14. Component Organization

### Component Directories
```
components/
├── admin/          # Feature-specific components (CategoryForm, ProductForm, etc.)
├── providers/      # QueryProvider, ThemeProvider
└── ui/             # Reusable shadcn/ui primitives (button, input, card, etc.)
```

### shadcn/ui Configuration
- Style: `new-york`
- Base color: `slate`
- CSS variables: enabled
- Aliases: `@/components`, `@/lib/utils`, `@/hooks`

### Form Components
- Unified create/edit forms with `mode` prop
- Use React Hook Form + Zod resolvers
- Slug auto-generation from name field
- Image upload with preview
- Error handling with inline banners

---

## 15. Storefront Architecture

### Key Differences from Admin
- Uses `src/` directory structure (`src/app/`, `src/components/`, `src/lib/`)
- NO layered architecture — simpler data fetching directly from Supabase
- Pages: home, collections, product details, cart, checkout, wishlist, search, about, contact, FAQs, legal, membership
- Components organized by feature: `home/`, `product/`, `ui/`

### Design System
- Luxury minimalist aesthetic (ivory, gold, charcoal palette)
- Mobile-first responsive design
- Bottom mobile navigation bar
- Vendor/store-specific data filtering (only show Paris Bridals content)

### Storefront Data Access
- `src/lib/supabase/` — Supabase client for storefront
- `src/lib/actions/` — Server actions for data fetching
- Direct Supabase queries (no repository/service layers)

---

## 16. Database

### Schema Location
- Migrations in `database/migrations/`
- Initial schema: `001_initial_schema.sql`
- Tables: `categories`, `products`, `banners`, `customers`, `orders`, `order_items`, `order_status_history`, `settings`, `staff`, `branches`

### Key Conventions
- Primary keys: UUID (`id`)
- Timestamps: `created_at` (auto), `updated_at` (set on update)
- Soft delete: `deleted_at` column (when implemented)
- Slugs: unique, lowercase, hyphenated
- Foreign keys: `parent_id`, `category_id`, `store_id`, etc.
- JSONB: Used for `images` array, `damage_history`

### Product Schema Highlights (Jewellery Rental)
- `price_per_day` (NOT purchase price)
- `security_deposit`
- `min_rental_days`, `max_rental_days`
- `material`, `metal_purity`, `metal_color`
- `weight_grams`
- Inventory: `total_quantity`, `available_quantity`, `reserved_quantity`, `maintenance_quantity`
- Condition tracking: `condition`, `sanitization_status`, `damage_history`

---

## 17. Security Rules

1. **NEVER hardcode secrets** — all keys in `.env.local` (git-ignored)
2. **Service role key** — server-side only, never exposed to client bundles
3. **PATCH whitelisting** — only allow specific fields in update endpoints
4. **Delete safety checks** — always check for dependencies before deleting
5. **Client-server boundary** — client components use REST API via `fetch()`, never import `lib/supabase/server.ts`
6. **Middleware auth** — `middleware.ts` protects `/dashboard/*` routes, redirects unauthenticated users to `/auth/login`
7. **Environment validation** — throw clear error messages if required env vars are missing

---

## 18. Code Quality Standards

1. **No unused imports** — remove them immediately
2. **Use `ref.invalidate()` instead of `ref.refresh()`** when the return value isn't needed
3. **AppBar must not change color on scroll** — `scrolledUnderElevation: 0` in theme
4. **Debug banner must be OFF** — `debugShowCheckedModeBanner: false`
5. **Feature-first folder structure** — never dump files in `lib/` root
6. **Every view must call `Responsive.init(context)`** or inherit from a parent that does

---

## 19. API Communication (Flutter Mobile)

- Base URL: `https://parisbridals-admin.vercel.app/api`
- All requests go through the shared `apiClient` (Dio instance in `core/api_client.dart`)
- Response format follows the admin API conventions:
  - Lists: `{ categories: [...] }`, `{ products: [...] }`
  - Singles: `{ category: {...} }`, `{ product: {...} }`
  - Success: `{ success: true }`
  - Errors: `{ error: "message" }`

---

## 20. Documentation Standards

1. **Module-level JSDoc** on every new file:
   ```typescript
   /**
    * Category Repository
    *
    * Data access layer for category entities using Supabase.
    *
    * @module repository/categoryRepository
    */
   ```
2. **Function-level JSDoc**: `@param`, `@returns`, `@throws`
3. **Inline comments** for non-obvious business logic
4. **Update `AGENTS.md`** when adding new features or patterns
5. **Update `README.md`** for API changes

---

## 21. Testing

### PowerShell Test Scripts (`scripts/`)
- `test-categories-api.ps1` — 12 basic CRUD tests
- `test-categories-hierarchy.ps1` — 30 comprehensive edge cases

### Running Tests
```bash
# Ensure dev server is running on :3001
powershell -ExecutionPolicy Bypass -File scripts/test-categories-hierarchy.ps1
```

### What to Test
- Happy-path CRUD lifecycle
- Validation errors (missing fields, malformed JSON, duplicates)
- Not-found scenarios (404)
- Delete safety checks and 409 responses
- Field whitelisting behavior
- Children endpoint behavior
- Cleanup in correct order (Variant → Sub → Main)

---

## 22. CSS & Styling

### Admin
- Tailwind CSS 4 with CSS variables (HSL color system)
- shadcn/ui component library (new-york style)
- Dark mode support (`darkMode: "class"`)
- Clean, minimal, data-focused design

### Storefront
- Tailwind CSS 4
- Custom CSS in `globals.css` (~12KB with extensive styling)
- Mobile-first, luxury aesthetic
- Color palette: ivory/white, gold accents, charcoal text
- NO claymorphism — clean design with subtle depth effects

---

## 23. Common Patterns Quick Reference

### Creating a New CRUD Module (e.g., "Banners")

1. **Domain**: Add `domain/types/banner.ts` + Zod schemas in `domain/schemas/banner.schema.ts`
2. **Repository**: Create `repository/bannerRepository.ts` extending `BaseRepository`
3. **Service**: Create `services/bannerService.ts` with validation + business logic
4. **Hooks**: Create `hooks/useBanners.ts` with TanStack Query hooks
5. **API Routes**: Create `app/api/banners/route.ts` and `app/api/banners/[id]/route.ts`
6. **Components**: Create `components/admin/BannerForm.tsx`
7. **Pages**: Create `app/dashboard/banners/page.tsx`, `create/page.tsx`, `edit/[id]/page.tsx`
8. **Tests**: Add PowerShell test script
9. **Barrel exports**: Update all `index.ts` files
10. **Query keys**: Add to `queryKeys` in `lib/query-client.ts`
11. **Docs**: Update AGENTS.md and README.md

### Adding a Feature to Existing Module

1. Add types to `domain/types/`
2. Add repository method to existing repository
3. Add service method with validation
4. Add hook wrapping the service
5. Update components
6. Add tests

---

## 24. Known TODOs & Incomplete Areas

- Several service methods have `// TODO: Calculate actual level` — the repository `findById()` already calculates level, but the service overrides it
- `getCategoryHierarchy()` returns flat list with `// TODO: Build hierarchy tree`
- Soft delete (`deleted_at`) is planned but not fully implemented
- `packages/shared-*` directories exist but may not be fully populated
- Product module is newer and follows the layered architecture more thoroughly

---

## 25. Environment Variables Reference

### Admin App (`.env.local`)
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Cloudflare R2
R2_ENDPOINT=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=
```

### Storefront App (`.env.local`)
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

---

## Git & Documentation

- Update `README.md` in each app when adding new modules
- Document new API endpoints, models, and providers
- Keep `AGENTS.md` updated with new rules as they emerge

## 26. Mandatory Post-Work Verification
1. ALWAYS check the build for type issues (pnpm lint or 	sc --noEmit) after every significant change.
2. If any runtime issues (e.g. React.Children.only Slot errors) or build issues are found, solve them PROPERLY before concluding the task.
