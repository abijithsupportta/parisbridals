import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
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
    // Debounce can be added here if needed, or trigger immediately
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
                    padding: Responsive.only(left: 16, right: 16, top: 8, bottom: 80),
                    itemCount: products.length + (paginatedData.page < paginatedData.totalPages ? 1 : 0),
                    separatorBuilder: (_, __) => SizedBox(height: Responsive.h(12)),
                    itemBuilder: (context, index) {
                      if (index == products.length) {
                        return const Center(
                          child: Padding(
                            padding: EdgeInsets.all(16.0),
                            child: CircularProgressIndicator(color: _primary),
                          ),
                        );
                      }
                      return _buildProductCard(products[index], canManage);
                    },
                  ),
                );
              },
              loading: () => const Center(child: CircularProgressIndicator(color: _primary)),
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
              backgroundColor: const Color(0xFFF7C873), // Golden Accent
              icon: Icon(Icons.add_rounded, size: Responsive.icon(24), color: const Color(0xFF434343)),
              label: Text(
                'New Product',
                style: TextStyle(fontSize: Responsive.sp(14), fontWeight: FontWeight.bold, color: const Color(0xFF434343)),
              ),
              elevation: 4,
            )
          : null,
    );
  }

  Widget _buildSearchBar() {
    return Container(
      color: Colors.white,
      padding: Responsive.only(left: 16, right: 16, top: 16, bottom: 16),
      child: Container(
        decoration: BoxDecoration(
          color: const Color(0xFFFAEBCD),
          borderRadius: BorderRadius.circular(Responsive.r(16)),
          border: Border.all(color: Colors.grey.withValues(alpha: 0.15)),
        ),
        child: TextField(
          controller: _searchController,
          onSubmitted: _onSearchChanged,
          textInputAction: TextInputAction.search,
          style: TextStyle(fontSize: Responsive.sp(16)),
          decoration: InputDecoration(
            hintText: 'Search products or SKU... (Press Enter)',
            hintStyle: TextStyle(fontSize: Responsive.sp(16), color: Colors.grey[500]),
            prefixIcon: Icon(Icons.search_rounded, size: Responsive.icon(24), color: _primary),
            suffixIcon: _searchController.text.isNotEmpty
                ? IconButton(
                    icon: Icon(Icons.close_rounded, size: Responsive.icon(22), color: Colors.grey[500]),
                    onPressed: () {
                      _searchController.clear();
                      _onSearchChanged('');
                    },
                  )
                : null,
            border: InputBorder.none,
            contentPadding: Responsive.symmetric(vertical: 16),
          ),
        ),
      ),
    );
  }

  Widget _buildProductCard(Product product, bool canManage) {
    // Determine Stock Status
    Color stockColor;
    String stockText;
    if (product.availableQuantity <= 0) {
      stockColor = const Color(0xFFFF6B8A); // Red
      stockText = 'Out of Stock';
    } else if (product.availableQuantity <= product.lowStockThreshold) {
      stockColor = const Color(0xFFF5A623); // Orange
      stockText = 'Low Stock (${product.availableQuantity})';
    } else {
      stockColor = const Color(0xFF2ECC71); // Green
      stockText = 'In Stock (${product.availableQuantity})';
    }

    final imageUrl = product.images.isNotEmpty ? product.images.first.url : null;

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(Responsive.r(16)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: Responsive.r(10),
            offset: Offset(0, Responsive.h(4)),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(Responsive.r(16)),
        child: InkWell(
          borderRadius: BorderRadius.circular(Responsive.r(16)),
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
            padding: Responsive.all(12),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Thumbnail
                Container(
                  width: Responsive.w(100),
                  height: Responsive.w(100),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFAEBCD),
                    borderRadius: BorderRadius.circular(Responsive.r(16)),
                  ),
                  child: imageUrl != null && imageUrl.isNotEmpty && imageUrl.startsWith('http')
                      ? ClipRRect(
                          borderRadius: BorderRadius.circular(Responsive.r(16)),
                          child: Image.network(
                            imageUrl,
                            fit: BoxFit.cover,
                            loadingBuilder: (context, child, loadingProgress) {
                              if (loadingProgress == null) return child;
                              return Shimmer.fromColors(
                                baseColor: Colors.grey[200]!,
                                highlightColor: Colors.grey[100]!,
                                child: Container(
                                  color: Colors.white,
                                  width: Responsive.w(100),
                                  height: Responsive.w(100),
                                ),
                              );
                            },
                            errorBuilder: (_, __, ___) => _buildFallbackImage(),
                          ),
                        )
                      : _buildFallbackImage(),
                ),
                SizedBox(width: Responsive.w(18)),
                
                // Details
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: Text(
                              product.name,
                              style: TextStyle(
                                fontSize: Responsive.sp(16),
                                fontWeight: FontWeight.bold,
                                color: _primary,
                              ),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          if (!product.isActive)
                            Container(
                              padding: Responsive.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: Colors.grey[200],
                                borderRadius: BorderRadius.circular(Responsive.r(6)),
                              ),
                              child: Text(
                                'Inactive',
                                style: TextStyle(fontSize: Responsive.sp(11), fontWeight: FontWeight.bold, color: Colors.grey[600]),
                              ),
                            ),
                        ],
                      ),
                      SizedBox(height: Responsive.h(6)),
                      if (product.sku != null && product.sku!.isNotEmpty) ...[
                        Text(
                          'SKU: ${product.sku}',
                          style: TextStyle(fontSize: Responsive.sp(12), color: Colors.grey[600], fontFamily: 'monospace', fontWeight: FontWeight.w600),
                        ),
                        SizedBox(height: Responsive.h(12)),
                      ] else ...[
                        SizedBox(height: Responsive.h(12)),
                      ],
                      
                      // Bottom Row: Price & Stock
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            '₹${product.pricePerDay.toStringAsFixed(0)} / day',
                            style: TextStyle(
                              fontSize: Responsive.sp(16),
                              fontWeight: FontWeight.w800,
                              color: const Color(0xFFF7C873), // Golden
                            ),
                          ),
                          Container(
                            padding: Responsive.symmetric(horizontal: 10, vertical: 6),
                            decoration: BoxDecoration(
                              color: stockColor.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(Responsive.r(20)),
                              border: Border.all(color: stockColor.withValues(alpha: 0.2)),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Container(
                                  width: Responsive.w(8),
                                  height: Responsive.w(8),
                                  decoration: BoxDecoration(shape: BoxShape.circle, color: stockColor),
                                ),
                                SizedBox(width: Responsive.w(6)),
                                Text(
                                  stockText,
                                  style: TextStyle(
                                    fontSize: Responsive.sp(12),
                                    fontWeight: FontWeight.w800,
                                    color: stockColor,
                                  ),
                                ),
                              ],
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
      child: Icon(Icons.inventory_2_rounded, size: Responsive.icon(28), color: Colors.grey[400]),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: Responsive.all(24),
            decoration: BoxDecoration(
              color: _primary.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(Icons.inventory_2_outlined, size: Responsive.icon(48), color: _primary),
          ),
          SizedBox(height: Responsive.h(24)),
          Text(
            _searchQuery.isEmpty ? 'No Products Found' : 'No matches found',
            style: TextStyle(fontSize: Responsive.sp(18), fontWeight: FontWeight.bold, color: Colors.black87),
          ),
          SizedBox(height: Responsive.h(8)),
          Text(
            _searchQuery.isEmpty 
              ? 'Add your first product to start renting'
              : 'Try a different search term or SKU',
            style: TextStyle(fontSize: Responsive.sp(14), color: Colors.grey[500]),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorState(String error) {
    return Center(
      child: Padding(
        padding: Responsive.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline_rounded, color: const Color(0xFFFF6B8A), size: Responsive.icon(48)),
            SizedBox(height: Responsive.h(16)),
            Text(
              'Failed to Load Products',
              style: TextStyle(fontSize: Responsive.sp(18), fontWeight: FontWeight.bold),
            ),
            SizedBox(height: Responsive.h(8)),
            Text(
              error,
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: Responsive.sp(13), color: Colors.grey[600]),
            ),
            SizedBox(height: Responsive.h(24)),
            ElevatedButton.icon(
              onPressed: () => ref.refresh(productsProvider),
              icon: Icon(Icons.refresh_rounded, size: Responsive.icon(18)),
              label: const Text('Retry'),
              style: ElevatedButton.styleFrom(
                backgroundColor: _primary,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(Responsive.r(12))),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
