import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:shimmer/shimmer.dart';
import '../../../core/responsive.dart';
import '../../auth/providers/auth_provider.dart';
import '../providers/product_provider.dart';
import '../models/product.dart';
import 'product_form_view.dart';
import 'product_detail_view.dart';

class ProductsView extends ConsumerStatefulWidget {
  const ProductsView({super.key});

  @override
  ConsumerState<ProductsView> createState() => _ProductsViewState();
}

class _ProductsViewState extends ConsumerState<ProductsView> {
  final TextEditingController _searchController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  String _searchQuery = '';

  static const _primary = Color(0xFF434343);
  static const _accent  = Color(0xFFF7C873);

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _searchController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >= _scrollController.position.maxScrollExtent - 200) {
      ref.read(productsProvider.notifier).loadMore();
    }
  }

  void _onSearchChanged(String val) {
    setState(() => _searchQuery = val);
    ref.read(productsProvider.notifier).search(val);
  }

  @override
  Widget build(BuildContext context) {
    Responsive.init(context);
    final canManage = ref.watch(canManageProvider);
    final productsAsyncValue = ref.watch(productsProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF8F8F8),
      body: Column(
        children: [
          _buildSearchBar(),
          Expanded(
            child: productsAsyncValue.when(
              data: (paginatedData) {
                final products = paginatedData.products;

                if (products.isEmpty) {
                  return _buildEmptyState();
                }

                return RefreshIndicator(
                  color: _primary,
                  onRefresh: () async => ref.refresh(productsProvider),
                  child: ListView.separated(
                    controller: _scrollController,
                    padding: Responsive.only(left: 12, right: 12, top: 6, bottom: 70),
                    itemCount: products.length + (paginatedData.page < paginatedData.totalPages ? 1 : 0),
                    separatorBuilder: (_, __) => SizedBox(height: Responsive.h(8)),
                    itemBuilder: (context, index) {
                      if (index == products.length) {
                        return _buildShimmerCard();
                      }
                      return _buildProductCard(products[index], canManage);
                    },
                  ),
                );
              },
              loading: () => _buildShimmerList(),
              error: (error, stack) => _buildErrorState(error.toString()),
            ),
          ),
        ],
      ),
      floatingActionButton: canManage
          ? FloatingActionButton.extended(
              onPressed: () {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const ProductFormView()),
                );
              },
              backgroundColor: _accent,
              icon: Icon(Icons.add_rounded, size: Responsive.icon(20), color: _primary),
              label: Text(
                'New Product',
                style: TextStyle(fontSize: Responsive.sp(12), fontWeight: FontWeight.bold, color: _primary),
              ),
              elevation: 3,
            )
          : null,
    );
  }

  Widget _buildSearchBar() {
    return Container(
      color: Colors.white,
      padding: Responsive.all(12),
      child: Container(
        decoration: BoxDecoration(
          color: const Color(0xFFF5F5F7),
          borderRadius: BorderRadius.circular(Responsive.r(12)),
          border: Border.all(color: Colors.grey.withValues(alpha: 0.15)),
        ),
        child: TextField(
          controller: _searchController,
          onSubmitted: _onSearchChanged,
          textInputAction: TextInputAction.search,
          style: TextStyle(fontSize: Responsive.sp(13)),
          decoration: InputDecoration(
            hintText: 'Search products or SKU...',
            hintStyle: TextStyle(fontSize: Responsive.sp(12), color: Colors.grey[500]),
            prefixIcon: Icon(Icons.search_rounded, size: Responsive.icon(20), color: _primary),
            suffixIcon: _searchController.text.isNotEmpty
                ? IconButton(
                    icon: Icon(Icons.close_rounded, size: Responsive.icon(18), color: Colors.grey[500]),
                    onPressed: () {
                      _searchController.clear();
                      _onSearchChanged('');
                    },
                  )
                : null,
            border: InputBorder.none,
            contentPadding: Responsive.symmetric(vertical: 12),
          ),
        ),
      ),
    );
  }

  Widget _buildProductCard(Product product, bool canManage) {
    Color stockColor;
    String stockText;
    if (product.availableQuantity <= 0) {
      stockColor = const Color(0xFFFF6B8A);
      stockText = 'Out';
    } else if (product.availableQuantity <= product.lowStockThreshold) {
      stockColor = const Color(0xFFF5A623);
      stockText = 'Low (${product.availableQuantity})';
    } else {
      stockColor = const Color(0xFF2ECC71);
      stockText = 'In Stock (${product.availableQuantity})';
    }

    final imageUrl = product.images.isNotEmpty ? product.images.first.url : null;

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(Responsive.r(12)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: Responsive.r(6),
            offset: Offset(0, Responsive.h(2)),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(Responsive.r(12)),
        child: InkWell(
          borderRadius: BorderRadius.circular(Responsive.r(12)),
          onTap: () {
            if (canManage) {
              Navigator.of(context).push(MaterialPageRoute(
                builder: (_) => ProductFormView(product: product),
              ));
            } else {
              Navigator.of(context).push(MaterialPageRoute(
                builder: (_) => ProductDetailView(product: product),
              ));
            }
          },
          child: Padding(
            padding: Responsive.all(10),
            child: Row(
              children: [
                // Thumbnail — fixed but responsive size
                Container(
                  width: Responsive.w(68),
                  height: Responsive.w(68),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFAEBCD),
                    borderRadius: BorderRadius.circular(Responsive.r(10)),
                  ),
                  child: imageUrl != null && imageUrl.isNotEmpty && imageUrl.startsWith('http')
                      ? ClipRRect(
                          borderRadius: BorderRadius.circular(Responsive.r(10)),
                          child: CachedNetworkImage(
                            imageUrl: imageUrl,
                            fit: BoxFit.cover,
                            width: Responsive.w(68),
                            height: Responsive.w(68),
                            placeholder: (context, url) => Shimmer.fromColors(
                              baseColor: const Color(0xFFE8E8E8),
                              highlightColor: const Color(0xFFF5F5F5),
                              child: Container(color: Colors.white),
                            ),
                            errorWidget: (_, __, ___) => _buildFallbackImage(),
                          ),
                        )
                      : _buildFallbackImage(),
                ),
                SizedBox(width: Responsive.w(10)),
                
                // Details — Expanded: takes ALL remaining space
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Row 1: Name + inactive badge
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              product.name,
                              style: TextStyle(
                                fontSize: Responsive.sp(14),
                                fontWeight: FontWeight.w600,
                                color: _primary,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          if (!product.isActive)
                            Container(
                              margin: Responsive.only(left: 4),
                              padding: Responsive.symmetric(horizontal: 4, vertical: 2),
                              decoration: BoxDecoration(
                                color: Colors.grey[200],
                                borderRadius: BorderRadius.circular(Responsive.r(4)),
                              ),
                              child: Text(
                                'Off',
                                style: TextStyle(fontSize: Responsive.sp(9), fontWeight: FontWeight.bold, color: Colors.grey[600]),
                              ),
                            ),
                        ],
                      ),
                      // Row 2: SKU
                      if (product.sku != null && product.sku!.isNotEmpty) ...[
                        SizedBox(height: Responsive.h(3)),
                        Text(
                          'SKU: ${product.sku}',
                          style: TextStyle(fontSize: Responsive.sp(10), color: Colors.grey[500], fontFamily: 'monospace'),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                      SizedBox(height: Responsive.h(6)),
                      // Row 3: Price & Stock — both can shrink
                      Row(
                        children: [
                          // FittedBox: price auto-shrinks if needed
                          Expanded(
                            child: FittedBox(
                              fit: BoxFit.scaleDown,
                              alignment: Alignment.centerLeft,
                              child: Text(
                                '₹${product.pricePerDay.toStringAsFixed(0)}/day',
                                style: TextStyle(
                                  fontSize: Responsive.sp(14),
                                  fontWeight: FontWeight.w800,
                                  color: _accent,
                                ),
                              ),
                            ),
                          ),
                          SizedBox(width: Responsive.w(6)),
                          // Stock badge — Flexible so it shrinks
                          Flexible(
                            child: Container(
                              padding: Responsive.symmetric(horizontal: 6, vertical: 3),
                              decoration: BoxDecoration(
                                color: stockColor.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(Responsive.r(12)),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Container(
                                    width: Responsive.w(5),
                                    height: Responsive.w(5),
                                    decoration: BoxDecoration(shape: BoxShape.circle, color: stockColor),
                                  ),
                                  SizedBox(width: Responsive.w(3)),
                                  Flexible(
                                    child: Text(
                                      stockText,
                                      style: TextStyle(
                                        fontSize: Responsive.sp(10),
                                        fontWeight: FontWeight.w700,
                                        color: stockColor,
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildFallbackImage() {
    return Center(
      child: Icon(Icons.inventory_2_rounded, size: Responsive.icon(24), color: Colors.grey[400]),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: Responsive.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: Responsive.all(18),
              decoration: BoxDecoration(
                color: _primary.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(Icons.inventory_2_outlined, size: Responsive.icon(36), color: _primary),
            ),
            SizedBox(height: Responsive.h(16)),
            Text(
              _searchQuery.isEmpty ? 'No Products Found' : 'No matches found',
              style: TextStyle(fontSize: Responsive.sp(15), fontWeight: FontWeight.bold, color: Colors.black87),
            ),
            SizedBox(height: Responsive.h(6)),
            Text(
              _searchQuery.isEmpty 
                ? 'Add your first product to start renting'
                : 'Try a different search term or SKU',
              style: TextStyle(fontSize: Responsive.sp(12), color: Colors.grey[500]),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildErrorState(String error) {
    return Center(
      child: Padding(
        padding: Responsive.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline_rounded, color: const Color(0xFFFF6B8A), size: Responsive.icon(36)),
            SizedBox(height: Responsive.h(12)),
            Text(
              'Failed to Load Products',
              style: TextStyle(fontSize: Responsive.sp(15), fontWeight: FontWeight.bold),
            ),
            SizedBox(height: Responsive.h(6)),
            Text(
              error,
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: Responsive.sp(12), color: Colors.grey[600]),
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
            ),
            SizedBox(height: Responsive.h(16)),
            ElevatedButton.icon(
              onPressed: () => ref.refresh(productsProvider),
              icon: Icon(Icons.refresh_rounded, size: Responsive.icon(18)),
              label: const Text('Retry'),
              style: ElevatedButton.styleFrom(
                backgroundColor: _primary,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(Responsive.r(10))),
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Full-page shimmer skeleton shown during initial load
  Widget _buildShimmerList() {
    return ListView.separated(
      padding: Responsive.only(left: 12, right: 12, top: 6, bottom: 70),
      itemCount: 6,
      separatorBuilder: (_, __) => SizedBox(height: Responsive.h(8)),
      itemBuilder: (_, __) => _buildShimmerCard(),
    );
  }

  /// Single shimmer card skeleton matching the product card layout
  Widget _buildShimmerCard() {
    return Shimmer.fromColors(
      baseColor: const Color(0xFFE8E8E8),
      highlightColor: const Color(0xFFF5F5F5),
      child: Container(
        padding: Responsive.all(10),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(Responsive.r(12)),
        ),
        child: Row(
          children: [
            Container(
              width: Responsive.w(68),
              height: Responsive.w(68),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(Responsive.r(10)),
              ),
            ),
            SizedBox(width: Responsive.w(10)),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    height: Responsive.h(12),
                    width: double.infinity,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(Responsive.r(4)),
                    ),
                  ),
                  SizedBox(height: Responsive.h(6)),
                  Container(
                    height: Responsive.h(8),
                    width: Responsive.w(80),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(Responsive.r(4)),
                    ),
                  ),
                  SizedBox(height: Responsive.h(10)),
                  Row(
                    children: [
                      Expanded(
                        child: Container(
                          height: Responsive.h(10),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(Responsive.r(4)),
                          ),
                        ),
                      ),
                      SizedBox(width: Responsive.w(10)),
                      Container(
                        height: Responsive.h(16),
                        width: Responsive.w(60),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(Responsive.r(12)),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
