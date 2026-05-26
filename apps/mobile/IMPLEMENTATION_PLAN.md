# Remaining Features Implementation Plan

## ✅ COMPLETED: 1. Payment Recording Modal
- Payment model with enums
- Payment repository and provider
- Modal with payment method selector
- Amount validation
- Integration with order detail view

---

## 🔨 TODO: 2. Start Rental Action (Stock Check)

### Implementation:
1. Add stock check API call in order repository
2. Create stock check modal to show availability
3. Add "Start Rental" button for scheduled orders
4. Show stock error modal if insufficient stock
5. Update order status to 'ongoing' on success

### Files to create/modify:
- `order_repository.dart` - Add `checkStockAvailability()` and `startRental()`
- `order_detail_view_new.dart` - Add start rental button and logic

---

## 🔨 TODO: 3. Cancel Order Workflow

### Implementation:
1. Add cancel confirmation dialog
2. Call update order API with status='cancelled'
3. Show success message
4. Navigate back to orders list

### Files to modify:
- `order_detail_view_new.dart` - Add cancel button and dialog

---

## 🔨 TODO: 4. Barcode Scanner Integration

### Implementation:
1. Add `mobile_scanner` package to pubspec.yaml
2. Create barcode scanner widget
3. Integrate with return processing
4. Auto-mark scanned items as "Good"
5. Highlight scanned item with animation

### Files to create:
- `barcode_scanner_widget.dart` - Scanner UI
- Modify `order_detail_view_new.dart` - Add scanner button

### Dependencies:
```yaml
dependencies:
  mobile_scanner: ^5.0.0
```

---

## 🔨 TODO: 5. Invoice PDF Generation

### Implementation:
1. Add `pdf` and `printing` packages
2. Create invoice PDF generator service
3. Add "Download Invoice" button
4. Generate PDF with order details, items, payments
5. Share/save PDF

### Files to create:
- `invoice_pdf_service.dart` - PDF generation logic
- Modify `order_detail_view_new.dart` - Add invoice button

### Dependencies:
```yaml
dependencies:
  pdf: ^3.10.0
  printing: ^5.11.0
  path_provider: ^2.1.0
```

---

## Priority Order:
1. ✅ Payment Recording (DONE)
2. Start Rental (Most critical for workflow)
3. Cancel Order (Simple, high value)
4. Barcode Scanner (Nice to have)
5. Invoice PDF (Nice to have)

---

## Notes:
- All features follow the existing architecture pattern
- Use Responsive helper for all UI
- Follow color scheme: primary=#434343, accent=#F7C873
- Add proper error handling and loading states
- Invalidate caches after mutations
