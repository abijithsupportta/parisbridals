import 'package:equatable/equatable.dart';

/// Category model matching the admin panel's domain/types/category.ts
///
/// Core entity fields: id, name, slug, description, image_url,
/// parent_id (for hierarchy: Main → Sub → Variant), sort_order,
/// is_active, is_global, created_at, updated_at.
class Category extends Equatable {
  final String id;
  final String name;
  final String slug;
  final String? description;
  final String? imageUrl;
  final String? parentId;
  final int sortOrder;
  final bool isActive;
  final bool isGlobal;
  final String createdAt;
  final String? updatedAt;

  // Relations (optional, populated by detail endpoints)
  final Category? parent;
  final List<Category>? children;
  final int? productCount;

  const Category({
    required this.id,
    required this.name,
    required this.slug,
    this.description,
    this.imageUrl,
    this.parentId,
    this.sortOrder = 0,
    this.isActive = true,
    this.isGlobal = false,
    required this.createdAt,
    this.updatedAt,
    this.parent,
    this.children,
    this.productCount,
  });

  /// Whether this is a Main (root) category.
  bool get isMain => parentId == null;

  @override
  List<Object?> get props => [
        id,
        name,
        slug,
        description,
        imageUrl,
        parentId,
        sortOrder,
        isActive,
        isGlobal,
        createdAt,
        updatedAt,
        parent,
        children,
        productCount,
      ];

  factory Category.fromJson(Map<String, dynamic> json) {
    return Category(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      slug: json['slug'] as String? ?? '',
      description: json['description'] as String?,
      imageUrl: json['image_url'] as String?,
      parentId: json['parent_id'] as String?,
      sortOrder: (json['sort_order'] as num?)?.toInt() ?? 0,
      isActive: json['is_active'] as bool? ?? true,
      isGlobal: json['is_global'] as bool? ?? true,
      createdAt: json['created_at'] as String? ?? '',
      updatedAt: json['updated_at'] as String?,
      parent: json['parent'] != null && json['parent'] is Map
          ? Category.fromJson(Map<String, dynamic>.from(json['parent']))
          : null,
      children: json['children'] != null && json['children'] is List
          ? (json['children'] as List)
              .map((c) => Category.fromJson(Map<String, dynamic>.from(c)))
              .toList()
          : null,
      productCount: (json['product_count'] as num?)?.toInt(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'slug': slug,
      'description': description,
      'image_url': imageUrl,
      'parent_id': parentId,
      'sort_order': sortOrder,
      'is_active': isActive,
      'is_global': isGlobal,
      'created_at': createdAt,
      'updated_at': updatedAt,
    };
  }
}
