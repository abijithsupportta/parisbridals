import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/dashboard_models.dart';
import '../repositories/dashboard_repository.dart';
import '../../../../core/supabase_client.dart';

/// Dashboard Repository Provider
final dashboardRepositoryProvider = Provider<DashboardRepository>((ref) {
  return DashboardRepository(supabaseClient);
});

/// Dashboard Metrics Provider
final dashboardMetricsProvider = FutureProvider<DashboardMetrics>((ref) async {
  final repository = ref.watch(dashboardRepositoryProvider);
  return await repository.getMetrics();
});
