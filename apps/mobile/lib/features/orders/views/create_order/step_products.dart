import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../../../../core/responsive.dart';
import '../../../products/models/product.dart';
import '../../../products/repositories/product_repository.dart';
import '../product_search_field.dart';
import 'create_order_view.dart';

/// Step 3: Product selection with search, barcode scanner, and cart.
class StepProducts extends StatefulWidget {
  final String? branchId;
  final List<CartItem> cart;
  final ValueChanged<Product> onAddProduct;
  final void Function(int index, int delta) onUpdateQty;
  final ValueChanged<int> onRemove;
  final int rentalDays;

  const StepProducts({
    super.key,
    this.branchId,
    required this.cart,
    required this.onAddProduct,
    required this.onUpdateQty,
    required this.onRemove,
    required this.rentalDays,
  });

  @override
  State<StepProducts> createState() => _StepProductsState();
}

class _StepProductsState extends State<StepProducts> {
  static const _primary = Color(0xFF434343);
  static const _accent = Color(0xFFF7C873);

  Future<void> _openScanner() async {
    final barcode = await Navigator.push<String>(
      context,
      MaterialPageRoute(builder: (_) => const _BarcodeScannerPage()),
    );
    if (barcode != null && barcode.isNotEmpty && mounted) {
      _lookupBarcode(barcode);
    }
  }

