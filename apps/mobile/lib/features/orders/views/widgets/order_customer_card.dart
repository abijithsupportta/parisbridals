import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/responsive.dart';
import '../../models/order.dart';
import '../order_detail_helpers.dart';

/// Customer info card with name, phone, and tap-to-call button.
class OrderCustomerCard extends StatelessWidget {
  final Order order;

  const OrderCustomerCard({super.key, required this.order});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: Responsive.only(left: 16, right: 16, top: 16),
      padding: Responsive.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(Responsive.r(16)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: Responsive.r(8),
            offset: Offset(0, Responsive.h(2)),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'CUSTOMER',
            style: TextStyle(
              fontSize: Responsive.sp(10),
              fontWeight: FontWeight.w900,
              color: Colors.grey[600],
              letterSpacing: 1,
            ),
          ),
          SizedBox(height: Responsive.h(12)),
          Text(
            order.customer?.name ?? 'Unknown',
            style: TextStyle(
              fontSize: Responsive.sp(20),
              fontWeight: FontWeight.w900,
              color: kPrimary,
            ),
          ),
          SizedBox(height: Responsive.h(12)),
          InkWell(
            onTap: () async {
              final phone = order.customer?.phone;
              if (phone != null && phone.isNotEmpty) {
                final uri = Uri(scheme: 'tel', path: phone);
                if (await canLaunchUrl(uri)) {
                  await launchUrl(uri);
                }
              }
            },
            child: Container(
              padding: Responsive.symmetric(vertical: 12),
              decoration: BoxDecoration(
                color: const Color(0xFFE8F5E9),
                borderRadius: BorderRadius.circular(Responsive.r(12)),
                border: Border.all(color: const Color(0xFF2ECC71)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.phone_rounded,
                    size: Responsive.icon(20),
                    color: const Color(0xFF2ECC71),
                  ),
                  SizedBox(width: Responsive.w(8)),
                  Text(
                    order.customer?.phone ?? 'N/A',
                    style: TextStyle(
                      fontSize: Responsive.sp(16),
                      fontWeight: FontWeight.w900,
                      color: const Color(0xFF2ECC71),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
