import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/responsive.dart';
import '../../auth/providers/auth_provider.dart';
import '../models/category.dart';
import '../providers/category_provider.dart';
import 'category_form_view.dart';

/// Category detail page — view, edit, and delete a category.
/// Accepts the full [Category] object directly to avoid extra API calls.
class CategoryDetailView extends ConsumerStatefulWidget {
  final Category initialCategory;
  const CategoryDetailView({super.key, required this.initialCategory});

  @override
  ConsumerState<CategoryDetailView> createState() => _CategoryDetailViewState();
}

class _CategoryDetailViewState extends ConsumerState<CategoryDetailView> {
  late Category _category;

  static const _primary = Color(0xFF434343); // Charcoal
  static const _accent  = Color(0xFFF7C873); // Golden
  static const _bg      = Color(0xFFF8F8F8); // Off-white

  @override
  void initState() {
    super.initState();
    _category = widget.initialCategory;
  }

  @override
  Widget build(BuildContext context) {
    final canManage = ref.watch(canManageProvider);

    return Scaffold(
      backgroundColor: _bg,
      appBar: AppBar(
        title: Text('Category Details', style: TextStyle(fontSize: Responsive.sp(18))),
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
      MaterialPageRoute(builder: (_) => CategoryFormView(category: _category)),
    ).then((_) {
      // Refresh the list when coming back
      ref.invalidate(categoriesProvider);
      // Try to get updated data from the refreshed list
      final allAsync = ref.read(categoriesProvider);
      allAsync.whenData((all) {
        final updated = all.where((c) => c.id == _category.id).firstOrNull;
        if (updated != null && mounted) {
          setState(() => _category = updated);
        }
      });
    });
  }

  Widget _buildDetail(BuildContext context, bool canManage) {
    // Determine level label
    String levelLabel = 'Main Category';
    if (_category.parentId != null) {
      final allAsync = ref.watch(categoriesProvider);
      allAsync.whenData((all) {
        final parent = all.where((c) => c.id == _category.parentId).firstOrNull;
        if (parent != null && parent.parentId != null) {
          levelLabel = 'Variant';
        } else {
          levelLabel = 'Sub Category';
        }
      });
      if (levelLabel == 'Main Category') {
        levelLabel = 'Sub Category';
      }
    }

    return ListView(
      padding: Responsive.all(16),
      children: [
        // Image
        Container(
          width: double.infinity,
          height: Responsive.h(200),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(Responsive.r(16)),
            boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: Responsive.r(10), offset: Offset(0, Responsive.h(3)))],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(Responsive.r(16)),
            child: (_category.imageUrl != null && _category.imageUrl!.isNotEmpty)
                ? Image.network(_category.imageUrl!, fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => _buildPlaceholder())
                : _buildPlaceholder(),
          ),
        ),
        SizedBox(height: Responsive.h(20)),

        // Name & Level Badge
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
                    decoration: BoxDecoration(color: _accent, borderRadius: BorderRadius.circular(Responsive.r(20))),
                    child: Text(levelLabel, style: TextStyle(fontSize: Responsive.sp(12), fontWeight: FontWeight.w800, color: _primary)),
                  ),
                  const Spacer(),
                  Container(
                    padding: Responsive.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: (_category.isActive ? const Color(0xFF4CAF50) : Colors.grey).withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(Responsive.r(20)),
                    ),
                    child: Text(_category.isActive ? 'Active' : 'Inactive',
                      style: TextStyle(fontSize: Responsive.sp(12), fontWeight: FontWeight.w800,
                        color: _category.isActive ? const Color(0xFF4CAF50) : Colors.grey)),
                  ),
                ],
              ),
              SizedBox(height: Responsive.h(16)),
              Text(_category.name, style: TextStyle(fontSize: Responsive.sp(24), fontWeight: FontWeight.bold, color: _primary)),
              SizedBox(height: Responsive.h(6)),
              Text(_category.slug, style: TextStyle(fontSize: Responsive.sp(14), color: Colors.grey[500], fontStyle: FontStyle.italic)),
            ],
          ),
        ),
        SizedBox(height: Responsive.h(12)),

        // Description
        if (_category.description != null && _category.description!.isNotEmpty) ...[
          Container(
            padding: Responsive.all(16),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(Responsive.r(14))),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Description', style: TextStyle(fontSize: Responsive.sp(14), fontWeight: FontWeight.w700, color: Colors.grey)),
                SizedBox(height: Responsive.h(8)),
                Text(_category.description!, style: TextStyle(fontSize: Responsive.sp(15), height: 1.5, color: _primary)),
              ],
            ),
          ),
          SizedBox(height: Responsive.h(12)),
        ],

        // Info Grid
        Container(
          padding: Responsive.all(16),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(Responsive.r(14))),
          child: Column(
            children: [
              _buildInfoRow('Sort Order', '${_category.sortOrder}', Icons.sort),
              Divider(height: Responsive.h(20), color: const Color(0xFFF0F0F0)),
              _buildInfoRow('Global', _category.isGlobal ? 'Yes' : 'No', Icons.public),
              Divider(height: Responsive.h(20), color: const Color(0xFFF0F0F0)),
              _buildInfoRow('Created', _formatDate(_category.createdAt), Icons.calendar_today),
              if (_category.updatedAt != null) ...[
                Divider(height: Responsive.h(20), color: const Color(0xFFF0F0F0)),
                _buildInfoRow('Updated', _formatDate(_category.updatedAt!), Icons.update),
              ],
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
                  label: Text('Edit Category', style: TextStyle(fontSize: Responsive.sp(15), fontWeight: FontWeight.bold)),
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

  Widget _buildPlaceholder() {
    return Container(
      color: const Color(0xFFF5F5F5),
      child: Center(child: Icon(Icons.category_outlined, size: Responsive.icon(48), color: Colors.grey[300])),
    );
  }

  String _formatDate(String isoDate) {
    try {
      final dt = DateTime.parse(isoDate);
      return '${dt.day}/${dt.month}/${dt.year}';
    } catch (_) {
      return isoDate;
    }
  }

  void _confirmDelete(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Delete Category', style: TextStyle(fontSize: Responsive.sp(16), fontWeight: FontWeight.bold)),
        content: Text('Are you sure you want to delete this category? This cannot be undone.',
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
                final repo = ref.read(categoryRepositoryProvider);
                await repo.deleteCategory(_category.id);
                ref.invalidate(categoriesProvider);
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Category deleted successfully'), backgroundColor: Color(0xFF4CAF50)),
                  );
                  Navigator.pop(context);
                }
              } catch (e) {
                if (mounted) {
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
