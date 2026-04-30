import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:shimmer/shimmer.dart';
import '../../../core/responsive.dart';
import '../../auth/providers/auth_provider.dart';
import '../../branches/providers/branch_provider.dart';
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
  static const _accent = Color(0xFFF7C873);
  static const _bg = Color(0xFFF8F8F8);

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
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 200) {
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
    final productsAsync = ref.watch(productsProvider);
    final filteredAsync = ref.watch(filteredProductsProvider);
    final currentFilter = ref.watch(productStatusFilterProvider);
    final selectedBranchId = ref.watch(effectiveBranchIdProvider);

    return Container(
      color: _bg,
      child: Stack(
        children: [
          productsAsync.when(
            data: (paginatedData) {
              final products = filteredAsync.value ?? paginatedData.products;
              return _buildContent(
                context,
                products,
                paginatedData.total,
                paginatedData.products,
                currentFilter,
                canManage,
                selectedBranchId,
              );
            },
            loading: () => _buildShimmerList(),
            error: (error, stack) => _buildErrorState(error.toString()),
          ),
          if (canManage)
            Positioned(
              right: Responsive.w(16),
              bottom: Responsive.h(16),
              child: FloatingActionButton.extended(
                onPressed: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                        builder: (_) => const ProductFormView()),
                  );
                },
                backgroundColor: _accent,
                foregroundColor: _primary,
                icon: Icon(Icons.add_rounded, size: Responsive.icon(24)),
                label: Text(
                  'Add Product',
                  style: TextStyle(
                      fontSize: Responsive.sp(14),
                      fontWeight: FontWeight.bold),
                ),
                elevation: 3,
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildContent(
    BuildContext context,
    List<Product> products,
    int totalProducts,
    List<Product> allProducts,
    ProductStatusFilter currentFilter,
    bool canManage,
    String? branchId,
  ) {
    if (allProducts.isEmpty && _searchQuery.isEmpty) {
      return _buildEmptyState();
    }

    // Compute counts for filter badges using branch-specific stock
    final availableCount =
        allProducts.where((p) => _getStock(p, branchId) > 0).length;
    final lowStockCount = allProducts
        .where((p) =>
            _getStock(p, branchId) > 0 &&
            _getStock(p, branchId) <= p.lowStockThreshold)
        .length;
    final outOfStockCount =
        allProducts.where((p) => _getStock(p, branchId) <= 0).length;

    return Column(
      children: [
        _buildSearchBar(),

        // Filter chips
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: Responsive.symmetric(horizontal: 16, vertical: 4),
          child: Row(
            children: [
              _buildFilterChip('All', allProducts.length,
                  ProductStatusFilter.all, currentFilter),
              SizedBox(width: Responsive.w(8)),
              _buildFilterChip('Available', availableCount,
                  ProductStatusFilter.available, currentFilter),
              SizedBox(width: Responsive.w(8)),
              _buildFilterChip('Low Stock', lowStockCount,
                  ProductStatusFilter.lowStock, currentFilter),
              SizedBox(width: Responsive.w(8)),
              _buildFilterChip('Out of Stock', outOfStockCount,
                  ProductStatusFilter.outOfStock, currentFilter),
            ],
          ),
        ),
        SizedBox(height: Responsive.h(6)),

        if (products.isEmpty && _searchQuery.isNotEmpty)
          Expanded(
            child: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.search_off_rounded,
                      size: Responsive.icon(48), color: Colors.grey[300]),
                  SizedBox(height: Responsive.h(12)),
                  Text('No results for "$_searchQuery"',
                      style: TextStyle(
                          fontSize: Responsive.sp(14), color: Colors.grey)),
                ],
              ),
            ),
          )
        else if (products.isEmpty)
          Expanded(
            child: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.filter_list_off_rounded,
                      size: Responsive.icon(48), color: Colors.grey[300]),
                  SizedBox(height: Responsive.h(12)),
                  Text('No products in this filter',
                      style: TextStyle(
                          fontSize: Responsive.sp(14), color: Colors.grey)),
                ],
              ),
            ),
          )
        else
          Expanded(
            child: RefreshIndicator(
              color: _primary,
              onRefresh: () async => ref.invalidate(productsProvider),
              child: ListView.separated(
                controller: _scrollController,
                padding: Responsive.only(
                    left: 16, right: 16, top: 6, bottom: 80),
                itemCount: products.length +
                    (products.length < totalProducts ? 1 : 0),
                separatorBuilder: (context, index) =>
                    SizedBox(height: Responsive.h(12)),
                itemBuilder: (context, index) {
                  if (index == products.length) {
                    return _buildShimmerCard();
                  }
                  return _buildProductCard(products[index], canManage);
                },
              ),
            ),
          ),
      ],
    );
  }

  // ── Filter Chip ──
  Widget _buildFilterChip(
    String label,
    int count,
    ProductStatusFilter filter,
    ProductStatusFilter current,
  ) {
    final isActive = filter == current;
    return GestureDetector(
      onTap: () =>
          ref.read(productStatusFilterProvider.notifier).set(filter),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: Responsive.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isActive ? _primary : Colors.white,
          borderRadius: BorderRadius.circular(Responsive.r(20)),
          border:
              Border.all(color: isActive ? _primary : Colors.grey.shade300),
          boxShadow: isActive
              ? [
                  BoxShadow(
                    color: _primary.withValues(alpha: 0.15),
                    blurRadius: Responsive.r(8),
                    offset: Offset(0, Responsive.h(2)),
                  )
                ]
              : [],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              label,
              style: TextStyle(
                fontSize: Responsive.sp(12),
                fontWeight: FontWeight.w600,
                color: isActive ? Colors.white : _primary,
              ),
            ),
            SizedBox(width: Responsive.w(4)),
            Container(
              padding: Responsive.symmetric(horizontal: 6, vertical: 1),
              decoration: BoxDecoration(
                color: isActive
                    ? Colors.white.withValues(alpha: 0.25)
                    : _primary.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(Responsive.r(10)),
              ),
              child: Text(
                '$count',
                style: TextStyle(
                  fontSize: Responsive.sp(10),
                  fontWeight: FontWeight.w700,
                  color: isActive ? Colors.white : _primary,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSearchBar() {
    return Padding(
      padding: Responsive.only(left: 16, right: 16, top: 12, bottom: 6),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(Responsive.r(14)),
          boxShadow: [
            BoxShadow(
                color: Colors.black.withValues(alpha: 0.05),
                blurRadius: Responsive.r(12),
                offset: Offset(0, Responsive.h(2)))
          ],
        ),
        child: TextField(
          controller: _searchController,
          onSubmitted: _onSearchChanged,
          textInputAction: TextInputAction.search,
          style: TextStyle(fontSize: Responsive.sp(15)),
          decoration: InputDecoration(
            hintText: 'Search products or SKU...',
            hintStyle: TextStyle(
                fontSize: Responsive.sp(15), color: Colors.grey[400]),
            prefixIcon: Icon(Icons.search_rounded,
                size: Responsive.icon(24), color: _primary),
            suffixIcon: _searchController.text.isNotEmpty
                ? IconButton(
                    icon: Icon(Icons.close_rounded,
                        size: Responsive.icon(22), color: Colors.grey),
                    onPressed: () {
                      _searchController.clear();
                      _onSearchChanged('');
                    },
                  )
                : null,
            border: InputBorder.none,
            enabledBorder: InputBorder.none,
            focusedBorder: InputBorder.none,
            contentPadding:
                Responsive.symmetric(horizontal: 18, vertical: 16),
          ),
        ),
      ),
    );
  }

  /// Get stock count for the selected branch, or total if no branch selected.
  int _getStock(Product product, String? branchId) {
    if (branchId == null || product.branchInventory.isEmpty) {
      return product.availableQuantity;
    }
    final branchInv = product.branchInventory
        .where((b) => b.branchId == branchId);
    if (branchInv.isEmpty) return 0;
    return branchInv.first.stockCount;
  }

  Widget _buildProductCard(Product product, bool canManage) {
    final branchId = ref.watch(effectiveBranchIdProvider);
    final stock = _getStock(product, branchId);

    Color stockColor;
    String stockText;
    if (stock <= 0) {
      stockColor = const Color(0xFFFF6B8A);
      stockText = 'Out';
    } else if (stock <= product.lowStockThreshold) {
      stockColor = const Color(0xFFF5A623);
      stockText = 'Low ($stock)';
    } else {
      stockColor = const Color(0xFF2ECC71);
      stockText = 'In Stock ($stock)';
    }

    final imageUrl = product.primaryImageUrl;

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(Responsive.r(14)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: Responsive.r(8),
            offset: Offset(0, Responsive.h(2)),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(Responsive.r(14)),
        child: InkWell(
          borderRadius: BorderRadius.circular(Responsive.r(14)),
          onTap: () {
            Navigator.of(context)
                .push(MaterialPageRoute(
                  builder: (_) => ProductDetailView(productId: product.id),
                ))
                .then((_) => ref.invalidate(productsProvider));
          },
          child: Padding(
            padding: Responsive.all(10),
            child: Row(
              children: [
                // Thumbnail
                Container(
                  width: Responsive.w(68),
                  height: Responsive.w(68),
                  decoration: BoxDecoration(
                    color: _primary.withValues(alpha: 0.06),
                    borderRadius:
                        BorderRadius.circular(Responsive.r(10)),
                  ),
                  child: imageUrl != null &&
                          imageUrl.isNotEmpty &&
                          imageUrl.startsWith('http')
                      ? ClipRRect(
                          borderRadius:
                              BorderRadius.circular(Responsive.r(10)),
                          child: CachedNetworkImage(
                            imageUrl: imageUrl,
                            fit: BoxFit.cover,
                            width: Responsive.w(68),
                            height: Responsive.w(68),
                            placeholder: (context, url) =>
                                Shimmer.fromColors(
                              baseColor: const Color(0xFFE8E8E8),
                              highlightColor: const Color(0xFFF5F5F5),
                              child: Container(color: Colors.white),
                            ),
                            errorWidget: (context, url, error) =>
                                _buildFallbackImage(),
                          ),
                        )
                      : _buildFallbackImage(),
                ),
                SizedBox(width: Responsive.w(10)),

                // Details
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
                              padding: Responsive.symmetric(
                                  horizontal: 4, vertical: 2),
                              decoration: BoxDecoration(
                                color: Colors.grey[200],
                                borderRadius:
                                    BorderRadius.circular(Responsive.r(4)),
                              ),
                              child: Text(
                                'Off',
                                style: TextStyle(
                                    fontSize: Responsive.sp(9),
                                    fontWeight: FontWeight.bold,
                                    color: Colors.grey[600]),
                              ),
                            ),
                        ],
                      ),
                      // Row 2: SKU
                      if (product.sku != null &&
                          product.sku!.isNotEmpty) ...[
                        SizedBox(height: Responsive.h(3)),
                        Text(
                          'SKU: ${product.sku}',
                          style: TextStyle(
                              fontSize: Responsive.sp(10),
                              color: Colors.grey[500],
                              fontFamily: 'monospace'),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                      SizedBox(height: Responsive.h(6)),
                      // Row 3: Price & Stock
                      Row(
                        children: [
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
                          Flexible(
                            child: Container(
                              padding: Responsive.symmetric(
                                  horizontal: 6, vertical: 3),
                              decoration: BoxDecoration(
                                color: stockColor.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(
                                    Responsive.r(12)),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Container(
                                    width: Responsive.w(5),
                                    height: Responsive.w(5),
                                    decoration: BoxDecoration(
                                        shape: BoxShape.circle,
                                        color: stockColor),
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
      child: Icon(Icons.inventory_2_rounded,
          size: Responsive.icon(24), color: Colors.grey[400]),
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
              child: Icon(Icons.inventory_2_outlined,
                  size: Responsive.icon(36), color: _primary),
            ),
            SizedBox(height: Responsive.h(16)),
            Text(
              'No Products Found',
              style: TextStyle(
                  fontSize: Responsive.sp(15),
                  fontWeight: FontWeight.bold,
                  color: Colors.black87),
            ),
            SizedBox(height: Responsive.h(6)),
            Text(
              'Add your first product to start renting',
              style: TextStyle(
                  fontSize: Responsive.sp(12), color: Colors.grey[500]),
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
            Icon(Icons.error_outline_rounded,
                color: const Color(0xFFFF6B8A),
                size: Responsive.icon(36)),
            SizedBox(height: Responsive.h(12)),
            Text(
              'Failed to Load Products',
              style: TextStyle(
                  fontSize: Responsive.sp(15), fontWeight: FontWeight.bold),
            ),
            SizedBox(height: Responsive.h(6)),
            Text(
              error,
              textAlign: TextAlign.center,
              style: TextStyle(
                  fontSize: Responsive.sp(12), color: Colors.grey[600]),
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
            ),
            SizedBox(height: Responsive.h(16)),
            ElevatedButton.icon(
              onPressed: () => ref.invalidate(productsProvider),
              icon: Icon(Icons.refresh_rounded,
                  size: Responsive.icon(18)),
              label: const Text('Retry'),
              style: ElevatedButton.styleFrom(
                backgroundColor: _primary,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                    borderRadius:
                        BorderRadius.circular(Responsive.r(10))),
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
      padding: Responsive.only(left: 12, right: 12, top: 120, bottom: 70),
      itemCount: 6,
      separatorBuilder: (context, index) =>
          SizedBox(height: Responsive.h(8)),
      itemBuilder: (context, index) => _buildShimmerCard(),
    );
  }

  /// Single shimmer card skeleton matching the product card layout
  Widget _buildShimmerCard() {
    return Container(
      padding: Responsive.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(Responsive.r(14)),
        boxShadow: [
          BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: Responsive.r(8),
              offset: Offset(0, Responsive.h(2)))
        ],
      ),
      child: Shimmer.fromColors(
        baseColor: Colors.grey[300]!,
        highlightColor: Colors.grey[100]!,
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
                      borderRadius:
                          BorderRadius.circular(Responsive.r(4)),
                    ),
                  ),
                  SizedBox(height: Responsive.h(6)),
                  Container(
                    height: Responsive.h(8),
                    width: Responsive.w(80),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius:
                          BorderRadius.circular(Responsive.r(4)),
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
                            borderRadius:
                                BorderRadius.circular(Responsive.r(4)),
                          ),
                        ),
                      ),
                      SizedBox(width: Responsive.w(10)),
                      Container(
                        height: Responsive.h(16),
                        width: Responsive.w(60),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius:
                              BorderRadius.circular(Responsive.r(12)),
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
