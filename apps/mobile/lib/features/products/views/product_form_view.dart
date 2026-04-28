import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:shimmer/shimmer.dart';
import '../../../core/responsive.dart';
import '../../categories/providers/category_provider.dart';
import '../../categories/models/category.dart';
import '../models/product.dart';
import '../providers/product_provider.dart';
import '../../../core/upload_repository.dart';

class ProductFormView extends ConsumerStatefulWidget {
  final Product? product;
  const ProductFormView({super.key, this.product});

  @override
  ConsumerState<ProductFormView> createState() => _ProductFormViewState();
}

class _ProductFormViewState extends ConsumerState<ProductFormView> {
  final _formKey = GlobalKey<FormState>();
  
  // Controllers
  late TextEditingController _nameController;
  late TextEditingController _descriptionController;
  late TextEditingController _skuController;
  late TextEditingController _barcodeController;
  late TextEditingController _priceController;
  late TextEditingController _quantityController;
  late TextEditingController _lowStockController;

  // State
  String? _selectedCategoryId;
  String? _selectedSubcategoryId;
  String? _selectedVariantId;
  bool _isActive = true;
  bool _isFeatured = false;
  bool _trackInventory = true;
  bool _isSaving = false;
  
  // Images
  final List<dynamic> _images = []; // Can be String (URL) or XFile (local)

  static const _primary = Color(0xFF434343);

  @override
  void initState() {
    super.initState();
    final p = widget.product;
    _nameController = TextEditingController(text: p?.name ?? '');
    _descriptionController = TextEditingController(text: p?.description ?? '');
    _skuController = TextEditingController(text: p?.sku ?? '');
    _barcodeController = TextEditingController(text: p?.barcode ?? '');
    _priceController = TextEditingController(text: p?.pricePerDay.toString() ?? '');
    _quantityController = TextEditingController(text: p?.quantity.toString() ?? '');
    _lowStockController = TextEditingController(text: p?.lowStockThreshold.toString() ?? '10');
    
    _selectedCategoryId = p?.categoryId;
    _selectedSubcategoryId = p?.subcategoryId;
    _selectedVariantId = p?.subvariantId;
    _isActive = p?.isActive ?? true;
    _isFeatured = p?.isFeatured ?? false;
    _trackInventory = p?.trackInventory ?? true;

    if (p != null) {
      _images.addAll(p.images.map((e) => e.url));
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _descriptionController.dispose();
    _skuController.dispose();
    _barcodeController.dispose();
    _priceController.dispose();
    _quantityController.dispose();
    _lowStockController.dispose();
    super.dispose();
  }

  Future<void> _pickImage(ImageSource source) async {
    try {
      final picker = ImagePicker();
      final List<XFile> pickedFiles = [];
      
      if (source == ImageSource.gallery) {
        final files = await picker.pickMultiImage(imageQuality: 70);
        pickedFiles.addAll(files);
      } else {
        final file = await picker.pickImage(source: source, imageQuality: 70);
        if (file != null) pickedFiles.add(file);
      }

      // Guard: widget may be disposed if Android killed activity during camera
      if (!mounted) return;

      if (pickedFiles.isNotEmpty) {
        setState(() => _images.addAll(pickedFiles));
      }
    } catch (e) {
      debugPrint('Image pick failed: $e');
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to pick image: $e', style: TextStyle(fontSize: Responsive.sp(12)))),
      );
    }
  }

  String _generateBarcode() {
    final timestamp = DateTime.now().millisecondsSinceEpoch.toString();
    return timestamp.substring(timestamp.length - 8); // Simple 8-digit numeric barcode
  }

