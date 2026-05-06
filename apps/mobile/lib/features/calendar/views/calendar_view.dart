import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/responsive.dart';
import '../providers/calendar_provider.dart';
import '../repositories/calendar_repository.dart';
import '../../orders/models/order.dart';


class CalendarView extends ConsumerStatefulWidget {
  const CalendarView({super.key});

  @override
  ConsumerState<CalendarView> createState() => _CalendarViewState();
}

class _CalendarViewState extends ConsumerState<CalendarView> {
  String? _selectedDate;

  static const _primary = Color(0xFF434343);

  static const _bg = Color(0xFFF8F8F8);
  static const _danger = Color(0xFFFF6B8A);
  static const _success = Color(0xFF10B981);

  final _currFmt = NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 0);
  final _weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  @override
  Widget build(BuildContext context) {
    Responsive.init(context);
    final nav = ref.watch(calendarNavProvider);
    final ordersAsync = ref.watch(calendarOrdersProvider);
    final dayMap = ref.watch(calendarDaySummaryProvider);
    final stats = ref.watch(calendarStatsProvider);

    return Container(
      color: _bg,
      child: Column(
        children: [
          _buildHeader(nav),
          _buildStats(stats, ordersAsync.isLoading),
          Expanded(
            child: ordersAsync.when(
              data: (_) => _buildCalendarGrid(nav.currentMonth, dayMap),
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.error_outline, size: Responsive.icon(40), color: _danger),
                    SizedBox(height: Responsive.h(8)),
                    Text('$e', style: TextStyle(fontSize: Responsive.sp(12), color: Colors.grey), textAlign: TextAlign.center),
                    SizedBox(height: Responsive.h(12)),
                    ElevatedButton(onPressed: () => ref.invalidate(calendarOrdersProvider), child: const Text('Retry')),
                  ],
                ),
              ),
            ),
          ),
          _buildLegend(),
        ],
      ),
    );
  }

  // ── Header with month nav ──
  Widget _buildHeader(CalendarNavState nav) {
    return Container(
      padding: Responsive.symmetric(horizontal: 16, vertical: 10),
      color: Colors.white,
      child: Row(
        children: [
          IconButton(
            icon: Icon(Icons.chevron_left_rounded, size: Responsive.icon(24), color: _primary),
            onPressed: () => ref.read(calendarNavProvider.notifier).goToPrevMonth(),
          ),
          Expanded(
            child: GestureDetector(
              onTap: () => ref.read(calendarNavProvider.notifier).goToToday(),
              child: Text(
                nav.monthLabel,
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: Responsive.sp(16), fontWeight: FontWeight.bold, color: _primary),
              ),
            ),
          ),
          IconButton(
            icon: Icon(Icons.chevron_right_rounded, size: Responsive.icon(24), color: _primary),
            onPressed: () => ref.read(calendarNavProvider.notifier).goToNextMonth(),
          ),
        ],
      ),
    );
  }

  // ── Stats bar ──
  Widget _buildStats(CalendarMonthStats stats, bool isLoading) {
    return Container(
      padding: Responsive.symmetric(horizontal: 12, vertical: 8),
      color: Colors.white,
      child: Row(
        children: [
          _buildStatChip('${stats.totalOrders}', 'Orders', _primary),
          SizedBox(width: Responsive.w(6)),
          _buildStatChip('${stats.scheduledCount}', 'Scheduled', const Color(0xFF4A90D9)),
          SizedBox(width: Responsive.w(6)),
          _buildStatChip('${stats.ongoingCount}', 'Ongoing', const Color(0xFF7B68EE)),
          SizedBox(width: Responsive.w(6)),
          _buildStatChip('${stats.lateCount}', 'Late', _danger),
        ],
      ),
    );
  }

  Widget _buildStatChip(String value, String label, Color color) {
    return Expanded(
      child: Container(
        padding: Responsive.symmetric(vertical: 6, horizontal: 4),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(Responsive.r(8)),
        ),
        child: Column(
          children: [
            Text(value, style: TextStyle(fontSize: Responsive.sp(14), fontWeight: FontWeight.bold, color: color)),
            Text(label, style: TextStyle(fontSize: Responsive.sp(9), color: color, fontWeight: FontWeight.w600), maxLines: 1, overflow: TextOverflow.ellipsis),
          ],
        ),
      ),
    );
  }

  // ── Calendar grid ──
  Widget _buildCalendarGrid(DateTime currentMonth, Map<String, DaySummary> dayMap) {
    final monthStart = DateTime(currentMonth.year, currentMonth.month, 1);
    final monthEnd = DateTime(currentMonth.year, currentMonth.month + 1, 0);

    // Find calendar start (Sunday before monthStart)
    final calStart = monthStart.subtract(Duration(days: monthStart.weekday % 7));
    // Find calendar end (Saturday after monthEnd)
    final calEnd = monthEnd.add(Duration(days: (6 - monthEnd.weekday % 7) % 7 + (monthEnd.weekday == 6 ? 0 : 1)));

    final days = <DateTime>[];
    var d = calStart;
    while (!d.isAfter(calEnd)) {
      days.add(d);
      d = d.add(const Duration(days: 1));
    }
    // Ensure we have complete weeks
    while (days.length % 7 != 0) {
      days.add(days.last.add(const Duration(days: 1)));
    }

    final todayStr = DateFormat('yyyy-MM-dd').format(DateTime.now());

    return Column(
      children: [
        // Weekday header
        Container(
          color: Colors.white,
          padding: Responsive.symmetric(vertical: 6),
          child: Row(
            children: _weekDays.map((wd) => Expanded(
              child: Text(wd, textAlign: TextAlign.center,
                style: TextStyle(fontSize: Responsive.sp(10), fontWeight: FontWeight.w700, color: Colors.grey[500])),
            )).toList(),
          ),
        ),
        Divider(height: 1, color: Colors.grey[200]),
        // Day grid
        Expanded(
          child: GridView.builder(
            padding: EdgeInsets.zero,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 7,
              childAspectRatio: days.length <= 35 ? 0.65 : 0.78,
            ),
            itemCount: days.length,
            itemBuilder: (_, i) {
              final day = days[i];
              final dateStr = DateFormat('yyyy-MM-dd').format(day);
              final isCurrentMonth = day.month == currentMonth.month && day.year == currentMonth.year;
              final isToday = dateStr == todayStr;
              final isSelected = dateStr == _selectedDate;
              final summary = dayMap[dateStr];

              return _buildDayCell(day, dateStr, isCurrentMonth, isToday, isSelected, summary);
            },
          ),
        ),
      ],
    );
  }

  Widget _buildDayCell(DateTime day, String dateStr, bool isCurrentMonth, bool isToday, bool isSelected, DaySummary? summary) {
    final total = summary?.totalOrders ?? 0;

    return GestureDetector(
      onTap: isCurrentMonth ? () {
        setState(() => _selectedDate = _selectedDate == dateStr ? null : dateStr);
        if (summary != null && summary.totalOrders > 0) {
          _showDayDetail(dateStr, summary);
        }
      } : null,
      child: Container(
        decoration: BoxDecoration(
          color: isSelected ? _primary.withValues(alpha: 0.06) : (isCurrentMonth ? Colors.white : Colors.grey[50]),
          border: Border(
            bottom: BorderSide(color: Colors.grey[200]!, width: 0.5),
            right: BorderSide(color: Colors.grey[200]!, width: 0.5),
          ),
        ),
        padding: Responsive.all(3),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Day number + count badge
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  width: Responsive.w(22),
                  height: Responsive.w(22),
                  alignment: Alignment.center,
                  decoration: isToday ? BoxDecoration(
                    color: _primary,
                    borderRadius: BorderRadius.circular(Responsive.r(11)),
                  ) : null,
                  child: Text(
                    '${day.day}',
                    style: TextStyle(
                      fontSize: Responsive.sp(10),
                      fontWeight: FontWeight.w700,
                      color: !isCurrentMonth ? Colors.grey[300] : isToday ? Colors.white : _primary,
                    ),
                  ),
                ),
                if (total > 0 && isCurrentMonth)
                  Container(
                    padding: Responsive.symmetric(horizontal: 4, vertical: 1),
                    decoration: BoxDecoration(
                      color: total >= 5 ? _danger.withValues(alpha: 0.15) : total >= 3 ? Colors.amber.withValues(alpha: 0.15) : Colors.grey[100],
                      borderRadius: BorderRadius.circular(Responsive.r(6)),
                    ),
                    child: Text(
                      '$total',
                      style: TextStyle(
                        fontSize: Responsive.sp(8),
                        fontWeight: FontWeight.w800,
                        color: total >= 5 ? _danger : total >= 3 ? Colors.amber[800] : Colors.grey[600],
                      ),
                    ),
                  ),
              ],
            ),
            // Event dots
            if (isCurrentMonth && summary != null) ...[
              SizedBox(height: Responsive.h(2)),
              if (summary.startingCount > 0)
                _buildEventDot('${summary.startingCount} start', _success),
              if (summary.endingCount > 0)
                _buildEventDot('${summary.endingCount} end', Colors.orange),
              if (summary.hasLateReturns)
                _buildEventDot('late', _danger),
              if (summary.ongoingCount > 0 && summary.startingCount == 0 && summary.endingCount == 0)
                _buildEventDot('${summary.ongoingCount} active', const Color(0xFF7B68EE)),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildEventDot(String label, Color color) {
    return Padding(
      padding: EdgeInsets.only(bottom: Responsive.h(1)),
      child: Row(
        children: [
          Container(
            width: Responsive.w(5),
            height: Responsive.w(5),
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
          ),
          SizedBox(width: Responsive.w(3)),
          Expanded(
            child: Text(
              label,
              style: TextStyle(fontSize: Responsive.sp(7), color: color, fontWeight: FontWeight.w600),
              maxLines: 1, overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }

  // ── Legend ──
  Widget _buildLegend() {
    return Container(
      color: Colors.white,
      padding: Responsive.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _legendItem(_success, 'Starting'),
          _legendItem(const Color(0xFF7B68EE), 'Ongoing'),
          _legendItem(Colors.orange, 'Ending'),
          _legendItem(_danger, 'Late'),
        ],
      ),
    );
  }

  Widget _legendItem(Color color, String label) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(width: Responsive.w(8), height: Responsive.w(8), decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
        SizedBox(width: Responsive.w(4)),
        Text(label, style: TextStyle(fontSize: Responsive.sp(10), color: Colors.grey[600], fontWeight: FontWeight.w600)),
      ],
    );
  }

  // ── Day detail bottom sheet ──
  void _showDayDetail(String dateStr, DaySummary summary) {
    final dateParsed = DateTime.parse(dateStr);
    final dateLabel = DateFormat('EEEE, d MMMM yyyy').format(dateParsed);

    // Group events: starting, ongoing, ending
    final starting = <CalendarEvent>[];
    final ongoing = <CalendarEvent>[];
    final ending = <CalendarEvent>[];
    final seen = <String>{};

    for (final event in summary.events) {
      if (!seen.add(event.orderId)) continue;
      if (event.startDate == dateStr) {
        starting.add(event);
      } else if (event.endDate == dateStr) {
        ending.add(event);
      } else {
        ongoing.add(event);
      }
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => DraggableScrollableSheet(
        initialChildSize: 0.55,
        maxChildSize: 0.85,
        minChildSize: 0.3,
        builder: (ctx, scrollCtrl) => Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(Responsive.r(20))),
          ),
          child: Column(
            children: [
              // Drag handle
              Container(
                margin: Responsive.only(top: 10, bottom: 6),
                width: Responsive.w(40),
                height: Responsive.h(4),
                decoration: BoxDecoration(color: Colors.grey[300], borderRadius: BorderRadius.circular(2)),
              ),
              // Header
              Padding(
                padding: Responsive.symmetric(horizontal: 16, vertical: 8),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(dateLabel, style: TextStyle(fontSize: Responsive.sp(14), fontWeight: FontWeight.bold, color: _primary)),
                          SizedBox(height: Responsive.h(2)),
                          Text('${seen.length} order${seen.length != 1 ? 's' : ''}',
                            style: TextStyle(fontSize: Responsive.sp(11), color: Colors.grey[500])),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: Icon(Icons.close_rounded, size: Responsive.icon(22), color: Colors.grey),
                      onPressed: () => Navigator.pop(ctx),
                    ),
                  ],
                ),
              ),
              Divider(height: 1, color: Colors.grey[200]),
              // Event list
              Expanded(
                child: ListView(
                  controller: scrollCtrl,
                  padding: Responsive.all(16),
                  children: [
                    if (starting.isNotEmpty) _buildEventSection('Starting', Icons.arrow_downward_rounded, _success, starting),
                    if (ongoing.isNotEmpty) _buildEventSection('Ongoing', Icons.access_time_rounded, const Color(0xFF7B68EE), ongoing),
                    if (ending.isNotEmpty) _buildEventSection('Ending', Icons.arrow_upward_rounded, Colors.orange, ending),
                    if (starting.isEmpty && ongoing.isEmpty && ending.isEmpty)
                      Center(child: Text('No bookings', style: TextStyle(fontSize: Responsive.sp(13), color: Colors.grey))),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildEventSection(String title, IconData icon, Color color, List<CalendarEvent> events) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: Responsive.only(bottom: 8, top: 4),
          child: Row(
            children: [
              Icon(icon, size: Responsive.icon(14), color: color),
              SizedBox(width: Responsive.w(4)),
              Text('$title (${events.length})',
                style: TextStyle(fontSize: Responsive.sp(11), fontWeight: FontWeight.w800, color: color, letterSpacing: 0.5)),
            ],
          ),
        ),
        ...events.map((e) => _buildEventCard(e)),
        SizedBox(height: Responsive.h(12)),
      ],
    );
  }

  Widget _buildEventCard(CalendarEvent event) {
    final statusColor = _getStatusColor(event.status);
    return GestureDetector(
      onTap: () {
        Navigator.pop(context); // close bottom sheet
        // Navigate to order detail — we need the full Order, so build a minimal one
        // Just navigate with the order ID via the orders list
      },
      child: Container(
        margin: Responsive.only(bottom: 8),
        padding: Responsive.all(12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(Responsive.r(10)),
          border: Border.all(color: Colors.grey[200]!),
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: 4, offset: const Offset(0, 2))],
        ),
        child: Column(
          children: [
            Row(
              children: [
                Container(
                  width: Responsive.w(36),
                  height: Responsive.w(36),
                  decoration: BoxDecoration(
                    color: _primary.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(Responsive.r(18)),
                  ),
                  child: Center(
                    child: Text(
                      event.customerName.isNotEmpty ? event.customerName[0].toUpperCase() : 'C',
                      style: TextStyle(fontSize: Responsive.sp(14), fontWeight: FontWeight.w800, color: _primary),
                    ),
                  ),
                ),
                SizedBox(width: Responsive.w(10)),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(event.customerName,
                        style: TextStyle(fontSize: Responsive.sp(13), fontWeight: FontWeight.w700, color: _primary),
                        maxLines: 1, overflow: TextOverflow.ellipsis),
                      SizedBox(height: Responsive.h(2)),
                      Text(event.customerPhone,
                        style: TextStyle(fontSize: Responsive.sp(10), color: Colors.grey[500]),
                        maxLines: 1, overflow: TextOverflow.ellipsis),
                    ],
                  ),
                ),
                Container(
                  padding: Responsive.symmetric(horizontal: 6, vertical: 3),
                  decoration: BoxDecoration(
                    color: statusColor.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(Responsive.r(6)),
                  ),
                  child: Text(
                    _formatStatus(event.status),
                    style: TextStyle(fontSize: Responsive.sp(9), fontWeight: FontWeight.w700, color: statusColor),
                  ),
                ),
              ],
            ),
            SizedBox(height: Responsive.h(8)),
            Divider(height: 1, color: Colors.grey[100]),
            SizedBox(height: Responsive.h(8)),
            Row(
              children: [
                Icon(Icons.calendar_today_rounded, size: Responsive.icon(12), color: Colors.grey[400]),
                SizedBox(width: Responsive.w(4)),
                Expanded(
                  child: Text(
                    '${_fmtDate(event.startDate)} — ${_fmtDate(event.endDate)}',
                    style: TextStyle(fontSize: Responsive.sp(10), color: Colors.grey[600]),
                    maxLines: 1, overflow: TextOverflow.ellipsis,
                  ),
                ),
                Text('${event.itemCount} item${event.itemCount != 1 ? 's' : ''}',
                  style: TextStyle(fontSize: Responsive.sp(9), color: Colors.grey[500], fontWeight: FontWeight.w600)),
                SizedBox(width: Responsive.w(8)),
                Text(_currFmt.format(event.totalAmount),
                  style: TextStyle(fontSize: Responsive.sp(12), fontWeight: FontWeight.w800, color: _primary)),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Color _getStatusColor(OrderStatus s) {
    switch (s) {
      case OrderStatus.scheduled: case OrderStatus.confirmed: return const Color(0xFF4A90D9);
      case OrderStatus.ongoing: case OrderStatus.inUse: case OrderStatus.delivered: return const Color(0xFF7B68EE);
      case OrderStatus.returned: case OrderStatus.completed: return _success;
      case OrderStatus.lateReturn: case OrderStatus.flagged: return _danger;
      case OrderStatus.partial: return Colors.orange;
      case OrderStatus.cancelled: return Colors.grey;
      case OrderStatus.pending: return Colors.grey;
    }
  }

  String _formatStatus(OrderStatus s) {
    switch (s) {
      case OrderStatus.scheduled: return 'Scheduled';
      case OrderStatus.confirmed: return 'Confirmed';
      case OrderStatus.ongoing: return 'Ongoing';
      case OrderStatus.inUse: return 'In Use';
      case OrderStatus.delivered: return 'Delivered';
      case OrderStatus.returned: return 'Returned';
      case OrderStatus.completed: return 'Completed';
      case OrderStatus.lateReturn: return 'Late';
      case OrderStatus.flagged: return 'Flagged';
      case OrderStatus.partial: return 'Partial';
      case OrderStatus.cancelled: return 'Cancelled';
      case OrderStatus.pending: return 'Pending';
    }
  }

  String _fmtDate(String dateStr) {
    try { return DateFormat('d MMM').format(DateTime.parse(dateStr)); }
    catch (_) { return dateStr; }
  }
}
