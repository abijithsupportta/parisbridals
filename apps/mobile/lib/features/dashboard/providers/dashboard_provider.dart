import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../branches/providers/branch_provider.dart';
import '../repositories/dashboard_repository.dart';

// Dashboard cache
class DashboardCache {
  DashboardMetrics? _data;
  DateTime? _timestamp;
  String? _branchId;
  final Duration _ttl = const Duration(minutes: 1);

  bool get isValid => _data != null && _timestamp != null &&
      DateTime.now().difference(_timestamp!) < _ttl &&
      _branchId == _currentBranchId;

  String? _currentBranchId;
  DashboardMetrics? get data => _data;
  DateTime? get timestamp => _timestamp;

  void set(DashboardMetrics metrics, String? branchId) {
    _data = metrics;
    _timestamp = DateTime.now();
    _branchId = branchId;
    _currentBranchId = branchId;
  }

  void invalidate() {
    _data = null;
    _timestamp = null;
  }
}

final dashboardCache = DashboardCache();

// Repository provider
final dashboardRepositoryProvider = Provider<DashboardRepository>((ref) {
  return DashboardRepository();
});

// Dashboard metrics provider with caching
final dashboardMetricsProvider = FutureProvider.autoDispose<DashboardMetrics>((ref) async {
  final repo = ref.read(dashboardRepositoryProvider);
  final branchId = ref.watch(effectiveBranchIdProvider);

  // Return cached data if valid for this branch
  if (dashboardCache.isValid && dashboardCache.data != null) {
    return dashboardCache.data!;
  }

  final metrics = await repo.getMetrics(branchId: branchId);
  dashboardCache.set(metrics, branchId);
  return metrics;
});

// Invalidate dashboard cache
void invalidateDashboardCache() {
  dashboardCache.invalidate();
}
