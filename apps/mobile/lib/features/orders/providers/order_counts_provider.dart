/// Order counts provider — fetches accurate server-side counts for filter chips.
///
/// This is a mobile-only solution that makes lightweight API calls
/// (limit=1) for each status to get meta.total counts without
/// modifying the backend.
///
/// @module features/orders/providers/order_counts_provider
library;

import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api_client.dart';
import '../../branches/providers/branch_provider.dart';

/// Status filter mappings matching the backend
const _statusFilters = <String, String?>{
  'All': null,
  'Ongoing': 'ongoing',
  'Scheduled': 'scheduled',
  'Late': 'late_return',
  'Partial': 'partial',
  'Returned': 'returned',
  'Flagged': 'flagged',
};

/// Provider for fetching order counts from the server
final orderCountsProvider = AsyncNotifierProvider<OrderCountsNotifier, Map<String, int>>(
  () => OrderCountsNotifier(),
);

class OrderCountsNotifier extends AsyncNotifier<Map<String, int>> {
  @override
  Future<Map<String, int>> build() async {
    final branchId = ref.watch(effectiveBranchIdProvider);
    return await _fetchCounts(branchId: branchId);
  }

  /// Refresh counts (call after order changes)
  Future<void> refresh() async {
    final branchId = ref.read(effectiveBranchIdProvider);
    state = const AsyncLoading();
    state = await AsyncValue.guard(() => _fetchCounts(branchId: branchId));
  }

  /// Fetch counts for all statuses via lightweight API calls
  Future<Map<String, int>> _fetchCounts({String? branchId}) async {
    final client = apiClient;
    final counts = <String, int>{};

    // Fetch each status count in parallel using limit=1 to minimize data transfer
    final futures = <Future<void>>[];

    for (final entry in _statusFilters.entries) {
      futures.add(() async {
        try {
          final queryParams = <String, dynamic>{
            'page': 1,
            'limit': 1, // Minimal data transfer
          };

          if (branchId != null && branchId.isNotEmpty) {
            queryParams['branch_id'] = branchId;
          }

          if (entry.value != null) {
            queryParams['status'] = entry.value;
          }

          final response = await client.get('/orders', queryParameters: queryParams);

          if (response.statusCode == 200 && response.data['success'] == true) {
            final meta = response.data['meta'] as Map<String, dynamic>?;
            final total = meta?['total'] as int? ?? 0;
            counts[entry.key.toLowerCase()] = total;
          } else {
            counts[entry.key.toLowerCase()] = 0;
          }
        } catch (e) {
          // If a single count fails, default to 0
          counts[entry.key.toLowerCase()] = 0;
        }
      }());
    }

    await Future.wait(futures);
    return counts;
  }
}
