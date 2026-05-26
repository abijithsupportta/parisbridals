import 'package:flutter/material.dart';
import '../responsive.dart';
import '../theme.dart';

/// Reusable Quick Action Button Widget
class HomeQuickAction extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color? iconColor;
  final Color? backgroundColor;
  final VoidCallback onTap;

  const HomeQuickAction({
    super.key,
    required this.icon,
    required this.label,
    this.iconColor,
    this.backgroundColor,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final bgColor = backgroundColor ?? AppColors.primary.withOpacity(0.08);
    final iconClr = iconColor ?? AppColors.secondary;

    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Container(
        padding: EdgeInsets.symmetric(
          vertical: context.hs(20),
          horizontal: context.ws(16),
        ),
        decoration: BoxDecoration(
          color: AppColors.white,
          borderRadius: BorderRadius.circular(context.sr(16)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.04),
              blurRadius: 10,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          children: [
            Container(
              padding: EdgeInsets.all(context.sp(12)),
              decoration: BoxDecoration(
                color: bgColor,
                borderRadius: BorderRadius.circular(context.sr(12)),
              ),
              child: Icon(
                icon,
                color: iconClr,
                size: context.sicon(28),
              ),
            ),
            SizedBox(height: context.hs(12)),
            Text(
              label,
              style: AppTextStyles.bodySmall(context).copyWith(
                fontWeight: FontWeight.w600,
                color: AppColors.secondary,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
