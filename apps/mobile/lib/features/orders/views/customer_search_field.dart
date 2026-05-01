import 'dart:async';
import 'package:flutter/material.dart';
import '../../../core/responsive.dart';
import '../../customers/models/customer.dart';
import '../../customers/repositories/customer_repository.dart';

/// Lightweight customer picker: debounced search, slim dropdown, bottom-sheet quick-add.
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
  String? _searchError;
  Timer? _debounce;

  static const _primary = Color(0xFF434343);

  // True if every character in the string is a digit, +, or space (phone-like).
  static bool _looksLikePhone(String s) => RegExp(r'^[\d\s\+\-]+$').hasMatch(s.trim());

  @override
  void initState() {
    super.initState();
    _selected = widget.initialCustomer;
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _controller.dispose();
    super.dispose();
  }

  // ── Search with 300ms debounce ──

  void _onSearchChanged(String query) {
    _debounce?.cancel();
    if (query.isEmpty) {
      setState(() { _results = []; _showResults = false; _searchError = null; });
      return;
    }
    _debounce = Timer(const Duration(milliseconds: 300), () => _search(query));
  }

  Future<void> _search(String query) async {
    if (query.isEmpty) return;
    setState(() { _isSearching = true; _searchError = null; });
    try {
      final result = await _repo.getCustomers(query: query, limit: 5);
      if (mounted) {
        setState(() {
          _results = result.customers;
          _showResults = true;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _results = [];
          _showResults = true;
          _searchError = e.toString().replaceFirst('Exception: ', '');
        });
      }
    } finally {
      if (mounted) setState(() => _isSearching = false);
    }
  }

  // ── Selection ──

  void _selectCustomer(Customer c) {
    setState(() { _selected = c; _showResults = false; _results = []; });
    _controller.clear();
    widget.onSelected(c);
  }

  void _clear() {
    setState(() { _selected = null; _results = []; _showResults = false; });
    _controller.clear();
    widget.onSelected(null);
  }

  // ── Quick-Add bottom sheet ──

  void _openQuickAdd() {
    final text = _controller.text.trim();
    final isPhone = _looksLikePhone(text);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _QuickAddSheet(
        initialName: isPhone ? '' : text,
        initialPhone: isPhone ? text : '',
        repo: _repo,
        onCreated: (c) {
          if (mounted) _selectCustomer(c);
        },
      ),
    );
  }

  // ── Build ──

  @override
  Widget build(BuildContext context) {
    if (_selected != null) return _buildSelectedChip();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        // Search field
        TextField(
          controller: _controller,
          onChanged: _onSearchChanged,
          style: TextStyle(fontSize: Responsive.sp(14)),
          decoration: InputDecoration(
            hintText: 'Name or phone number...',
            hintStyle: TextStyle(fontSize: Responsive.sp(13), color: Colors.grey[400]),
            prefixIcon: Icon(Icons.search, size: Responsive.icon(20), color: Colors.grey[500]),
            suffixIcon: _isSearching
                ? Padding(
                    padding: Responsive.all(12),
                    child: SizedBox(
                      width: Responsive.w(16), height: Responsive.w(16),
                      child: const CircularProgressIndicator(strokeWidth: 2),
                    ),
                  )
                : (_controller.text.isNotEmpty
                    ? IconButton(
                        icon: Icon(Icons.close, size: Responsive.icon(18), color: Colors.grey),
                        onPressed: () {
                          _controller.clear();
                          setState(() { _results = []; _showResults = false; _searchError = null; });
                        },
                      )
                    : null),
            filled: true,
            fillColor: Colors.grey[50],
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(Responsive.r(10)), borderSide: BorderSide(color: Colors.grey[300]!)),
            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(Responsive.r(10)), borderSide: BorderSide(color: Colors.grey[300]!)),
            focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(Responsive.r(10)), borderSide: BorderSide(color: _primary, width: 1.5)),
            contentPadding: Responsive.symmetric(horizontal: 14, vertical: 12),
          ),
        ),

        // Error message
        if (_searchError != null)
          Padding(
            padding: Responsive.only(top: 6),
            child: Text(
              _searchError!,
              style: TextStyle(fontSize: Responsive.sp(11), color: Colors.red[600]),
              maxLines: 2, overflow: TextOverflow.ellipsis,
            ),
          ),

        // Dropdown results
        if (_showResults && _results.isNotEmpty)
          Container(
            margin: Responsive.only(top: 4),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(Responsive.r(10)),
              border: Border.all(color: Colors.grey[200]!),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                ..._results.map((c) => InkWell(
                  onTap: () => _selectCustomer(c),
                  child: Container(
                    width: double.infinity,
                    padding: Responsive.symmetric(horizontal: 12, vertical: 10),
                    decoration: BoxDecoration(
                      border: Border(bottom: BorderSide(color: Colors.grey[100]!)),
                    ),
                    child: Text(
                      '${c.name}  •  ${c.phone}',
                      style: TextStyle(fontSize: Responsive.sp(13), color: _primary),
                      maxLines: 1, overflow: TextOverflow.ellipsis,
                    ),
                  ),
                )),
                // Add new at bottom
                _buildAddNewRow(),
              ],
            ),
          ),

        // No results
        if (_showResults && _results.isEmpty && _searchError == null && _controller.text.isNotEmpty)
          Container(
            margin: Responsive.only(top: 4),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(Responsive.r(10)),
              border: Border.all(color: Colors.grey[200]!),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Padding(
                  padding: Responsive.symmetric(vertical: 12),
                  child: Text('No customers found', style: TextStyle(fontSize: Responsive.sp(12), color: Colors.grey[500])),
                ),
                _buildAddNewRow(),
              ],
            ),
          ),
      ],
    );
  }

  // ── Slim selected chip ──

  Widget _buildSelectedChip() {
    return Container(
      padding: Responsive.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: const Color(0xFFE8F5E9),
        borderRadius: BorderRadius.circular(Responsive.r(8)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.check_circle, size: Responsive.icon(16), color: const Color(0xFF2ECC71)),
          SizedBox(width: Responsive.w(6)),
          Flexible(
            child: Text(
              '${_selected!.name}  •  ${_selected!.phone}',
              style: TextStyle(fontSize: Responsive.sp(13), fontWeight: FontWeight.w600, color: _primary),
              maxLines: 1, overflow: TextOverflow.ellipsis,
            ),
          ),
          SizedBox(width: Responsive.w(4)),
          InkWell(
            onTap: _clear,
            child: Icon(Icons.close, size: Responsive.icon(16), color: Colors.grey[600]),
          ),
        ],
      ),
    );
  }

  // ── Add-new row at bottom of dropdown ──

  Widget _buildAddNewRow() {
    return InkWell(
      onTap: _openQuickAdd,
      child: Container(
        width: double.infinity,
        padding: Responsive.symmetric(horizontal: 12, vertical: 10),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.person_add_alt_1, size: Responsive.icon(16), color: const Color(0xFF4A90D9)),
            SizedBox(width: Responsive.w(6)),
            Text('Add New Customer', style: TextStyle(fontSize: Responsive.sp(12), fontWeight: FontWeight.w700, color: const Color(0xFF4A90D9))),
          ],
        ),
      ),
    );
  }
}

