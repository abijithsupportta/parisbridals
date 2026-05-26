import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'responsive.dart';

/// App Colors
class AppColors {
  // Primary Color
  static const Color primary = Color(0xFFE1DCC9);
  
  // Secondary Color (Buttons)
  static const Color secondary = Color(0xFF1F150C);
  
  // Status Colors
  static const Color success = Color(0xFF4CAF50);
  static const Color error = Color(0xFFF44336);
  
  // Neutral Colors
  static const Color white = Color(0xFFFFFFFF);
  static const Color black = Color(0xFF000000);
  static const Color grey = Color(0xFF9E9E9E);
  static const Color lightGrey = Color(0xFFF5F5F5);
  static const Color darkGrey = Color(0xFF424242);
}

/// App Text Styles with dynamic sizing
class AppTextStyles {
  static TextStyle headline1(BuildContext context) => TextStyle(
    fontSize: context.ssp(32),
    fontWeight: FontWeight.bold,
    color: AppColors.black,
  );

  static TextStyle headline2(BuildContext context) => TextStyle(
    fontSize: context.ssp(28),
    fontWeight: FontWeight.bold,
    color: AppColors.black,
  );

  static TextStyle headline3(BuildContext context) => TextStyle(
    fontSize: context.ssp(24),
    fontWeight: FontWeight.bold,
    color: AppColors.black,
  );

  static TextStyle headline4(BuildContext context) => TextStyle(
    fontSize: context.ssp(20),
    fontWeight: FontWeight.w600,
    color: AppColors.black,
  );

  static TextStyle headline5(BuildContext context) => TextStyle(
    fontSize: context.ssp(18),
    fontWeight: FontWeight.w600,
    color: AppColors.black,
  );

  static TextStyle headline6(BuildContext context) => TextStyle(
    fontSize: context.ssp(16),
    fontWeight: FontWeight.w600,
    color: AppColors.black,
  );

  static TextStyle bodyLarge(BuildContext context) => TextStyle(
    fontSize: context.ssp(16),
    fontWeight: FontWeight.normal,
    color: AppColors.black,
  );

  static TextStyle bodyMedium(BuildContext context) => TextStyle(
    fontSize: context.ssp(14),
    fontWeight: FontWeight.normal,
    color: AppColors.black,
  );

  static TextStyle bodySmall(BuildContext context) => TextStyle(
    fontSize: context.ssp(12),
    fontWeight: FontWeight.normal,
    color: AppColors.black,
  );

  static TextStyle labelLarge(BuildContext context) => TextStyle(
    fontSize: context.ssp(14),
    fontWeight: FontWeight.w500,
    color: AppColors.black,
  );

  static TextStyle labelMedium(BuildContext context) => TextStyle(
    fontSize: context.ssp(12),
    fontWeight: FontWeight.w500,
    color: AppColors.black,
  );

  static TextStyle labelSmall(BuildContext context) => TextStyle(
    fontSize: context.ssp(10),
    fontWeight: FontWeight.w500,
    color: AppColors.black,
  );

  static TextStyle button(BuildContext context) => TextStyle(
    fontSize: context.ssp(16),
    fontWeight: FontWeight.w600,
    color: AppColors.white,
  );

  static TextStyle caption(BuildContext context) => TextStyle(
    fontSize: context.ssp(12),
    fontWeight: FontWeight.normal,
    color: AppColors.grey,
  );
}

