# Work Log - Paris Bridals Mobile App

## Date: May 2, 2026

---

## Session 1: Performance Optimization

### Problem Identified
The mobile app was experiencing slow loading times (3-5 seconds) for:
- Dashboard metrics
- Orders list
- Products list
- Calendar view

### Root Causes Found

1. **API Client - Token read on every request**
   - `api_client.dart` was reading auth token from secure storage on every HTTP request
   - FlutterSecureStorage is slow (async I/O operation)
   - Each API call was blocking on token read

2. **Splash Screen - Unnecessary 1500ms delay**
   - Animation duration was 1500ms + additional 1500ms hard delay
   - No parallel data loading

3. **No caching mechanism**
   - Every app launch fetched branches, metrics, orders fresh
   - No data reuse between screen navigations

4. **Sequential loading pattern**
   - App start → Splash → Auth check → MainLayout → Branches → Dashboard
   - Each step waited for previous to complete

### Solutions Implemented

#### 1. API Client Optimization
**File:** `lib/core/api_client.dart`

Changes:
- Added `_cachedToken` variable to cache token in memory
- Added `_tokenLoaded` flag to avoid repeated storage reads
- Added `preloadToken()` method for early token loading
- Added `clearCachedToken()` method for logout
- Token is now read once and reused for all requests

```dart
// Key changes:
String? _cachedToken;
bool _tokenLoaded = false;

Future<void> preloadToken() async {
  if (!_tokenLoaded) {
    _cachedToken = await _storage.read(key: _tokenKey);
    _tokenLoaded = true;
  }
}
```

#### 2. Splash Screen Optimization
**File:** `lib/features/auth/views/splash_view.dart`

Changes:
- Reduced animation duration from 1500ms to 800ms
- Removed hard-coded 1500ms delay
- Added parallel token preloading
- Added status message display for better UX
- Added LinearProgressIndicator for visual feedback

```dart
// Preload token immediately during splash
await apiClientInstance.preloadToken();
```

#### 3. Branch Caching
**File:** `lib/features/branches/providers/branch_provider.dart`

Changes:
- Added `BranchCache` class with TTL (2 minutes)
- Module-level cache instance `branchCache`
- Cache invalidation function added
- Branches now return cached data when valid

```dart
class BranchCache {
  List<Branch>? _data;
  DateTime? _timestamp;
  final Duration _ttl = const Duration(minutes: 2);

  bool get isValid => _data != null && _timestamp != null &&
      DateTime.now().difference(_timestamp!) < _ttl;
}

final branchCache = BranchCache();
```

#### 4. Dashboard Metrics Caching
**File:** `lib/features/dashboard/providers/dashboard_provider.dart`

Changes:
- Added `DashboardCache` class with TTL (1 minute)
- Tracks branch ID for cache invalidation
- Cache invalidation function added

#### 5. Orders Caching
**File:** `lib/features/orders/providers/order_provider.dart`

Changes:
- Added `OrdersCache` class with TTL (1 minute)
- Tracks branch ID, search query, status filter
- Cache is keyed by search parameters

### Performance Improvements Expected

| Area | Before | After (Expected) |
|------|--------|------------------|
| Token read | Every API call | Once on app start |
| Branch fetch | Fresh every load | Cached 2 mins |
| Dashboard metrics | Fresh every load | Cached 1 min |
| Orders list | Fresh every load | Cached 1 min |

---

## Session 2: Orders Module Enhancement

### Planned Enhancements

#### 1. Order Model Updates
**File:** `lib/features/orders/models/order.dart`

Added:
- `advanceAmount` field (advance payment)
- `advanceCollected` boolean
- `advanceCollectedAt` timestamp
- `advancePaymentMethod` enum
- `store` relation (StoreInfo class)

```dart
// New fields added to Order class
final double advanceAmount;
final bool? advanceCollected;
final String? advanceCollectedAt;
final PaymentMethod? advancePaymentMethod;
final StoreInfo? store;

class StoreInfo {
  final String id;
  final String name;
  final String? address;
  final String? phone;
  final String? email;
  final String? gstin;
}
```

---

## Files Modified

1. `lib/core/api_client.dart` - Token caching
2. `lib/features/auth/views/splash_view.dart` - Optimized splash
3. `lib/features/branches/providers/branch_provider.dart` - Branch caching
4. `lib/features/dashboard/providers/dashboard_provider.dart` - Dashboard caching
5. `lib/features/orders/providers/order_provider.dart` - Orders caching
6. `lib/features/orders/models/order.dart` - Added advance fields & StoreInfo

---

## Next Tasks

- [x] Add Products caching
- [ ] Add Order History/Status timeline to OrderDetailView
- [ ] Add Deposit Refund button and functionality
- [ ] Add delivery fields to CreateOrderView
- [ ] Add event_date field to CreateOrderView step 2
- [ ] Test and verify complete flow

---

## Session 3: Products Caching

### Changes Made
**File:** `lib/features/products/providers/product_provider.dart`

Added `ProductsCache` class with:
- 1 minute TTL
- Tracks branch ID and search query
- Cache invalidation function

```dart
class ProductsCache {
  PaginatedProducts? _data;
  DateTime? _timestamp;
  String? _branchId;
  String? _search;
  final Duration _ttl = const Duration(minutes: 1);

  bool isValid(String? branchId, String? search) { ... }
  void set(PaginatedProducts products, String? branchId, String? search) { ... }
  void invalidate() { ... }
}

final productsCache = ProductsCache();
```

---

*Document generated: May 2, 2026*
*Project: Paris Bridals Mobile App*