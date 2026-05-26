import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../branches/providers/branch_provider.dart';
import '../../orders/models/order.dart';
import '../repositories/calendar_repository.dart';

// Repository provider
final calendarRepositoryProvider = Provider<CalendarRepository>((ref) {
  return CalendarRepository();
});

// Month navigation state
class CalendarNavState {
  final DateTime currentMonth;
  final String monthLabel;

  CalendarNavState({required this.currentMonth})
      : monthLabel = DateFormat('MMMM yyyy').format(currentMonth);
}

class CalendarNavNotifier extends Notifier<CalendarNavState> {
  @override
  CalendarNavState build() => CalendarNavState(currentMonth: DateTime.now());

  void goToPrevMonth() {
    final prev = DateTime(state.currentMonth.year, state.currentMonth.month - 1);
    state = CalendarNavState(currentMonth: prev);
  }

  void goToNextMonth() {
    final next = DateTime(state.currentMonth.year, state.currentMonth.month + 1);
    state = CalendarNavState(currentMonth: next);
  }

  void goToToday() {
    state = CalendarNavState(currentMonth: DateTime.now());
  }
}

final calendarNavProvider = NotifierProvider<CalendarNavNotifier, CalendarNavState>(
  CalendarNavNotifier.new,
);

// Calendar orders provider — fetches orders for the current month
final calendarOrdersProvider = FutureProvider<List<Order>>((ref) async {
  final repo = ref.read(calendarRepositoryProvider);
  final branchId = ref.watch(effectiveBranchIdProvider);
  final nav = ref.watch(calendarNavProvider);

  if (branchId == null || branchId.isEmpty) return [];

  final start = DateTime(nav.currentMonth.year, nav.currentMonth.month, 1);
  final end = DateTime(nav.currentMonth.year, nav.currentMonth.month + 1, 0);

  return repo.getCalendarOrders(
    branchId: branchId,
    startDate: start,
    endDate: end,
  );
});

// Day summary map — transforms raw orders into per-day summaries
final calendarDaySummaryProvider = Provider<Map<String, DaySummary>>((ref) {
  final repo = ref.read(calendarRepositoryProvider);
  final nav = ref.watch(calendarNavProvider);
  final ordersAsync = ref.watch(calendarOrdersProvider);

  final orders = ordersAsync.value ?? [];
  if (orders.isEmpty) return {};

  final events = repo.ordersToEvents(orders);
  final start = DateTime(nav.currentMonth.year, nav.currentMonth.month, 1);
  final end = DateTime(nav.currentMonth.year, nav.currentMonth.month + 1, 0);

  return repo.buildDaySummaryMap(events, start, end);
});

// Month stats
class CalendarMonthStats {
  final int totalOrders;
  final int scheduledCount;
  final int ongoingCount;
  final int lateCount;
  final double totalRevenue;

  CalendarMonthStats({
    required this.totalOrders,
    required this.scheduledCount,
    required this.ongoingCount,
    required this.lateCount,
    required this.totalRevenue,
  });
}

final calendarStatsProvider = Provider<CalendarMonthStats>((ref) {
  final dayMap = ref.watch(calendarDaySummaryProvider);
  final ordersAsync = ref.watch(calendarOrdersProvider);
  final orders = ordersAsync.value ?? [];

  int scheduled = 0, ongoing = 0, late = 0;
  double revenue = 0;
  final seenScheduled = <String>{};
  final seenOngoing = <String>{};
  final seenLate = <String>{};

  for (final entry in dayMap.values) {
    for (final event in entry.events) {
      if ((event.status == OrderStatus.scheduled || event.status == OrderStatus.confirmed) &&
          seenScheduled.add(event.orderId)) {
        scheduled++;
      }
      if ((event.status == OrderStatus.ongoing || event.status == OrderStatus.inUse) &&
          seenOngoing.add(event.orderId)) {
        ongoing++;
      }
      if ((event.status == OrderStatus.lateReturn || event.status == OrderStatus.flagged) &&
          seenLate.add(event.orderId)) {
        late++;
      }
    }
    revenue += entry.totalRevenue;
  }

  return CalendarMonthStats(
    totalOrders: orders.length,
    scheduledCount: scheduled,
    ongoingCount: ongoing,
    lateCount: late,
    totalRevenue: revenue,
  );
});
