import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../../core/responsive.dart';

/// Step 2: Rental period selection with auto-defaults.
class StepRentalPeriod extends StatelessWidget {
  final DateTime? startDate;
  final DateTime? endDate;
  final ValueChanged<DateTime> onStartChanged;
  final ValueChanged<DateTime> onEndChanged;

  const StepRentalPeriod({
    super.key,
    this.startDate,
    this.endDate,
    required this.onStartChanged,
    required this.onEndChanged,
  });

  static const _primary = Color(0xFF434343);

  int get _rentalDays {
    if (startDate == null || endDate == null) return 0;
    return endDate!.difference(startDate!).inDays.clamp(1, 365);
  }

  String get _statusLabel {
    if (startDate == null) return '';
    final today = DateTime.now();
    final todayDate = DateTime(today.year, today.month, today.day);
    final start = DateTime(startDate!.year, startDate!.month, startDate!.day);
    if (start.isAfter(todayDate)) return 'Scheduled';
    if (start.isAtSameMomentAs(todayDate)) return 'Ongoing';
    return 'Ongoing';
  }

  Color get _statusColor {
    if (_statusLabel == 'Scheduled') return const Color(0xFF4A90D9);
    return const Color(0xFF7B68EE);
  }

  Future<void> _pickDate(
    BuildContext context,
    String label,
    DateTime? initial,
    ValueChanged<DateTime> onPicked, {
    DateTime? firstDate,
  }) async {
    final effectiveFirstDate = firstDate ?? DateTime.now().subtract(const Duration(days: 7));
    final effectiveLastDate = DateTime.now().add(const Duration(days: 365));
    // Ensure initialDate is never before firstDate (causes picker to silently fail)
    var effectiveInitial = initial ?? DateTime.now();
    if (effectiveInitial.isBefore(effectiveFirstDate)) {
      effectiveInitial = effectiveFirstDate;
    }
    final picked = await showDatePicker(
      context: context,
      initialDate: effectiveInitial,
      firstDate: effectiveFirstDate,
      lastDate: effectiveLastDate,
      helpText: label,
      builder: (ctx, child) => Theme(
        data: Theme.of(ctx).copyWith(
          colorScheme: const ColorScheme.light(
            primary: _primary,
            onPrimary: Colors.white,
            surface: Colors.white,
          ),
        ),
        child: child!,
      ),
    );
    if (picked != null) onPicked(picked);
  }

