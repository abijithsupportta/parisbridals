import 'package:dio/dio.dart';
import '../../../core/api_client.dart';

class Product {
  final String id;
  final String name;
  final String? description;
  final double pricePerDay;
  final int quantity;
  final int availableQuantity;
  final String? imageUrl;
  final String? categoryName;
  final bool isActive;
  final bool isFeatured;

  Product({
    required this.id,
    required this.name,
    this.description,
    required this.pricePerDay,
    required this.quantity,
    required this.availableQuantity,
    this.imageUrl,
    this.categoryName,
    required this.isActive,
    required this.isFeatured,
  });

  factory Product.fromJson(Map<String, dynamic> json) {
    String? imageUrl;
    if (json['images'] != null && (json['images'] as List).isNotEmpty) {
      final primaryImage = (json['images'] as List).firstWhere(
        (img) => img['is_primary'] == true,
        orElse: () => (json['images'] as List).first,
      );
      imageUrl = primaryImage['url'] as String?;
    }

    return Product(
      id: json['id'] as String,
      name: json['name'] as String,
      description: json['description'] as String?,
      pricePerDay: (json['price_per_day'] as num?)?.toDouble() ?? 0.0,
      quantity: json['quantity'] as int? ?? 0,
      availableQuantity: json['available_quantity'] as int? ?? 0,
      imageUrl: imageUrl,
      categoryName: json['category']?['name'] as String?,
      isActive: json['is_active'] as bool? ?? false,
      isFeatured: json['is_featured'] as bool? ?? false,
    );
  }
}

class DashboardMetrics {
  final int totalProducts;
  final int availableProducts;
  final int lowStockCount;
  final int featuredProducts;
  final double avgPrice;
  final List<Product> recentProducts;

  DashboardMetrics({
    required this.totalProducts,
    required this.availableProducts,
    required this.lowStockCount,
    required this.featuredProducts,
    required this.avgPrice,
    required this.recentProducts,
  });

  factory DashboardMetrics.fromJson(Map<String, dynamic> json) {
    final products = (json['data'] as List?)
            ?.map((e) => Product.fromJson(e as Map<String, dynamic>))
            .toList() ??
        [];

    return DashboardMetrics(
      totalProducts: json['total'] as int? ?? 0,
      availableProducts: products.where((p) => p.availableQuantity > 0).length,
      lowStockCount: products.where((p) => p.availableQuantity < 10).length,
      featuredProducts: products.where((p) => p.isFeatured).length,
      avgPrice: products.isEmpty
          ? 0.0
          : products.map((p) => p.pricePerDay).reduce((a, b) => a + b) / products.length,
      recentProducts: products.take(5).toList(),
    );
  }
}

/// Repository layer for Dashboard.
/// All HTTP calls go through here — providers never touch Dio directly.
class DashboardRepository {
  final Dio _client = apiClient;

  /// Fetch mobile dashboard metrics from the Products API.
  Future<DashboardMetrics> getMetrics({
    String? dateFrom,
    String? dateTo,
  }) async {
    final Map<String, dynamic> queryParams = {
      'limit': '50', // Fetch more products for better metrics
    };

    final response = await _client.get('/products', queryParameters: queryParams);

    if (response.statusCode == 200) {
      return DashboardMetrics.fromJson(response.data);
    }
    // Return default metrics on error
    return DashboardMetrics(
      totalProducts: 0,
      availableProducts: 0,
      lowStockCount: 0,
      featuredProducts: 0,
      avgPrice: 0.0,
      recentProducts: [],
    );
  }
}
