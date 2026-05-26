import 'package:flutter/material.dart';
import '../responsive.dart';
import '../theme.dart';

/// Global Footer Component
class AppFooter extends StatelessWidget {
  final String? madeWithText;
  final String brandText;
  final CrossAxisAlignment crossAxisAlignment;

  const AppFooter({
    super.key,
    this.madeWithText = 'Made with',
    this.brandText = 'rentocostumes.com',
    this.crossAxisAlignment = CrossAxisAlignment.center,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: crossAxisAlignment,
      children: [
        if (madeWithText != null) ...[
          Text(
            madeWithText!,
            style: AppTextStyles.caption(context),
          ),
          SizedBox(height: context.hs(4)),
        ],
        Text(
          brandText,
          style: AppTextStyles.labelSmall(context).copyWith(
            color: AppColors.secondary,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }
}
