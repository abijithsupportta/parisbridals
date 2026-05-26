import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:paris_mobile/features/auth/views/login_view.dart';
import 'package:paris_mobile/features/home/views/home_view.dart';
import 'package:paris_mobile/features/categories/views/categories_view.dart';
import 'package:paris_mobile/features/products/views/products_view.dart';
import 'package:paris_mobile/features/orders/views/orders_view.dart';
import 'package:paris_mobile/features/customers/views/customers_view.dart';
import 'package:paris_mobile/core/components/app_main_scaffold.dart';

/// App Router Configuration using go_router with shell pattern
class AppRouter {
  static final GoRouter router = GoRouter(
    initialLocation: '/login',
    routes: [
      // Auth Routes
      GoRoute(
        path: '/login',
        name: 'login',
        builder: (context, state) => const LoginView(),
      ),

      // Main App Shell with Bottom Nav
      ShellRoute(
        builder: (context, state, child) {
          // Get current index based on path
          final path = state.uri.path;
          int currentIndex = 0;
          if (path.startsWith('/categories')) currentIndex = 1;
          else if (path.startsWith('/products')) currentIndex = 2;
          else if (path.startsWith('/orders')) currentIndex = 3;
          else if (path.startsWith('/customers')) currentIndex = 4;
          
          return AppMainScaffold(
            currentIndex: currentIndex,
            child: child,
          );
        },
        routes: [
          GoRoute(
            path: '/',
            name: 'home',
            builder: (context, state) => const HomeView(),
          ),
          GoRoute(
            path: '/categories',
            name: 'categories',
            builder: (context, state) => const CategoriesView(),
          ),
          GoRoute(
            path: '/categories/:id',
            name: 'category_detail',
            builder: (context, state) {
              final id = state.pathParameters['id']!;
              return CategoryDetailView(categoryId: id);
            },
          ),
          GoRoute(
            path: '/products',
            name: 'products',
            builder: (context, state) => const ProductsView(),
          ),
          GoRoute(
            path: '/products/:id',
            name: 'product_detail',
            builder: (context, state) {
              final id = state.pathParameters['id']!;
              return ProductDetailView(productId: id);
            },
          ),
          GoRoute(
            path: '/orders',
            name: 'orders',
            builder: (context, state) => const OrdersView(),
          ),
          GoRoute(
            path: '/orders/:id',
            name: 'order_detail',
            builder: (context, state) {
              final id = state.pathParameters['id']!;
              return OrderDetailView(orderId: id);
            },
          ),
          GoRoute(
            path: '/customers',
            name: 'customers',
            builder: (context, state) => const CustomersView(),
          ),
          GoRoute(
            path: '/customers/:id',
            name: 'customer_detail',
            builder: (context, state) {
              final id = state.pathParameters['id']!;
              return CustomerDetailView(customerId: id);
            },
          ),
        ],
      ),
    ],
    errorBuilder: (context, state) => Scaffold(
      body: Center(
        child: Text('Page not found: ${state.uri}'),
      ),
    ),
  );
}
