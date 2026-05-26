import 'package:flutter/material.dart';
import '../../../core/responsive.dart';
import '../../../core/theme.dart';

class CustomersView extends StatelessWidget {
  const CustomersView({super.key});

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
                'Customers',
                style: AppTextStyles.headline5(context),
              ),
              SizedBox(height: context.hs(24)),
              const Center(
                child: Text('Customers View - TODO: Implement'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class CustomerDetailView extends StatelessWidget {
  final String customerId;
  const CustomerDetailView({super.key, required this.customerId});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Customer Detail')),
      body: Center(
        child: Text('Customer Detail: $customerId - TODO: Implement'),
      ),
    );
  }
}
