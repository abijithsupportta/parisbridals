import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../features/auth/providers/auth_provider.dart';
import '../features/auth/views/login_view.dart';
import '../features/products/views/products_view.dart';
import '../features/dashboard/views/dashboard_view.dart';
import '../features/orders/views/orders_view.dart';
import '../features/calendar/views/calendar_view.dart';
import '../features/categories/views/categories_view.dart';
import 'responsive.dart';

class MainLayout extends StatefulWidget {
  const MainLayout({super.key});

  @override
  State<MainLayout> createState() => _MainLayoutState();
}

class _MainLayoutState extends State<MainLayout> {
  int _selectedIndex = 0;
  String _selectedBranch = 'Main Branch - Paris';
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();

  final List<String> _branches = [
    'Main Branch - Paris',
    'Downtown Boutique',
    'Wedding Expo Popup',
  ];

  static const _primary = Color(0xFF434343);

  @override
  Widget build(BuildContext context) {
    Responsive.init(context);

    return Consumer(
      builder: (context, ref, _) {
        final user = ref.watch(authUserProvider);
        return Scaffold(
          key: _scaffoldKey,
          appBar: _buildAppBar(),
          drawer: _buildDrawer(context, user, ref),
          body: _buildBody(),
          bottomNavigationBar: _buildBottomNav(),
        );
      },
    );
  }

  // ── App Bar ──
  PreferredSizeWidget _buildAppBar() {
    if (_selectedIndex == 0) {
      return AppBar(
        backgroundColor: _primary,
        titleSpacing: 0,
        toolbarHeight: Responsive.h(60),
        leading: GestureDetector(
          onTap: () => _scaffoldKey.currentState?.openDrawer(),
          child: Padding(
            padding: Responsive.only(left: 16),
            child: Center(
              child: SvgPicture.asset(
                'assets/images/logo_paris.svg',
                width: Responsive.icon(28),
                height: Responsive.icon(28),
                colorFilter: const ColorFilter.mode(Colors.white, BlendMode.srcIn),
              ),
            ),
          ),
        ),
        title: Text(
          'PARIS BRIDALS',
          style: TextStyle(fontSize: Responsive.sp(16), fontWeight: FontWeight.w800, letterSpacing: 1.5, color: Colors.white),
        ),
        actions: [
          _buildBranchSwitcher(),
          IconButton(
            icon: Icon(Icons.notifications_none_rounded, size: Responsive.icon(24), color: Colors.white),
            onPressed: () {},
          ),
          SizedBox(width: Responsive.w(4)),
        ],
      );
    }

    final titles = ['', 'Orders', 'Calendar', 'Products', 'Categories'];
    return AppBar(
      backgroundColor: _primary,
      iconTheme: const IconThemeData(color: Colors.white),
      toolbarHeight: Responsive.h(60),
      leading: GestureDetector(
        onTap: () => _scaffoldKey.currentState?.openDrawer(),
        child: Padding(
          padding: Responsive.only(left: 16),
          child: Center(
            child: SvgPicture.asset(
              'assets/images/logo_paris.svg',
              width: Responsive.icon(28),
              height: Responsive.icon(28),
              colorFilter: const ColorFilter.mode(Colors.white, BlendMode.srcIn),
            ),
          ),
        ),
      ),
      title: Text(titles[_selectedIndex], style: TextStyle(fontSize: Responsive.sp(18), fontWeight: FontWeight.w700, color: Colors.white)),
      actions: [
        _buildBranchSwitcher(),
        SizedBox(width: Responsive.w(8)),
      ],
    );
  }

