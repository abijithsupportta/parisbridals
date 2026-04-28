# Admin Codex Fast Context

This file is the quick-start map for work inside the admin app.

## App

- Path: `apps/admin`
- Framework: Next.js 16, React 19, TypeScript strict, Tailwind CSS 4
- Port: `3001`
- Dev: `pnpm --filter admin dev`
- Build: `pnpm --filter admin build`
- Lint: `pnpm --filter admin lint`

## Architecture

Follow the strict 5-layer pattern:

`domain -> repository -> service -> hooks -> components/pages`

- Domain: pure types, enums, schemas, validation helpers.
- Repository: raw Supabase/R2 access, returns `RepositoryResult<T>`.
- Service: business logic, validation, safety checks, orchestration.
- Hooks: TanStack Query wrappers, cache invalidation, notifications.
- Components/pages: UI and route composition.

## Import Rules

- Prefer barrels: `@/domain`, `@/repository`, `@/services`, `@/hooks`.
- Components should not import repositories or server-only Supabase modules.
- Client components should not import `@/lib/supabase/server`.
- Server pages and API routes can call services directly.

## Verification

- Required after admin changes: `pnpm --filter admin lint` and `pnpm --filter admin build`.
- Existing build warning: Next.js recommends replacing `middleware.ts` with `proxy`.

## Common Paths

- Routes: `app`
- API routes: `app/api`
- Dashboard pages: `app/dashboard`
- Domain: `domain`
- Repository: `repository`
- Services: `services`
- Hooks: `hooks`
- Admin components: `components/admin`
- UI primitives: `components/ui`
- Query keys/cache helpers: `lib/query-client.ts`
