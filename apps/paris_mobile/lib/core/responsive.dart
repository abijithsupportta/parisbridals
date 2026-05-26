import 'package:flutter/material.dart';

/// Responsive utilities for dynamic screen sizing
/// All sizes are calculated based on screen dimensions
class Responsive {
  Responsive._();

  /// Get screen width
  static double screenWidth(BuildContext context) {
    return MediaQuery.of(context).size.width;
  }

  /// Get screen height
  static double screenHeight(BuildContext context) {
    return MediaQuery.of(context).size.height;
  }

  /// Base design width (reference for calculations)
  static const double baseWidth = 375.0;
  static const double baseHeight = 812.0;

  /// Scale factor based on width
  static double widthScale(BuildContext context) {
    return screenWidth(context) / baseWidth;
  }

  /// Scale factor based on height
  static double heightScale(BuildContext context) {
    return screenHeight(context) / baseHeight;
  }

  /// Dynamic width scaling
  static double w(BuildContext context, double value) {
    return value * widthScale(context);
  }

  /// Dynamic height scaling
  static double h(BuildContext context, double value) {
    return value * heightScale(context);
  }

  /// Dynamic font size scaling
  static double sp(BuildContext context, double value) {
    return value * widthScale(context);
  }

  /// Dynamic radius scaling
  static double r(BuildContext context, double value) {
    return value * widthScale(context);
  }

  /// Dynamic padding/margin scaling
  static double p(BuildContext context, double value) {
    return value * widthScale(context);
  }

  /// Dynamic icon size scaling
  static double icon(BuildContext context, double value) {
    return value * widthScale(context);
  }

  /// Check if device is tablet
  static bool isTablet(BuildContext context) {
    return screenWidth(context) > 600;
  }

  /// Check if device is mobile
  static bool isMobile(BuildContext context) {
    return screenWidth(context) <= 600;
  }

  /// Get responsive columns count
  static int columns(BuildContext context) {
    if (isTablet(context)) {
      if (screenWidth(context) > 900) return 4;
      return 3;
    }
    return 2;
  }
}

/// Extension for easy access to responsive utilities
extension ResponsiveExtension on BuildContext {
  double get w => Responsive.screenWidth(this);
  double get h => Responsive.screenHeight(this);
  double ws(double value) => Responsive.w(this, value);
  double hs(double value) => Responsive.h(this, value);
  double ssp(double value) => Responsive.sp(this, value);
  double sr(double value) => Responsive.r(this, value);
  double sp(double value) => Responsive.p(this, value);
  double sicon(double value) => Responsive.icon(this, value);
  bool get isTablet => Responsive.isTablet(this);
  bool get isMobile => Responsive.isMobile(this);
  int get columns => Responsive.columns(this);
}
