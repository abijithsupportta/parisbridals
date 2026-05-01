import 'package:flutter/material.dart';
import '../../../core/responsive.dart';
import '../../products/models/product.dart';
import '../../products/repositories/product_repository.dart';

/// Searchable product picker that returns the selected product.
class ProductSearchField extends StatefulWidget {
  final String? branchId;
  final ValueChanged<Product> onSelected;

  const ProductSearchField({super.key, this.branchId, required this.onSelected});

  @override
  State<ProductSearchField> createState() => _ProductSearchFieldState();
}

class _ProductSearchFieldState extends State<ProductSearchField> {
  final _controller = TextEditingController();
  final _repo = ProductRepository();
  List<Product> _results = [];
  bool _isSearching = false;
  bool _showResults = false;

  static const _primary = Color(0xFF434343);

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _search(String query) async {
    if (query.length < 2) {
      setState(() { _results = []; _showResults = false; });
      return;
    }
    setState(() => _isSearching = true);
    try {
      final result = await _repo.getProducts(search: query, branchId: widget.branchId, limit: 10);
      if (mounted) setState(() { _results = result.products; _showResults = true; });
    } catch (_) {
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
          onChanged: _search,
          style: TextStyle(fontSize: Responsive.sp(14)),
          decoration: InputDecoration(
            hintText: 'Search products...',
            hintStyle: TextStyle(fontSize: Responsive.sp(13), color: Colors.grey[400]),
            prefixIcon: Icon(Icons.search, size: Responsive.icon(20), color: Colors.grey),
            suffixIcon: _isSearching ? Padding(padding: Responsive.all(12), child: SizedBox(width: Responsive.w(16), height: Responsive.h(16), child: const CircularProgressIndicator(strokeWidth: 2))) : null,
            filled: true,
            fillColor: Colors.grey[50],
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(Responsive.r(12)), borderSide: BorderSide(color: Colors.grey[300]!)),
            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(Responsive.r(12)), borderSide: BorderSide(color: Colors.grey[300]!)),
            focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(Responsive.r(12)), borderSide: BorderSide(color: _primary, width: 2)),
            contentPadding: Responsive.symmetric(horizontal: 16, vertical: 14),
          ),
        ),
        if (_showResults && _results.isNotEmpty)
          Container(
            margin: Responsive.only(top: 4),
            constraints: BoxConstraints(maxHeight: Responsive.h(250)),
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
              separatorBuilder: (_, __) => Divider(height: 1, color: Colors.grey[200]),
              itemBuilder: (_, i) {
                final p = _results[i];
                return ListTile(
                  dense: true,
                  title: Text(p.name, style: TextStyle(fontSize: Responsive.sp(13), fontWeight: FontWeight.w600), maxLines: 1, overflow: TextOverflow.ellipsis),
                  subtitle: Text('₹${p.pricePerDay.toStringAsFixed(0)}/day • Stock: ${p.availableQuantity}', style: TextStyle(fontSize: Responsive.sp(11), color: Colors.grey[600])),
                  trailing: Icon(Icons.add_circle_outline, size: Responsive.icon(22), color: const Color(0xFF2ECC71)),
                  onTap: () {
                    widget.onSelected(p);
                    _controller.clear();
                    setState(() { _results = []; _showResults = false; });
                  },
                );
              },
            ),
          ),
      ],
    );
  }
}
