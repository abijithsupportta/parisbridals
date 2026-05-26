import 'package:dio/dio.dart';
import 'package:intl/intl.dart';
import '../../../core/api_client.dart';
import '../../orders/models/order.dart';

/// A single calendar event derived from an order.
class CalendarEvent {
  final String orderId;
  final String customerName;
  final String customerPhone;
  final String startDate;
  final String endDate;
  final OrderStatus status;
  final double totalAmount;
  final int itemCount;
  final bool depositCollected;

  CalendarEvent({
    required this.orderId,
    required this.customerName,
    required this.customerPhone,
    required this.startDate,
    required this.endDate,
    required this.status,
    required this.totalAmount,
    required this.itemCount,
    required this.depositCollected,
  });

  factory CalendarEvent.fromOrder(Order order) {
    return CalendarEvent(
      orderId: order.id,
      customerName: order.customer?.name ?? 'Unknown',
      customerPhone: order.customer?.phone ?? '',
      startDate: order.startDate,
      endDate: order.endDate,
      status: order.status,
      totalAmount: order.totalAmount,
      itemCount: order.items?.length ?? 0,
      depositCollected: order.depositCollected ?? false,
    );
  }
}

/// Summary for a single day — contains all events active on that day.
class DaySummary {
  final String date;
  final List<CalendarEvent> events;
  int startingCount;
  int endingCount;
  int ongoingCount;
  int totalOrders;
  double totalRevenue;
  bool hasLateReturns;

  DaySummary({
    required this.date,
    List<CalendarEvent>? events,
    this.startingCount = 0,
    this.endingCount = 0,
    this.ongoingCount = 0,
    this.totalOrders = 0,
    this.totalRevenue = 0,
    this.hasLateReturns = false,
  }) : events = events ?? [];
}

/// Repository that fetches calendar orders from the admin API.
class CalendarRepository {
  final Dio _client = apiClient;
  final _dateFmt = DateFormat('yyyy-MM-dd');

  /// Fetch all orders active within the given date range for a branch.
  Future<List<Order>> getCalendarOrders({
    required String branchId,
    required DateTime startDate,
    required DateTime endDate,
  }) async {
    try {
      final response = await _client.get('/calendar', queryParameters: {
        'branch_id': branchId,
        'start_date': _dateFmt.format(startDate),
        'end_date': _dateFmt.format(endDate),
      });

      if (response.statusCode == 200 && response.data['success'] == true) {
        final ordersData = response.data['data'] as List;
        return ordersData.map((e) => Order.fromJson(e)).toList();
      }
      throw Exception(response.data?['error'] ?? 'Failed to load calendar orders');
    } on DioException catch (e) {
      final statusCode = e.response?.statusCode;
      final body = e.response?.data;
      throw Exception('Calendar API error ($statusCode): ${body?['error'] ?? e.message}');
    }
  }

  /// Transform a list of orders into CalendarEvents.
  List<CalendarEvent> ordersToEvents(List<Order> orders) {
    return orders.map((o) => CalendarEvent.fromOrder(o)).toList();
  }

  /// Build a DaySummary map for each day in the range.
  /// Each event spans from startDate to endDate, and is placed on every day
  /// within that range — matching the admin web calendar behavior.
  Map<String, DaySummary> buildDaySummaryMap(
    List<CalendarEvent> events,
    DateTime rangeStart,
    DateTime rangeEnd,
  ) {
    final map = <String, DaySummary>{};

    // Initialize all days
    var day = DateTime(rangeStart.year, rangeStart.month, rangeStart.day);
    final end = DateTime(rangeEnd.year, rangeEnd.month, rangeEnd.day);
    while (!day.isAfter(end)) {
      final dateStr = _dateFmt.format(day);
      map[dateStr] = DaySummary(date: dateStr);
      day = day.add(const Duration(days: 1));
    }

    // Distribute events across days
    for (final event in events) {
      final evStart = DateTime.parse(event.startDate);
      final evEnd = DateTime.parse(event.endDate);

      var current = DateTime(rangeStart.year, rangeStart.month, rangeStart.day);
      while (!current.isAfter(end)) {
        final dateStr = _dateFmt.format(current);
        final summary = map[dateStr];

        if (summary != null && !current.isBefore(evStart) && !current.isAfter(evEnd)) {
          summary.events.add(event);
          summary.totalOrders++;

          if (_isSameDay(current, evStart)) {
            summary.startingCount++;
            summary.totalRevenue += event.totalAmount;
          } else if (_isSameDay(current, evEnd)) {
            summary.endingCount++;
          } else {
            summary.ongoingCount++;
          }

          if (event.status == OrderStatus.lateReturn || event.status == OrderStatus.flagged) {
            summary.hasLateReturns = true;
          }
        }

        current = current.add(const Duration(days: 1));
      }
    }

    return map;
  }

  bool _isSameDay(DateTime a, DateTime b) {
    return a.year == b.year && a.month == b.month && a.day == b.day;
  }
}
