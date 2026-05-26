import 'package:flutter/material.dart';
import '../responsive.dart';
import '../theme.dart';

/// Global Primary Button Component
class AppButton extends StatelessWidget {
  final String text;
  final VoidCallback? onPressed;
  final bool isLoading;
  final bool isDisabled;
  final double? width;
  final double? height;
  final double? fontSize;
  final Color? backgroundColor;
  final Color? textColor;
  final BorderRadius? borderRadius;
  final Widget? icon;

  const AppButton({
    super.key,
    required this.text,
    this.onPressed,
    this.isLoading = false,
    this.isDisabled = false,
    this.width,
    this.height,
    this.fontSize,
    this.backgroundColor,
    this.textColor,
    this.borderRadius,
    this.icon,
  });

  @override
  Widget build(BuildContext context) {
    final isDisabledState = isDisabled || isLoading || onPressed == null;

    return SizedBox(
      width: width ?? context.ws(300),
      height: height ?? context.hs(50),
      child: ElevatedButton(
        onPressed: isDisabledState ? null : onPressed,
        style: ElevatedButton.styleFrom(
          backgroundColor: backgroundColor ?? AppColors.secondary,
          foregroundColor: textColor ?? AppColors.white,
          disabledBackgroundColor: AppColors.grey,
          disabledForegroundColor: AppColors.white,
          shape: RoundedRectangleBorder(
            borderRadius: borderRadius ?? BorderRadius.circular(context.sr(8)),
          ),
          elevation: 2,
        ),
        child: isLoading
            ? SizedBox(
                width: context.sicon(20),
                height: context.sicon(20),
                child: const CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                ),
              )
            : Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  if (icon != null) ...[
                    icon!,
                    SizedBox(width: context.ws(8)),
                  ],
                  Text(
                    text,
                    style: TextStyle(
                      fontSize: fontSize ?? context.ssp(16),
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
      ),
    );
  }
}

/// Global Secondary Button Component (Outlined)
class AppSecondaryButton extends StatelessWidget {
  final String text;
  final VoidCallback? onPressed;
  final bool isLoading;
  final bool isDisabled;
  final double? width;
  final double? height;
  final double? fontSize;
  final Color? borderColor;
  final Color? textColor;
  final BorderRadius? borderRadius;
  final Widget? icon;

  const AppSecondaryButton({
    super.key,
    required this.text,
    this.onPressed,
    this.isLoading = false,
    this.isDisabled = false,
    this.width,
    this.height,
    this.fontSize,
    this.borderColor,
    this.textColor,
    this.borderRadius,
    this.icon,
  });

  @override
  Widget build(BuildContext context) {
    final isDisabledState = isDisabled || isLoading || onPressed == null;

    return SizedBox(
      width: width ?? context.ws(300),
      height: height ?? context.hs(50),
      child: OutlinedButton(
        onPressed: isDisabledState ? null : onPressed,
        style: OutlinedButton.styleFrom(
          foregroundColor: textColor ?? AppColors.secondary,
          disabledForegroundColor: AppColors.grey,
          side: BorderSide(
            color: borderColor ?? AppColors.secondary,
            width: 1.5,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: borderRadius ?? BorderRadius.circular(context.sr(8)),
          ),
        ),
        child: isLoading
            ? SizedBox(
                width: context.sicon(20),
                height: context.sicon(20),
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation<Color>(
                    borderColor ?? AppColors.secondary,
                  ),
                ),
              )
            : Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  if (icon != null) ...[
                    icon!,
                    SizedBox(width: context.ws(8)),
                  ],
                  Text(
                    text,
                    style: TextStyle(
                      fontSize: fontSize ?? context.ssp(16),
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
      ),
    );
  }
}

/// Global Text Button Component
class AppTextButton extends StatelessWidget {
  final String text;
  final VoidCallback? onPressed;
  final bool isDisabled;
  final double? fontSize;
  final Color? textColor;
  final FontWeight? fontWeight;
  final Widget? icon;

  const AppTextButton({
    super.key,
    required this.text,
    this.onPressed,
    this.isDisabled = false,
    this.fontSize,
    this.textColor,
    this.fontWeight,
    this.icon,
  });

  @override
  Widget build(BuildContext context) {
    final isDisabledState = isDisabled || onPressed == null;

    return TextButton(
      onPressed: isDisabledState ? null : onPressed,
      style: TextButton.styleFrom(
        foregroundColor: isDisabledState ? AppColors.grey : (textColor ?? AppColors.secondary),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            icon!,
            SizedBox(width: context.ws(4)),
          ],
          Text(
            text,
            style: TextStyle(
              fontSize: fontSize ?? context.ssp(14),
              fontWeight: fontWeight ?? FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}

/// Global Icon Button Component
class AppIconButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback? onPressed;
  final bool isDisabled;
  final double? size;
  final Color? iconColor;
  final Color? backgroundColor;
  final BorderRadius? borderRadius;

  const AppIconButton({
    super.key,
    required this.icon,
    this.onPressed,
    this.isDisabled = false,
    this.size,
    this.iconColor,
    this.backgroundColor,
    this.borderRadius,
  });

  @override
  Widget build(BuildContext context) {
    final isDisabledState = isDisabled || onPressed == null;

    return SizedBox(
      width: size ?? context.sicon(48),
      height: size ?? context.sicon(48),
      child: IconButton(
        onPressed: isDisabledState ? null : onPressed,
        style: IconButton.styleFrom(
          backgroundColor: backgroundColor,
          foregroundColor: iconColor ?? AppColors.secondary,
          disabledBackgroundColor: AppColors.lightGrey,
          disabledForegroundColor: AppColors.grey,
          shape: RoundedRectangleBorder(
            borderRadius: borderRadius ?? BorderRadius.circular(context.sr(8)),
          ),
        ),
        icon: Icon(
          icon,
          size: (size ?? context.sicon(48)) * 0.5,
        ),
      ),
    );
  }
}
