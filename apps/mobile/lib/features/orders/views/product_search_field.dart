import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/responsive.dart';
import '../../products/models/product.dart';
import '../../products/providers/product_provider.dart';

/// Searchable product picker with branch-specific stock display.
/// Out-of-stock items are shown greyed out and cannot be selected.
class ProductSearchField extends ConsumerStatefulWidget {
  final String? branchId;
  final ValueChanged<Product> onSelected;

  const ProductSearchField({super.key, this.branchId, required this.onSelected});

  @override
  ConsumerState<ProductSearchField> createState() => _ProductSearchFieldState();
}

class _ProductSearchFieldState extends ConsumerState<ProductSearchField> {
  final _controller = TextEditingController();
  List<Product> _results = [];
  bool _isSearching = false;
  bool _showResults = false;
  String? _error;
  Timer? _debounce;

  static const _primary = Color(0xFF434343);

  @override
  void dispose() {
    _debounce?.cancel();
    _controller.dispose();
    super.dispose();
  }

  /// Get branch-specific available stock for a product.
  int _branchStock(Product p) {
    if (widget.branchId != null && p.branchInventory.isNotEmpty) {
      final inv = p.branchInventory.where((b) => b.branchId == widget.branchId);
      if (inv.isNotEmpty) return inv.first.stockCount;
    }
    return p.availableQuantity;
  }

  void _onChanged(String query) {
    _debounce?.cancel();
    if (query.isEmpty) {
      setState(() { _results = []; _showResults = false; _error = null; });
      return;
    }
    _debounce = Timer(const Duration(milliseconds: 300), () => _search(query));
  }

  Future<void> _search(String query) async {
    if (query.isEmpty) return;
    setState(() { _isSearching = true; _error = null; });
    try {
      final repo = ref.read(productRepositoryProvider);
      final result = await repo.getProducts(
        search: query,
        branchId: widget.branchId,
        limit: 10,
      );
      if (mounted) setState(() { _results = result.products; _showResults = true; });
    } catch (e) {
      if (mounted) {
        setState(() {
          _results = [];
          _showResults = true;
          _error = e.toString().replaceFirst('Exception: ', '');
        });
      }
    } finally {
      if (mounted) setState(() => _isSearching = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        TextField(
          controller: _controller,
          onChanged: _onChanged,
          style: TextStyle(fontSize: Responsive.sp(14)),
          decoration: InputDecoration(
            hintText: 'Search products...',
            hintStyle: TextStyle(fontSize: Responsive.sp(13), color: Colors.grey[400]),
            prefixIcon: Icon(Icons.search, size: Responsive.icon(20), color: Colors.grey),
            suffixIcon: _isSearching
                ? Padding(padding: Responsive.all(12), child: SizedBox(width: Responsive.w(16), height: Responsive.h(16), child: const CircularProgressIndicator(strokeWidth: 2)))
                : (_controller.text.isNotEmpty
                    ? IconButton(icon: Icon(Icons.close, size: Responsive.icon(18), color: Colors.grey), onPressed: () {
                        _controller.clear();
                        setState(() { _results = []; _showResults = false; _error = null; });
                      })
                    : null),
            filled: true,
            fillColor: Colors.grey[50],
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(Responsive.r(12)), borderSide: BorderSide(color: Colors.grey[300]!)),
            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(Responsive.r(12)), borderSide: BorderSide(color: Colors.grey[300]!)),
            focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(Responsive.r(12)), borderSide: BorderSide(color: _primary, width: 1.5)),
            contentPadding: Responsive.symmetric(horizontal: 16, vertical: 14),
          ),
        ),

        // Error
        if (_error != null)
          Padding(
            padding: Responsive.only(top: 4),
            child: Text(_error!, style: TextStyle(fontSize: Responsive.sp(11), color: Colors.red[600]), maxLines: 2, overflow: TextOverflow.ellipsis),
          ),

        // Results dropdown
        if (_showResults && _results.isNotEmpty)
          Container(
            margin: Responsive.only(top: 4),
            constraints: BoxConstraints(maxHeight: Responsive.h(280)),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(Responsive.r(12)),
              border: Border.all(color: Colors.grey[300]!),
              boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.08), blurRadius: 8, offset: const Offset(0, 4))],
            ),
            child: ListView.separated(
              shrinkWrap: true,
              padding: Responsive.symmetric(vertical: 4),
              itemCount: _results.length,
              separatorBuilder: (context, index) => Divider(height: 1, color: Colors.grey[100]),
              itemBuilder: (context, index) => _buildProductTile(_results[index]),
            ),
          ),

        // No results
        if (_showResults && _results.isEmpty && _error == null && _controller.text.isNotEmpty)
          Container(
            margin: Responsive.only(top: 4),
            padding: Responsive.symmetric(vertical: 14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(Responsive.r(12)),
              border: Border.all(color: Colors.grey[200]!),
            ),
            child: Center(
              child: Text('No products found', style: TextStyle(fontSize: Responsive.sp(12), color: Colors.grey[500])),
            ),
          ),
      ],
    );
  }

  Widget _buildProductTile(Product p) {
    final stock = _branchStock(p);
    final isOutOfStock = stock <= 0;

    return InkWell(
      onTap: isOutOfStock
          ? null
          : () {
              widget.onSelected(p);
              _controller.clear();
              setState(() { _results = []; _showResults = false; });
            },
      child: Opacity(
        opacity: isOutOfStock ? 0.45 : 1.0,
        child: Padding(
          padding: Responsive.symmetric(horizontal: 12, vertical: 10),
          child: Row(
            children: [
              // Thumbnail
              Container(
                width: Responsive.w(36),
                height: Responsive.w(36),
                decoration: BoxDecoration(
                  color: _primary.withValues(alpha: 0.06),
                  borderRadius: BorderRadius.circular(Responsive.r(8)),
                ),
                child: p.primaryImageUrl != null
                    ? ClipRRect(
                        borderRadius: BorderRadius.circular(Responsive.r(8)),
                        child: Image.network(p.primaryImageUrl!, fit: BoxFit.cover,
                            errorBuilder: (context, error, stackTrace) => Icon(Icons.diamond_outlined, size: Responsive.icon(18), color: _primary)),
                      )
                    : Icon(Icons.diamond_outlined, size: Responsive.icon(18), color: _primary),
              ),
              SizedBox(width: Responsive.w(10)),

              // Name + price
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(p.name,
                        style: TextStyle(fontSize: Responsive.sp(13), fontWeight: FontWeight.w600, color: _primary),
                        maxLines: 1, overflow: TextOverflow.ellipsis),
                    SizedBox(height: Responsive.h(2)),
                    Text('₹${p.pricePerDay.toStringAsFixed(0)}',
                        style: TextStyle(fontSize: Responsive.sp(11), color: Colors.grey[600])),
                  ],
                ),
              ),

              // Stock badge
              Container(
                padding: Responsive.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: isOutOfStock
                      ? Colors.red.withValues(alpha: 0.1)
                      : const Color(0xFF2ECC71).withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(Responsive.r(6)),
                ),
                child: Text(
                  isOutOfStock ? 'Out of Stock' : 'Stock: $stock',
                  style: TextStyle(
                    fontSize: Responsive.sp(10),
                    fontWeight: FontWeight.w700,
                    color: isOutOfStock ? Colors.red : const Color(0xFF2ECC71),
                  ),
                ),
              ),

              // Add icon (only if in stock)
              if (!isOutOfStock) ...[
                SizedBox(width: Responsive.w(6)),
                Icon(Icons.add_circle_outline, size: Responsive.icon(22), color: const Color(0xFF2ECC71)),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
