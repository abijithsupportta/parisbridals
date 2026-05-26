import 'package:flutter/material.dart';
import '../../../../core/responsive.dart';
import '../../../customers/models/customer.dart';
import '../customer_search_field.dart';

/// Step 1: Customer selection with search + quick-add.
class StepCustomer extends StatelessWidget {
  final Customer? selected;
  final ValueChanged<Customer?> onSelected;

  const StepCustomer({super.key, this.selected, required this.onSelected});

  static const _primary = Color(0xFF434343);

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: Responsive.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Container(
            padding: Responsive.all(16),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [_primary.withValues(alpha: 0.06), _primary.withValues(alpha: 0.02)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(Responsive.r(14)),
            ),
            child: Row(
              children: [
                Container(
                  padding: Responsive.all(10),
                  decoration: BoxDecoration(
                    color: _primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(Responsive.r(10)),
                  ),
                  child: Icon(Icons.person_search_rounded, size: Responsive.icon(22), color: _primary),
                ),
                SizedBox(width: Responsive.w(12)),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Select Customer', style: TextStyle(fontSize: Responsive.sp(15), fontWeight: FontWeight.w800, color: _primary)),
                      SizedBox(height: Responsive.h(2)),
                      Text(
                        'Search by name or phone, or add a new customer',
                        style: TextStyle(fontSize: Responsive.sp(11), color: Colors.grey[600]),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          SizedBox(height: Responsive.h(20)),

          // Customer search field (reuses existing widget)
          Container(
            padding: Responsive.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(Responsive.r(16)),
              boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 8, offset: const Offset(0, 2))],
            ),
            child: CustomerSearchField(
              initialCustomer: selected,
              onSelected: onSelected,
            ),
          ),

          // Tip
          if (selected == null) ...[
            SizedBox(height: Responsive.h(24)),
            Container(
              padding: Responsive.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFFFFF8E1),
                borderRadius: BorderRadius.circular(Responsive.r(12)),
                border: Border.all(color: const Color(0xFFF7C873).withValues(alpha: 0.5)),
              ),
              child: Row(
                children: [
                  Icon(Icons.lightbulb_outline, size: Responsive.icon(18), color: const Color(0xFFF5A623)),
                  SizedBox(width: Responsive.w(10)),
                  Expanded(
                    child: Text(
                      'Tip: If the customer doesn\'t exist, type their name and use the "Add New Customer" button.',
                      style: TextStyle(fontSize: Responsive.sp(11), color: Colors.grey[700]),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}
