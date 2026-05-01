/// Shared color constants for Paris Bridals mobile app.
///
/// These colors define the luxury minimalist aesthetic used throughout the app.
/// Use these constants instead of defining colors locally in each widget.
library;

import 'package:flutter/material.dart';

class AppColors {
  AppColors._(); // Private constructor to prevent instantiation

  // Primary palette
  static const primary = Color(0xFF434343);   // Charcoal
  static const accent = Color(0xFFF7C873);    // Golden
  static const surface = Color(0xFFFAEBCD);   // Almond
  static const background = Color(0xFFF8F8F8); // Off-White

  // Status colors
  static const danger = Color(0xFFFF6B8A);    // Red
  static const success = Color(0xFF10B981);   // Green
  static const warning = Color(0xFFFBBF24);   // Amber
  static const info = Color(0xFF4A90D9);      // Blue

  // Order status colors
  static const scheduled = Color(0xFF4A90D9);  // Blue
  static const ongoing = Color(0xFF7B68EE);    // Purple
  static const completed = success;
  static const cancelled = Color(0xFF9CA3AF);  // Gray
  static const lateReturn = danger;
  static const partial = Color(0xFFF59E0B);    // Orange
}
