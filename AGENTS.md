# AGENTS.md — Paris Bridals Development Rules

## 🚨 MANDATORY: Post-Work Build Verification

**After EVERY code change, the agent MUST:**

1. Run `flutter analyze --no-pub` (for Flutter/Dart) or the equivalent lint/build command
2. Fix ALL `error` and `warning` level issues before delivering to the user
3. `info` level hints are acceptable but should be minimized
4. Never deliver code that has compilation errors

**This is non-negotiable. Every single change must be verified.**

---

## Architecture Rules

### Next.js Admin (apps/admin)
```
UI (page.tsx) → Hook (useX.ts) → API Route → Service → Repository → Supabase
```
- Hooks NEVER call services/repositories directly
- All data mutations go through API routes (server-side)
- Secret keys live on the server only

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

## RBAC (Role-Based Access Control)

| Role    | Can View | Can Create/Edit/Delete |
|---------|----------|------------------------|
| Admin   | ✅       | ✅                     |
| Manager | ✅       | ✅                     |
| Staff   | ✅       | ❌                     |

- Use `canManageProvider` to conditionally show/hide add/edit/delete UI
- Staff users can only view data and access the orders module
- Category and Product management is admin/manager only

---

## Responsive Design Rules

- **ALL sizes must use `Responsive.*` helpers** — no hardcoded pixel values
- `Responsive.sp()` for font sizes
- `Responsive.icon()` for icon sizes
- `Responsive.w()` for widths and horizontal spacing
- `Responsive.h()` for heights and vertical spacing
- `Responsive.r()` for border radii
- `Responsive.all()`, `Responsive.symmetric()`, `Responsive.only()` for padding
- Base design: 375 × 812 (iPhone X)

---

## Code Quality Standards

1. **No unused imports** — remove them immediately
2. **Use `ref.invalidate()` instead of `ref.refresh()`** when the return value isn't needed
3. **AppBar must not change color on scroll** — `scrolledUnderElevation: 0` in theme
4. **Debug banner must be OFF** — `debugShowCheckedModeBanner: false`
5. **Feature-first folder structure** — never dump files in `lib/` root
6. **Every view must call `Responsive.init(context)`** or inherit from a parent that does

---

## API Communication

- Base URL: `https://parisbridals-admin.vercel.app/api`
- All requests go through the shared `apiClient` (Dio instance in `core/api_client.dart`)
- Response format follows the admin API conventions:
  - Lists: `{ categories: [...] }`, `{ products: [...] }`
  - Singles: `{ category: {...} }`, `{ product: {...} }`
  - Success: `{ success: true }`
  - Errors: `{ error: "message" }`

---

## Git & Documentation

- Update `README.md` in each app when adding new modules
- Document new API endpoints, models, and providers
- Keep `AGENTS.md` updated with new rules as they emerge
