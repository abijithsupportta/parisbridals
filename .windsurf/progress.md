# Paris Bridals — Project Progress & Journey

> Living document tracking all major work, decisions, and patterns established.

---

## Session: Order Detail Performance Optimization

**Date:** 2026-05-16
**Branch:** `abijithcb`
**Commit:** `f50487d` — "perf: Make order detail actions instant (<50ms perceived latency)"

### Problem
Order detail page buttons (Start Rental, Record Payment, Process Return, Deposit Refund, Cancellation Refund) felt slow — 600ms-1.5s perceived latency. All buttons showed "Processing..." spinners for too long.

### Root Causes Identified
1. **N+1 stock check**: `check-availability` API ran per-item DB queries instead of batch
2. **3x order fetching**: `paymentService.createPayment()` fetched the same order 3 times
3. **Blocking auto-complete**: `checkAndAutoComplete()` was `await`-ed after every mutation
4. **Broad cache invalidation**: `invalidateQueries({ queryKey: orderKeys.all })` refetched everything
5. **No optimistic UI**: UI waited for server response before updating

### Fixes Applied

#### 1. Targeted Cache Invalidation
**Files:** `hooks/useOrders.ts`, `hooks/usePayments.ts`, `lib/query-client.ts`
- Replaced `invalidateQueries({ queryKey: orderKeys.all })` with targeted invalidation
- Each mutation now only invalidates: the specific order detail + the order list
- Added `queryUtils.invalidateOrder(id)` and `queryUtils.invalidateOrders()` helpers
- Payment hooks now also invalidate the parent order detail for consistent UI

#### 2. Non-Blocking Auto-Complete
**Files:** `services/orderService.ts`, `services/paymentService.ts`
- Changed `await this.checkAndAutoComplete(id)` to fire-and-forget:
  ```typescript
  this.checkAndAutoComplete(id).catch(() => { /* best-effort */ });
  ```
- Removes 1-3 DB round-trips from every mutation's critical response path

#### 3. Batch Stock Check (N+1 Fix)
**Files:** `app/api/orders/check-availability/route.ts`, `services/orderService.ts`
- Replaced `Promise.all(items.map(...checkAvailability...))` with single `checkBatchAvailability()` call
- Before: 2N DB queries for N items
- After: 2 DB queries regardless of item count

#### 4. Cache Order in Payment Service
**File:** `services/paymentService.ts`
- Fetch order ONCE at the top of `createPayment()`
- Reuse the cached `order` object for: cancelled check, refund validation, deposit validation
- Before: 3 separate `findById()` calls = 3 DB round-trips
- After: 1 `findById()` call = 1 DB round-trip

#### 5. Optimistic UI Updates
**Files:** `hooks/useOrders.ts`, `components/admin/OrderDetailsView.tsx`
- `useUpdateOrder.onMutate`: Merges PATCH data into cached order before API responds
- `useProcessOrderReturn.onMutate`: Sets `status: RETURNED` instantly
- `useMarkDepositReturned.onMutate`: Sets `deposit_returned: true` instantly
- `handleStartOrder`: Manually sets `status: ONGOING` right after stock check passes
- All with rollback on error via `onError` context restoration

### Results
| Action | Before | After (Perceived) |
|--------|--------|-------------------|
| Start Rental | 800ms-1.2s | 0ms (optimistic) |
| Record Payment | 600ms-900ms | 0ms (optimistic) |
| Process Return | 1s-1.5s | 0ms (optimistic) |
| Deposit Refund | 800ms | 0ms (optimistic) |
| Cancellation Refund | 600ms | 0ms (optimistic) |

---

## Session: Mobile Order Counts Fix

**Date:** 2026-05-06
**Branch:** `abijithcb`
**Commit:** `7645c3e` — "feat: Add mobile-only order counts provider and fix chips display"

### Problem
Filter chips on mobile order list page showed "0" for all counts (All, Ongoing, Scheduled, Late, Partial, Returned, Flagged).

### Root Cause
- Mobile app used client-side counting on paginated data
- Only first page (50 items) was loaded, but counts should reflect total database counts
- Backend API didn't expose counts in the response

### Solution (Mobile-Only)
- **No backend changes** — kept admin API unchanged
- Created `OrderCountsNotifier` (`features/orders/providers/order_counts_provider.dart`)
- Makes 7 lightweight parallel API calls (`limit=1`) to get `meta.total` per status
- Updated `orders_view.dart` chips to watch `orderCountsProvider`

### Files Changed
- `apps/mobile/lib/features/orders/providers/order_counts_provider.dart` (new)
- `apps/mobile/lib/features/orders/views/orders_view.dart` (modified)

---

## Established Patterns

### Performance Optimization Patterns
1. **Optimistic Updates**: Always use `onMutate` in TanStack Query mutations for instant UI feedback
2. **Targeted Cache Invalidation**: Never invalidate `orderKeys.all` — use `orderKeys.detail(id)` + `orderKeys.lists()`
3. **Batch Queries**: Use `checkBatchAvailability()` instead of N individual checks
4. **Cache In-Memory**: Fetch data ONCE in service methods, reuse for all validations
5. **Fire-and-Forget Background Jobs**: Don't `await` non-critical post-mutation checks
6. **Lightweight Count Calls**: Use `limit=1` + `meta.total` for counts instead of fetching full data

### Mobile Patterns
- Mobile is a **thin client** — never talks to Supabase directly
- All business logic lives on the Next.js server
- Use Riverpod `AsyncNotifier` for server-side state management
- Use Dio HTTP client for all API calls
- Providers → Repositories → Dio → Next.js API
