import 'package:flutter/material.dart';
import '../../../core/responsive.dart';
import '../../../core/theme.dart';

class ProductsView extends StatelessWidget {
  const ProductsView({super.key});

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
                'Products',
                style: AppTextStyles.headline5(context),
              ),
              SizedBox(height: context.hs(24)),
              const Center(
                child: Text('Products View - TODO: Implement'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class ProductDetailView extends StatelessWidget {
  final String productId;
  const ProductDetailView({super.key, required this.productId});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Product Detail')),
      body: Center(
        child: Text('Product Detail: $productId - TODO: Implement'),
      ),
    );
  }
}
