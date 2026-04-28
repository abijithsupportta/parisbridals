import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../branches/providers/branch_provider.dart';
import '../repositories/dashboard_repository.dart';

// Repository provider
final dashboardRepositoryProvider = Provider<DashboardRepository>((ref) {
  return DashboardRepository();
});

// Dashboard metrics provider
final dashboardMetricsProvider = FutureProvider<DashboardMetrics>((ref) async {
  final repo = ref.read(dashboardRepositoryProvider);
  final branchId = ref.watch(effectiveBranchIdProvider);
  return repo.getMetrics(branchId: branchId);
});
