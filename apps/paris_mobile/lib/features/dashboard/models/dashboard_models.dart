/// Dashboard Metrics Model
class DashboardMetrics {
  final double totalRevenue;
  final int totalOrders;
  final int scheduledOrders;
  final int inRental;
  final int inStock;
  final int totalCustomers;
  final int pendingLate;
  final List<RecentOrder> recentOrders;

  DashboardMetrics({
    required this.totalRevenue,
    required this.totalOrders,
    required this.scheduledOrders,
    required this.inRental,
    required this.inStock,
    required this.totalCustomers,
    required this.pendingLate,
    required this.recentOrders,
  });

  factory DashboardMetrics.fromJson(Map<String, dynamic> json) {
    return DashboardMetrics(
      totalRevenue: (json['total_revenue'] as num?)?.toDouble() ?? 0.0,
      totalOrders: json['total_orders'] as int? ?? 0,
      scheduledOrders: json['scheduled_orders'] as int? ?? 0,
      inRental: json['in_rental'] as int? ?? 0,
      inStock: json['in_stock'] as int? ?? 0,
      totalCustomers: json['total_customers'] as int? ?? 0,
      pendingLate: json['pending_late'] as int? ?? 0,
      recentOrders: (json['recent_orders'] as List?)
              ?.map((e) => RecentOrder.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'total_revenue': totalRevenue,
      'total_orders': totalOrders,
      'scheduled_orders': scheduledOrders,
      'in_rental': inRental,
      'in_stock': inStock,
      'total_customers': totalCustomers,
      'pending_late': pendingLate,
      'recent_orders': recentOrders.map((e) => e.toJson()).toList(),
    };
  }
}

/// Recent Order Model
class RecentOrder {
  final String id;
  final String customerName;
  final String? productName;
  final String status;
  final DateTime createdAt;

  RecentOrder({
    required this.id,
    required this.customerName,
    this.productName,
    required this.status,
    required this.createdAt,
  });

  factory RecentOrder.fromJson(Map<String, dynamic> json) {
    return RecentOrder(
      id: json['id'] as String,
      customerName: json['customer_name'] as String? ?? 'Unknown',
      productName: json['product_name'] as String?,
      status: json['status'] as String? ?? 'unknown',
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'customer_name': customerName,
      'product_name': productName,
      'status': status,
      'created_at': createdAt.toIso8601String(),
    };
  }
}
