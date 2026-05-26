import 'package:flutter/material.dart';
import '../responsive.dart';
import '../theme.dart';
import '../models/bottom_nav_config.dart';

/// Bottom Navigation Bar Component
class AppBottomNav extends StatelessWidget {
  final int currentIndex;
  final Function(int) onTap;
  final BottomNavConfig config;

  const AppBottomNav({
    super.key,
    required this.currentIndex,
    required this.onTap,
    this.config = defaultBottomNavConfig,
  });

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final scalingFactor = config.getScalingFactor(screenWidth);
    
    return Container(
      decoration: BoxDecoration(
        color: AppColors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: ConstrainedBox(
          constraints: BoxConstraints(
            minHeight: context.hs(config.getMinHeight(screenWidth)),
          ),
          child: Padding(
            padding: EdgeInsets.symmetric(
              horizontal: context.ws(config.getHorizontalPadding(screenWidth) * 0.5),
              vertical: context.hs(config.getVerticalPadding(screenWidth) * 0.5),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              crossAxisAlignment: CrossAxisAlignment.center,
              children: config.items.asMap().entries.map((entry) {
                final index = entry.key;
                final item = entry.value;
                return _NavItem(
                  config: item,
                  isActive: currentIndex == index,
                  onTap: () => onTap(index),
                  screenWidth: screenWidth,
                  bottomNavConfig: config,
                );
              }).toList(),
            ),
          ),
        ),
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  final BottomNavItemConfig config;
  final bool isActive;
  final VoidCallback onTap;
  final double screenWidth;
  final BottomNavConfig bottomNavConfig;

  const _NavItem({
    required this.config,
    required this.isActive,
    required this.onTap,
    required this.screenWidth,
    required this.bottomNavConfig,
  });

  @override
  Widget build(BuildContext context) {
    final iconSize = bottomNavConfig.getIconSize(screenWidth);
    final fontSize = bottomNavConfig.getFontSize(screenWidth);
    final horizontalPadding = bottomNavConfig.getHorizontalPadding(screenWidth);
    final verticalPadding = bottomNavConfig.getVerticalPadding(screenWidth);
    final spacing = bottomNavConfig.getSpacing(screenWidth);
    final label = bottomNavConfig.getShortenedLabel(config.label, screenWidth);

    return Flexible(
      child: GestureDetector(
        onTap: onTap,
        behavior: HitTestBehavior.opaque,
        child: Container(
          padding: EdgeInsets.symmetric(
            horizontal: context.ws(horizontalPadding),
            vertical: context.hs(verticalPadding),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                isActive ? config.activeIcon : config.icon,
                size: context.sicon(iconSize),
                color: isActive ? AppColors.secondary : AppColors.grey,
              ),
              SizedBox(height: context.hs(spacing)),
              FittedBox(
                child: Text(
                  label,
                  style: AppTextStyles.caption(context).copyWith(
                    color: isActive ? AppColors.secondary : AppColors.grey,
                    fontWeight: isActive ? FontWeight.w600 : FontWeight.normal,
                    fontSize: fontSize,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