  void _confirmDelete(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Delete Product', style: TextStyle(fontSize: Responsive.sp(16), fontWeight: FontWeight.bold)),
        content: Text(
          'Are you sure you want to delete "${widget.product?.name}"? This action cannot be undone.',
          style: TextStyle(fontSize: Responsive.sp(13)),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text('Cancel', style: TextStyle(fontSize: Responsive.sp(13), color: Colors.grey[600])),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(ctx); // Close dialog
              _handleDelete();
            },
            child: Text('Delete', style: TextStyle(fontSize: Responsive.sp(13), fontWeight: FontWeight.bold, color: const Color(0xFFFF6B8A))),
          ),
        ],
      ),
    );
  }

  void _handleDelete() async {
    final product = widget.product;
    if (product == null) return;

    Navigator.pop(context); // Close form
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Deleting product...', style: TextStyle(fontSize: Responsive.sp(13))),
        duration: const Duration(seconds: 2),
      ),
    );

    try {
      await ref.read(productsProvider.notifier).deleteProduct(product.id);
    } catch (e) {
      debugPrint('Delete failed: $e');
    }
  }

  void _handleSave() async {
    if (!_formKey.currentState!.validate()) return;

    // Show loading indicator on the form itself (DON'T pop yet)
    setState(() => _isSaving = true);

    try {
      // 1. Upload new local images first
      final List<Map<String, dynamic>> finalImages = [];
      int sortOrder = 0;

      for (var img in _images) {
        if (img is XFile) {
          final repo = UploadRepository();
          final url = await repo.uploadFile(File(img.path), folder: 'products');
          finalImages.add({
            'url': url,
            'is_primary': sortOrder == 0,
            'sort_order': sortOrder,
          });
        } else if (img is String) {
          finalImages.add({
            'url': img,
            'is_primary': sortOrder == 0,
            'sort_order': sortOrder,
          });
        }
        sortOrder++;
      }

      // 2. Prepare payload
      final name = _nameController.text.trim();
      final String slug = name.toLowerCase().replaceAll(' ', '-').replaceAll(RegExp(r'[^a-z0-9\-]'), '');
      final int qty = int.tryParse(_quantityController.text) ?? 0;

      final payload = {
        'name': name,
        'slug': widget.product?.slug ?? slug,
        'description': _descriptionController.text.trim(),
        'sku': _skuController.text.trim(),
        'barcode': _barcodeController.text.trim(),
        'price_per_day': double.tryParse(_priceController.text) ?? 0,
        'security_deposit': 0,
        'quantity': qty,
        // On CREATE: available = total quantity
        // On EDIT: adjust available by the delta (new_qty - old_qty)
        // e.g., had 5 total / 3 available (2 rented), change total to 15
        //        delta = +10, new available = 3 + 10 = 13
        'available_quantity': widget.product == null
            ? qty
            : (widget.product!.availableQuantity + (qty - widget.product!.quantity)).clamp(0, qty),
        'low_stock_threshold': int.tryParse(_lowStockController.text) ?? 10,
        'track_inventory': _trackInventory,
        'is_active': _isActive,
        'is_featured': _isFeatured,
        'category_id': _selectedCategoryId,
        'subcategory_id': _selectedSubcategoryId,
        'subvariant_id': _selectedVariantId,
        'store_id': '00000000-0000-0000-0000-000000000001',
        'images': finalImages,
      };

      // 3. Save via provider (ref is still valid because we haven't popped)
      if (widget.product != null) {
        await ref.read(productsProvider.notifier).updateProduct(widget.product!.id, payload);
      } else {
        await ref.read(productsProvider.notifier).addProduct(payload);
      }

      // 4. NOW pop after save is complete and provider is updated
      if (!mounted) return;
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            widget.product != null ? 'Product updated!' : 'Product added!',
            style: TextStyle(fontSize: Responsive.sp(13)),
          ),
          backgroundColor: const Color(0xFF2ECC71),
          duration: const Duration(seconds: 2),
        ),
      );
    } catch (e) {
      debugPrint('Save failed: $e');
      if (!mounted) return;
      setState(() => _isSaving = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Save failed: $e', style: TextStyle(fontSize: Responsive.sp(12))),
          backgroundColor: const Color(0xFFFF6B8A),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    Responsive.init(context);
    final categoriesAsync = ref.watch(categoriesProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF8F8F8),
      appBar: AppBar(
        backgroundColor: _primary,
        iconTheme: const IconThemeData(color: Colors.white),
        titleSpacing: 0,
        title: Text(widget.product == null ? 'New Product' : 'Edit Product', style: TextStyle(fontSize: Responsive.sp(15), fontWeight: FontWeight.bold, color: Colors.white)),
        actions: [
          if (widget.product != null && !_isSaving)
            IconButton(
              onPressed: () => _confirmDelete(context),
              icon: Icon(Icons.delete_outline, size: Responsive.icon(20), color: const Color(0xFFFF6B8A)),
              tooltip: 'Delete Product',
            ),
          TextButton.icon(
            onPressed: _isSaving ? null : _handleSave,
            icon: _isSaving
                ? SizedBox(width: Responsive.icon(16), height: Responsive.icon(16), child: const CircularProgressIndicator(strokeWidth: 2, color: Color(0xFFF7C873)))
                : Icon(Icons.check_rounded, size: Responsive.icon(18), color: const Color(0xFFF7C873)),
            label: Text(_isSaving ? 'Saving...' : 'Save', style: TextStyle(fontSize: Responsive.sp(13), fontWeight: FontWeight.bold, color: const Color(0xFFF7C873))),
          ),
          SizedBox(width: Responsive.w(4)),
        ],
      ),
      body: Stack(
        children: [
          Form(
        key: _formKey,
        child: SingleChildScrollView(
          padding: Responsive.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _buildSectionTitle('1', 'Basic Information', Colors.purple),
              _buildBasicInfoCard(),
              SizedBox(height: Responsive.h(24)),

              _buildSectionTitle('2', 'Identifiers', Colors.blue),
              _buildIdentifiersCard(),
              SizedBox(height: Responsive.h(24)),

              _buildSectionTitle('3', 'Categories', Colors.green),
              categoriesAsync.when(
                data: (cats) => _buildCategoriesCard(cats),
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (err, _) => Text('Error loading categories', style: TextStyle(color: Colors.red, fontSize: Responsive.sp(14))),
              ),
              SizedBox(height: Responsive.h(24)),

              _buildSectionTitle('4', 'Images', Colors.pink),
              _buildImagesCard(),
              SizedBox(height: Responsive.h(24)),

              _buildSectionTitle('5', 'Pricing & Inventory', Colors.amber),
              _buildPricingInventoryCard(),
              SizedBox(height: Responsive.h(24)),

              _buildSectionTitle('6', 'Status', Colors.grey),
              _buildStatusCard(),
              SizedBox(height: Responsive.h(40)),
            ],
          ),
        ),
      ),
          // Loading overlay
          if (_isSaving)
            Container(
              color: Colors.black.withValues(alpha: 0.3),
              child: Center(
                child: Container(
                  padding: Responsive.all(24),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(Responsive.r(16)),
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const CircularProgressIndicator(color: Color(0xFF434343)),
                      SizedBox(height: Responsive.h(16)),
                      Text('Saving product...', style: TextStyle(fontSize: Responsive.sp(14), fontWeight: FontWeight.w600)),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildSectionTitle(String number, String title, MaterialColor color) {
    return Padding(
      padding: Responsive.only(bottom: 10, left: 2),
      child: Row(
        children: [
          Container(
            width: Responsive.w(24),
            height: Responsive.w(24),
            decoration: BoxDecoration(
              color: _primary,
              shape: BoxShape.circle,
            ),
            child: Center(
              child: Text(number, style: TextStyle(fontSize: Responsive.sp(11), fontWeight: FontWeight.bold, color: Colors.white)),
            ),
          ),
          SizedBox(width: Responsive.w(8)),
          Text(title, style: TextStyle(fontSize: Responsive.sp(14), fontWeight: FontWeight.w700, color: _primary)),
        ],
      ),
    );
  }

  Widget _buildBasicInfoCard() {
    return _buildCard(
      child: Column(
        children: [
          _buildTextField(label: 'Product Name *', controller: _nameController, hint: 'e.g. Diamond Necklace Set', required: true),
          SizedBox(height: Responsive.h(16)),
          _buildTextField(label: 'Description', controller: _descriptionController, hint: 'Materials, occasion, style...', maxLines: 3),
        ],
      ),
    );
  }

  Widget _buildIdentifiersCard() {
    return _buildCard(
      child: Column(
        children: [
          _buildTextField(label: 'SKU', controller: _skuController, hint: 'PB-NK-001'),
          SizedBox(height: Responsive.h(16)),
          Row(
            children: [
              Expanded(child: _buildTextField(label: 'Barcode', controller: _barcodeController, hint: '123456789')),
              SizedBox(width: Responsive.w(12)),
              Padding(
                padding: Responsive.only(top: 24),
                child: IconButton(
                  onPressed: () {
                    final newBarcode = _generateBarcode();
                    _barcodeController.text = newBarcode;
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Barcode Auto-generated!'), duration: Duration(seconds: 1)),
                    );
                  },
                  style: IconButton.styleFrom(backgroundColor: _primary.withValues(alpha: 0.1), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(Responsive.r(12)))),
                  icon: Icon(Icons.qr_code_scanner_rounded, color: _primary, size: Responsive.icon(22)),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildCategoriesCard(List<Category> allCategories) {
    final List<Category> mainCats = allCategories.where((c) => c.parentId == null).toList();
    final List<Category> subCats = _selectedCategoryId != null ? allCategories.where((c) => c.parentId == _selectedCategoryId).toList() : [];
    final List<Category> variants = _selectedSubcategoryId != null ? allCategories.where((c) => c.parentId == _selectedSubcategoryId).toList() : [];

    return _buildCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _buildDropdown(
            label: 'Main Category',
            value: _selectedCategoryId,
            items: mainCats,
            onChanged: (val) {
              setState(() {
                _selectedCategoryId = val;
                _selectedSubcategoryId = null;
                _selectedVariantId = null;
              });
            },
          ),
          SizedBox(height: Responsive.h(16)),
          _buildDropdown(
            label: 'Subcategory',
            value: _selectedSubcategoryId,
            items: subCats,
            disabled: subCats.isEmpty,
            onChanged: (val) {
              setState(() {
                _selectedSubcategoryId = val;
                _selectedVariantId = null;
              });
            },
          ),
          SizedBox(height: Responsive.h(16)),
          _buildDropdown(
            label: 'Variant',
            value: _selectedVariantId,
            items: variants,
            disabled: variants.isEmpty,
            onChanged: (val) => setState(() => _selectedVariantId = val),
          ),
        ],
      ),
    );
  }

  Widget _buildImagesCard() {
    return _buildCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: () => _pickImage(ImageSource.camera),
                  icon: Icon(Icons.camera_alt_rounded, size: Responsive.icon(18)),
                  label: const Text('Camera'),
                  style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFF3F0FF), foregroundColor: _primary, elevation: 0),
                ),
              ),
              SizedBox(width: Responsive.w(12)),
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: () => _pickImage(ImageSource.gallery),
                  icon: Icon(Icons.photo_library_rounded, size: Responsive.icon(18)),
                  label: const Text('Gallery'),
                  style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFF3F0FF), foregroundColor: _primary, elevation: 0),
                ),
              ),
            ],
          ),
          if (_images.isNotEmpty) ...[
            SizedBox(height: Responsive.h(16)),
            SizedBox(
              height: Responsive.w(100),
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: _images.length,
                separatorBuilder: (context, index) => SizedBox(width: Responsive.w(12)),
                itemBuilder: (context, index) {
                  final img = _images[index];
                  return Stack(
                    children: [
                      Container(
                        width: Responsive.w(100),
                        height: Responsive.w(100),
                        decoration: BoxDecoration(borderRadius: BorderRadius.circular(Responsive.r(12)), border: Border.all(color: Colors.grey[200]!)),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(Responsive.r(12)),
                          child: img is XFile 
                              ? Image.file(File(img.path), fit: BoxFit.cover) 
                              : (img as String).startsWith('http') 
                                  ? Image.network(
                                      img,
                                      fit: BoxFit.cover,
                                      loadingBuilder: (context, child, loadingProgress) {
                                        if (loadingProgress == null) return child;
                                        return Shimmer.fromColors(
                                          baseColor: Colors.grey[200]!,
                                          highlightColor: Colors.grey[100]!,
                                          child: Container(color: Colors.white),
                                        );
                                      },
                                      errorBuilder: (context, error, stackTrace) => Icon(Icons.error_outline_rounded, color: Colors.grey[400]),
                                    )
                                  : Icon(Icons.error_outline_rounded, color: Colors.grey[400]),
                        ),
                      ),
                      if (index == 0)
                        Positioned(
                          top: 6, left: 6,
                          child: Container(
                            padding: Responsive.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(color: _primary, borderRadius: BorderRadius.circular(Responsive.r(6))),
                            child: Text('Primary', style: TextStyle(color: Colors.white, fontSize: Responsive.sp(9), fontWeight: FontWeight.bold)),
                          ),
                        ),
                      Positioned(
                        top: -4, right: -4,
                        child: IconButton(
                          onPressed: () => setState(() => _images.removeAt(index)),
                          icon: Container(
                            padding: Responsive.all(4),
                            decoration: const BoxDecoration(color: Colors.red, shape: BoxShape.circle),
                            child: Icon(Icons.close_rounded, size: Responsive.icon(12), color: Colors.white),
                          ),
                        ),
                      ),
                    ],
                  );
                },
              ),
            ),
          ]
        ],
      ),
    );
  }

  Widget _buildPricingInventoryCard() {
    return _buildCard(
      child: Column(
        children: [
          _buildTextField(label: 'Rent Amount (₹/day) *', controller: _priceController, hint: '0.0', required: true, keyboardType: TextInputType.number),
          SizedBox(height: Responsive.h(16)),
          Row(
            children: [
              Expanded(child: _buildQuantityStepper(_quantityController)),
              SizedBox(width: Responsive.w(16)),
              Expanded(child: _buildTextField(label: 'Low Stock Alert', controller: _lowStockController, hint: '10', keyboardType: TextInputType.number)),
            ],
          ),
          SizedBox(height: Responsive.h(16)),
          _buildSwitch(label: 'Track Inventory', value: _trackInventory, onChanged: (v) => setState(() => _trackInventory = v)),
        ],
      ),
    );
  }

  Widget _buildStatusCard() {
    return _buildCard(
      child: Column(
        children: [
          _buildSwitch(label: 'Active (Visible to customers)', value: _isActive, onChanged: (v) => setState(() => _isActive = v)),
          SizedBox(height: Responsive.h(12)),
          _buildSwitch(label: 'Featured (Show on homepage)', value: _isFeatured, onChanged: (v) => setState(() => _isFeatured = v)),
        ],
      ),
    );
  }

  // ── Helpers ──

  Widget _buildCard({required Widget child}) {
    return Container(
      padding: Responsive.all(16),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(Responsive.r(12)), boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: Responsive.r(6), offset: Offset(0, Responsive.h(2)))]),
      child: child,
    );
  }

  Widget _buildQuantityStepper(TextEditingController controller) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Total Quantity *', style: TextStyle(fontSize: Responsive.sp(12), fontWeight: FontWeight.bold, color: Colors.grey[700])),
        SizedBox(height: Responsive.h(6)),
        Container(
          decoration: BoxDecoration(
            color: const Color(0xFFF9FAFB),
            borderRadius: BorderRadius.circular(Responsive.r(12)),
            border: Border.all(color: Colors.grey[300]!),
          ),
          child: Row(
            children: [
              IconButton(
                icon: Icon(Icons.remove, size: Responsive.icon(16), color: _primary),
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
                onPressed: () {
                  final current = int.tryParse(controller.text) ?? 1;
                  if (current > 0) controller.text = (current - 1).toString();
                },
              ),
              Expanded(
                child: TextFormField(
                  controller: controller,
                  keyboardType: TextInputType.number,
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: Responsive.sp(13), fontWeight: FontWeight.bold),
                  decoration: InputDecoration(
                    border: InputBorder.none,
                    isDense: true,
                    contentPadding: EdgeInsets.symmetric(vertical: Responsive.h(12)),
                  ),
                ),
              ),
              IconButton(
                icon: Icon(Icons.add, size: Responsive.icon(16), color: _primary),
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
                onPressed: () {
                  final current = int.tryParse(controller.text) ?? 0;
                  controller.text = (current + 1).toString();
                },
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildTextField({required String label, required TextEditingController controller, String? hint, bool required = false, int maxLines = 1, TextInputType keyboardType = TextInputType.text}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: TextStyle(fontSize: Responsive.sp(12), fontWeight: FontWeight.w600, color: Colors.grey[600])),
        SizedBox(height: Responsive.h(6)),
        TextFormField(
          controller: controller,
          maxLines: maxLines,
          keyboardType: keyboardType,
          style: TextStyle(fontSize: Responsive.sp(13), color: _primary),
          validator: required ? (v) => v == null || v.isEmpty ? 'Required' : null : null,
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: TextStyle(color: Colors.grey[400], fontSize: Responsive.sp(12)),
            filled: true,
            fillColor: const Color(0xFFF5F5F7),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(Responsive.r(10)), borderSide: BorderSide.none),
            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(Responsive.r(10)), borderSide: BorderSide.none),
            focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(Responsive.r(10)), borderSide: BorderSide(color: _primary, width: 1.5)),
            contentPadding: Responsive.symmetric(horizontal: 14, vertical: 12),
          ),
        ),
      ],
    );
  }

  Widget _buildDropdown({required String label, required String? value, required List<Category> items, required Function(String?) onChanged, bool disabled = false}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: TextStyle(fontSize: Responsive.sp(12), fontWeight: FontWeight.w600, color: Colors.grey[600])),
        SizedBox(height: Responsive.h(6)),
        Container(
          padding: Responsive.symmetric(horizontal: 14, vertical: 2),
          decoration: BoxDecoration(
            color: disabled ? Colors.grey[100] : const Color(0xFFF5F5F7),
            borderRadius: BorderRadius.circular(Responsive.r(10)),
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              isExpanded: true,
              value: value,
              hint: Text(disabled ? 'None available' : 'Select $label', style: TextStyle(color: Colors.grey[400], fontSize: Responsive.sp(12))),
              items: items.map((c) => DropdownMenuItem(value: c.id, child: Text(c.name, style: TextStyle(fontSize: Responsive.sp(13), color: _primary)))).toList(),
              onChanged: disabled ? null : onChanged,
              icon: Icon(Icons.keyboard_arrow_down_rounded, size: Responsive.icon(20), color: Colors.grey[500]),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildSwitch({required String label, required bool value, required Function(bool) onChanged}) {
    return Container(
      padding: Responsive.symmetric(horizontal: 4, vertical: 2),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Text(label, style: TextStyle(fontSize: Responsive.sp(12), fontWeight: FontWeight.w500, color: _primary), maxLines: 1, overflow: TextOverflow.ellipsis),
          ),
          Switch(
            value: value,
            onChanged: onChanged,
            activeTrackColor: _primary,
            activeThumbColor: Colors.white,
            inactiveTrackColor: Colors.grey[300],
          ),
        ],
      ),
    );
  }
}