/// App Theme Configuration
class AppTheme {
  static ThemeData lightTheme(BuildContext context) {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      primaryColor: AppColors.primary,
      scaffoldBackgroundColor: AppColors.white,
      colorScheme: const ColorScheme.light(
        primary: AppColors.primary,
        secondary: AppColors.secondary,
        error: AppColors.error,
      ),
      textTheme: TextTheme(
        displayLarge: AppTextStyles.headline1(context),
        displayMedium: AppTextStyles.headline2(context),
        displaySmall: AppTextStyles.headline3(context),
        headlineMedium: AppTextStyles.headline4(context),
        headlineSmall: AppTextStyles.headline5(context),
        titleLarge: AppTextStyles.headline6(context),
        bodyLarge: AppTextStyles.bodyLarge(context),
        bodyMedium: AppTextStyles.bodyMedium(context),
        bodySmall: AppTextStyles.bodySmall(context),
        labelLarge: AppTextStyles.labelLarge(context),
        labelMedium: AppTextStyles.labelMedium(context),
        labelSmall: AppTextStyles.labelSmall(context),
      ),
      cardTheme: CardThemeData(
        elevation: 2,
        color: AppColors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(context.sr(12)),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.secondary,
          foregroundColor: AppColors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(context.sr(8)),
          ),
          textStyle: AppTextStyles.button(context),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: AppColors.secondary,
          textStyle: AppTextStyles.labelLarge(context),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(context.sr(8)),
          borderSide: const BorderSide(color: AppColors.grey),
        ),
        filled: true,
        fillColor: AppColors.lightGrey,
        contentPadding: EdgeInsets.symmetric(
          horizontal: context.ws(16),
          vertical: context.hs(12),
        ),
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: AppColors.secondary,
        foregroundColor: AppColors.white,
        elevation: 0,
        systemOverlayStyle: SystemUiOverlayStyle.light,
        titleTextStyle: AppTextStyles.headline5(context).copyWith(
          color: AppColors.white,
        ),
      ),
    );
  }

  static ThemeData darkTheme(BuildContext context) {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      primaryColor: AppColors.primary,
      scaffoldBackgroundColor: AppColors.black,
      colorScheme: const ColorScheme.dark(
        primary: AppColors.primary,
        secondary: AppColors.secondary,
        error: AppColors.error,
      ),
      textTheme: TextTheme(
        displayLarge: AppTextStyles.headline1(context).copyWith(color: AppColors.white),
        displayMedium: AppTextStyles.headline2(context).copyWith(color: AppColors.white),
        displaySmall: AppTextStyles.headline3(context).copyWith(color: AppColors.white),
        headlineMedium: AppTextStyles.headline4(context).copyWith(color: AppColors.white),
        headlineSmall: AppTextStyles.headline5(context).copyWith(color: AppColors.white),
        titleLarge: AppTextStyles.headline6(context).copyWith(color: AppColors.white),
        bodyLarge: AppTextStyles.bodyLarge(context).copyWith(color: AppColors.white),
        bodyMedium: AppTextStyles.bodyMedium(context).copyWith(color: AppColors.white),
        bodySmall: AppTextStyles.bodySmall(context).copyWith(color: AppColors.white),
        labelLarge: AppTextStyles.labelLarge(context).copyWith(color: AppColors.white),
        labelMedium: AppTextStyles.labelMedium(context).copyWith(color: AppColors.white),
        labelSmall: AppTextStyles.labelSmall(context).copyWith(color: AppColors.white),
      ),
      cardTheme: CardThemeData(
        elevation: 2,
        color: AppColors.darkGrey,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(context.sr(12)),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.secondary,
          foregroundColor: AppColors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(context.sr(8)),
          ),
          textStyle: AppTextStyles.button(context),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: AppColors.primary,
          textStyle: AppTextStyles.labelLarge(context),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(context.sr(8)),
          borderSide: const BorderSide(color: AppColors.grey),
        ),
        filled: true,
        fillColor: AppColors.darkGrey,
        contentPadding: EdgeInsets.symmetric(
          horizontal: context.ws(16),
          vertical: context.hs(12),
        ),
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: AppColors.secondary,
        foregroundColor: AppColors.white,
        elevation: 0,
        systemOverlayStyle: SystemUiOverlayStyle.light,
        titleTextStyle: AppTextStyles.headline5(context).copyWith(
          color: AppColors.white,
        ),
      ),
    );
  }
}
