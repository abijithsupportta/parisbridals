import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:shimmer/shimmer.dart';
import '../../../core/responsive.dart';
import '../models/product.dart';

class ProductDetailView extends StatelessWidget {
  final Product product;
  
  const ProductDetailView({super.key, required this.product});

  static const _primary = Color(0xFF434343);
  static const _accent  = Color(0xFFF7C873);

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
        title: Text('Product Details', style: TextStyle(fontSize: Responsive.sp(15), fontWeight: FontWeight.bold, color: Colors.white)),
      ),
      body: SingleChildScrollView(
        padding: Responsive.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Image Hero — uses height ratio, not fixed width
            AspectRatio(
              aspectRatio: 16 / 10,
              child: Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(Responsive.r(14)),
                  boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: Responsive.r(6), offset: Offset(0, Responsive.h(2)))],
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(Responsive.r(14)),
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
                          errorWidget: (context, url, error) => Center(child: Icon(Icons.inventory_2_rounded, size: Responsive.icon(40), color: Colors.grey[300])),
                        )
                      : Center(child: Icon(Icons.inventory_2_rounded, size: Responsive.icon(40), color: Colors.grey[300])),
                ),
              ),
            ),
            SizedBox(height: Responsive.h(16)),

            // Name — FittedBox auto-shrinks long names
            FittedBox(
              fit: BoxFit.scaleDown,
              alignment: Alignment.centerLeft,
              child: Text(
                product.name,
                style: TextStyle(fontSize: Responsive.sp(18), fontWeight: FontWeight.w800, color: _primary),
              ),
            ),
            SizedBox(height: Responsive.h(8)),

            // SKU + Price row — Expanded + FittedBox
            Row(
              children: [
                if (product.sku != null && product.sku!.isNotEmpty)
                  Container(
                    padding: Responsive.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(color: Colors.grey[200], borderRadius: BorderRadius.circular(Responsive.r(6))),
                    child: Text(
                      'SKU: ${product.sku}',
                      style: TextStyle(fontSize: Responsive.sp(10), fontFamily: 'monospace', fontWeight: FontWeight.bold),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                const Spacer(),
                FittedBox(
                  fit: BoxFit.scaleDown,
                  child: Text(
                    '₹${product.pricePerDay.toStringAsFixed(0)} / day',
                    style: TextStyle(fontSize: Responsive.sp(16), fontWeight: FontWeight.w800, color: _accent),
                  ),
                ),
              ],
            ),
            if (product.description != null && product.description!.isNotEmpty) ...[
              SizedBox(height: Responsive.h(10)),
              Text(
                product.description!,
                style: TextStyle(fontSize: Responsive.sp(12), color: Colors.grey[700], height: 1.5),
                maxLines: 5,
                overflow: TextOverflow.ellipsis,
              ),
            ],
            SizedBox(height: Responsive.h(16)),

            // Stock Information
            _buildSectionTitle('Inventory Status'),
            _buildStockCard(),
            SizedBox(height: Responsive.h(16)),

            // Additional Details
            _buildSectionTitle('Additional Information'),
            Container(
              padding: Responsive.all(12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(Responsive.r(12)),
                boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: Responsive.r(6), offset: Offset(0, Responsive.h(2)))],
              ),
              child: Column(
                children: [
                  _buildDetailRow('Barcode', product.barcode?.isNotEmpty == true ? product.barcode! : 'N/A'),
                  Divider(height: Responsive.h(18)),
                  _buildDetailRow('Total Quantity', product.quantity.toString()),
                  Divider(height: Responsive.h(18)),
                  _buildDetailRow('Low Stock Alert', product.lowStockThreshold.toString()),
                  Divider(height: Responsive.h(18)),
                  _buildDetailRow('Track Inventory', product.trackInventory ? 'Yes' : 'No'),
                  Divider(height: Responsive.h(18)),
                  _buildDetailRow('Status', product.isActive ? 'Active' : 'Inactive'),
                ],
              ),
            ),
            SizedBox(height: Responsive.h(24)),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: Responsive.only(bottom: 8, left: 2),
      child: Text(
        title,
        style: TextStyle(fontSize: Responsive.sp(14), fontWeight: FontWeight.bold, color: _primary),
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      ),
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
                  '${product.availableQuantity} items available',
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

  Widget _buildDetailRow(String label, String value) {
    return Row(
      children: [
        // Expanded label
        Expanded(
          child: Text(
            label,
            style: TextStyle(fontSize: Responsive.sp(12), color: Colors.grey[600]),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ),
        SizedBox(width: Responsive.w(8)),
        // FittedBox value — auto-shrinks
        Flexible(
          child: FittedBox(
            fit: BoxFit.scaleDown,
            child: Text(
              value,
              style: TextStyle(fontSize: Responsive.sp(12), fontWeight: FontWeight.bold, color: _primary),
            ),
          ),
        ),
      ],
    );
  }
}
