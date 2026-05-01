import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/responsive.dart';
import '../../customers/models/customer.dart';
import '../../customers/repositories/customer_repository.dart';

/// Searchable customer picker field for the order form.
class CustomerSearchField extends ConsumerStatefulWidget {
  final Customer? initialCustomer;
  final ValueChanged<Customer?> onSelected;

  const CustomerSearchField({super.key, this.initialCustomer, required this.onSelected});

  @override
  ConsumerState<CustomerSearchField> createState() => _CustomerSearchFieldState();
}

class _CustomerSearchFieldState extends ConsumerState<CustomerSearchField> {
  final _controller = TextEditingController();
  final _repo = CustomerRepository();
  Customer? _selected;
  List<Customer> _results = [];
  bool _isSearching = false;
  bool _showResults = false;

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
    super.dispose();
  }

  Future<void> _search(String query) async {
    if (query.length < 2) {
      setState(() { _results = []; _showResults = false; });
      return;
    }
    setState(() => _isSearching = true);
    try {
      final result = await _repo.getCustomers(query: query, limit: 10);
      if (mounted) setState(() { _results = result.customers; _showResults = true; });
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
    });
    widget.onSelected(c);
  }

  void _clear() {
    setState(() {
      _selected = null;
      _controller.clear();
      _results = [];
      _showResults = false;
    });
    widget.onSelected(null);
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('CUSTOMER', style: TextStyle(fontSize: Responsive.sp(11), fontWeight: FontWeight.w800, color: Colors.grey[600], letterSpacing: 0.5)),
        SizedBox(height: Responsive.h(6)),
        TextField(
          controller: _controller,
          onChanged: (v) {
            if (_selected != null) _clear();
            _search(v);
          },
          style: TextStyle(fontSize: Responsive.sp(14)),
          decoration: InputDecoration(
            hintText: 'Search by name or phone...',
            hintStyle: TextStyle(fontSize: Responsive.sp(13), color: Colors.grey[400]),
            prefixIcon: Icon(_selected != null ? Icons.person : Icons.search, size: Responsive.icon(20), color: _selected != null ? const Color(0xFF2ECC71) : Colors.grey),
            suffixIcon: _selected != null
                ? IconButton(icon: Icon(Icons.close, size: Responsive.icon(20)), onPressed: _clear)
                : _isSearching ? Padding(padding: Responsive.all(12), child: SizedBox(width: Responsive.w(16), height: Responsive.h(16), child: const CircularProgressIndicator(strokeWidth: 2))) : null,
            filled: true,
            fillColor: _selected != null ? const Color(0xFFE8F5E9) : Colors.grey[50],
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(Responsive.r(12)), borderSide: BorderSide(color: Colors.grey[300]!)),
            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(Responsive.r(12)), borderSide: BorderSide(color: _selected != null ? const Color(0xFF2ECC71) : Colors.grey[300]!)),
            focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(Responsive.r(12)), borderSide: BorderSide(color: _primary, width: 2)),
            contentPadding: Responsive.symmetric(horizontal: 16, vertical: 14),
          ),
          readOnly: _selected != null,
        ),
        if (_showResults && _results.isNotEmpty)
          Container(
            margin: Responsive.only(top: 4),
            constraints: BoxConstraints(maxHeight: Responsive.h(200)),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(Responsive.r(12)),
              border: Border.all(color: Colors.grey[300]!),
              boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.08), blurRadius: 8, offset: const Offset(0, 4))],
            ),
            child: ListView.separated(
              shrinkWrap: true,
              padding: Responsive.symmetric(vertical: 4),
              itemCount: _results.length,
              separatorBuilder: (_, __) => Divider(height: 1, color: Colors.grey[200]),
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
      ],
    );
  }
}
