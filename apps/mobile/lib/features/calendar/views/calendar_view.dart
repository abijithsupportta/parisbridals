import 'package:flutter/material.dart';
import '../../../core/responsive.dart';

class CalendarView extends StatelessWidget {
  const CalendarView({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.calendar_month_outlined, size: Responsive.icon(48), color: Colors.grey[400]),
          SizedBox(height: Responsive.h(16)),
          Text(
            'Calendar / Bookings',
            style: TextStyle(fontSize: Responsive.sp(18), fontWeight: FontWeight.bold),
          ),
          SizedBox(height: Responsive.h(6)),
          Text(
            'Coming soon...',
            style: TextStyle(fontSize: Responsive.sp(13), color: Colors.grey),
          ),
        ],
      ),
    );
  }
}
