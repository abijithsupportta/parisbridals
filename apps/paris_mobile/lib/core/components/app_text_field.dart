import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../responsive.dart';
import '../theme.dart';

/// Global Text Field Component
class AppTextField extends StatelessWidget {
  final String? label;
  final String? hint;
  final String? initialValue;
  final TextEditingController? controller;
  final bool obscureText;
  final bool enabled;
  final bool readOnly;
  final int? maxLines;
  final int? minLines;
  final TextInputType? keyboardType;
  final List<TextInputFormatter>? inputFormatters;
  final String? Function(String?)? validator;
  final void Function(String)? onChanged;
  final void Function(String?)? onSaved;
  final Widget? prefixIcon;
  final Widget? suffixIcon;
  final Color? prefixIconColor;
  final Color? suffixIconColor;
  final double? width;
  final double? height;
  final double? fontSize;
  final Color? fillColor;
  final Color? borderColor;
  final Color? textColor;
  final BorderRadius? borderRadius;
  final TextInputAction? textInputAction;
  final VoidCallback? onTap;
  final FocusNode? focusNode;

  const AppTextField({
    super.key,
    this.label,
    this.hint,
    this.initialValue,
    this.controller,
    this.obscureText = false,
    this.enabled = true,
    this.readOnly = false,
    this.maxLines = 1,
    this.minLines,
    this.keyboardType,
    this.inputFormatters,
    this.validator,
    this.onChanged,
    this.onSaved,
    this.prefixIcon,
    this.suffixIcon,
    this.prefixIconColor,
    this.suffixIconColor,
    this.width,
    this.height,
    this.fontSize,
    this.fillColor,
    this.borderColor,
    this.textColor,
    this.borderRadius,
    this.textInputAction,
    this.onTap,
    this.focusNode,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: width ?? double.infinity,
      child: TextFormField(
        controller: controller,
        initialValue: initialValue,
        obscureText: obscureText,
        enabled: enabled,
        readOnly: readOnly,
        maxLines: maxLines,
        minLines: minLines,
        keyboardType: keyboardType,
        inputFormatters: inputFormatters,
        validator: validator,
        onChanged: onChanged,
        onSaved: onSaved,
        onTap: onTap,
        focusNode: focusNode,
        textInputAction: textInputAction,
        style: TextStyle(
          fontSize: fontSize ?? context.ssp(16),
          color: textColor ?? AppColors.black,
        ),
        decoration: InputDecoration(
          labelText: label,
          hintText: hint,
          prefixIcon: prefixIconColor != null
              ? IconTheme(
                  data: IconThemeData(color: prefixIconColor),
                  child: prefixIcon!,
                )
              : prefixIcon,
          suffixIcon: suffixIconColor != null
              ? IconTheme(
                  data: IconThemeData(color: suffixIconColor),
                  child: suffixIcon!,
                )
              : suffixIcon,
          filled: true,
          fillColor: fillColor ?? (enabled ? AppColors.lightGrey : AppColors.grey.withOpacity(0.3)),
          border: OutlineInputBorder(
            borderRadius: borderRadius ?? BorderRadius.circular(context.sr(8)),
            borderSide: BorderSide(color: borderColor ?? AppColors.grey),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: borderRadius ?? BorderRadius.circular(context.sr(8)),
            borderSide: BorderSide(color: borderColor ?? AppColors.grey),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: borderRadius ?? BorderRadius.circular(context.sr(8)),
            borderSide: const BorderSide(color: AppColors.secondary, width: 2),
          ),
          errorBorder: OutlineInputBorder(
            borderRadius: borderRadius ?? BorderRadius.circular(context.sr(8)),
            borderSide: const BorderSide(color: AppColors.error),
          ),
          focusedErrorBorder: OutlineInputBorder(
            borderRadius: borderRadius ?? BorderRadius.circular(context.sr(8)),
            borderSide: const BorderSide(color: AppColors.error, width: 2),
          ),
          disabledBorder: OutlineInputBorder(
            borderRadius: borderRadius ?? BorderRadius.circular(context.sr(8)),
            borderSide: BorderSide(color: AppColors.grey.withOpacity(0.3)),
          ),
          contentPadding: EdgeInsets.symmetric(
            horizontal: context.ws(16),
            vertical: context.hs(12),
          ),
          labelStyle: TextStyle(
            fontSize: context.ssp(14),
            color: AppColors.grey,
          ),
          hintStyle: TextStyle(
            fontSize: context.ssp(14),
            color: AppColors.grey,
          ),
        ),
      ),
    );
  }
}

/// Global Search Text Field Component
class AppSearchField extends StatelessWidget {
  final String hint;
  final TextEditingController? controller;
  final void Function(String)? onChanged;
  final void Function()? onClear;
  final bool showClearButton;
  final double? width;
  final double? height;
  final double? fontSize;

  const AppSearchField({
    super.key,
    this.hint = 'Search...',
    this.controller,
    this.onChanged,
    this.onClear,
    this.showClearButton = true,
    this.width,
    this.height,
    this.fontSize,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: width ?? double.infinity,
      height: height ?? context.hs(50),
      child: TextField(
        controller: controller,
        onChanged: onChanged,
        style: TextStyle(
          fontSize: fontSize ?? context.ssp(16),
          color: AppColors.black,
        ),
        decoration: InputDecoration(
          hintText: hint,
          prefixIcon: Icon(Icons.search, size: context.sicon(20)),
          suffixIcon: showClearButton && (controller?.text.isNotEmpty ?? false)
              ? IconButton(
                  icon: Icon(Icons.clear, size: context.sicon(20)),
                  onPressed: onClear ?? () => controller?.clear(),
                )
              : null,
          filled: true,
          fillColor: AppColors.lightGrey,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(context.sr(25)),
            borderSide: BorderSide.none,
          ),
          contentPadding: EdgeInsets.symmetric(
            horizontal: context.ws(16),
            vertical: context.hs(12),
          ),
          hintStyle: TextStyle(
            fontSize: context.ssp(14),
            color: AppColors.grey,
          ),
        ),
      ),
    );
  }
}