// ────────────────────────────────────────────────────────
// Quick-Add Bottom Sheet
// ────────────────────────────────────────────────────────

class _QuickAddSheet extends StatefulWidget {
  final String initialName;
  final String initialPhone;
  final CustomerRepository repo;
  final ValueChanged<Customer> onCreated;

  const _QuickAddSheet({
    required this.initialName,
    required this.initialPhone,
    required this.repo,
    required this.onCreated,
  });

  @override
  State<_QuickAddSheet> createState() => _QuickAddSheetState();
}

class _QuickAddSheetState extends State<_QuickAddSheet> {
  late final TextEditingController _phone;
  late final TextEditingController _name;
  late final TextEditingController _address;
  bool _isCreating = false;

  static const _primary = Color(0xFF434343);

  @override
  void initState() {
    super.initState();
    _phone = TextEditingController(text: widget.initialPhone);
    _name = TextEditingController(text: widget.initialName);
    _address = TextEditingController();
  }

  @override
  void dispose() {
    _phone.dispose();
    _name.dispose();
    _address.dispose();
    super.dispose();
  }

  Future<void> _create() async {
    final name = _name.text.trim();
    final phone = _phone.text.trim();
    if (name.isEmpty || phone.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: const Text('Name and Phone are required'), backgroundColor: Colors.orange[700]),
      );
      return;
    }

    setState(() => _isCreating = true);
    try {
      final body = <String, dynamic>{'name': name, 'phone': phone};
      final addr = _address.text.trim();
      if (addr.isNotEmpty) body['address'] = addr;

      final customer = await widget.repo.createCustomer(body);
      if (mounted) {
        Navigator.pop(context);
        widget.onCreated(customer);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed: ${e.toString().replaceFirst("Exception: ", "")}'), backgroundColor: Colors.red[700]),
        );
      }
    } finally {
      if (mounted) setState(() => _isCreating = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    Responsive.init(context);
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(Responsive.r(16))),
        ),
        padding: Responsive.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Handle bar
            Center(
              child: Container(
                width: Responsive.w(36), height: Responsive.h(4),
                decoration: BoxDecoration(color: Colors.grey[300], borderRadius: BorderRadius.circular(2)),
              ),
            ),
            SizedBox(height: Responsive.h(14)),
            Text('New Customer', style: TextStyle(fontSize: Responsive.sp(16), fontWeight: FontWeight.w800, color: _primary)),
            SizedBox(height: Responsive.h(16)),

            // Phone (first — most important for rental business)
            _field(_phone, 'Phone *', TextInputType.phone, Icons.phone_outlined),
            SizedBox(height: Responsive.h(10)),
            _field(_name, 'Name *', TextInputType.name, Icons.person_outline),
            SizedBox(height: Responsive.h(10)),
            _field(_address, 'Address', TextInputType.streetAddress, Icons.location_on_outlined),
            SizedBox(height: Responsive.h(18)),

            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _isCreating ? null : _create,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF2ECC71),
                  foregroundColor: Colors.white,
                  padding: Responsive.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(Responsive.r(10))),
                  disabledBackgroundColor: Colors.grey[300],
                ),
                child: _isCreating
                    ? SizedBox(width: Responsive.w(18), height: Responsive.w(18), child: const CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : Text('Create & Select', style: TextStyle(fontSize: Responsive.sp(14), fontWeight: FontWeight.w800)),
              ),
            ),
            SizedBox(height: Responsive.h(8)),
          ],
        ),
      ),
    );
  }

  Widget _field(TextEditingController ctrl, String label, TextInputType type, IconData icon) {
    return TextField(
      controller: ctrl,
      keyboardType: type,
      style: TextStyle(fontSize: Responsive.sp(14)),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: TextStyle(fontSize: Responsive.sp(12), color: Colors.grey[600]),
        prefixIcon: Icon(icon, size: Responsive.icon(18), color: Colors.grey[500]),
        filled: true,
        fillColor: Colors.grey[50],
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(Responsive.r(10)), borderSide: BorderSide(color: Colors.grey[300]!)),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(Responsive.r(10)), borderSide: BorderSide(color: Colors.grey[300]!)),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(Responsive.r(10)), borderSide: BorderSide(color: _primary, width: 1.5)),
        contentPadding: Responsive.symmetric(horizontal: 12, vertical: 12),
        isDense: true,
      ),
    );
  }
}