  // ── Drawer / Sidebar ──
  Widget _buildDrawer(BuildContext context, AuthUser? user, WidgetRef ref) {
    final isAdmin = user?.isAdmin ?? false;
    final canManage = user?.canManage ?? false;

    return Drawer(
      width: Responsive.w(300),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
      child: SafeArea(
        child: Column(
          children: [
            // Header
            Container(
              width: double.infinity,
              padding: Responsive.only(left: 24, right: 24, top: 32, bottom: 24),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [_primary, _primary.withValues(alpha: 0.8)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: Responsive.all(12),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(Responsive.r(14)),
                    ),
                    child: SvgPicture.asset(
                      'assets/images/logo_paris.svg',
                      width: Responsive.icon(32),
                      height: Responsive.icon(32),
                      colorFilter: const ColorFilter.mode(Colors.white, BlendMode.srcIn),
                    ),
                  ),
                  SizedBox(height: Responsive.h(16)),
                  Text(
                    user?.name ?? 'User',
                    style: TextStyle(fontSize: Responsive.sp(18), fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                  SizedBox(height: Responsive.h(4)),
                  Text(
                    user?.email ?? '',
                    style: TextStyle(fontSize: Responsive.sp(13), color: Colors.white.withValues(alpha: 0.7)),
                  ),
                  SizedBox(height: Responsive.h(8)),
                  Container(
                    padding: Responsive.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(Responsive.r(20)),
                    ),
                    child: Text(
                      (user?.role.name ?? 'staff').toUpperCase(),
                      style: TextStyle(fontSize: Responsive.sp(10), fontWeight: FontWeight.w700, color: Colors.white, letterSpacing: 1),
                    ),
                  ),
                ],
              ),
            ),

            // Menu items
            Expanded(
              child: ListView(
                padding: Responsive.symmetric(vertical: 12),
                children: [
                  // Admin-only menu items
                  if (isAdmin) ...[
                    _buildDrawerSectionLabel('Management'),
                    _buildDrawerItem(Icons.dashboard_rounded, 'Dashboard', 0),
                    _buildDrawerItem(Icons.category_rounded, 'Categories', 4),
                    _buildDrawerItem(Icons.inventory_2_rounded, 'Products', 3),
                    _buildDrawerItem(Icons.receipt_long_rounded, 'Orders', 1),
                    _buildDrawerItem(Icons.calendar_month_rounded, 'Calendar', 2),
                    Padding(
                      padding: Responsive.symmetric(horizontal: 24),
                      child: Divider(height: Responsive.h(24), color: Colors.grey[200]),
                    ),
                    _buildDrawerSectionLabel('Settings'),
                    _buildDrawerItem(Icons.storefront_rounded, 'Branches', null, onTap: () {
                      Navigator.pop(context);
                      // TODO: navigate to branches
                    }),
                    _buildDrawerItem(Icons.people_rounded, 'Staff', null, onTap: () {
                      Navigator.pop(context);
                      // TODO: navigate to staff
                    }),
                    _buildDrawerItem(Icons.settings_rounded, 'Settings', null, onTap: () {
                      Navigator.pop(context);
                      // TODO: navigate to settings
                    }),
                  ] else if (canManage) ...[
                    // Manager sees nav items but no settings
                    _buildDrawerSectionLabel('Navigation'),
                    _buildDrawerItem(Icons.dashboard_rounded, 'Dashboard', 0),
                    _buildDrawerItem(Icons.category_rounded, 'Categories', 4),
                    _buildDrawerItem(Icons.inventory_2_rounded, 'Products', 3),
                    _buildDrawerItem(Icons.receipt_long_rounded, 'Orders', 1),
                    _buildDrawerItem(Icons.calendar_month_rounded, 'Calendar', 2),
                  ] else ...[
                    // Staff sees minimal menu
                    _buildDrawerSectionLabel('Navigation'),
                    _buildDrawerItem(Icons.dashboard_rounded, 'Dashboard', 0),
                    _buildDrawerItem(Icons.receipt_long_rounded, 'Orders', 1),
                  ],
                ],
              ),
            ),

            // Logout at bottom
            Padding(
              padding: Responsive.only(left: 16, right: 16, bottom: 16),
              child: SizedBox(
                width: double.infinity,
                height: Responsive.h(52),
                child: OutlinedButton.icon(
                  onPressed: () => _confirmLogout(context),
                  icon: Icon(Icons.logout_rounded, size: Responsive.icon(20)),
                  label: Text('Log Out', style: TextStyle(fontSize: Responsive.sp(15), fontWeight: FontWeight.w600)),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: const Color(0xFFFF6B8A),
                    side: const BorderSide(color: Color(0xFFFF6B8A)),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(Responsive.r(12))),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDrawerSectionLabel(String label) {
    return Padding(
      padding: Responsive.only(left: 24, top: 8, bottom: 8),
      child: Text(
        label.toUpperCase(),
        style: TextStyle(fontSize: Responsive.sp(11), fontWeight: FontWeight.w700, color: Colors.grey[400], letterSpacing: 1.2),
      ),
    );
  }

  Widget _buildDrawerItem(IconData icon, String label, int? tabIndex, {VoidCallback? onTap}) {
    final isSelected = tabIndex != null && _selectedIndex == tabIndex;

    return Padding(
      padding: Responsive.symmetric(horizontal: 12, vertical: 2),
      child: Material(
        color: isSelected ? _primary.withValues(alpha: 0.08) : Colors.transparent,
        borderRadius: BorderRadius.circular(Responsive.r(12)),
        child: InkWell(
          borderRadius: BorderRadius.circular(Responsive.r(12)),
          onTap: () {
            if (onTap != null) {
              onTap();
            } else if (tabIndex != null) {
              setState(() => _selectedIndex = tabIndex);
              Navigator.pop(context);
            }
          },
          child: Padding(
            padding: Responsive.symmetric(horizontal: 16, vertical: 14),
            child: Row(
              children: [
                Icon(icon, size: Responsive.icon(22), color: isSelected ? _primary : Colors.grey[600]),
                SizedBox(width: Responsive.w(16)),
                Text(
                  label,
                  style: TextStyle(
                    fontSize: Responsive.sp(15),
                    fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                    color: isSelected ? _primary : Colors.grey[800],
                  ),
                ),
                if (isSelected) ...[
                  const Spacer(),
                  Container(
                    width: Responsive.w(6), height: Responsive.h(6),
                    decoration: BoxDecoration(shape: BoxShape.circle, color: _primary),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _confirmLogout(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(Responsive.r(16))),
        title: Row(
          children: [
            Icon(Icons.logout_rounded, size: Responsive.icon(24), color: const Color(0xFFFF6B8A)),
            SizedBox(width: Responsive.w(10)),
            Text('Log Out', style: TextStyle(fontSize: Responsive.sp(18), fontWeight: FontWeight.bold)),
          ],
        ),
        content: Text(
          'Are you sure you want to log out of Paris Bridals?',
          style: TextStyle(fontSize: Responsive.sp(14), height: 1.5),
        ),
        actionsPadding: Responsive.only(left: 16, right: 16, bottom: 16),
        actions: [
          Row(
            children: [
              Expanded(
                child: SizedBox(
                  height: Responsive.h(46),
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(ctx),
                    style: OutlinedButton.styleFrom(
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(Responsive.r(10))),
                    ),
                    child: Text('Cancel', style: TextStyle(fontSize: Responsive.sp(14))),
                  ),
                ),
              ),
              SizedBox(width: Responsive.w(12)),
              Expanded(
                child: SizedBox(
                  height: Responsive.h(46),
                  child: ElevatedButton(
                    onPressed: () async {
                      // Clear session
                      const storage = FlutterSecureStorage();
                      await storage.delete(key: 'auth_token');
                      
                      if (!mounted) return;
                      Navigator.pop(ctx); // close dialog
                      Navigator.pop(context); // close drawer
                      Navigator.of(context).pushAndRemoveUntil(
                        MaterialPageRoute(builder: (_) => const LoginView()),
                        (route) => false,
                      );
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFFF6B8A),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(Responsive.r(10))),
                    ),
                    child: Text('Log Out', style: TextStyle(fontSize: Responsive.sp(14), fontWeight: FontWeight.bold)),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ── Branch Switcher ──
  Widget _buildBranchSwitcher() {
    return PopupMenuButton<String>(
      onSelected: (String result) => setState(() => _selectedBranch = result),
      offset: Offset(0, Responsive.h(50)),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(Responsive.r(14))),
      itemBuilder: (BuildContext context) {
        return _branches.map((String branch) {
          final isSelected = _selectedBranch == branch;
          return PopupMenuItem<String>(
            value: branch,
            height: Responsive.h(48),
            child: Row(
              children: [
                Icon(
                  isSelected ? Icons.check_circle : Icons.circle_outlined,
                  size: Responsive.icon(18),
                  color: isSelected ? _primary : Colors.grey,
                ),
                SizedBox(width: Responsive.w(12)),
                Expanded(
                  child: Text(
                    branch,
                    style: TextStyle(
                      fontSize: Responsive.sp(14),
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                      color: isSelected ? _primary : Colors.black87,
                    ),
                  ),
                ),
              ],
            ),
          );
        }).toList();
      },
      child: Container(
        padding: Responsive.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.15),
          borderRadius: BorderRadius.circular(Responsive.r(20)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.storefront_rounded, size: Responsive.icon(14), color: Colors.white),
            SizedBox(width: Responsive.w(6)),
            ConstrainedBox(
              constraints: BoxConstraints(maxWidth: Responsive.w(80)),
              child: Text(
                _selectedBranch,
                style: TextStyle(fontSize: Responsive.sp(11), fontWeight: FontWeight.w600, color: Colors.white),
                overflow: TextOverflow.ellipsis,
              ),
            ),
            Icon(Icons.arrow_drop_down_rounded, size: Responsive.icon(18), color: Colors.white),
          ],
        ),
      ),
    );
  }

  // ── Bottom Nav ──
  Widget _buildBottomNav() {
    return Container(
      decoration: BoxDecoration(
        color: _primary,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.1),
            blurRadius: 20,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: BottomNavigationBar(
        currentIndex: _selectedIndex,
        onTap: (index) => setState(() => _selectedIndex = index),
        type: BottomNavigationBarType.fixed,
        backgroundColor: _primary,
        selectedItemColor: const Color(0xFFF7C873), // Golden Accent
        unselectedItemColor: Colors.white54,
        selectedFontSize: Responsive.sp(11),
        unselectedFontSize: Responsive.sp(11),
        iconSize: Responsive.icon(24),
        showUnselectedLabels: true,
        elevation: 0,
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.home_rounded), activeIcon: Icon(Icons.home_rounded), label: 'Home'),
          BottomNavigationBarItem(icon: Icon(Icons.receipt_long_outlined), activeIcon: Icon(Icons.receipt_long_rounded), label: 'Orders'),
          BottomNavigationBarItem(icon: Icon(Icons.calendar_month_outlined), activeIcon: Icon(Icons.calendar_month_rounded), label: 'Calendar'),
          BottomNavigationBarItem(icon: Icon(Icons.inventory_2_outlined), activeIcon: Icon(Icons.inventory_2_rounded), label: 'Products'),
          BottomNavigationBarItem(icon: Icon(Icons.category_outlined), activeIcon: Icon(Icons.category_rounded), label: 'Categories'),
        ],
      ),
    );
  }

  // ── Body ──
  Widget _buildBody() {
    switch (_selectedIndex) {
      case 0: return const DashboardView();
      case 1: return const OrdersView();
      case 2: return const CalendarView();
      case 3: return const ProductsView();
      case 4: return const CategoriesView();
      default: return const DashboardView();
    }
  }
}
