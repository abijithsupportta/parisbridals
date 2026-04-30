# Mobile Codex Fast Context

This file is the quick-start map for work inside the Flutter mobile app.

## App

- Path: `apps/mobile`
- Framework: Flutter, Riverpod, Dio
- Role: thin client for the Next.js admin API
- Analyze: `flutter analyze --no-pub`
- API base URL should come from `.env` via `API_BASE_URL`

## Architecture

Follow the feature-first mobile pattern:

`view -> provider -> repository -> Dio HTTP -> Next.js API`

Feature modules should use:

- `models`
- `repositories`
- `providers`
- `views`

Providers should not make HTTP calls directly. Repositories own Dio/API calls.

## Responsive Rules

- Views should call `Responsive.init(context)` or clearly inherit from a parent that does.
- Use `Responsive.sp`, `Responsive.icon`, `Responsive.w`, `Responsive.h`, `Responsive.r`, and padding helpers.
- In rows/columns with flexible text, prefer `Expanded`, `Flexible`, `FittedBox`, `maxLines`, and `TextOverflow.ellipsis`.

## Verification

- Required after mobile changes: `flutter analyze --no-pub`.
- Current analyzer status from last review: no issues found.
- Known architecture drift: `features/categories/providers/category_provider.dart` imports Dio only for `CancelToken`.
- Known responsive drift: some branch, customer, order, and calendar views do not call `Responsive.init(context)` directly.

## Common Paths

- API client: `lib/core/api_client.dart`
- Auth service: `lib/core/auth_service.dart`
- Main layout: `lib/core/main_layout.dart`
- Responsive helper: `lib/core/responsive.dart`
- Features: `lib/features`
- App entry: `lib/main.dart`
