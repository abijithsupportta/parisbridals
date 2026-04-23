import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:shimmer/shimmer.dart';
import '../../../core/responsive.dart';
import '../models/product.dart';

class ProductDetailView extends StatelessWidget {
  final Product product;
  
  const ProductDetailView({super.key, required this.product});

  static const _primary = Color(0xFF434343);

  @override
  Widget build(BuildContext context) {
    Responsive.init(context);
    final String imageUrl = product.images.isNotEmpty ? product.images.first.url : '';

    return Scaffold(
      backgroundColor: const Color(0xFFF8F8F8),
      appBar: AppBar(
        backgroundColor: _primary,
        iconTheme: const IconThemeData(color: Colors.white),
        titleSpacing: 0,
        title: Text('Product Details', style: TextStyle(fontSize: Responsive.sp(18), fontWeight: FontWeight.bold, color: Colors.white)),
      ),
      body: SingleChildScrollView(
        padding: Responsive.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Image Hero
            Container(
              height: Responsive.w(250),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(Responsive.r(20)),
                boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: Responsive.r(10), offset: Offset(0, Responsive.h(4)))],
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(Responsive.r(20)),
                child: imageUrl.isNotEmpty && imageUrl.startsWith('http')
                    ? CachedNetworkImage(
                        imageUrl: imageUrl,
                        fit: BoxFit.cover,
                        width: double.infinity,
                        height: Responsive.w(250),
                        placeholder: (context, url) => Shimmer.fromColors(
                          baseColor: const Color(0xFFE8E8E8),
                          highlightColor: const Color(0xFFF5F5F5),
                          child: Container(color: Colors.white),
                        ),
                        errorWidget: (_, __, ___) => Icon(Icons.inventory_2_rounded, size: Responsive.icon(64), color: Colors.grey[300]),
                      )
                    : Icon(Icons.inventory_2_rounded, size: Responsive.icon(64), color: Colors.grey[300]),
              ),
            ),
            SizedBox(height: Responsive.h(24)),

            // Basic Info
            Text(
              product.name,
              style: TextStyle(fontSize: Responsive.sp(26), fontWeight: FontWeight.w800, color: _primary),
            ),
            SizedBox(height: Responsive.h(8)),
            Row(
              children: [
                if (product.sku != null && product.sku!.isNotEmpty)
                  Container(
                    padding: Responsive.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(color: Colors.grey[200], borderRadius: BorderRadius.circular(Responsive.r(8))),
                    child: Text('SKU: ${product.sku}', style: TextStyle(fontSize: Responsive.sp(13), fontFamily: 'monospace', fontWeight: FontWeight.bold)),
                  ),
                const Spacer(),
                Text(
                  '₹${product.pricePerDay.toStringAsFixed(0)} / day',
                  style: TextStyle(fontSize: Responsive.sp(22), fontWeight: FontWeight.w800, color: const Color(0xFFF7C873)), // Golden Accent
                ),
              ],
            ),
            if (product.description != null && product.description!.isNotEmpty) ...[
              SizedBox(height: Responsive.h(16)),
              Text(product.description!, style: TextStyle(fontSize: Responsive.sp(16), color: Colors.grey[700], height: 1.5)),
            ],
            SizedBox(height: Responsive.h(24)),

            // Stock Information
            _buildSectionTitle('Inventory Status'),
            _buildStockCard(),
            SizedBox(height: Responsive.h(24)),

            // Additional Details
            _buildSectionTitle('Additional Information'),
            Container(
              padding: Responsive.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(Responsive.r(16)),
                boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: Responsive.r(10), offset: Offset(0, Responsive.h(4)))],
              ),
              child: Column(
                children: [
                  _buildDetailRow('Barcode', product.barcode?.isNotEmpty == true ? product.barcode! : 'N/A'),
                  const Divider(height: 24),
                  _buildDetailRow('Total Owned Quantity', product.quantity.toString()),
                  const Divider(height: 24),
                  _buildDetailRow('Low Stock Alert', product.lowStockThreshold.toString()),
                  const Divider(height: 24),
                  _buildDetailRow('Track Inventory', product.trackInventory ? 'Yes' : 'No'),
                  const Divider(height: 24),
                  _buildDetailRow('Status', product.isActive ? 'Active' : 'Inactive'),
                ],
              ),
            ),
            SizedBox(height: Responsive.h(40)),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: Responsive.only(bottom: 12, left: 4),
      child: Text(title, style: TextStyle(fontSize: Responsive.sp(18), fontWeight: FontWeight.bold, color: _primary)),
    );
  }

  Widget _buildStockCard() {
    Color stockColor;
    String stockText;
    IconData stockIcon;

    if (product.availableQuantity <= 0) {
      stockColor = const Color(0xFFFF6B8A);
      stockText = 'Out of Stock';
      stockIcon = Icons.error_outline_rounded;
    } else if (product.availableQuantity <= product.lowStockThreshold) {
      stockColor = const Color(0xFFF5A623);
      stockText = 'Low Stock';
      stockIcon = Icons.warning_amber_rounded;
    } else {
      stockColor = const Color(0xFF2ECC71);
      stockText = 'In Stock';
      stockIcon = Icons.check_circle_outline_rounded;
    }

    return Container(
      padding: Responsive.all(20),
      decoration: BoxDecoration(
        color: stockColor.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(Responsive.r(16)),
        border: Border.all(color: stockColor.withValues(alpha: 0.2)),
      ),
      child: Row(
        children: [
          Container(
            padding: Responsive.all(12),
            decoration: BoxDecoration(color: Colors.white, shape: BoxShape.circle, boxShadow: [BoxShadow(color: stockColor.withValues(alpha: 0.2), blurRadius: Responsive.r(10), offset: Offset(0, Responsive.h(4)))]),
            child: Icon(stockIcon, color: stockColor, size: Responsive.icon(28)),
          ),
          SizedBox(width: Responsive.w(16)),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(stockText, style: TextStyle(fontSize: Responsive.sp(18), fontWeight: FontWeight.bold, color: stockColor)),
              SizedBox(height: Responsive.h(6)),
              Text('${product.availableQuantity} items currently available', style: TextStyle(fontSize: Responsive.sp(14), color: Colors.black87)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: TextStyle(fontSize: Responsive.sp(15), color: Colors.grey[600])),
        Text(value, style: TextStyle(fontSize: Responsive.sp(15), fontWeight: FontWeight.bold, color: _primary)),
      ],
    );
  }
}