  Future<void> _lookupBarcode(String barcode) async {
    try {
      final repo = ProductRepository();
      final result = await repo.getProducts(search: barcode, branchId: widget.branchId, limit: 1);
      if (result.products.isNotEmpty && mounted) {
        widget.onAddProduct(result.products.first);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Added: ${result.products.first.name}'), backgroundColor: Colors.green[700], duration: const Duration(seconds: 1)),
        );
      } else if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('No product found for barcode: $barcode'), backgroundColor: Colors.orange[700]),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Scan error: $e'), backgroundColor: Colors.red[700]),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: Responsive.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Container(
            padding: Responsive.all(16),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [const Color(0xFF2ECC71).withValues(alpha: 0.08), const Color(0xFF2ECC71).withValues(alpha: 0.02)],
                begin: Alignment.topLeft, end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(Responsive.r(14)),
            ),
            child: Row(
              children: [
                Container(
                  padding: Responsive.all(10),
                  decoration: BoxDecoration(color: const Color(0xFF2ECC71).withValues(alpha: 0.12), borderRadius: BorderRadius.circular(Responsive.r(10))),
                  child: Icon(Icons.shopping_bag_rounded, size: Responsive.icon(22), color: const Color(0xFF2ECC71)),
                ),
                SizedBox(width: Responsive.w(12)),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Add Products', style: TextStyle(fontSize: Responsive.sp(15), fontWeight: FontWeight.w800, color: _primary)),
                      SizedBox(height: Responsive.h(2)),
                      Text('Search or scan barcode to add items', style: TextStyle(fontSize: Responsive.sp(11), color: Colors.grey[600])),
                    ],
                  ),
                ),
              ],
            ),
          ),
          SizedBox(height: Responsive.h(16)),

          // Search + Scanner row
          Container(
            padding: Responsive.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(Responsive.r(16)),
              boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 8, offset: const Offset(0, 2))],
            ),
            child: Column(
              children: [
                Row(
                  children: [
                    Expanded(
                      child: ProductSearchField(branchId: widget.branchId, onSelected: widget.onAddProduct),
                    ),
                    SizedBox(width: Responsive.w(8)),
                    InkWell(
                      onTap: _openScanner,
                      borderRadius: BorderRadius.circular(Responsive.r(12)),
                      child: Container(
                        padding: Responsive.all(12),
                        decoration: BoxDecoration(
                          color: _primary,
                          borderRadius: BorderRadius.circular(Responsive.r(12)),
                        ),
                        child: Icon(Icons.qr_code_scanner_rounded, size: Responsive.icon(24), color: Colors.white),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          SizedBox(height: Responsive.h(16)),

          // Cart header
          if (widget.cart.isNotEmpty) ...[
            Padding(
              padding: Responsive.only(bottom: 8),
              child: Row(
                children: [
                  Text('CART', style: TextStyle(fontSize: Responsive.sp(11), fontWeight: FontWeight.w900, color: _primary, letterSpacing: 1)),
                  const Spacer(),
                  Container(
                    padding: Responsive.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(color: _accent.withValues(alpha: 0.3), borderRadius: BorderRadius.circular(Responsive.r(8))),
                    child: Text('${widget.cart.length} item${widget.cart.length > 1 ? 's' : ''}',
                        style: TextStyle(fontSize: Responsive.sp(10), fontWeight: FontWeight.w700, color: _primary)),
                  ),
                ],
              ),
            ),
            ...widget.cart.asMap().entries.map((e) => _buildCartItem(e.key, e.value)),
          ] else
            _buildEmptyCart(),
        ],
      ),
    );
  }

  Widget _buildCartItem(int index, CartItem item) {
    final available = item.isAvailable;
    return Container(
      margin: Responsive.only(bottom: 10),
      padding: Responsive.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(Responsive.r(14)),
        border: Border.all(
          color: available == false ? Colors.red.withValues(alpha: 0.4) : Colors.grey[200]!,
          width: available == false ? 1.5 : 1,
        ),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: 6, offset: const Offset(0, 2))],
      ),
      child: Column(
        children: [
          Row(
            children: [
              // Product image or icon
              Container(
                width: Responsive.w(44),
                height: Responsive.w(44),
                decoration: BoxDecoration(
                  color: _primary.withValues(alpha: 0.06),
                  borderRadius: BorderRadius.circular(Responsive.r(10)),
                ),
                child: item.product.primaryImageUrl != null
                    ? ClipRRect(
                        borderRadius: BorderRadius.circular(Responsive.r(10)),
                        child: Image.network(item.product.primaryImageUrl!, fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => Icon(Icons.diamond_outlined, size: Responsive.icon(22), color: _primary)),
                      )
                    : Icon(Icons.diamond_outlined, size: Responsive.icon(22), color: _primary),
              ),
              SizedBox(width: Responsive.w(10)),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(item.product.name, style: TextStyle(fontSize: Responsive.sp(13), fontWeight: FontWeight.w700, color: _primary), maxLines: 1, overflow: TextOverflow.ellipsis),
                    SizedBox(height: Responsive.h(2)),
                    Text('₹${item.product.pricePerDay.toStringAsFixed(0)}/day', style: TextStyle(fontSize: Responsive.sp(11), color: Colors.grey[600])),
                  ],
                ),
              ),
              // Qty controls
              Container(
                decoration: BoxDecoration(color: Colors.grey[50], borderRadius: BorderRadius.circular(Responsive.r(10)), border: Border.all(color: Colors.grey[200]!)),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    InkWell(
                      onTap: () => widget.onUpdateQty(index, -1),
                      child: Padding(padding: Responsive.all(6), child: Icon(Icons.remove, size: Responsive.icon(16), color: _primary)),
                    ),
                    Padding(
                      padding: Responsive.symmetric(horizontal: 8),
                      child: Text('${item.quantity}', style: TextStyle(fontSize: Responsive.sp(14), fontWeight: FontWeight.bold)),
                    ),
                    InkWell(
                      onTap: () => widget.onUpdateQty(index, 1),
                      child: Padding(padding: Responsive.all(6), child: Icon(Icons.add, size: Responsive.icon(16), color: _primary)),
                    ),
                  ],
                ),
              ),
              SizedBox(width: Responsive.w(6)),
              InkWell(
                onTap: () => widget.onRemove(index),
                child: Icon(Icons.delete_outline, size: Responsive.icon(20), color: Colors.red[400]),
              ),
            ],
          ),
          // Availability indicator
          if (available != null) ...[
            SizedBox(height: Responsive.h(6)),
            Container(
              padding: Responsive.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: available ? const Color(0xFF2ECC71).withValues(alpha: 0.1) : Colors.red.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(Responsive.r(8)),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(available ? Icons.check_circle : Icons.error, size: Responsive.icon(14),
                      color: available ? const Color(0xFF2ECC71) : Colors.red),
                  SizedBox(width: Responsive.w(4)),
                  Text(
                    available ? 'Available (${item.availableQty} in stock)' : 'Only ${item.availableQty ?? 0} available',
                    style: TextStyle(fontSize: Responsive.sp(10), fontWeight: FontWeight.w600,
                        color: available ? const Color(0xFF2ECC71) : Colors.red),
                  ),
                ],
              ),
            ),
          ],
          // Line subtotal
          if (widget.rentalDays > 0) ...[
            SizedBox(height: Responsive.h(6)),
            Align(
              alignment: Alignment.centerRight,
              child: Text(
                '₹${(item.lineTotal * widget.rentalDays).toStringAsFixed(0)} for ${widget.rentalDays}d',
                style: TextStyle(fontSize: Responsive.sp(11), fontWeight: FontWeight.w700, color: _primary),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildEmptyCart() {
    return Container(
      padding: Responsive.symmetric(vertical: 40),
      child: Center(
        child: Column(
          children: [
            Icon(Icons.shopping_cart_outlined, size: Responsive.icon(48), color: Colors.grey[300]),
            SizedBox(height: Responsive.h(12)),
            Text('Cart is empty', style: TextStyle(fontSize: Responsive.sp(14), fontWeight: FontWeight.w600, color: Colors.grey[400])),
            SizedBox(height: Responsive.h(4)),
            Text('Search or scan products to add', style: TextStyle(fontSize: Responsive.sp(11), color: Colors.grey[400])),
          ],
        ),
      ),
    );
  }
}

/// Full-screen barcode scanner page.
class _BarcodeScannerPage extends StatefulWidget {
  const _BarcodeScannerPage();

  @override
  State<_BarcodeScannerPage> createState() => _BarcodeScannerPageState();
}

class _BarcodeScannerPageState extends State<_BarcodeScannerPage> {
  final MobileScannerController _controller = MobileScannerController();
  bool _scanned = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    Responsive.init(context);
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        title: Text('Scan Barcode', style: TextStyle(fontSize: Responsive.sp(16))),
        actions: [
          IconButton(
            icon: const Icon(Icons.flash_on),
            onPressed: () => _controller.toggleTorch(),
          ),
        ],
      ),
      body: Stack(
        children: [
          MobileScanner(
            controller: _controller,
            onDetect: (capture) {
              if (_scanned) return;
              final barcodes = capture.barcodes;
              if (barcodes.isNotEmpty && barcodes.first.rawValue != null) {
                _scanned = true;
                Navigator.pop(context, barcodes.first.rawValue);
              }
            },
          ),
          // Scan overlay
          Center(
            child: Container(
              width: Responsive.w(250),
              height: Responsive.w(250),
              decoration: BoxDecoration(
                border: Border.all(color: const Color(0xFFF7C873), width: 2),
                borderRadius: BorderRadius.circular(Responsive.r(16)),
              ),
            ),
          ),
          Positioned(
            bottom: Responsive.h(60),
            left: 0, right: 0,
            child: Center(
              child: Text('Align barcode within the frame', style: TextStyle(fontSize: Responsive.sp(13), color: Colors.white70)),
            ),
          ),
        ],
      ),
    );
  }
}
