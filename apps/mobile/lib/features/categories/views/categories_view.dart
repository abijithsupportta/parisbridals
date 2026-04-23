import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/responsive.dart';
import '../../auth/providers/auth_provider.dart';
import '../models/category.dart';
import '../providers/category_provider.dart';
import 'category_detail_view.dart';
import 'category_form_view.dart';

/// Categories listing view – hierarchical tree: Main → Sub → Variant.
class CategoriesView extends ConsumerStatefulWidget {
  const CategoriesView({super.key});

  @override
  ConsumerState<CategoriesView> createState() => _CategoriesViewState();
}

class _CategoriesViewState extends ConsumerState<CategoriesView> {
  String _searchQuery = '';

  static const _primary = Color(0xFF434343); // Charcoal
  static const _accent  = Color(0xFFF7C873); // Golden
  static const _surface = Color(0xFFFAEBCD); // Almond
  static const _bg      = Color(0xFFF8F8F8); // Off-white

  @override
  Widget build(BuildContext context) {
    final categoriesAsync = ref.watch(categoriesProvider);
    final canManage = ref.watch(canManageProvider);

    return Container(
      color: _bg,
      child: Stack(
        children: [
          categoriesAsync.when(
            data: (categories) => _buildContent(context, categories, canManage),
            loading: () => const Center(child: CircularProgressIndicator(color: _primary)),
            error: (error, _) => _buildError(error),
          ),
          // FAB — only for admin/manager
          if (canManage)
            Positioned(
              right: Responsive.w(16),
              bottom: Responsive.h(16),
              child: FloatingActionButton.extended(
                onPressed: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const CategoryFormView()),
                  ).then((_) => ref.invalidate(categoriesProvider));
                },
                backgroundColor: _accent,
                foregroundColor: _primary,
                icon: Icon(Icons.add, size: Responsive.icon(24)),
                label: Text('Add Category', style: TextStyle(fontSize: Responsive.sp(14), fontWeight: FontWeight.bold)),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildContent(BuildContext context, List<Category> categories, bool canManage) {
    // Apply search filter
    final filtered = _searchQuery.isEmpty
        ? categories
        : categories.where((c) =>
            c.name.toLowerCase().contains(_searchQuery.toLowerCase()) ||
            c.slug.toLowerCase().contains(_searchQuery.toLowerCase()) ||
            (c.description ?? '').toLowerCase().contains(_searchQuery.toLowerCase())).toList();

    final allMainCats = categories.where((c) => c.parentId == null).toList();
    final filteredMainCats = filtered.where((c) => c.parentId == null).toList();

    // When searching, also show parents of matching sub/variants
    final Set<String> visibleMainIds = {};
    for (final c in filteredMainCats) {
      visibleMainIds.add(c.id);
    }
    // If a sub or variant matches, include its root main category
    for (final c in filtered) {
      if (c.parentId != null) {
        String? parentId = c.parentId;
        while (parentId != null) {
          final parent = categories.where((p) => p.id == parentId).firstOrNull;
          if (parent == null) break;
          if (parent.parentId == null) {
            visibleMainIds.add(parent.id);
            break;
          }
          parentId = parent.parentId;
        }
      }
    }

    final displayMainCats = _searchQuery.isEmpty
        ? allMainCats
        : allMainCats.where((c) => visibleMainIds.contains(c.id)).toList();

    if (categories.isEmpty) return _buildEmpty();

    return Column(
      children: [
        // Search bar
        Padding(
          padding: Responsive.only(left: 16, right: 16, top: 12, bottom: 6),
          child: Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(Responsive.r(14)),
              boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: Responsive.r(12), offset: Offset(0, Responsive.h(2)))],
            ),
            child: TextField(
              onChanged: (val) => setState(() => _searchQuery = val),
              style: TextStyle(fontSize: Responsive.sp(15)),
              decoration: InputDecoration(
                hintText: 'Search categories...',
                hintStyle: TextStyle(fontSize: Responsive.sp(15), color: Colors.grey[400]),
                prefixIcon: Icon(Icons.search_rounded, size: Responsive.icon(24), color: _primary),
                suffixIcon: _searchQuery.isNotEmpty
                    ? IconButton(
                        icon: Icon(Icons.close_rounded, size: Responsive.icon(22), color: Colors.grey),
                        onPressed: () => setState(() => _searchQuery = ''),
                      )
                    : null,
                border: InputBorder.none, enabledBorder: InputBorder.none, focusedBorder: InputBorder.none,
                contentPadding: Responsive.symmetric(horizontal: 18, vertical: 16),
              ),
            ),
          ),
        ),

        // Stats row
        Padding(
          padding: Responsive.symmetric(horizontal: 16, vertical: 4),
          child: Row(
            children: [
              _buildMiniStat('Total', '${categories.length}', _primary),
              SizedBox(width: Responsive.w(8)),
              _buildMiniStat('Main', '${allMainCats.length}', _primary),
              SizedBox(width: Responsive.w(8)),
              _buildMiniStat('Active', '${categories.where((c) => c.isActive).length}', _primary),
            ],
          ),
        ),
        SizedBox(height: Responsive.h(6)),

        // No results
        if (displayMainCats.isEmpty && _searchQuery.isNotEmpty)
          Expanded(
            child: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.search_off_rounded, size: Responsive.icon(48), color: Colors.grey[300]),
                  SizedBox(height: Responsive.h(12)),
                  Text('No results for "$_searchQuery"', style: TextStyle(fontSize: Responsive.sp(14), color: Colors.grey)),
                ],
              ),
            ),
          )
        else
          // Category Tree
          Expanded(
            child: RefreshIndicator(
              color: _primary,
              onRefresh: () async => ref.invalidate(categoriesProvider),
              child: ListView.builder(
                padding: Responsive.only(left: 16, right: 16, bottom: 80),
                itemCount: displayMainCats.length,
                itemBuilder: (context, index) {
                  final main = displayMainCats[index];
                  final subs = categories.where((c) => c.parentId == main.id).toList();
                  return _buildMainCategoryCard(context, main, subs, categories, canManage);
                },
              ),
            ),
          ),
      ],
    );
  }

  // ── Mini Stat ──
  Widget _buildMiniStat(String label, String value, Color color) {
    return Expanded(
      child: Container(
        padding: Responsive.symmetric(vertical: 8),
        decoration: BoxDecoration(
          color: _surface,
          borderRadius: BorderRadius.circular(Responsive.r(12)),
        ),
        child: Column(
          children: [
            Text(value, style: TextStyle(fontSize: Responsive.sp(18), fontWeight: FontWeight.w800, color: _primary)),
            SizedBox(height: Responsive.h(2)),
            Text(label, style: TextStyle(fontSize: Responsive.sp(11), fontWeight: FontWeight.w600, color: _primary.withValues(alpha: 0.7))),
          ],
        ),
      ),
    );
  }

  // ── Main Category Card ──
  Widget _buildMainCategoryCard(BuildContext context, Category main, List<Category> subs, List<Category> all, bool canManage) {
    return Container(
      margin: Responsive.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(Responsive.r(14)),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: Responsive.r(8), offset: Offset(0, Responsive.h(2)))],
      ),
      child: Theme(
        data: ThemeData(dividerColor: Colors.transparent),
        child: ExpansionTile(
          tilePadding: Responsive.symmetric(horizontal: 16, vertical: 8),
          childrenPadding: Responsive.only(left: 16, right: 16, bottom: 16),
          leading: _buildCategoryImage(main, size: 56),
          title: Text(main.name, style: TextStyle(fontSize: Responsive.sp(16), fontWeight: FontWeight.w800, color: _primary)),
          subtitle: Row(
            children: [
              _buildStatusDot(main.isActive),
              SizedBox(width: Responsive.w(6)),
              Text(main.isActive ? 'Active' : 'Inactive', style: TextStyle(fontSize: Responsive.sp(12), color: Colors.grey[600], fontWeight: FontWeight.w500)),
              if (subs.isNotEmpty) ...[
                SizedBox(width: Responsive.w(10)),
                Container(
                  padding: Responsive.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(color: _surface, borderRadius: BorderRadius.circular(Responsive.r(8))),
                  child: Text('${subs.length} sub', style: TextStyle(fontSize: Responsive.sp(10), fontWeight: FontWeight.bold, color: _primary)),
                ),
              ],
            ],
          ),
          trailing: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (canManage)
                GestureDetector(
                  onTap: () => _navigateToDetail(context, main),
                  child: Padding(
                    padding: Responsive.all(8),
                    child: Icon(Icons.edit_outlined, size: Responsive.icon(22), color: _primary),
                  ),
                ),
              Icon(Icons.keyboard_arrow_down_rounded, size: Responsive.icon(28), color: Colors.grey[400]),
            ],
          ),
          children: subs.isEmpty
              ? [
                  Container(
                    padding: Responsive.symmetric(vertical: 16),
                    child: Text('No sub-categories yet', style: TextStyle(fontSize: Responsive.sp(13), color: Colors.grey[500])),
                  ),
                ]
              : subs.map((sub) {
                  final variants = all.where((c) => c.parentId == sub.id).toList();
                  return _buildSubCategoryTile(context, sub, variants, canManage);
                }).toList(),
        ),
      ),
    );
  }

  // ── Sub Category Tile ──
  Widget _buildSubCategoryTile(BuildContext context, Category sub, List<Category> variants, bool canManage) {
    return GestureDetector(
      onTap: () => _navigateToDetail(context, sub),
      child: Container(
        margin: Responsive.only(bottom: 12),
        decoration: BoxDecoration(
          color: _bg,
          borderRadius: BorderRadius.circular(Responsive.r(14)),
          border: Border.all(color: Colors.grey.withValues(alpha: 0.2)),
        ),
        child: Column(
          children: [
            // Sub header
            Padding(
              padding: Responsive.all(12),
              child: Row(
                children: [
                  _buildCategoryImage(sub, size: 48),
                  SizedBox(width: Responsive.w(14)),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(sub.name, style: TextStyle(fontSize: Responsive.sp(15), fontWeight: FontWeight.w700, color: _primary)),
                        SizedBox(height: Responsive.h(4)),
                        Row(
                          children: [
                            _buildStatusDot(sub.isActive),
                            SizedBox(width: Responsive.w(6)),
                            Text(sub.isActive ? 'Active' : 'Inactive', style: TextStyle(fontSize: Responsive.sp(11), color: Colors.grey[600], fontWeight: FontWeight.w500)),
                            if (variants.isNotEmpty) ...[
                              SizedBox(width: Responsive.w(8)),
                              Container(
                                padding: Responsive.symmetric(horizontal: 8, vertical: 2),
                                decoration: BoxDecoration(color: _surface, borderRadius: BorderRadius.circular(Responsive.r(8))),
                                child: Text('${variants.length} variant', style: TextStyle(fontSize: Responsive.sp(10), fontWeight: FontWeight.bold, color: _primary)),
                              ),
                            ],
                          ],
                        ),
                      ],
                    ),
                  ),
                  if (canManage)
                    GestureDetector(
                      onTap: () => _navigateToDetail(context, sub),
                      child: Padding(
                        padding: Responsive.all(8.0),
                        child: Icon(Icons.edit_outlined, size: Responsive.icon(22), color: _primary),
                      ),
                    ),
                ],
              ),
            ),
            // Variant rows
            if (variants.isNotEmpty)
              Container(
                margin: Responsive.only(left: 8, right: 8, bottom: 8),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(Responsive.r(10)),
                ),
                child: Column(
                  children: variants.asMap().entries.map((entry) {
                    final i = entry.key;
                    final v = entry.value;
                    return Column(
                      children: [
                        _buildVariantRow(context, v, canManage),
                        if (i < variants.length - 1)
                          Divider(height: 1, indent: Responsive.w(46), color: const Color(0xFFF0F0F0)),
                      ],
                    );
                  }).toList(),
                ),
              ),
          ],
        ),
      ),
    );
  }

  // ── Variant Row ──
  Widget _buildVariantRow(BuildContext context, Category variant, bool canManage) {
    return GestureDetector(
      onTap: () => _navigateToDetail(context, variant),
      child: Padding(
        padding: Responsive.symmetric(horizontal: 14, vertical: 12),
        child: Row(
          children: [
            _buildCategoryImage(variant, size: 40),
            SizedBox(width: Responsive.w(14)),
            Expanded(
              child: Text(variant.name, style: TextStyle(fontSize: Responsive.sp(14), fontWeight: FontWeight.w600, color: _primary)),
            ),
            _buildStatusDot(variant.isActive),
            SizedBox(width: Responsive.w(8)),
            Icon(Icons.edit_outlined, size: Responsive.icon(20), color: _primary),
          ],
        ),
      ),
    );
  }

  // ── Category Image ──
  Widget _buildCategoryImage(Category cat, {double size = 40}) {
    final s = Responsive.w(size);
    if (cat.imageUrl != null && cat.imageUrl!.isNotEmpty) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(Responsive.r(size * 0.25)),
        child: Image.network(cat.imageUrl!, width: s, height: s, fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => _buildIconAvatar(s)),
      );
    }
    return _buildIconAvatar(s);
  }

  Widget _buildIconAvatar(double size) {
    return Container(
      width: size, height: size,
      decoration: BoxDecoration(
        color: _surface,
        borderRadius: BorderRadius.circular(Responsive.r(size * 0.25)),
      ),
      child: Icon(Icons.folder_rounded, size: size * 0.45, color: _primary),
    );
  }

  // ── Status Dot ──
  Widget _buildStatusDot(bool isActive) {
    return Container(
      width: Responsive.w(7), height: Responsive.w(7),
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: isActive ? const Color(0xFF4CAF50) : Colors.grey[400],
      ),
    );
  }

  // ── Navigation ──
  void _navigateToDetail(BuildContext context, Category cat) {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => CategoryDetailView(initialCategory: cat)),
    ).then((_) => ref.invalidate(categoriesProvider));
  }

  // ── Empty State ──
  Widget _buildEmpty() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: Responsive.all(20),
            decoration: BoxDecoration(color: _primary.withValues(alpha: 0.06), shape: BoxShape.circle),
            child: Icon(Icons.category_outlined, size: Responsive.icon(48), color: _primary.withValues(alpha: 0.4)),
          ),
          SizedBox(height: Responsive.h(20)),
          Text('No categories yet', style: TextStyle(fontSize: Responsive.sp(16), fontWeight: FontWeight.bold, color: Colors.grey[600])),
          SizedBox(height: Responsive.h(6)),
          Text('Tap + to add your first category', style: TextStyle(fontSize: Responsive.sp(12), color: Colors.grey[400])),
        ],
      ),
    );
  }

  // ── Error State ──
  Widget _buildError(Object error) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.error_outline, size: Responsive.icon(48), color: _rose),
          SizedBox(height: Responsive.h(16)),
          Padding(
            padding: Responsive.symmetric(horizontal: 32),
            child: Text('Error loading categories\n$error', textAlign: TextAlign.center, style: TextStyle(fontSize: Responsive.sp(13))),
          ),
          SizedBox(height: Responsive.h(16)),
          ElevatedButton(
            onPressed: () => ref.invalidate(categoriesProvider),
            style: ElevatedButton.styleFrom(backgroundColor: _primary),
            child: Text('Retry', style: TextStyle(fontSize: Responsive.sp(13))),
          ),
        ],
      ),
    );
  }
}
