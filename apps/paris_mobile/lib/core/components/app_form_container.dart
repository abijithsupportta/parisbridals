import 'package:flutter/material.dart';
import '../responsive.dart';
import '../theme.dart';

/// Global Form Container Component
class AppFormContainer extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final double? maxWidth;
  final Color? backgroundColor;

  const AppFormContainer({
    super.key,
    required this.child,
    this.padding,
    this.maxWidth,
    this.backgroundColor,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: BoxConstraints(
        maxWidth: maxWidth ?? context.ws(400),
      ),
      padding: padding ?? EdgeInsets.symmetric(horizontal: context.ws(24)),
      decoration: BoxDecoration(
        color: backgroundColor ?? AppColors.white,
      ),
      child: child,
    );
  }
}

/// Global Auth Screen Container with scrollable form
class AppAuthContainer extends StatelessWidget {
  final Widget? logo;
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final Color? backgroundColor;

  const AppAuthContainer({
    super.key,
    this.logo,
    required this.child,
    this.padding,
    this.backgroundColor,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: backgroundColor ?? AppColors.white,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: padding ?? EdgeInsets.symmetric(horizontal: context.ws(24)),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (logo != null) ...[
                  logo!,
                  SizedBox(height: context.hs(40)),
                ],
                child,
              ],
            ),
          ),
        ),
      ),
    );
  }
}
