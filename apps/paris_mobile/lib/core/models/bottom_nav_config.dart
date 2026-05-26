import 'package:flutter/material.dart';

/// Bottom Navigation Item Configuration
class BottomNavItemConfig {
  final String label;
  final IconData icon;
  final IconData activeIcon;
  final String route;

  const BottomNavItemConfig({
    required this.label,
    required this.icon,
    required this.activeIcon,
    required this.route,
  });
}

/// Bottom Navigation Configuration
class BottomNavConfig {
  final List<BottomNavItemConfig> items;
  final double defaultIconSize;
  final double defaultFontSize;
  final double defaultHorizontalPadding;
  final double defaultVerticalPadding;
  final double defaultSpacing;
  final double defaultMinHeight;
  final double smallScreenThreshold;
  final double verySmallScreenThreshold;

  const BottomNavConfig({
    required this.items,
    this.defaultIconSize = 24.0,
    this.defaultFontSize = 12.0,
    this.defaultHorizontalPadding = 12.0,
    this.defaultVerticalPadding = 8.0,
    this.defaultSpacing = 4.0,
    this.defaultMinHeight = 64.0,
    this.smallScreenThreshold = 360.0,
    this.verySmallScreenThreshold = 320.0,
  });

  /// Get scaling factor based on screen width
  double getScalingFactor(double screenWidth) {
    if (screenWidth < verySmallScreenThreshold) {
      return 0.75; // 75% of default for very small screens
    } else if (screenWidth < smallScreenThreshold) {
      return 0.85; // 85% of default for small screens
    }
    return 1.0; // 100% for normal screens
  }

  /// Get icon size for screen width
  double getIconSize(double screenWidth) {
    return defaultIconSize * getScalingFactor(screenWidth);
  }

  /// Get font size for screen width
  double getFontSize(double screenWidth) {
    return defaultFontSize * getScalingFactor(screenWidth);
  }

  /// Get horizontal padding for screen width
  double getHorizontalPadding(double screenWidth) {
    return defaultHorizontalPadding * getScalingFactor(screenWidth);
  }

  /// Get vertical padding for screen width
  double getVerticalPadding(double screenWidth) {
    return defaultVerticalPadding * getScalingFactor(screenWidth);
  }

  /// Get spacing for screen width
  double getSpacing(double screenWidth) {
    return defaultSpacing * getScalingFactor(screenWidth);
  }

  /// Get min height for screen width
  double getMinHeight(double screenWidth) {
    return defaultMinHeight * getScalingFactor(screenWidth);
  }

  /// Get shortened label for small screens
  String getShortenedLabel(String label, double screenWidth) {
    if (screenWidth < verySmallScreenThreshold) {
      // Very short abbreviations
      final abbreviations = {
        'Home': 'Home',
        'Categories': 'Cats',
        'Products': 'Prods',
        'Orders': 'Ord',
        'Customers': 'Cust',
      };
      return abbreviations[label] ?? label.substring(0, 3);
    } else if (screenWidth < smallScreenThreshold) {
      // Shorter labels
      final abbreviations = {
        'Home': 'Home',
        'Categories': 'Cats',
        'Products': 'Prods',
        'Orders': 'Orders',
        'Customers': 'Cust',
      };
      return abbreviations[label] ?? label;
    }
    return label;
  }
}

/// Default bottom navigation configuration
const defaultBottomNavConfig = BottomNavConfig(
  items: [
    BottomNavItemConfig(
      label: 'Home',
      icon: Icons.home_outlined,
      activeIcon: Icons.home,
      route: '/',
    ),
    BottomNavItemConfig(
      label: 'Categories',
      icon: Icons.category_outlined,
      activeIcon: Icons.category,
      route: '/categories',
    ),
    BottomNavItemConfig(
      label: 'Products',
      icon: Icons.inventory_2_outlined,
      activeIcon: Icons.inventory_2,
      route: '/products',
    ),
    BottomNavItemConfig(
      label: 'Orders',
      icon: Icons.receipt_long_outlined,
      activeIcon: Icons.receipt_long,
      route: '/orders',
    ),
    BottomNavItemConfig(
      label: 'Customers',
      icon: Icons.people_outline,
      activeIcon: Icons.people,
      route: '/customers',
    ),
  ],
);
