import 'package:dio/dio.dart';
import '../../../core/api_client.dart';

class DashboardMetrics {
  final int totalOrders;
  final int ordersToday;
  final double totalRevenue;
  final double revenueToday;
  final int totalScheduled;
  final int totalOngoing;
  final int totalLates;
  final int totalPartial;
  final int totalFlagged;

  DashboardMetrics({
    required this.totalOrders,
    required this.ordersToday,
    required this.totalRevenue,
    required this.revenueToday,
    required this.totalScheduled,
    required this.totalOngoing,
    required this.totalLates,
    required this.totalPartial,
    required this.totalFlagged,
  });

  factory DashboardMetrics.fromJson(Map<String, dynamic> json) {
    final data = json['data'] as Map<String, dynamic>? ?? json;

    return DashboardMetrics(
      totalOrders: (data['totalOrders'] as num?)?.toInt() ?? 0,
      ordersToday: (data['ordersToday'] as num?)?.toInt() ?? 0,
      totalRevenue: (data['totalRevenue'] as num?)?.toDouble() ?? 0,
      revenueToday: (data['revenueToday'] as num?)?.toDouble() ?? 0,
      totalScheduled: (data['totalScheduled'] as num?)?.toInt() ?? 0,
      totalOngoing: (data['totalOngoing'] as num?)?.toInt() ?? 0,
      totalLates: (data['totalLates'] as num?)?.toInt() ?? 0,
      totalPartial: (data['totalPartial'] as num?)?.toInt() ?? 0,
      totalFlagged: (data['totalFlagged'] as num?)?.toInt() ?? 0,
    );
  }
}

class DashboardRepository {
  final Dio _client = apiClient;

  Future<DashboardMetrics> getMetrics({String? branchId}) async {
    final queryParams = <String, dynamic>{};
    if (branchId != null && branchId.isNotEmpty) {
      queryParams['branch_id'] = branchId;
    }

    final response = await _client.get('/dashboard/mobile-metrics', queryParameters: queryParams);
    if (response.statusCode == 200 && response.data['success'] == true) {
      return DashboardMetrics.fromJson(response.data);
    }

    throw Exception(response.data?['error'] ?? 'Failed to load dashboard metrics');
  }
}
