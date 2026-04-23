# Paris Bridals Admin Dashboard

A modern, responsive admin dashboard for managing the Paris Bridals e-commerce platform. Built with Next.js 16, TypeScript, Tailwind CSS, and Supabase.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- pnpm
- Supabase project with required tables

### Environment Setup

1. Copy the environment template:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in your Supabase and Cloudflare R2 credentials:
   ```env
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

   # Cloudflare R2 (Image Upload)
   R2_ENDPOINT=https://your-account.r2.cloudflarestorage.com
   R2_ACCESS_KEY_ID=your_access_key
   R2_SECRET_ACCESS_KEY=your_secret_key
   R2_BUCKET_NAME=your_bucket_name
   R2_PUBLIC_URL=https://your-pub-id.r2.dev
   ```

### Installation & Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Open http://localhost:3001
```

### Build & Deploy

```bash
# Build for production
pnpm build

# Start production server
pnpm start
```

---

## 📁 Project Structure

```
apps/admin/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   ├── categories/           # Category CRUD API
│   │   │   ├── route.ts          # GET/POST /api/categories
│   │   │   ├── [id]/
│   │   │   │   ├── route.ts      # GET/PATCH/DELETE /api/categories/:id
│   │   │   │   ├── can-delete/
│   │   │   │   │   └── route.ts  # Pre-delete safety check
│   │   │   │   └── children/
│   │   │   │       └── route.ts  # Direct children endpoint
│   │   │   └── upload/
│   │   │       └── route.ts      # R2 image upload
│   │   └── test-env/             # Environment verification
│   ├── dashboard/                # Protected dashboard pages
│   │   ├── categories/
│   │   │   ├── page.tsx          # Category tree view (collapsible)
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx      # Category detail page with children
│   │   │   ├── create/
│   │   │   │   └── page.tsx      # Create form (supports ?parent=)
│   │   │   └── edit/[id]/
│   │   │       └── page.tsx      # Edit form
│   │   └── ...                   # Other dashboard modules
│   └── auth/
│       └── login/
│           └── page.tsx          # Modern login page
├── components/
│   ├── ui/                       # Reusable UI components (shadcn/ui)
│   └── admin/
│       ├── CategoryForm.tsx      # Create/edit form with slug auto-gen
│       ├── CategoryTree.tsx      # Collapsible tree view component
│       └── CategoryTreeActions.tsx # View/Edit/Delete actions
├── lib/
│   ├── supabase/
│   │   ├── server.ts             # Admin/Anon client factories
│   │   ├── categories.ts         # Category data access layer
│   │   └── queries.ts            # Re-exports + helpers
│   └── r2.ts                     # Cloudflare R2 client
└── scripts/
    ├── test-categories-api.ps1   # Basic CRUD tests (12 cases)
    └── test-categories-hierarchy.ps1 # Comprehensive edge cases (30 cases)
```

---

## 🏗️ Architecture Overview

### Category Management System

The admin features a **3-level category hierarchy**:

```
Main Category (parent_id = null)
├── Sub Category (parent_id = main.id)
│   ├── Variant (parent_id = sub.id)
│   └── Variant (parent_id = sub.id)
└── Sub Category (parent_id = main.id)
    └── Variant (parent_id = sub.id)
```

#### Key Features

- **Collapsible Tree View**: Click chevrons to expand/collapse Sub categories and Variants
- **Category Detail Pages**: Deep drill-down with breadcrumbs and child management
- **Smart Child Creation**: "Add Subcategory" / "Add Variant" buttons with parent pre-selection
- **Delete Safety Checks**: Prevents deletion of categories with linked products or child categories
- **Slug Auto-Generation**: URL-friendly slugs generated from names with manual override
- **Image Upload**: Cloudflare R2 integration for category images
- **Comprehensive Validation**: Server-side validation with clear error messages

### Security Model

- **Service Role Isolation**: Admin operations use service role key bypassing RLS
- **No Hardcoded Secrets**: All credentials read from environment variables
- **Field Whitelisting**: PATCH endpoints only allow specific fields to prevent mass assignment
- **Client-Server Boundary**: Client components use REST APIs; server components use data access layer

---

## 📚 API Documentation

### Category REST Endpoints

| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| `GET` | `/api/categories` | List all categories (ordered) | Public (RLS) |
| `POST` | `/api/categories` | Create new category | Admin |
| `GET` | `/api/categories/:id` | Fetch single category | Public (RLS) |
| `PATCH` | `/api/categories/:id` | Update category (whitelisted fields) | Admin |
| `DELETE` | `/api/categories/:id` | Delete with safety check (409 if blocked) | Admin |
| `GET` | `/api/categories/:id/can-delete` | Pre-delete check (returns safety status) | Admin |
| `GET` | `/api/categories/:id/children` | Get direct children + resolved level | Admin |
| `POST` | `/api/upload` | Upload image to R2 (multipart/form-data) | Admin |

#### Request/Response Examples

**Create Category**
```bash
curl -X POST http://localhost:3001/api/categories \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Earrings",
    "slug": "earrings",
    "description": "All types of earrings",
    "parent_id": null,
    "is_active": true,
    "is_global": true,
    "sort_order": 0
  }'
