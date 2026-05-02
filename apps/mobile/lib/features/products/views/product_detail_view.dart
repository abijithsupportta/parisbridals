import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../../core/responsive.dart';
import '../../auth/providers/auth_provider.dart';
import '../../branches/providers/branch_provider.dart';
import '../providers/product_provider.dart';
import '../models/product.dart';
import 'product_form_view.dart';

/// Product detail view — image carousel, pricing, stock, and quick actions.
class ProductDetailView extends ConsumerStatefulWidget {
  final String productId;

  const ProductDetailView({super.key, required this.productId});

  @override
  ConsumerState<ProductDetailView> createState() => _ProductDetailViewState();
}

class _ProductDetailViewState extends ConsumerState<ProductDetailView> {
  static const _primary = Color(0xFF434343);
  static const _accent = Color(0xFFF7C873);

  int _currentImageIndex = 0;
  final PageController _pageController = PageController();

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    Responsive.init(context);
    final canManage = ref.watch(canManageProvider);
    final productAsync = ref.watch(productByIdProvider(widget.productId));

    return Scaffold(
      backgroundColor: const Color(0xFFF8F8F8),
      body: productAsync.when(
        data: (product) => _buildBody(context, product, canManage),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Padding(
            padding: Responsive.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.error_outline_rounded,
                    size: Responsive.icon(48), color: Colors.red[300]),
                SizedBox(height: Responsive.h(12)),
                Text('Failed to load product',
                    style: TextStyle(
                        fontSize: Responsive.sp(16),
                        fontWeight: FontWeight.bold)),
                SizedBox(height: Responsive.h(8)),
                Text(e.toString(),
                    textAlign: TextAlign.center,
                    style: TextStyle(
                        fontSize: Responsive.sp(12),
                        color: Colors.grey[600]),
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis),
                SizedBox(height: Responsive.h(16)),
                ElevatedButton.icon(
                  onPressed: () =>
                      ref.invalidate(productByIdProvider(widget.productId)),
                  icon: const Icon(Icons.refresh_rounded),
                  label: const Text('Retry'),
                ),
              ],
            ),
          ),
        ),
      ),
      bottomNavigationBar: canManage
          ? productAsync.whenOrNull(
              data: (product) => _buildBottomActions(context, product),
            )
          : null,
    );
  }

  Widget _buildBody(BuildContext context, Product product, bool canManage) {
    return CustomScrollView(
      slivers: [
        // ── Image Carousel as SliverAppBar ──
        SliverAppBar(
          expandedHeight: Responsive.h(320),
          pinned: true,
          backgroundColor: _primary,
          leading: IconButton(
            icon: Container(
              padding: Responsive.all(6),
              decoration: BoxDecoration(
                color: Colors.black.withValues(alpha: 0.3),
                shape: BoxShape.circle,
              ),
              child:
                  Icon(Icons.arrow_back_rounded, size: Responsive.icon(22)),
            ),
            onPressed: () => Navigator.of(context).pop(),
          ),
          flexibleSpace: FlexibleSpaceBar(
            background: Stack(
              children: [
                // Image carousel
                if (product.images.isNotEmpty)
                  PageView.builder(
                    controller: _pageController,
                    onPageChanged: (i) =>
                        setState(() => _currentImageIndex = i),
                    itemCount: product.images.length,
                    itemBuilder: (context, index) {
                      final img = product.images[index];
                      return CachedNetworkImage(
                        imageUrl: img.url,
                        fit: BoxFit.cover,
                        placeholder: (context, url) => Container(
                            color: _primary.withValues(alpha: 0.1)),
                        errorWidget: (context, url, error) =>
                            _buildPlaceholderImage(),
                      );
                    },
                  )
                else
                  _buildPlaceholderImage(),

                // Dot indicators
                if (product.images.length > 1)
                  Positioned(
                    bottom: Responsive.h(12),
                    left: 0,
                    right: 0,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: List.generate(product.images.length, (i) {
                        return AnimatedContainer(
                          duration: const Duration(milliseconds: 250),
                          margin: EdgeInsets.symmetric(
                              horizontal: Responsive.w(3)),
                          width: i == _currentImageIndex
                              ? Responsive.w(20)
                              : Responsive.w(7),
                          height: Responsive.h(6),
                          decoration: BoxDecoration(
                            color: i == _currentImageIndex
                                ? Colors.white
                                : Colors.white.withValues(alpha: 0.4),
                            borderRadius:
                                BorderRadius.circular(Responsive.r(3)),
                          ),
                        );
                      }),
                    ),
                  ),

                // Status badge overlay
                Positioned(
                  top: Responsive.h(50),
                  right: Responsive.w(12),
                  child: _buildStatusBadge(product),
                ),
              ],
            ),
          ),
        ),

        // ── Content ──
        SliverToBoxAdapter(
          child: Padding(
            padding: Responsive.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Name & SKU
                Text(
                  product.name,
                  style: TextStyle(
                    fontSize: Responsive.sp(22),
                    fontWeight: FontWeight.w800,
                    color: _primary,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                if (product.sku != null && product.sku!.isNotEmpty) ...[
                  SizedBox(height: Responsive.h(4)),
                  Text(
                    'SKU: ${product.sku}',
                    style: TextStyle(
                        fontSize: Responsive.sp(12),
                        color: Colors.grey[500],
                        fontFamily: 'monospace'),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
                SizedBox(height: Responsive.h(16)),

                // ── Pricing Card ──
                _buildCard(
                  children: [
                    _buildSectionTitle('Pricing'),
                    SizedBox(height: Responsive.h(10)),
                    Row(
                      children: [
                        Expanded(
                          child: _buildPriceItem(
                              'Rent / Day',
                              '₹${product.pricePerDay.toStringAsFixed(0)}',
                              _accent),
                        ),
                        SizedBox(width: Responsive.w(12)),
                        Expanded(
                          child: _buildPriceItem(
                              'Deposit',
                              '₹${product.securityDeposit.toStringAsFixed(0)}',
                              _primary),
                        ),
                      ],
                    ),
                    if (product.minRentalDays != null ||
                        product.maxRentalDays != null) ...[
                      SizedBox(height: Responsive.h(12)),
                      Row(
                        children: [
                          if (product.minRentalDays != null)
                            Expanded(
                              child: _buildInfoChip(
                                  'Min ${product.minRentalDays} days',
                                  Icons.timer_outlined),
                            ),
                          if (product.minRentalDays != null &&
                              product.maxRentalDays != null)
                            SizedBox(width: Responsive.w(8)),
                          if (product.maxRentalDays != null)
                            Expanded(
                              child: _buildInfoChip(
                                  'Max ${product.maxRentalDays} days',
                                  Icons.timer_off_outlined),
                            ),
                        ],
                      ),
                    ],
                  ],
                ),
                SizedBox(height: Responsive.h(12)),

                // ── Stock Card ──
                _buildCard(
                  children: [
                    _buildSectionTitle('Inventory'),
                    SizedBox(height: Responsive.h(10)),
                    _buildBranchStockSection(product),
                  ],
                ),
                SizedBox(height: Responsive.h(12)),

                // ── Details Card ──
                if (product.description != null &&
                    product.description!.isNotEmpty) ...[
                  _buildCard(
                    children: [
                      _buildSectionTitle('Description'),
                      SizedBox(height: Responsive.h(8)),
                      Text(
                        product.description!,
                        style: TextStyle(
                            fontSize: Responsive.sp(13),
                            color: Colors.grey[700],
                            height: 1.5),
                      ),
                    ],
                  ),
                  SizedBox(height: Responsive.h(12)),
                ],

                // ── Jewellery Details Card ──
                if (product.material != null ||
                    product.metalPurity != null ||
                    product.metalColor != null ||
                    product.weightGrams != null ||
                    product.condition != null)
                  _buildCard(
                    children: [
                      _buildSectionTitle('Specifications'),
                      SizedBox(height: Responsive.h(10)),
                      Wrap(
                        spacing: Responsive.w(8),
                        runSpacing: Responsive.h(8),
                        children: [
                          if (product.material != null)
                            _buildSpecChip('Material', product.material!),
                          if (product.metalPurity != null)
                            _buildSpecChip('Purity', product.metalPurity!),
                          if (product.metalColor != null)
                            _buildSpecChip('Color', product.metalColor!),
                          if (product.weightGrams != null)
                            _buildSpecChip(
                                'Weight', '${product.weightGrams}g'),
                          if (product.condition != null)
                            _buildSpecChip(
                                'Condition', product.condition!),
                        ],
                      ),
                    ],
                  ),

                SizedBox(height: Responsive.h(80)),
              ],
            ),
          ),
        ),
      ],
    );
  }

  // ── Helpers ──

  Widget _buildPlaceholderImage() {
    return Container(
      color: _primary.withValues(alpha: 0.08),
      child: Center(
        child: Icon(Icons.inventory_2_outlined,
            size: Responsive.icon(64), color: Colors.grey[400]),
      ),
    );
  }

  Widget _buildStatusBadge(Product product) {
    final branchId = ref.watch(effectiveBranchIdProvider);
    final stock = _getBranchStock(product, branchId);

    Color bgColor;
    String label;
    if (!product.isActive) {
      bgColor = Colors.grey;
      label = 'Inactive';
    } else if (stock <= 0) {
      bgColor = const Color(0xFFFF6B8A);
      label = 'Out of Stock';
    } else if (stock <= product.lowStockThreshold) {
      bgColor = const Color(0xFFF5A623);
      label = 'Low Stock';
    } else {
      bgColor = const Color(0xFF2ECC71);
      label = 'Available';
    }

    return Container(
      padding: Responsive.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(Responsive.r(8)),
        boxShadow: [
          BoxShadow(
              color: bgColor.withValues(alpha: 0.4),
              blurRadius: Responsive.r(8))
        ],
      ),
      child: Text(
        label,
        style: TextStyle(
            fontSize: Responsive.sp(11),
            fontWeight: FontWeight.w700,
            color: Colors.white),
      ),
    );
  }

  Widget _buildCard({required List<Widget> children}) {
    return Container(
      width: double.infinity,
      padding: Responsive.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(Responsive.r(14)),
        boxShadow: [
          BoxShadow(
              color: Colors.black.withValues(alpha: 0.03),
              blurRadius: Responsive.r(8),
              offset: Offset(0, Responsive.h(2)))
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: children,
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Text(
      title,
      style: TextStyle(
          fontSize: Responsive.sp(14),
          fontWeight: FontWeight.w700,
          color: _primary),
    );
  }

  Widget _buildPriceItem(String label, String value, Color color) {
    return Container(
      padding: Responsive.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(Responsive.r(10)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label,
              style: TextStyle(
                  fontSize: Responsive.sp(11), color: Colors.grey[600]),
              maxLines: 1,
              overflow: TextOverflow.ellipsis),
          SizedBox(height: Responsive.h(4)),
          FittedBox(
            fit: BoxFit.scaleDown,
            child: Text(
              value,
              style: TextStyle(
                  fontSize: Responsive.sp(20),
                  fontWeight: FontWeight.w800,
                  color: color == _accent ? const Color(0xFFD4A540) : _primary),
            ),
          ),
        ],
      ),
    );
  }

  /// Get stock count for a specific branch, or total if no branch selected.
  int _getBranchStock(Product product, String? branchId) {
    if (branchId == null || product.branchInventory.isEmpty) {
      return product.availableQuantity;
    }
    final branchInv = product.branchInventory
        .where((b) => b.branchId == branchId);
    if (branchInv.isEmpty) return 0;
    return branchInv.first.stockCount;
  }

  /// Builds the branch stock section for the detail view.
  Widget _buildBranchStockSection(Product product) {
    final branchId = ref.watch(effectiveBranchIdProvider);

    if (product.branchInventory.isEmpty || branchId == null) {
      // No branch data — show total aggregated stock
      return Row(
        children: [
          Expanded(
              child: _buildStockItem('Total', '${product.totalQuantity}')),
          Expanded(
              child: _buildStockItem(
                  'Available', '${product.availableQuantity}')),
          Expanded(
              child: _buildStockItem(
                  'Reserved', '${product.reservedQuantity}')),
        ],
      );
    }

    // Show only the selected branch's stock
    final stock = _getBranchStock(product, branchId);
    final branchInv = product.branchInventory
        .where((b) => b.branchId == branchId);
    final branchName = branchInv.isNotEmpty
        ? (branchInv.first.branchName ?? 'Selected Branch')
        : 'Selected Branch';

    return Container(
      width: double.infinity,
      padding: Responsive.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: _primary.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(Responsive.r(10)),
      ),
      child: Row(
        children: [
          Icon(Icons.store_rounded,
              size: Responsive.icon(18), color: _primary),
          SizedBox(width: Responsive.w(8)),
          Expanded(
            child: Text(branchName,
                style: TextStyle(
                    fontSize: Responsive.sp(13),
                    fontWeight: FontWeight.w600,
                    color: _primary),
                maxLines: 1,
                overflow: TextOverflow.ellipsis),
          ),
          Container(
            padding: Responsive.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: stock > 0
                  ? const Color(0xFF2ECC71)
                  : const Color(0xFFFF6B8A),
              borderRadius: BorderRadius.circular(Responsive.r(6)),
            ),
            child: Text('$stock',
                style: TextStyle(
                    fontSize: Responsive.sp(14),
                    fontWeight: FontWeight.w800,
                    color: Colors.white)),
          ),
        ],
      ),
    );
  }

  Widget _buildStockItem(String label, String value) {
    return Column(
      children: [
        FittedBox(
          fit: BoxFit.scaleDown,
          child: Text(
            value,
            style: TextStyle(
                fontSize: Responsive.sp(20),
                fontWeight: FontWeight.w800,
                color: _primary),
          ),
        ),
        SizedBox(height: Responsive.h(2)),
        Text(label,
            style: TextStyle(
                fontSize: Responsive.sp(11), color: Colors.grey[500]),
            maxLines: 1,
            overflow: TextOverflow.ellipsis),
      ],
    );
  }

  Widget _buildInfoChip(String text, IconData icon) {
    return Container(
      padding: Responsive.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: _primary.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(Responsive.r(8)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: Responsive.icon(14), color: Colors.grey[600]),
          SizedBox(width: Responsive.w(4)),
          Flexible(
            child: Text(text,
                style: TextStyle(
                    fontSize: Responsive.sp(11), color: Colors.grey[700]),
                maxLines: 1,
                overflow: TextOverflow.ellipsis),
          ),
        ],
      ),
    );
  }

  Widget _buildSpecChip(String label, String value) {
    return Container(
      padding: Responsive.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: _primary.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(Responsive.r(8)),
        border: Border.all(color: _primary.withValues(alpha: 0.1)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label,
              style: TextStyle(
                  fontSize: Responsive.sp(9),
                  color: Colors.grey[500],
                  fontWeight: FontWeight.w600),
              maxLines: 1,
              overflow: TextOverflow.ellipsis),
          SizedBox(height: Responsive.h(2)),
          Text(value,
              style: TextStyle(
                  fontSize: Responsive.sp(12),
                  fontWeight: FontWeight.w700,
                  color: _primary),
              maxLines: 1,
              overflow: TextOverflow.ellipsis),
        ],
      ),
    );
  }

  // ── Bottom Actions ──

  Widget _buildBottomActions(BuildContext context, Product product) {
    return Container(
      padding: Responsive.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
              color: Colors.black.withValues(alpha: 0.06),
              blurRadius: Responsive.r(10),
              offset: Offset(0, -Responsive.h(2)))
        ],
      ),
      child: SafeArea(
        child: Row(
          children: [
            // Delete button
            Expanded(
              child: OutlinedButton.icon(
                onPressed: () => _confirmDelete(context, product),
                icon: Icon(Icons.delete_outline_rounded,
                    size: Responsive.icon(20)),
                label: Text('Delete',
                    style: TextStyle(fontSize: Responsive.sp(14))),
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.red[400],
                  side: BorderSide(color: Colors.red[300]!),
                  padding: Responsive.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                      borderRadius:
                          BorderRadius.circular(Responsive.r(12))),
                ),
              ),
            ),
            SizedBox(width: Responsive.w(12)),
            // Edit button
            Expanded(
              flex: 2,
              child: ElevatedButton.icon(
                onPressed: () {
                  Navigator.of(context)
                      .push(MaterialPageRoute(
                        builder: (_) =>
                            ProductFormView(productId: product.id),
                      ))
                      .then((_) => ref.invalidate(
                          productByIdProvider(widget.productId)));
                },
                icon: Icon(Icons.edit_outlined,
                    size: Responsive.icon(20)),
                label: Text('Edit Product',
                    style: TextStyle(fontSize: Responsive.sp(14))),
                style: ElevatedButton.styleFrom(
                  backgroundColor: _primary,
                  foregroundColor: Colors.white,
                  padding: Responsive.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                      borderRadius:
                          BorderRadius.circular(Responsive.r(12))),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _confirmDelete(BuildContext context, Product product) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(Responsive.r(16))),
        title: Text('Delete Product?',
            style: TextStyle(
                fontSize: Responsive.sp(18), fontWeight: FontWeight.bold)),
        content: Text(
          'Are you sure you want to delete "${product.name}"? This action cannot be undone.',
          style: TextStyle(fontSize: Responsive.sp(14)),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: ElevatedButton.styleFrom(
                backgroundColor: Colors.red[400],
                foregroundColor: Colors.white),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      if (!mounted) return;
      final messenger = ScaffoldMessenger.of(context);
      final navigator = Navigator.of(context);
      try {
        await ref
            .read(productsProvider.notifier)
            .deleteProduct(product.id);
        if (mounted) {
          if (mounted) {
            messenger.showSnackBar(
              SnackBar(
                content: Text('${product.name} deleted'),
                backgroundColor: const Color(0xFF2ECC71),
              ),
            );
          }
          if (mounted) {
            navigator.pop();
          }
        }
      } catch (e) {
        if (mounted) {
          if (!mounted) return;
          final messenger = ScaffoldMessenger.of(context);
          messenger.showSnackBar(
            SnackBar(
              content: Text(e.toString().replaceFirst('Exception: ', '')),
              backgroundColor: Colors.red[400],
              duration: const Duration(seconds: 4),
            ),
          );
        }
      }
    }
  }
}
