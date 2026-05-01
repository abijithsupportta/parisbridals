import 'package:flutter/material.dart';
import '../../../core/responsive.dart';
import '../../customers/models/customer.dart';
import '../../customers/repositories/customer_repository.dart';

/// Searchable customer picker with inline quick-add for the order form.
class CustomerSearchField extends StatefulWidget {
  final Customer? initialCustomer;
  final ValueChanged<Customer?> onSelected;

  const CustomerSearchField({super.key, this.initialCustomer, required this.onSelected});

  @override
  State<CustomerSearchField> createState() => _CustomerSearchFieldState();
}

class _CustomerSearchFieldState extends State<CustomerSearchField> {
  final _controller = TextEditingController();
  final _repo = CustomerRepository();
  Customer? _selected;
  List<Customer> _results = [];
  bool _isSearching = false;
  bool _showResults = false;
  bool _showQuickAdd = false;

  // Quick-add controllers
  final _qaName = TextEditingController();
  final _qaPhone = TextEditingController();
  final _qaAddress = TextEditingController();
  bool _isCreating = false;

  static const _primary = Color(0xFF434343);

  @override
  void initState() {
    super.initState();
    _selected = widget.initialCustomer;
    if (_selected != null) {
      _controller.text = '${_selected!.name} • ${_selected!.phone}';
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    _qaName.dispose();
    _qaPhone.dispose();
    _qaAddress.dispose();
    super.dispose();
  }

  Future<void> _search(String query) async {
    if (query.length < 2) {
      setState(() { _results = []; _showResults = false; _showQuickAdd = false; });
      return;
    }
    setState(() => _isSearching = true);
    try {
      final result = await _repo.getCustomers(query: query, limit: 8);
      if (mounted) {
        setState(() {
          _results = result.customers;
          _showResults = true;
          _showQuickAdd = result.customers.isEmpty;
        });
      }
    } catch (_) {
    } finally {
      if (mounted) setState(() => _isSearching = false);
    }
  }

  void _selectCustomer(Customer c) {
    setState(() {
      _selected = c;
      _controller.text = '${c.name} • ${c.phone}';
      _showResults = false;
      _showQuickAdd = false;
    });
    widget.onSelected(c);
  }

  void _clear() {
    setState(() {
      _selected = null;
      _controller.clear();
      _results = [];
      _showResults = false;
      _showQuickAdd = false;
    });
    widget.onSelected(null);
  }

  void _openQuickAdd() {
    // Pre-fill name from search query
    _qaName.text = _controller.text;
    _qaPhone.clear();
    _qaAddress.clear();
    setState(() { _showQuickAdd = true; _showResults = false; });
  }

  Future<void> _createCustomer() async {
    if (_qaName.text.trim().isEmpty || _qaPhone.text.trim().isEmpty) return;
    setState(() => _isCreating = true);
    try {
      final customer = await _repo.createCustomer({
        'name': _qaName.text.trim(),
        'phone': _qaPhone.text.trim(),
        'address': _qaAddress.text.trim().isEmpty ? null : _qaAddress.text.trim(),
      });
      if (mounted) _selectCustomer(customer);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to create customer: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _isCreating = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Selected customer card
        if (_selected != null)
          _buildSelectedCard()
        else ...[
          // Search bar
          TextField(
            controller: _controller,
            onChanged: _search,
            style: TextStyle(fontSize: Responsive.sp(14)),
            decoration: InputDecoration(
              hintText: 'Search by name or phone...',
              hintStyle: TextStyle(fontSize: Responsive.sp(13), color: Colors.grey[400]),
              prefixIcon: Icon(Icons.search, size: Responsive.icon(20), color: Colors.grey),
              suffixIcon: _isSearching
                  ? Padding(padding: Responsive.all(12), child: SizedBox(width: Responsive.w(16), height: Responsive.h(16), child: const CircularProgressIndicator(strokeWidth: 2)))
                  : null,
              filled: true,
              fillColor: Colors.grey[50],
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(Responsive.r(12)), borderSide: BorderSide(color: Colors.grey[300]!)),
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(Responsive.r(12)), borderSide: BorderSide(color: Colors.grey[300]!)),
              focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(Responsive.r(12)), borderSide: BorderSide(color: _primary, width: 2)),
              contentPadding: Responsive.symmetric(horizontal: 16, vertical: 14),
            ),
          ),

          // Search results
          if (_showResults && _results.isNotEmpty)
            Container(
              margin: Responsive.only(top: 4),
              constraints: BoxConstraints(maxHeight: Responsive.h(200)),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(Responsive.r(12)),
                border: Border.all(color: Colors.grey[200]!),
                boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 8, offset: const Offset(0, 4))],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Flexible(
                    child: ListView.separated(
                      shrinkWrap: true,
                      padding: Responsive.symmetric(vertical: 4),
                      itemCount: _results.length,
                      separatorBuilder: (_, __) => Divider(height: 1, color: Colors.grey[100]),
                      itemBuilder: (_, i) {
                        final c = _results[i];
                        return ListTile(
                          dense: true,
                          leading: CircleAvatar(
                            radius: Responsive.r(16),
                            backgroundColor: _primary.withValues(alpha: 0.1),
                            child: Text(c.name[0].toUpperCase(), style: TextStyle(fontSize: Responsive.sp(13), fontWeight: FontWeight.bold, color: _primary)),
                          ),
                          title: Text(c.name, style: TextStyle(fontSize: Responsive.sp(13), fontWeight: FontWeight.w600), maxLines: 1, overflow: TextOverflow.ellipsis),
                          subtitle: Text(c.phone, style: TextStyle(fontSize: Responsive.sp(11), color: Colors.grey[600])),
                          onTap: () => _selectCustomer(c),
                        );
                      },
                    ),
                  ),
                  // Quick add button at bottom of results
                  InkWell(
                    onTap: _openQuickAdd,
                    child: Container(
                      width: double.infinity,
                      padding: Responsive.symmetric(vertical: 10),
                      decoration: BoxDecoration(border: Border(top: BorderSide(color: Colors.grey[200]!))),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.person_add, size: Responsive.icon(16), color: const Color(0xFF4A90D9)),
                          SizedBox(width: Responsive.w(6)),
                          Text('Add New Customer', style: TextStyle(fontSize: Responsive.sp(12), fontWeight: FontWeight.w700, color: const Color(0xFF4A90D9))),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),

