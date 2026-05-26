import 'package:flutter/material.dart';
import '../responsive.dart';
import '../theme.dart';

/// Global Header Component with title and subtitle
class AppHeader extends StatelessWidget {
  final String title;
  final String? subtitle;
  final CrossAxisAlignment crossAxisAlignment;
  final TextAlign textAlign;

  const AppHeader({
    super.key,
    required this.title,
    this.subtitle,
    this.crossAxisAlignment = CrossAxisAlignment.center,
    this.textAlign = TextAlign.center,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: crossAxisAlignment,
      children: [
        Text(
          title,
          style: AppTextStyles.headline3(context),
          textAlign: textAlign,
        ),
        if (subtitle != null) ...[
          SizedBox(height: context.hs(8)),
          Text(
            subtitle!,
            style: AppTextStyles.bodyMedium(context).copyWith(
              color: AppColors.grey,
            ),
            textAlign: textAlign,
          ),
        ],
      ],
    );
  }
}
