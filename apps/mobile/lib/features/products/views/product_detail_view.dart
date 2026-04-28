import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:shimmer/shimmer.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/responsive.dart';
import '../../auth/providers/auth_provider.dart';
import '../models/product.dart';
import '../providers/product_provider.dart';
import 'product_form_view.dart';

class ProductDetailView extends ConsumerStatefulWidget {
  final Product product;
  
  const ProductDetailView({super.key, required this.product});

  @override
  ConsumerState<ProductDetailView> createState() => _ProductDetailViewState();
}

class _ProductDetailViewState extends ConsumerState<ProductDetailView> {
  late Product _product;

  static const _primary = Color(0xFF434343);
  static const _accent  = Color(0xFFF7C873);
  static const _bg      = Color(0xFFF8F8F8);

  @override
  void initState() {
    super.initState();
    _product = widget.product;
  }

  @override
  Widget build(BuildContext context) {
    Responsive.init(context);
    final canManage = ref.watch(canManageProvider);

    return Scaffold(
      backgroundColor: _bg,
      appBar: AppBar(
        title: Text('Product Details', style: TextStyle(fontSize: Responsive.sp(18))),
        actions: [
          if (canManage) ...[
            IconButton(
              onPressed: () => _navigateToEdit(),
              icon: Icon(Icons.edit_outlined, size: Responsive.icon(20)),
            ),
            IconButton(
              onPressed: () => _confirmDelete(context),
              icon: Icon(Icons.delete_outline, size: Responsive.icon(22), color: const Color(0xFFFF6B8A)),
            ),
          ],
        ],
      ),
      body: _buildDetail(context, canManage),
    );
  }

