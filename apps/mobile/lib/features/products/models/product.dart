class ProductImage {
  final String url;
  final String altText;
  final bool isPrimary;
  final int sortOrder;

  ProductImage({
    required this.url,
    this.altText = '',
    this.isPrimary = false,
    this.sortOrder = 0,
  });

  factory ProductImage.fromJson(dynamic json) {
    if (json is String) {
      return ProductImage(url: json);
    }
    return ProductImage(
      url: json['url'] ?? '',
      altText: json['alt_text'] ?? json['alt'] ?? '',
      isPrimary: json['is_primary'] ?? false,
      sortOrder: json['sort_order'] ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'url': url,
      'alt_text': altText,
      'is_primary': isPrimary,
      'sort_order': sortOrder,
    };
  }
}

class Product {
  final String id;
  final String storeId;
  final String? categoryId;
  final String? subcategoryId;
  final String? subvariantId;
  final String name;
  final String slug;
  final String? description;
  final String? sku;
  final String? barcode;
  final double pricePerDay;
  final double securityDeposit;
  final int quantity;
  final int availableQuantity;
  final List<ProductImage> images;
  final bool isActive;
  final bool isFeatured;
  final bool trackInventory;
  final int lowStockThreshold;
  final String createdAt;

  Product({
    required this.id,
    required this.storeId,
    this.categoryId,
    this.subcategoryId,
    this.subvariantId,
    required this.name,
    required this.slug,
    this.description,
    this.sku,
    this.barcode,
    required this.pricePerDay,
    this.securityDeposit = 0,
    required this.quantity,
    required this.availableQuantity,
    this.images = const [],
    this.isActive = true,
    this.isFeatured = false,
    this.trackInventory = true,
    this.lowStockThreshold = 10,
    required this.createdAt,
  });

  factory Product.fromJson(Map<String, dynamic> json) {
    return Product(
      id: json['id'] as String,
      storeId: json['store_id'] as String,
      categoryId: json['category_id'] as String?,
      subcategoryId: json['subcategory_id'] as String?,
      subvariantId: json['subvariant_id'] as String?,
      name: json['name'] as String,
      slug: json['slug'] as String,
      description: json['description'] as String?,
      sku: json['sku'] as String?,
      barcode: json['barcode'] as String?,
      pricePerDay: (json['price_per_day'] as num?)?.toDouble() ?? 0.0,
      securityDeposit: (json['security_deposit'] as num?)?.toDouble() ?? 0.0,
      quantity: json['quantity'] as int? ?? 0,
      availableQuantity: json['available_quantity'] as int? ?? 0,
      images: (json['images'] as List<dynamic>?)
              ?.map((e) => ProductImage.fromJson(e))
              .toList() ??
          [],
      isActive: json['is_active'] as bool? ?? true,
      isFeatured: json['is_featured'] as bool? ?? false,
      trackInventory: json['track_inventory'] as bool? ?? true,
      lowStockThreshold: json['low_stock_threshold'] as int? ?? 10,
      createdAt: json['created_at'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'store_id': storeId,
      'category_id': categoryId,
      'subcategory_id': subcategoryId,
      'subvariant_id': subvariantId,
      'name': name,
      'slug': slug,
      'description': description,
      'sku': sku,
      'barcode': barcode,
      'price_per_day': pricePerDay,
      'security_deposit': securityDeposit,
      'quantity': quantity,
      'available_quantity': availableQuantity,
      'images': images.map((e) => e.toJson()).toList(),
      'is_active': isActive,
      'is_featured': isFeatured,
      'track_inventory': trackInventory,
      'low_stock_threshold': lowStockThreshold,
      'created_at': createdAt,
    };
  }
}
