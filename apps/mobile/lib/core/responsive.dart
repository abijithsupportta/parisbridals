import 'package:flutter/material.dart';

/// Responsive utility that scales all sizes relative to a base design.
/// Base design: 375 x 812 (iPhone X / standard mobile design).
class Responsive {
  // Use safe defaults so that if init() hasn't been called yet
  // (e.g. after Android activity recreation), we don't crash with
  // LateInitializationError. The defaults match a 375x812 device
  // (scale = 1.0) which produces identical output to the base design.
  static double _screenWidth = 375.0;
  static double _screenHeight = 812.0;
  static double _scaleWidth = 1.0;
  static double _scaleHeight = 1.0;
  static double _scaleText = 1.0;
  static bool _initialized = false;

  /// Call once from the top-level widget's build (or in MainLayout).
  static void init(BuildContext context) {
    final size = MediaQuery.of(context).size;
    _screenWidth = size.width;
    _screenHeight = size.height;
    _scaleWidth = _screenWidth / 375.0;
    _scaleHeight = _screenHeight / 812.0;
    // Text scale uses width but is slightly dampened so fonts
    // don't grow too aggressively on tablets.
    _scaleText = _scaleWidth.clamp(0.8, 1.4);
    _initialized = true;
  }

  /// Whether init() has been called at least once.
  static bool get isInitialized => _initialized;

  // ── Getters ────────────────────────────────────────────
  static double get screenWidth => _screenWidth;
  static double get screenHeight => _screenHeight;

  /// Scale a value horizontally (widths, horizontal padding).
  static double w(double size) => size * _scaleWidth;

  /// Scale a value vertically (heights, vertical padding).
  static double h(double size) => size * _scaleHeight;

  /// Scale font sizes.
  static double sp(double size) => size * _scaleText;

  /// Scale icons.
  static double icon(double size) => size * _scaleText;

  /// Scale radius values.
  static double r(double size) => size * _scaleWidth;

  /// Symmetric EdgeInsets scaled.
  static EdgeInsets symmetric({double horizontal = 0, double vertical = 0}) {
    return EdgeInsets.symmetric(
      horizontal: w(horizontal),
      vertical: h(vertical),
    );
  }

  /// All-sides EdgeInsets scaled.
  static EdgeInsets all(double value) {
    return EdgeInsets.all(w(value));
  }

  /// Custom EdgeInsets scaled.
  static EdgeInsets only({
    double left = 0,
    double top = 0,
    double right = 0,
    double bottom = 0,
  }) {
    return EdgeInsets.only(
      left: w(left),
      top: h(top),
      right: w(right),
      bottom: h(bottom),
    );
  }
}
