import 'package:flutter/material.dart';
import '../responsive.dart';
import '../theme.dart';

/// Reusable Stat Card Widget for Home Dashboard - Modern KPI Layout
class HomeStatCard extends StatelessWidget {
  final String title;
  final String value;
  final String? subtitle;
  final IconData icon;
  final Color? iconColor;
  final Color? backgroundColor;
  final VoidCallback? onTap;
  final bool isLarge;

  const HomeStatCard({
    super.key,
    required this.title,
    required this.value,
    this.subtitle,
    required this.icon,
    this.iconColor,
    this.backgroundColor,
    this.onTap,
    this.isLarge = false,
  });

  @override
  Widget build(BuildContext context) {
    final bgColor = backgroundColor ?? AppColors.primary.withOpacity(0.08);
    final iconClr = iconColor ?? AppColors.secondary;
    final iconSize = context.sicon(24.0);
    final iconContainerSize = context.sp(44.0);

    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Container(
        constraints: BoxConstraints(
          minHeight: isLarge ? context.hs(110) : context.hs(95),
        ),
        padding: EdgeInsets.all(context.sp(16)),
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
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            // Icon and Title Row
            Row(
              children: [
                Container(
                  width: iconContainerSize,
                  height: iconContainerSize,
                  decoration: BoxDecoration(
                    color: bgColor,
                    borderRadius: BorderRadius.circular(context.sr(12)),
                  ),
                  child: Icon(
                    icon,
                    color: iconClr,
                    size: iconSize,
                  ),
                ),
                SizedBox(width: context.ws(12)),
                Expanded(
                  child: Text(
                    title,
                    style: AppTextStyles.bodySmall(context).copyWith(
                      color: AppColors.grey,
                      fontWeight: FontWeight.w500,
                      fontSize: context.ssp(13),
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            SizedBox(height: context.hs(10)),
            
            // KPI Number
            Flexible(
              child: Text(
                value,
                style: AppTextStyles.headline4(context).copyWith(
                  fontWeight: FontWeight.w700,
                  color: AppColors.secondary,
                  fontSize: isLarge ? context.ssp(32) : context.ssp(28),
                  height: 1.0,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            
            // Subtitle
            if (subtitle != null) ...[
              SizedBox(height: context.hs(4)),
              Text(
                subtitle!,
                style: AppTextStyles.caption(context).copyWith(
                  color: AppColors.grey,
                  fontSize: context.ssp(11),
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ],
        ),
      ),
    );
  }
}
