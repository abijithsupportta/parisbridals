import 'package:flutter/material.dart';
import '../../../core/responsive.dart';
import '../../../core/theme.dart';

class CategoriesView extends StatelessWidget {
  const CategoriesView({super.key});

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
                'Categories',
                style: AppTextStyles.headline5(context),
              ),
              SizedBox(height: context.hs(24)),
              const Center(
                child: Text('Categories View - TODO: Implement'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class CategoryDetailView extends StatelessWidget {
  final String categoryId;
  const CategoryDetailView({super.key, required this.categoryId});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Category Detail')),
      body: Center(
        child: Text('Category Detail: $categoryId - TODO: Implement'),
      ),
    );
  }
}
