import 'package:flutter/material.dart';
import '../../../core/responsive.dart';

class OrdersView extends StatelessWidget {
  const OrdersView({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.receipt_long_outlined, size: Responsive.icon(48), color: Colors.grey[400]),
          SizedBox(height: Responsive.h(16)),
          Text(
            'Orders Module',
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
