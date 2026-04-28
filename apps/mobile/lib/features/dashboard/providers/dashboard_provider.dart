import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../repositories/dashboard_repository.dart';

// Repository provider
final dashboardRepositoryProvider = Provider<DashboardRepository>((ref) {
  return DashboardRepository();
});

// Dashboard metrics provider
final dashboardMetricsProvider = FutureProvider.family<DashboardMetrics, Map<String, dynamic>>((ref, params) async {
  final repo = ref.read(dashboardRepositoryProvider);
  return repo.getMetrics();
});
