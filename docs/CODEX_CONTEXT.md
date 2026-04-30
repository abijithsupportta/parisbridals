# Codex Fast Context

This file is a quick project map for future Codex sessions. Keep it short and current so agents can start useful work without rediscovering the repo.

## Main Apps

- Admin: `apps/admin`, Next.js, port `3001`
- Storefront: `apps/storefront`, Next.js, port `3002`
- Mobile: `apps/mobile`, Flutter

## Most-Used Commands

- Full monorepo build: `pnpm build`
- Full monorepo lint: `pnpm lint`
- Admin check: `pnpm check:admin`
- Mobile check: `pnpm check:mobile`
- Admin dev server: `pnpm --filter admin dev`
- Mobile analyze directly: `cd apps/mobile; flutter analyze --no-pub`

## Critical Rules

- Push only to the `abijithcb` branch.
- Never push to `main`.
- After code changes, run the relevant analyzer/build and fix errors and warnings before delivery.
- Admin architecture: `domain -> repository -> service -> hooks -> components/pages`.
- Mobile architecture: `view -> provider -> repository -> Dio HTTP -> Next.js API`.
- Client components should use REST APIs or hooks and should not import server-only Supabase code.

## Known Current Issues

- Next.js 16 build warns that `middleware.ts` is deprecated in favor of `proxy`.
- Some admin API routes bypass the service layer and call repositories or Supabase directly.
- Some mobile views do not call `Responsive.init(context)` directly and may rely on a parent layout.

## Useful Paths

- Root rules: `AGENTS.md`
- Admin rules: `apps/admin/AGENTS.md`
- Mobile rules: `apps/mobile/AGENTS.md`
- Database migrations: `database/migrations`
- Admin API routes: `apps/admin/app/api`
- Mobile API client: `apps/mobile/lib/core/api_client.dart`
