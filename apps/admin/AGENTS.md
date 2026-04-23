<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Recent Updates

## April 23, 2026 - Login Page Redesign
- Redesigned the admin login page with a cleaner, minimalist UI
- Changed background from dark gradient to light slate-50 for better readability
- Simplified card design with reduced shadow and cleaner spacing
- Removed "Remember me" and "Forgot password" options for streamlined experience
- Reduced padding and spacing throughout for a more compact, modern look
- Added proper form autocomplete attributes (email, current-password)
- Optimized performance using useCallback for form submission handler
- Improved loading state handling with instant feedback
- No password visibility toggle (eye button) - kept as simple password field
- Responsive design maintained with max-w-sm container

## Category Module — Final Architecture (Apr 23, 2026)

### 3-Level Hierarchy
- **Main Category**: `parent_id = null`
- **Sub Category**: `parent_id = main.id`
- **Variant**: `parent_id = sub.id`

### REST API (all routes under `app/api/categories/`)
| Method | Route | Purpose |
|--------|-------|---------|
| `GET` | `/api/categories` | List all categories |
| `POST` | `/api/categories` | Create a category (validates name/slug) |
| `GET` | `/api/categories/:id` | Fetch one category (404 if not found) |
| `PATCH` | `/api/categories/:id` | Update (whitelisted fields only) |
| `DELETE` | `/api/categories/:id` | Delete with safety check (409 if unsafe) |
| `GET` | `/api/categories/:id/can-delete` | Pre-delete check (returns canDelete, productCount, childCount, reason) |
| `GET` | `/api/categories/:id/children` | Direct children + resolved level (`main`/`sub`/`variant`) |

### Delete Safety Check
A category is blocked from deletion if:
- Any product references it via `category_id`, `subcategory_id`, or `subvariant_id`, OR
- Any child categories are nested under it

The API returns **HTTP 409** with `{ error, reason, productCount, childCount }` when blocked.

### Data Access Layer
- **`lib/supabase/server.ts`**: exports `createClient()` (anon) and `createAdminClient()` (service role). All keys read from `.env.local` — **no hardcoded secrets**. Admin client throws a helpful error if `SUPABASE_SERVICE_ROLE_KEY` is missing.
- **`lib/supabase/categories.ts`**: dedicated module for category CRUD. All operations use `createAdminClient()` because the admin dashboard is a trusted server-side context. Never import this module from client components.
- **`lib/supabase/queries.ts`**: re-exports category types/functions for backward compatibility. Hierarchy and sub-category helpers live here.

### Client ↔ Server Boundary
- Client components (`CategoryForm`, `CategoryTreeActions`) call the REST API via `fetch()` — they do **not** import server-only Supabase code.
- Server components (`/dashboard/categories` page, edit page) call data-access functions directly.

### Image Upload (Cloudflare R2)
- **`lib/r2.ts`**: all credentials read from env (`R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`). Lazy-initialised S3 client. No hardcoded fallbacks.
- **`/api/upload`**: POST multipart form → R2 → returns `{ url, key }`.
- `CategoryForm` auto-uploads on file selection and stores the public URL in `image_url`.

### UX Features
- Slug auto-generates from name as user types (collapses to hyphenated lowercase).
- User can manually edit the slug; clearing the field resumes auto-generation.
- Error banner in form shows the exact Supabase/API error message.
- Delete modal shows `reason` (e.g., "3 product(s) are linked…" or "2 child categories are nested…").

### Pages
- `/dashboard/categories` — tree view with Main → Sub → Variant indentation. Each card exposes **View / Edit / Delete** actions.
- `/dashboard/categories/[id]` — **detail page** showing the category hero, breadcrumbs, and its direct children:
  - On a **Main** → lists Sub categories with an **"Add Subcategory"** button.
  - On a **Sub** → lists Variants with an **"Add Variant"** button.
  - On a **Variant** → shows an info notice (variants are leaf nodes, no children allowed).
  - Each child row links to its own detail page, enabling deep drill-down.
- `/dashboard/categories/create[?parent=<uuid>]` — create form. When `parent` is supplied the form pre-selects that parent (used by the Add-child buttons on the detail page). After successful child creation the user is redirected back to the parent detail page.
- `/dashboard/categories/edit/[id]` — edit form (pre-populated).

### Security
- **Service role key is NEVER bundled into client code** (used only in API routes and server components).
- **All secrets live in `.env.local`** (git-ignored). No hardcoded keys anywhere in the codebase.
- PATCH endpoint uses a **field whitelist** to prevent mass-assignment vulnerabilities.

### Automated CRUD Tests
Two PowerShell suites, both runnable against the local dev server on `:3001`:

1. **`scripts/test-categories-api.ps1`** — baseline happy-path CRUD (12/12 pass).
2. **`scripts/test-categories-hierarchy.ps1`** — exhaustive 30-case suite covering:
   - Full 3-level creation (Main → Sub → Variant) and the new `GET /children` endpoint.
   - Validation (missing `name`, missing `slug`, malformed JSON, duplicate slug, empty PATCH).
   - Not-found paths (`GET`/`PATCH`/`DELETE` unknown id; `GET /children` unknown id).
   - `can-delete` blocked/unblocked variants + 409 cascade on `DELETE` with children.
   - PATCH whitelist behaviour (unknown fields silently ignored).
   - Ordered cleanup (Variant → Sub → Main → verify 404).

Run: `powershell -ExecutionPolicy Bypass -File scripts/test-categories-hierarchy.ps1`. Exits non-zero on any failure. **Current status: 30/30 pass.**

### Build Verification
- `pnpm build` exits 0. All routes compile, including the 4 category API routes.

### Documentation Standards
- Module-level JSDoc on every new file (purpose, env vars, security notes).
- Every exported function has `@param` / `@returns` / `@throws`.
- Inline comments for non-obvious business logic (hierarchy detection, slug auto-gen, safety check, etc.).