  String _fmtDate(DateTime? d) =>
      d != null ? DateFormat('dd MMM yyyy').format(d) : 'Select';
  String _fmtDay(DateTime? d) => d != null ? DateFormat('EEEE').format(d) : '';

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: Responsive.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Container(
            padding: Responsive.all(16),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  const Color(0xFF4A90D9).withValues(alpha: 0.08),
                  const Color(0xFF4A90D9).withValues(alpha: 0.02),
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(Responsive.r(14)),
            ),
            child: Row(
              children: [
                Container(
                  padding: Responsive.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFF4A90D9).withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(Responsive.r(10)),
                  ),
                  child: Icon(
                    Icons.date_range_rounded,
                    size: Responsive.icon(22),
                    color: const Color(0xFF4A90D9),
                  ),
                ),
                SizedBox(width: Responsive.w(12)),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Rental Period',
                        style: TextStyle(
                          fontSize: Responsive.sp(15),
                          fontWeight: FontWeight.w800,
                          color: _primary,
                        ),
                      ),
                      SizedBox(height: Responsive.h(2)),
                      Text(
                        'End date defaults to 3 days after start',
                        style: TextStyle(
                          fontSize: Responsive.sp(11),
                          color: Colors.grey[600],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          SizedBox(height: Responsive.h(20)),

          // Date cards
          Container(
            padding: Responsive.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(Responsive.r(16)),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.04),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Column(
              children: [
                _buildDateCard(
                  context,
                  'Start Date',
                  startDate,
                  Icons.play_arrow_rounded,
                  const Color(0xFF2ECC71),
                  () {
                    _pickDate(context, 'Start Date', startDate, onStartChanged);
                  },
                ),
                SizedBox(height: Responsive.h(12)),
                _buildDateCard(
                  context,
                  'End Date',
                  endDate,
                  Icons.stop_rounded,
                  const Color(0xFFFF6B8A),
                  () {
                    _pickDate(
                      context,
                      'End Date',
                      endDate,
                      onEndChanged,
                      firstDate: startDate ?? DateTime.now(),
                    );
                  },
                ),
              ],
            ),
          ),

          SizedBox(height: Responsive.h(16)),
          Container(
            padding: Responsive.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFFFFF8E1),
              borderRadius: BorderRadius.circular(Responsive.r(12)),
              border: Border.all(
                  color: const Color(0xFFF7C873).withValues(alpha: 0.5)),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.info_outline_rounded,
                    size: Responsive.icon(18),
                    color: const Color(0xFFF5A623)),
                SizedBox(width: Responsive.w(10)),
                Expanded(
                  child: Text(
                    'Products are automatically blocked 1 day before pickup and 1 day after return for cleaning & preparation.',
                    style: TextStyle(
                        fontSize: Responsive.sp(11), color: Colors.grey[800]),
                  ),
                ),
              ],
            ),
          ),

          // Duration & Status chips
          if (_rentalDays > 0) ...[
            SizedBox(height: Responsive.h(16)),
            Container(
              padding: Responsive.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(Responsive.r(16)),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.04),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Row(
                children: [
                  // Duration
                  Expanded(
                    child: Container(
                      padding: Responsive.all(14),
                      decoration: BoxDecoration(
                        color: _primary.withValues(alpha: 0.04),
                        borderRadius: BorderRadius.circular(Responsive.r(12)),
                      ),
                      child: Column(
                        children: [
                          Text(
                            '$_rentalDays',
                            style: TextStyle(
                              fontSize: Responsive.sp(24),
                              fontWeight: FontWeight.w900,
                              color: _primary,
                            ),
                          ),
                          Text(
                            'day${_rentalDays > 1 ? 's' : ''}',
                            style: TextStyle(
                              fontSize: Responsive.sp(11),
                              color: Colors.grey[600],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  SizedBox(width: Responsive.w(12)),
                  // Auto status
                  Expanded(
                    child: Container(
                      padding: Responsive.all(14),
                      decoration: BoxDecoration(
                        color: _statusColor.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(Responsive.r(12)),
                      ),
                      child: Column(
                        children: [
                          Icon(
                            _statusLabel == 'Scheduled'
                                ? Icons.schedule_rounded
                                : Icons.play_circle_rounded,
                            size: Responsive.icon(24),
                            color: _statusColor,
                          ),
                          SizedBox(height: Responsive.h(4)),
                          Text(
                            _statusLabel,
                            style: TextStyle(
                              fontSize: Responsive.sp(12),
                              fontWeight: FontWeight.w700,
                              color: _statusColor,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }



  Widget _buildDateCard(
    BuildContext context,
    String label,
    DateTime? date,
    IconData icon,
    Color color,
    VoidCallback onTap,
  ) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(Responsive.r(12)),
      child: Container(
        padding: Responsive.symmetric(horizontal: 14, vertical: 14),
        decoration: BoxDecoration(
          color: date != null ? color.withValues(alpha: 0.06) : Colors.grey[50],
          borderRadius: BorderRadius.circular(Responsive.r(12)),
          border: Border.all(
            color: date != null
                ? color.withValues(alpha: 0.4)
                : Colors.grey[300]!,
          ),
        ),
        child: Row(
          children: [
            Container(
              padding: Responsive.all(8),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(Responsive.r(8)),
              ),
              child: Icon(icon, size: Responsive.icon(20), color: color),
            ),
            SizedBox(width: Responsive.w(12)),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: TextStyle(
                      fontSize: Responsive.sp(10),
                      fontWeight: FontWeight.w700,
                      color: Colors.grey[500],
                      letterSpacing: 0.5,
                    ),
                  ),
                  SizedBox(height: Responsive.h(2)),
                  Text(
                    _fmtDate(date),
                    style: TextStyle(
                      fontSize: Responsive.sp(14),
                      fontWeight: FontWeight.w700,
                      color: date != null ? _primary : Colors.grey[400],
                    ),
                  ),
                  if (date != null)
                    Text(
                      _fmtDay(date),
                      style: TextStyle(
                        fontSize: Responsive.sp(10),
                        color: Colors.grey[500],
                      ),
                    ),
                ],
              ),
            ),
            Icon(
              Icons.edit_calendar_rounded,
              size: Responsive.icon(20),
              color: Colors.grey[400],
            ),
          ],
        ),
      ),
    );
  }
}