```

**Get Children**
```bash
curl http://localhost:3001/api/categories/[main-id]/children
# Returns: { parent: Category, children: Category[], level: "main"|"sub"|"variant" }
```

**Delete Safety Check**
```bash
curl http://localhost:3001/api/categories/[id]/can-delete
# Returns: { canDelete: boolean, productCount: number, childCount: number, reason?: string }
```

---

## 🧪 Testing

### Automated Test Suites

Two comprehensive PowerShell test scripts validate the entire category system:

#### 1. Basic CRUD Tests (`scripts/test-categories-api.ps1`)
- 12 test cases covering happy-path CRUD operations
- Validates create → read → update → delete lifecycle
- Tests delete safety checks and cascade behavior

#### 2. Comprehensive Edge Cases (`scripts/test-categories-hierarchy.ps1`)
- **30 test cases** covering:
  - Full 3-level hierarchy creation
  - Validation errors (missing fields, malformed JSON, duplicates)
  - Not-found scenarios (404s)
  - Delete safety checks and 409 responses
  - PATCH field whitelisting
  - Children endpoint behavior
  - Cascade cleanup in correct order

#### Running Tests

```bash
# Ensure dev server is running
pnpm dev

# Run tests in separate terminal
powershell -ExecutionPolicy Bypass -File scripts/test-categories-hierarchy.ps1

# Exit code 0 = all passed; non-zero = failures
```

**Current Status**: ✅ 30/30 tests passing

---

## 🎨 UI Components

### Category Tree (`CategoryTree.tsx`)
- Interactive collapsible tree with smooth animations
- Expand/collapse state managed per category
- Visual hierarchy with indentation and icons
- Responsive design with hover states

### Category Form (`CategoryForm.tsx`)
- Unified create/edit form with validation
- Real-time slug generation from name
- Parent category selection with hierarchy display
- Image upload with preview and removal
- Error handling with inline banners

### Category Actions (`CategoryTreeActions.tsx`)
- View (eye) → detail page
- Edit → edit form
- Delete → safety-checked modal with detailed reasons

---

## 🔧 Development Guidelines

### Adding New Features

1. **Data Layer**: Add functions to `lib/supabase/categories.ts` with JSDoc
2. **API Layer**: Create/update routes in `app/api/categories/`
3. **UI Layer**: Update components in `components/admin/`
4. **Tests**: Add corresponding test cases to the PowerShell scripts
5. **Documentation**: Update this README and `AGENTS.md`

### Code Standards

- **TypeScript**: Strict mode enabled, all functions typed
- **JSDoc**: Module-level and function documentation required
- **Error Handling**: Consistent error responses with clear messages
- **Security**: No hardcoded secrets, field validation, admin-only operations
- **Testing**: All new features must include automated tests

### Environment Variables

All required environment variables are validated on startup:

```typescript
// Supabase
NEXT_PUBLIC_SUPABASE_URL          // Required
NEXT_PUBLIC_SUPABASE_ANON_KEY     // Required  
SUPABASE_SERVICE_ROLE_KEY         // Required for admin operations

// Cloudflare R2
R2_ENDPOINT                       // Required for image uploads
R2_ACCESS_KEY_ID                  // Required
R2_SECRET_ACCESS_KEY              // Required
R2_BUCKET_NAME                    // Required
R2_PUBLIC_URL                     // Required
```

---

## 🚀 Deployment

### Environment Setup

1. Configure all environment variables in your hosting platform
2. Ensure Supabase RLS policies are properly configured
3. Set up Cloudflare R2 bucket with proper CORS settings
4. Run database migrations if needed

### Build Process

```bash
# Build admin app only
npx turbo build --filter=admin

# Build entire monorepo
pnpm build
```

### Production Considerations

- **Image Uploads**: Ensure R2 bucket has public access for uploaded images
- **Database**: Supabase should have proper indexes on `parent_id`, `slug`, and `sort_order`
- **Security**: Service role key should never be exposed to client-side code
- **Performance**: Consider implementing pagination for large category trees

---

## 📝 Recent Updates (April 2026)

### v1.2.0 - Category Management Overhaul

#### New Features
- **Category Detail Pages**: `/dashboard/categories/[id]` with breadcrumbs and child management
- **Collapsible Tree View**: Interactive expand/collapse for better navigation
- **Smart Child Creation**: Pre-filled parent selection via `?parent=` query parameter
- **Children API Endpoint**: `GET /api/categories/:id/children` for direct child listing
- **Enhanced Delete Safety**: Detailed reasons and counts in delete modals

#### Improvements
- **Security**: Removed all hardcoded secrets, strict environment validation
- **UX**: Auto-redirect to parent detail page after child creation
- **Testing**: Comprehensive 30-case test suite covering all edge cases
- **Documentation**: Complete API documentation and development guidelines

#### Technical Changes
- **Client-Server Boundary**: Clear separation between client REST calls and server data access
- **Field Whitelisting**: PATCH endpoints prevent mass assignment vulnerabilities
- **Error Handling**: Consistent error responses with detailed messages
- **Build System**: Optimized builds with proper route registration

---

## 🤝 Contributing

1. Follow the existing code patterns and documentation standards
2. Add tests for all new features
3. Update documentation for any API changes
4. Ensure all environment variables are properly documented
5. Run the test suite before submitting changes

---

## 📄 License

This project is proprietary to Paris Bridals. All rights reserved.
