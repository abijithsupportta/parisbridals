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
    final picker = ImagePicker();
    final List<XFile> pickedFiles = [];
    
    if (source == ImageSource.gallery) {
      final files = await picker.pickMultiImage(imageQuality: 70);
      pickedFiles.addAll(files);
    } else {
      final file = await picker.pickImage(source: source, imageQuality: 70);
      if (file != null) pickedFiles.add(file);
    }

    if (pickedFiles.isNotEmpty) {
      setState(() => _images.addAll(pickedFiles));
    }
  }

  String _generateBarcode() {
    final timestamp = DateTime.now().millisecondsSinceEpoch.toString();
    return timestamp.substring(timestamp.length - 8); // Simple 8-digit numeric barcode
  }

  void _handleSave() {
    if (!_formKey.currentState!.validate()) return;

    // Immediately pop the screen to provide "instant" feeling
    Navigator.pop(context);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Saving product in background...', style: TextStyle(fontSize: Responsive.sp(14))),
        duration: const Duration(seconds: 2),
      ),
    );

    // Run the heavy work in the background without blocking the UI
    _processBackgroundSave(
      images: List.from(_images),
      name: _nameController.text.trim(),
      description: _descriptionController.text.trim(),
      sku: _skuController.text.trim(),
      barcode: _barcodeController.text.trim(),
      priceText: _priceController.text,
      qtyText: _quantityController.text,
      lowStockText: _lowStockController.text,
      catId: _selectedCategoryId,
      subCatId: _selectedSubcategoryId,
      varId: _selectedVariantId,
      trackInv: _trackInventory,
      active: _isActive,
      feat: _isFeatured,
      existingProduct: widget.product,
    );
  }

  Future<void> _processBackgroundSave({
    required List<dynamic> images,
    required String name,
    required String description,
    required String sku,
    required String barcode,
    required String priceText,
    required String qtyText,
    required String lowStockText,
    required String? catId,
    required String? subCatId,
    required String? varId,
    required bool trackInv,
    required bool active,
    required bool feat,
    required Product? existingProduct,
  }) async {
    try {
      // 1. Upload new local images first
      final List<Map<String, dynamic>> finalImages = [];
      int sortOrder = 0;

      for (var img in images) {
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
      final String slug = name.toLowerCase().replaceAll(' ', '-').replaceAll(RegExp(r'[^a-z0-9\-]'), '');
      final int qty = int.tryParse(qtyText) ?? 0;

      final payload = {
        'name': name,
        'slug': existingProduct?.slug ?? slug,
        'description': description,
        'sku': sku,
        'barcode': barcode,
        'price_per_day': double.tryParse(priceText) ?? 0,
        'quantity': qty,
        'available_quantity': qty,
        'low_stock_threshold': int.tryParse(lowStockText) ?? 10,
        'track_inventory': trackInv,
        'is_active': active,
        'is_featured': feat,
        'category_id': catId,
        'subcategory_id': subCatId,
        'subvariant_id': varId,
        'store_id': '00000000-0000-0000-0000-000000000001',
        'images': finalImages,
      };

      if (existingProduct != null) {
        await ref.read(productsProvider.notifier).updateProduct(existingProduct.id, payload);
      } else {
        await ref.read(productsProvider.notifier).addProduct(payload);
      }
      
      // We don't show a success toast here because the user might be doing something else,
      // but the list will automatically update via the provider.
    } catch (e) {
      debugPrint('Background save failed: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    Responsive.init(context);
    final categoriesAsync = ref.watch(categoriesProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF8F8F8),
      appBar: AppBar(
        titleSpacing: 0,
        title: Text(widget.product == null ? 'New Product' : 'Edit Product', style: TextStyle(fontSize: Responsive.sp(16), fontWeight: FontWeight.bold)),
        actions: [
          TextButton.icon(
            onPressed: _handleSave,
            icon: Icon(Icons.check_rounded, size: Responsive.icon(18), color: _primary),
            label: Text('Save', style: TextStyle(fontSize: Responsive.sp(14), fontWeight: FontWeight.bold, color: _primary)),
          ),
        ],
      ),
      body: Form(
        key: _formKey,
        child: SingleChildScrollView(
          padding: Responsive.all(16),
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
    );
  }

  Widget _buildSectionTitle(String number, String title, MaterialColor color) {
    return Padding(
      padding: Responsive.only(bottom: 8, left: 4),
      child: Row(
        children: [
          Container(
            padding: Responsive.all(6),
            decoration: BoxDecoration(color: color.shade50, shape: BoxShape.circle),
            child: Text(number, style: TextStyle(fontSize: Responsive.sp(10), fontWeight: FontWeight.bold, color: color.shade600)),
          ),
          SizedBox(width: Responsive.w(8)),
          Text(title, style: TextStyle(fontSize: Responsive.sp(14), fontWeight: FontWeight.bold, color: Colors.black87)),
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
                separatorBuilder: (_, __) => SizedBox(width: Responsive.w(12)),
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
                                      errorBuilder: (_, __, ___) => Icon(Icons.error_outline_rounded, color: Colors.grey[400]),
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
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(Responsive.r(16)), boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: 10, offset: const Offset(0, 4))]),
      child: child,
    );
  }

  Widget _buildQuantityStepper(TextEditingController controller) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Total Quantity *', style: TextStyle(fontSize: Responsive.sp(12), fontWeight: FontWeight.bold, color: Colors.grey[700])),
        SizedBox(height: Responsive.h(8)),
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
                  style: TextStyle(fontSize: Responsive.sp(14), fontWeight: FontWeight.bold),
                  decoration: const InputDecoration(
                    border: InputBorder.none,
                    isDense: true,
                    contentPadding: EdgeInsets.symmetric(vertical: 14),
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
        Text(label, style: TextStyle(fontSize: Responsive.sp(12), fontWeight: FontWeight.bold, color: Colors.grey[700])),
        SizedBox(height: Responsive.h(8)),
        TextFormField(
          controller: controller,
          maxLines: maxLines,
          keyboardType: keyboardType,
          style: TextStyle(fontSize: Responsive.sp(14)),
          validator: required ? (v) => v == null || v.isEmpty ? 'Required' : null : null,
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: TextStyle(color: Colors.grey[400], fontSize: Responsive.sp(14)),
            filled: true,
            fillColor: const Color(0xFFF9FAFB),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(Responsive.r(12)), borderSide: BorderSide(color: Colors.grey[300]!)),
            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(Responsive.r(12)), borderSide: BorderSide(color: Colors.grey[300]!)),
            focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(Responsive.r(12)), borderSide: const BorderSide(color: _primary, width: 2)),
            contentPadding: Responsive.symmetric(horizontal: 16, vertical: 12),
          ),
        ),
      ],
    );
  }

  Widget _buildDropdown({required String label, required String? value, required List<Category> items, required Function(String?) onChanged, bool disabled = false}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: TextStyle(fontSize: Responsive.sp(12), fontWeight: FontWeight.bold, color: Colors.grey[700])),
        SizedBox(height: Responsive.h(8)),
        Container(
          padding: Responsive.symmetric(horizontal: 16),
          decoration: BoxDecoration(color: disabled ? Colors.grey[100] : const Color(0xFFF9FAFB), borderRadius: BorderRadius.circular(Responsive.r(12)), border: Border.all(color: Colors.grey[300]!)),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              isExpanded: true,
              value: value,
              hint: Text(disabled ? 'None available' : 'Select $label', style: TextStyle(color: Colors.grey[400], fontSize: Responsive.sp(14))),
              items: items.map((c) => DropdownMenuItem(value: c.id, child: Text(c.name, style: TextStyle(fontSize: Responsive.sp(14))))).toList(),
              onChanged: disabled ? null : onChanged,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildSwitch({required String label, required bool value, required Function(bool) onChanged}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: TextStyle(fontSize: Responsive.sp(13), fontWeight: FontWeight.w600, color: Colors.black87)),
        Switch(value: value, onChanged: onChanged, activeTrackColor: _primary, activeColor: Colors.white),
      ],
    );
  }
}
