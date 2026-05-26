import 'package:flutter/material.dart';
import '../../../core/responsive.dart';
import '../../../core/theme.dart';

class OrdersView extends StatelessWidget {
  const OrdersView({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.lightGrey,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: EdgeInsets.all(context.sp(16)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Orders',
                style: AppTextStyles.headline5(context),
              ),
              SizedBox(height: context.hs(24)),
              const Center(
                child: Text('Orders View - TODO: Implement'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class OrderDetailView extends StatelessWidget {
  final String orderId;
  const OrderDetailView({super.key, required this.orderId});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Order Detail')),
      body: Center(
        child: Text('Order Detail: $orderId - TODO: Implement'),
      ),
    );
  }
}