  void _navigateToEdit() {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => ProductFormView(product: _product)),
    ).then((_) {
      ref.invalidate(productsProvider);
      final allAsync = ref.read(productsProvider);
      allAsync.whenData((paginatedData) {
        final updated = paginatedData.products.where((p) => p.id == _product.id).firstOrNull;
        if (updated != null && mounted) {
          setState(() => _product = updated);
        }
      });
    });
  }

  Widget _buildDetail(BuildContext context, bool canManage) {
    final String imageUrl = _product.images.isNotEmpty ? _product.images.first.url : '';

    return ListView(
      padding: Responsive.all(16),
      children: [
        // Image
        Container(
          width: double.infinity,
          height: Responsive.h(250),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(Responsive.r(16)),
            boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: Responsive.r(10), offset: Offset(0, Responsive.h(3)))],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(Responsive.r(16)),
            child: imageUrl.isNotEmpty && imageUrl.startsWith('http')
                ? CachedNetworkImage(
                    imageUrl: imageUrl,
                    fit: BoxFit.cover,
                    width: double.infinity,
                    placeholder: (context, url) => Shimmer.fromColors(
                      baseColor: const Color(0xFFE8E8E8),
                      highlightColor: const Color(0xFFF5F5F5),
                      child: Container(color: Colors.white),
                    ),
                    errorWidget: (context, url, error) => _buildPlaceholder(),
                  )
                : _buildPlaceholder(),
          ),
        ),
        SizedBox(height: Responsive.h(20)),

        // Name & Price Badge
        Container(
          padding: Responsive.all(16),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(Responsive.r(14))),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: Responsive.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: (_product.isActive ? const Color(0xFF4CAF50) : Colors.grey).withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(Responsive.r(20)),
                    ),
                    child: Text(_product.isActive ? 'Active' : 'Inactive',
                      style: TextStyle(fontSize: Responsive.sp(12), fontWeight: FontWeight.w800,
                        color: _product.isActive ? const Color(0xFF4CAF50) : Colors.grey)),
                  ),
                  const Spacer(),
                  if (_product.sku != null && _product.sku!.isNotEmpty)
                    Container(
                      padding: Responsive.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(color: Colors.grey[100], borderRadius: BorderRadius.circular(Responsive.r(6))),
                      child: Text(
                        'SKU: ${_product.sku}',
                        style: TextStyle(fontSize: Responsive.sp(11), fontFamily: 'monospace', fontWeight: FontWeight.bold, color: Colors.grey[700]),
                      ),
                    ),
                ],
              ),
              SizedBox(height: Responsive.h(16)),
              Text(_product.name, style: TextStyle(fontSize: Responsive.sp(22), fontWeight: FontWeight.bold, color: _primary)),
              SizedBox(height: Responsive.h(10)),
              Text(
                '₹${_product.pricePerDay.toStringAsFixed(0)} / day',
                style: TextStyle(fontSize: Responsive.sp(20), fontWeight: FontWeight.w800, color: _accent),
              ),
            ],
          ),
        ),
        SizedBox(height: Responsive.h(12)),

        // Description
        if (_product.description != null && _product.description!.isNotEmpty) ...[
          Container(
            padding: Responsive.all(16),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(Responsive.r(14))),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Description', style: TextStyle(fontSize: Responsive.sp(14), fontWeight: FontWeight.w700, color: Colors.grey)),
                SizedBox(height: Responsive.h(8)),
                Text(_product.description!, style: TextStyle(fontSize: Responsive.sp(15), height: 1.5, color: _primary)),
              ],
            ),
          ),
          SizedBox(height: Responsive.h(12)),
        ],

        // Inventory Status
        Container(
          padding: Responsive.all(16),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(Responsive.r(14))),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Inventory Status', style: TextStyle(fontSize: Responsive.sp(14), fontWeight: FontWeight.w700, color: Colors.grey)),
              SizedBox(height: Responsive.h(12)),
              _buildStockCard(),
            ],
          ),
        ),
        SizedBox(height: Responsive.h(12)),

        // Info Grid
        Container(
          padding: Responsive.all(16),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(Responsive.r(14))),
          child: Column(
            children: [
              _buildInfoRow('Barcode', _product.barcode?.isNotEmpty == true ? _product.barcode! : 'N/A', Icons.qr_code_2),
              Divider(height: Responsive.h(20), color: const Color(0xFFF0F0F0)),
              _buildInfoRow('Total Quantity', _product.quantity.toString(), Icons.inventory_2),
              Divider(height: Responsive.h(20), color: const Color(0xFFF0F0F0)),
              _buildInfoRow('Low Stock Alert', _product.lowStockThreshold.toString(), Icons.warning_amber_rounded),
              Divider(height: Responsive.h(20), color: const Color(0xFFF0F0F0)),
              _buildInfoRow('Track Inventory', _product.trackInventory ? 'Yes' : 'No', Icons.track_changes),
              Divider(height: Responsive.h(20), color: const Color(0xFFF0F0F0)),
              _buildInfoRow('Featured', _product.isFeatured ? 'Yes' : 'No', Icons.star_border),
            ],
          ),
        ),
        SizedBox(height: Responsive.h(24)),

        // Action buttons — only for admin/manager
        if (canManage) ...[
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => _navigateToEdit(),
                  icon: Icon(Icons.edit, size: Responsive.icon(20)),
                  label: Text('Edit Product', style: TextStyle(fontSize: Responsive.sp(15), fontWeight: FontWeight.bold)),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: _primary,
                    side: const BorderSide(color: _primary, width: 2),
                    padding: Responsive.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(Responsive.r(12))),
                  ),
                ),
              ),
              SizedBox(width: Responsive.w(12)),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => _confirmDelete(context),
                  icon: Icon(Icons.delete_outline, size: Responsive.icon(20)),
                  label: Text('Delete', style: TextStyle(fontSize: Responsive.sp(15), fontWeight: FontWeight.bold)),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: const Color(0xFFFF6B8A),
                    side: const BorderSide(color: Color(0xFFFF6B8A), width: 2),
                    padding: Responsive.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(Responsive.r(12))),
                  ),
                ),
              ),
            ],
          ),
        ],

        SizedBox(height: Responsive.h(32)),
      ],
    );
  }

  Widget _buildPlaceholder() {
    return Container(
      color: const Color(0xFFF5F5F5),
      child: Center(child: Icon(Icons.inventory_2_outlined, size: Responsive.icon(48), color: Colors.grey[300])),
    );
  }

  Widget _buildInfoRow(String label, String value, IconData icon) {
    return Row(
      children: [
        Icon(icon, size: Responsive.icon(20), color: Colors.grey[500]),
        SizedBox(width: Responsive.w(12)),
        Text(label, style: TextStyle(fontSize: Responsive.sp(14), color: Colors.grey[600], fontWeight: FontWeight.w500)),
        const Spacer(),
        Text(value, style: TextStyle(fontSize: Responsive.sp(15), fontWeight: FontWeight.w700, color: _primary)),
      ],
    );
  }

  Widget _buildStockCard() {
    Color stockColor;
    String stockText;
    IconData stockIcon;

    if (_product.availableQuantity <= 0) {
      stockColor = const Color(0xFFFF6B8A);
      stockText = 'Out of Stock';
      stockIcon = Icons.error_outline_rounded;
    } else if (_product.availableQuantity <= _product.lowStockThreshold) {
      stockColor = const Color(0xFFF5A623);
      stockText = 'Low Stock';
      stockIcon = Icons.warning_amber_rounded;
    } else {
      stockColor = const Color(0xFF2ECC71);
      stockText = 'In Stock';
      stockIcon = Icons.check_circle_outline_rounded;
    }

    return Container(
      padding: Responsive.all(14),
      decoration: BoxDecoration(
        color: stockColor.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(Responsive.r(12)),
        border: Border.all(color: stockColor.withValues(alpha: 0.2)),
      ),
      child: Row(
        children: [
          Container(
            padding: Responsive.all(8),
            decoration: BoxDecoration(
              color: Colors.white,
              shape: BoxShape.circle,
              boxShadow: [BoxShadow(color: stockColor.withValues(alpha: 0.15), blurRadius: Responsive.r(6), offset: Offset(0, Responsive.h(2)))],
            ),
            child: Icon(stockIcon, color: stockColor, size: Responsive.icon(20)),
          ),
          SizedBox(width: Responsive.w(12)),
          // Expanded: text never overflows
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  stockText,
                  style: TextStyle(fontSize: Responsive.sp(14), fontWeight: FontWeight.bold, color: stockColor),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                SizedBox(height: Responsive.h(2)),
                Text(
                  '${_product.availableQuantity} items available',
                  style: TextStyle(fontSize: Responsive.sp(12), color: Colors.black87),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _confirmDelete(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Delete Product', style: TextStyle(fontSize: Responsive.sp(16), fontWeight: FontWeight.bold)),
        content: Text('Are you sure you want to delete this product? This cannot be undone.',
          style: TextStyle(fontSize: Responsive.sp(13))),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text('Cancel', style: TextStyle(fontSize: Responsive.sp(13))),
          ),
          TextButton(
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                await ref.read(productsProvider.notifier).deleteProduct(_product.id);
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Product deleted successfully'), backgroundColor: Color(0xFF4CAF50)),
                  );
                  Navigator.of(context).pop();
                }
              } catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Failed to delete.'), backgroundColor: Color(0xFFFF6B8A)),
                  );
                }
              }
            },
            child: Text('Delete', style: TextStyle(fontSize: Responsive.sp(13), color: const Color(0xFFFF6B8A), fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }
}
