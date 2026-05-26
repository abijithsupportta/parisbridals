import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../responsive.dart';
import '../theme.dart';
import 'app_bottom_nav.dart';

/// Main Scaffold with Bottom Navigation
class AppMainScaffold extends ConsumerStatefulWidget {
  final Widget child;
  final int currentIndex;

  const AppMainScaffold({
    super.key,
    required this.child,
    required this.currentIndex,
  });

  @override
  ConsumerState<AppMainScaffold> createState() => _AppMainScaffoldState();
}

class _AppMainScaffoldState extends ConsumerState<AppMainScaffold> {
  final List<String> _routes = ['/', '/categories', '/products', '/orders', '/customers'];

  void _onTap(int index) {
    if (index != widget.currentIndex) {
      context.go(_routes[index]);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.white,
      body: widget.child,
      bottomNavigationBar: AppBottomNav(
        currentIndex: widget.currentIndex,
        onTap: _onTap,
      ),
    );
  }
}
