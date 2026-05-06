# Orders Module - Fixes Applied & Remaining Work

**Date:** May 1, 2026  
**Status:** 4/25 tasks completed (16%)

---

## ✅ Completed Fixes

### 1. **Critical Map Literal Syntax Bug** (FIXED)
**Files:** 
- `order_detail_view_new.dart` line 339
- `create_order_view.dart` line 156

**Issue:** Arrow function + braces created Set literal instead of Map
**Fix:** Added explicit `<String, dynamic>` type annotation

```dart
// Before (WRONG - creates Set)
items: widget.order.items!.map((item) => {
  'product_id': item.productId,
  'quantity': item.quantity,
}).toList(),

// After (CORRECT - creates Map)
items: widget.order.items!.map((item) => <String, dynamic>{
  'product_id': item.productId,
  'quantity': item.quantity,
}).toList(),
```

**Impact:** This was blocking order creation and stock availability checks.

---

### 2. **Shared Constants File** (CREATED)
**File:** `lib/core/constants.dart`

**Created:** `AppColors` class with all color constants:
- `primary` (Charcoal #434343)
- `accent` (Golden #F7C873)
- `surface` (Almond #FAEBCD)
- `background` (Off-White #F8F8F8)
- `danger`, `success`, `warning`, `info`
- Order status colors

**Next Step:** Replace hardcoded colors in all view files with `AppColors.*`

---

### 3. **Custom Exception Classes** (CREATED)
**File:** `lib/exceptions/app_exceptions.dart`

**Created:**
- `AppException` - Base exception class
- `NetworkException` - Network failures (no connection, timeout, server error)
- `ValidationException` - Validation failures with field-level errors
- `AuthException` - Authentication failures (unauthorized, forbidden)
- `NotFoundException` - Resource not found
- `BusinessRuleException` - Business logic violations (insufficient stock, invalid dates)

**Next Step:** Use these in repositories instead of generic `Exception`

---

### 4. **Unified Payment Enum** (CREATED)
**File:** `lib/core/enums.dart`

**Created:** `PaymentType` enum with:
- cash, upi, card, bankTransfer, cheque, other
- `displayName` getter for UI
- `fromString()` parser
- `toApiString()` for API calls

**Next Step:** Replace `PaymentMethod` and `PaymentMode` in models with `PaymentType`

---

## 🚧 High Priority Remaining Fixes

### 5. **Null-Safe Parsing** (TODO)
**Files:** 
- `order.dart` - `CustomerInfo.fromJson` (line 406-411)
- `payment.dart` - `Payment.fromJson` (line 46-56)

**Issue:** Raw `as String` casts will crash if API returns null

**Required Fix:**
```dart
// CustomerInfo.fromJson
id: json['id'] as String? ?? '',
name: json['name'] as String? ?? '',
phone: json['phone'] as String? ?? '',

// Payment.fromJson
id: json['id'] as String? ?? '',
orderId: json['order_id'] as String? ?? '',
amount: (json['amount'] as num?)?.toDouble() ?? 0.0,
paymentDate: json['payment_date'] as String? ?? '',
createdAt: json['created_at'] as String? ?? '',
```

---

### 6. **Order Detail View Refresh** (TODO)
**File:** `order_detail_view_new.dart`

**Issue:** View receives stale `Order` object via constructor, never refreshes after mutations

**Required Fix:**
```dart
// Change from StatefulWidget receiving Order to using orderByIdProvider
class OrderDetailViewNew extends ConsumerStatefulWidget {
  final String orderId; // Pass ID instead of Order object
  
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final orderAsync = ref.watch(orderByIdProvider(orderId));
    
    return orderAsync.when(
      data: (order) => _buildContent(order),
      loading: () => LoadingIndicator(),
      error: (e, _) => ErrorView(error: e),
    );
  }
}
```

---

### 7. **Product Name in Order Items** (TODO)
**File:** `order.dart` - `OrderItem` model

**Issue:** Shows truncated product ID instead of product name

**Required Fix:**
```dart
class OrderItem {
  final String productId;
  final String? productName; // ADD THIS
  final int quantity;
  // ...
  
  factory OrderItem.fromJson(Map<String, dynamic> json) {
    return OrderItem(
      productId: json['product_id'] as String? ?? '',
      productName: json['product_name'] as String?, // ADD THIS
      quantity: json['quantity'] as int? ?? 0,
      // ...
    );
  }
}
```

---

### 8. **Event Date in Create Order** (TODO)
**File:** `create_order_view.dart`

**Issue:** `Order` model has required `eventDate` field but create flow doesn't collect it

**Required Fix:**
- Add date picker in `step_rental_period.dart` for event date
- Include in order creation payload

---

### 9. **Riverpod Repository Access** (TODO)
**Files:**
- `customer_search_field.dart` (line 20)
- `product_search_field.dart` (line 21)
- `payment_recording_modal.dart` (line 57)
- `step_products.dart` (line 93)

**Issue:** Direct repository instantiation bypasses Riverpod DI

**Required Fix:**
```dart
// Convert to ConsumerStatefulWidget
class CustomerSearchField extends ConsumerStatefulWidget {
  @override
  ConsumerState<CustomerSearchField> createState() => _CustomerSearchFieldState();
}

class _CustomerSearchFieldState extends ConsumerState<CustomerSearchField> {
  // Use provider instead of direct instantiation
  void _search(String query) async {
    final repo = ref.read(customerRepositoryProvider);
    final results = await repo.search(query);
    // ...
  }
}
```

---

### 10. **Stock Check Error Handling** (TODO)
**File:** `create_order_view.dart` line 119

**Issue:** Silent catch swallows all errors

**Current:**
```dart
try {
  final result = await repo.checkStockAvailability(...);
} catch (_) {} // ❌ Silent failure
```

**Required Fix:**
```dart
try {
  setState(() => _isCheckingStock = true);
  final result = await repo.checkStockAvailability(...);
  // Handle result
} on NetworkException catch (e) {
  _showError('Network error: ${e.message}');
} on BusinessRuleException catch (e) {
  _showError(e.message);
} catch (e) {
  _showError('Failed to check stock availability');
} finally {
  setState(() => _isCheckingStock = false);
}
```

---

## 🔧 Medium Priority Remaining Fixes

### 11. **Decompose Large File** (TODO)
**File:** `order_detail_view_new.dart` (1173 lines)

**Extract into:**
- `widgets/order_hero_banner.dart`
- `widgets/order_action_buttons.dart`
- `widgets/order_items_list.dart`
- `widgets/return_settlement_footer.dart`
- `widgets/order_customer_card.dart`
- `widgets/order_financial_card.dart`

---

### 12. **Filter Chip Counts** (TODO)
**File:** `orders_view.dart` lines 167-179

**Issue:** Counts from loaded page, not server totals

**Required Fix:**
```dart
// Add meta counts to PaginatedOrders
class PaginatedOrders {
  final List<Order> orders;
  final int total;
  final Map<String, int> statusCounts; // ADD THIS
  // ...
}

// Use in UI
_buildFilterChip('All', statusCounts['all'] ?? 0)
_buildFilterChip('Pending', statusCounts['pending'] ?? 0)
```

---

### 13. **Remove Duplicate Methods** (TODO)
**File:** `payment.dart`

**Issue:** Both `Payment` and `CreatePaymentDTO` have identical `_paymentTypeToString` methods

**Required Fix:**
```dart
// Create static helper
class PaymentHelpers {
  static String paymentTypeToString(PaymentType type) {
    return type.toApiString();
  }
}

// Or use the enum method directly
payment_type: paymentType.toApiString()
```

---

### 14. **Add JSDoc Documentation** (TODO)
**Files:** All model files

**Required:** Add module-level JSDoc as per AGENTS.md rule 20

```dart
/// Order domain models for Paris Bridals mobile app.
///
/// Contains Order, OrderItem, CustomerInfo, BranchInfo classes and related enums
/// for managing jewellery rental orders.
///
/// @module features/orders/models/order
```

---

### 15. **Rename pricePerDay** (TODO)
**Files:** `order.dart`, UI labels

**Issue:** Misleading name for flat-rate pricing

**Required Fix:**
```dart
class OrderItem {
  final double price; // Renamed from pricePerDay
  final double totalPrice; // price * quantity
  // ...
}

// Update UI labels
Text('${formatCurrency(item.price)}') // Remove "/day"
```

---

## 📋 Low Priority / Future Work

### 16. **Repository Providers** (TODO)
Create providers for Customer and Product repositories:

```dart
// In customer_provider.dart
final customerRepositoryProvider = Provider<CustomerRepository>((ref) {
  return CustomerRepository();
});

// In product_provider.dart
final productRepositoryProvider = Provider<ProductRepository>((ref) {
  return ProductRepository();
});
```

---

### 17. **Unused Repository Methods** (TODO)
**File:** `order_repository.dart`

**Methods never called:**
- `markDepositReturned()`
- `getOrderHistory()`

**Decision needed:** Implement UI or remove methods

---

### 18. **Loading States** (TODO)
Add loading indicators for stock availability checks

---

### 19. **Unit Tests** (TODO)
Test Order and Payment model serialization with null values

---

### 20. **Widget Tests** (TODO)
Test 4-step order creation wizard navigation and validation

---

## 📊 Progress Summary

| Category | Completed | Remaining | Total |
|----------|-----------|-----------|-------|
| Critical Bugs | 2 | 3 | 5 |
| Architecture | 2 | 4 | 6 |
| Code Quality | 0 | 6 | 6 |
| Documentation | 0 | 1 | 1 |
| Testing | 0 | 2 | 2 |
| Future Work | 0 | 5 | 5 |
| **TOTAL** | **4** | **21** | **25** |

**Completion:** 16%

---

## 🎯 Recommended Next Steps

### Sprint 1 (This Week)
1. ✅ Fix null-safe parsing (CustomerInfo, Payment)
2. ✅ Fix order detail view refresh
3. ✅ Add product name to OrderItem
4. ✅ Add event date to create order flow

### Sprint 2 (Next Week)
5. ✅ Refactor to use Riverpod providers
6. ✅ Add stock check error handling
7. ✅ Fix filter chip counts
8. ✅ Decompose large file

### Sprint 3 (Following Week)
9. ✅ Remove duplicates (methods, enums)
10. ✅ Add JSDoc documentation
11. ✅ Rename pricePerDay
12. ✅ Add tests

---

## 🚨 Critical Path

**Must fix before production:**
1. ✅ Map literal syntax (DONE)
2. ⚠️ Null-safe parsing (CRITICAL)
3. ⚠️ Order detail refresh (HIGH)
4. ⚠️ Stock check error handling (HIGH)

**Can defer:**
- Decomposition (code quality)
- Documentation (nice to have)
- Tests (should have but not blocking)

---

## 📝 Notes

- Currency formatter already exists at `lib/utils/currency_formatter.dart` - no need to create
- All color constants now in `lib/core/constants.dart` - need to update imports
- Custom exceptions ready in `lib/exceptions/app_exceptions.dart` - need to use in repositories
- Unified PaymentType enum ready in `lib/core/enums.dart` - need to replace old enums

---

**End of Fix Summary**
