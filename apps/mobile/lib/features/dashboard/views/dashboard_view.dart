import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../../../core/responsive.dart';

class DashboardView extends StatelessWidget {
  const DashboardView({super.key});

  static const _primary = Color(0xFF434343); // Charcoal
  static const _accent  = Color(0xFFF7C873); // Golden
  static const _surface = Color(0xFFFAEBCD); // Almond
  static const _bg      = Color(0xFFF8F8F8); // Off-white

  @override
  Widget build(BuildContext context) {
    return Container(
      color: _bg,
      child: ListView(
        padding: Responsive.all(16),
        children: [
          _buildGreetingBanner(),
          SizedBox(height: Responsive.h(20)),
          _buildSummaryCards(),
          SizedBox(height: Responsive.h(24)),
          _buildSectionTitle('Quick Actions'),
          SizedBox(height: Responsive.h(12)),
          _buildQuickActions(),
          SizedBox(height: Responsive.h(24)),
          _buildSectionTitle('Recent Orders'),
          SizedBox(height: Responsive.h(12)),
          _buildRecentOrders(),
          SizedBox(height: Responsive.h(24)),
        ],
      ),
    );
  }

  Widget _buildGreetingBanner() {
    return Container(
      padding: Responsive.all(20),
      decoration: BoxDecoration(
        color: _primary,
        borderRadius: BorderRadius.circular(Responsive.r(24)),
        boxShadow: [
          BoxShadow(
            color: _primary.withValues(alpha: 0.35),
            blurRadius: Responsive.r(16),
            offset: Offset(0, Responsive.h(6)),
          ),
        ],
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Good Afternoon 👋',
                  style: TextStyle(color: Colors.white70, fontSize: Responsive.sp(15)),
                ),
                SizedBox(height: Responsive.h(6)),
                Text(
                  'Welcome back, Admin!',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: Responsive.sp(22),
                    fontWeight: FontWeight.bold,
                  ),
                ),
                SizedBox(height: Responsive.h(16)),
                Container(
                  padding: Responsive.symmetric(horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(Responsive.r(20)),
                  ),
                  child: Text(
                    '🎉  3 new orders today!',
                    style: TextStyle(color: Colors.white, fontSize: Responsive.sp(12), fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
          ),
          SizedBox(width: Responsive.w(14)),
          Container(
            width: Responsive.w(65),
            height: Responsive.w(65),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.15),
              shape: BoxShape.circle,
            ),
            child: Center(
              child: SvgPicture.asset(
                'assets/images/logo_paris.svg',
                width: Responsive.icon(38),
                height: Responsive.icon(38),
                colorFilter: const ColorFilter.mode(Colors.white, BlendMode.srcIn),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryCards() {
    return GridView.count(
      crossAxisCount: 2,
      crossAxisSpacing: Responsive.w(14),
      mainAxisSpacing: Responsive.h(14),
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      childAspectRatio: 1.35,
      children: [
        _buildStatCard('Total Sales',   '₹4,520', Icons.trending_up_rounded,  _primary, _surface),
        _buildStatCard('Pending',       '12',     Icons.hourglass_top_rounded, _primary, _surface),
        _buildStatCard('Rented Out',    '34',     Icons.checkroom_rounded,     _primary, _surface),
        _buildStatCard('Customers',     '128',    Icons.people_alt_rounded,    _primary, _surface),
      ],
    );
  }

  Widget _buildStatCard(String title, String value, IconData icon, Color accent, Color bg) {
    return Container(
      padding: Responsive.all(16),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(Responsive.r(18)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: Responsive.all(10),
            decoration: BoxDecoration(
              color: _accent,
              borderRadius: BorderRadius.circular(Responsive.r(12)),
            ),
            child: Icon(icon, size: Responsive.icon(22), color: _primary),
          ),
          const Spacer(),
          Text(
            value,
            style: TextStyle(fontSize: Responsive.sp(22), fontWeight: FontWeight.w800, color: accent),
          ),
          SizedBox(height: Responsive.h(4)),
          Text(
            title,
            style: TextStyle(fontSize: Responsive.sp(13), fontWeight: FontWeight.w600, color: accent.withValues(alpha: 0.7)),
          ),
        ],
      ),
    );
  }

  Widget _buildQuickActions() {
    return Row(
      children: [
        _buildActionChip('New Order',   Icons.add_shopping_cart_rounded, _primary),
        SizedBox(width: Responsive.w(10)),
        _buildActionChip('Add Product', Icons.add_box_outlined,         _primary),
        SizedBox(width: Responsive.w(10)),
        _buildActionChip('Scan',        Icons.qr_code_scanner_rounded,  _primary),
      ],
    );
  }

  Widget _buildActionChip(String label, IconData icon, Color color) {
    return Expanded(
      child: Container(
        padding: Responsive.symmetric(vertical: 18),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(Responsive.r(16)),
          boxShadow: [
            BoxShadow(
              color: color.withValues(alpha: 0.08),
              blurRadius: Responsive.r(10),
              offset: Offset(0, Responsive.h(3)),
            ),
          ],
        ),
        child: Column(
          children: [
            Container(
              padding: Responsive.all(12),
              decoration: const BoxDecoration(
                color: _surface,
                shape: BoxShape.circle,
              ),
              child: Icon(icon, size: Responsive.icon(26), color: color),
            ),
            SizedBox(height: Responsive.h(10)),
            Text(
              label,
              style: TextStyle(fontSize: Responsive.sp(13), fontWeight: FontWeight.w700, color: color),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Row(
      children: [
        Text(
          title,
          style: TextStyle(fontSize: Responsive.sp(18), fontWeight: FontWeight.bold, color: _primary),
        ),
        const Spacer(),
        Text(
          'See all',
          style: TextStyle(fontSize: Responsive.sp(14), fontWeight: FontWeight.w700, color: _primary),
        ),
      ],
    );
  }

  Widget _buildRecentOrders() {
    final orders = [
      _OrderData('Anjali Sharma',  'Bridal Lehenga - Rent',    'Pending',   _primary),
      _OrderData('Priya Nair',     'Wedding Gown - Rent',      'Confirmed', _primary),
      _OrderData('Meera Thomas',   'Reception Saree - Return', 'Returned',  _primary),
    ];

    return Column(
      children: orders.map((order) {
        return Container(
          margin: Responsive.only(bottom: 14),
          padding: Responsive.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(Responsive.r(16)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                blurRadius: Responsive.r(8),
                offset: Offset(0, Responsive.h(2)),
              ),
            ],
          ),
          child: Row(
            children: [
              CircleAvatar(
                radius: Responsive.w(24),
                backgroundColor: _surface,
                child: Text(
                  order.name[0],
                  style: TextStyle(fontWeight: FontWeight.bold, color: order.statusColor, fontSize: Responsive.sp(18)),
                ),
              ),
              SizedBox(width: Responsive.w(16)),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(order.name, style: TextStyle(fontWeight: FontWeight.bold, fontSize: Responsive.sp(15), color: _primary)),
                    SizedBox(height: Responsive.h(4)),
                    Text(order.product, style: TextStyle(color: Colors.grey[600], fontSize: Responsive.sp(13), fontWeight: FontWeight.w500)),
                  ],
                ),
              ),
              Container(
                padding: Responsive.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: _surface,
                  borderRadius: BorderRadius.circular(Responsive.r(14)),
                ),
                child: Text(
                  order.status,
                  style: TextStyle(color: order.statusColor, fontSize: Responsive.sp(12), fontWeight: FontWeight.w800),
                ),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }
}

class _OrderData {
  final String name;
  final String product;
  final String status;
  final Color statusColor;
  const _OrderData(this.name, this.product, this.status, this.statusColor);
}