          // No results — show quick add
          if (_showResults && _results.isEmpty && !_showQuickAdd && _controller.text.length >= 2)
            _buildNoResultsQuickAdd(),

          // Quick add form
          if (_showQuickAdd) _buildQuickAddForm(),
        ],
      ],
    );
  }

  Widget _buildSelectedCard() {
    return Container(
      padding: Responsive.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFE8F5E9),
        borderRadius: BorderRadius.circular(Responsive.r(12)),
        border: Border.all(color: const Color(0xFF2ECC71)),
      ),
      child: Row(children: [
        CircleAvatar(
          radius: Responsive.r(20),
          backgroundColor: const Color(0xFF2ECC71).withValues(alpha: 0.2),
          child: Icon(Icons.person, size: Responsive.icon(20), color: const Color(0xFF2ECC71)),
        ),
        SizedBox(width: Responsive.w(12)),
        Expanded(child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(_selected!.name, style: TextStyle(fontSize: Responsive.sp(14), fontWeight: FontWeight.w700, color: _primary)),
            SizedBox(height: Responsive.h(2)),
            Text(_selected!.phone, style: TextStyle(fontSize: Responsive.sp(12), color: Colors.grey[600])),
          ],
        )),
        IconButton(
          onPressed: _clear,
          icon: Icon(Icons.close_rounded, size: Responsive.icon(20), color: Colors.grey[600]),
        ),
      ]),
    );
  }

  Widget _buildNoResultsQuickAdd() {
    return Container(
      margin: Responsive.only(top: 8),
      padding: Responsive.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFFFF8E1),
        borderRadius: BorderRadius.circular(Responsive.r(12)),
        border: Border.all(color: const Color(0xFFF7C873)),
      ),
      child: Column(children: [
        Text('No customers found', style: TextStyle(fontSize: Responsive.sp(13), fontWeight: FontWeight.w600, color: Colors.grey[700])),
        SizedBox(height: Responsive.h(8)),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            onPressed: _openQuickAdd,
            icon: Icon(Icons.person_add, size: Responsive.icon(18)),
            label: Text('Add New Customer', style: TextStyle(fontSize: Responsive.sp(13), fontWeight: FontWeight.bold)),
            style: ElevatedButton.styleFrom(
              backgroundColor: _primary,
              foregroundColor: Colors.white,
              padding: Responsive.symmetric(vertical: 10),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(Responsive.r(10))),
            ),
          ),
        ),
      ]),
    );
  }

  Widget _buildQuickAddForm() {
    return Container(
      margin: Responsive.only(top: 8),
      padding: Responsive.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(Responsive.r(12)),
        border: Border.all(color: const Color(0xFF4A90D9)),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 8, offset: const Offset(0, 4))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Icon(Icons.person_add, size: Responsive.icon(18), color: const Color(0xFF4A90D9)),
            SizedBox(width: Responsive.w(6)),
            Text('Quick Add Customer', style: TextStyle(fontSize: Responsive.sp(13), fontWeight: FontWeight.w800, color: _primary)),
            const Spacer(),
            InkWell(
              onTap: () => setState(() => _showQuickAdd = false),
              child: Icon(Icons.close, size: Responsive.icon(18), color: Colors.grey),
            ),
          ]),
          SizedBox(height: Responsive.h(12)),
          _buildQaField(_qaName, 'Name *', TextInputType.name),
          SizedBox(height: Responsive.h(8)),
          _buildQaField(_qaPhone, 'Phone *', TextInputType.phone),
          SizedBox(height: Responsive.h(8)),
          _buildQaField(_qaAddress, 'Address', TextInputType.streetAddress),
          SizedBox(height: Responsive.h(12)),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _isCreating ? null : _createCustomer,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF2ECC71),
                foregroundColor: Colors.white,
                padding: Responsive.symmetric(vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(Responsive.r(10))),
              ),
              child: _isCreating
                  ? SizedBox(width: Responsive.w(18), height: Responsive.h(18), child: const CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : Text('Create & Select', style: TextStyle(fontSize: Responsive.sp(13), fontWeight: FontWeight.bold)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQaField(TextEditingController ctrl, String label, TextInputType type) {
    return TextField(
      controller: ctrl,
      keyboardType: type,
      style: TextStyle(fontSize: Responsive.sp(13)),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: TextStyle(fontSize: Responsive.sp(12)),
        filled: true,
        fillColor: Colors.grey[50],
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(Responsive.r(10)), borderSide: BorderSide(color: Colors.grey[300]!)),
        contentPadding: Responsive.symmetric(horizontal: 12, vertical: 10),
        isDense: true,
      ),
    );
  }
}
