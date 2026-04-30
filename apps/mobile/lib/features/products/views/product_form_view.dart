import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../../core/responsive.dart';
import '../../../core/upload_repository.dart';
import '../providers/product_provider.dart';
import '../models/product.dart';

/// 3-step wizard for creating or editing a product.
/// Step 1 — Media   |  Step 2 — Details   |  Step 3 — Pricing & Stock
class ProductFormView extends ConsumerStatefulWidget {
  final String? productId;

  const ProductFormView({super.key, this.productId});

  @override
  ConsumerState<ProductFormView> createState() => _ProductFormViewState();
}

class _ProductFormViewState extends ConsumerState<ProductFormView> {
  static const _primary = Color(0xFF434343);
  static const _accent = Color(0xFFF7C873);

  bool get isEdit => widget.productId != null;

  final PageController _pageController = PageController();
  int _currentStep = 0;

  // Step 1 — Media
  final List<String> _imageUrls = [];
  final List<File> _newImages = [];
  final bool _isUploading = false;

  // Step 2 — Details
  final _nameController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _skuController = TextEditingController();
  final _barcodeController = TextEditingController();
  String? _selectedMaterial;
  String? _selectedMetalColor;
  String? _selectedCondition;

  // Step 3 — Pricing
  final _priceController = TextEditingController();
  final _depositController = TextEditingController();
  final _quantityController = TextEditingController(text: '1');
  final _minDaysController = TextEditingController();
  final _maxDaysController = TextEditingController();

  bool _isLoading = false;
  bool _dataLoaded = false;

  static const _materials = ['Gold', 'Silver', 'Platinum', 'Diamond', 'Pearl', 'Kundan', 'Polki', 'Other'];
  static const _metalColors = ['Yellow', 'White', 'Rose', 'Two-Tone', 'Oxidized'];
  static const _conditions = ['Brand New', 'Good', 'Fair', 'Needs Repair'];

  @override
  void dispose() {
    _pageController.dispose();
    _nameController.dispose();
    _descriptionController.dispose();
    _skuController.dispose();
    _barcodeController.dispose();
    _priceController.dispose();
    _depositController.dispose();
    _quantityController.dispose();
    _minDaysController.dispose();
    _maxDaysController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    Responsive.init(context);

    // Load existing data for edit mode
    if (isEdit && !_dataLoaded) {
      final productAsync = ref.watch(productByIdProvider(widget.productId!));
      productAsync.whenData((p) {
        if (!_dataLoaded) {
          _populateFields(p);
          _dataLoaded = true;
        }
      });
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF8F8F8),
      appBar: AppBar(
        title: Text(
          isEdit ? 'Edit Product' : 'Add Product',
          style: TextStyle(fontSize: Responsive.sp(18), fontWeight: FontWeight.w700),
        ),
        centerTitle: true,
      ),
      body: Column(
        children: [
          // Step indicators
          _buildStepIndicator(),

          // Pages
          Expanded(
            child: PageView(
              controller: _pageController,
              physics: const NeverScrollableScrollPhysics(),
              onPageChanged: (i) => setState(() => _currentStep = i),
              children: [
                _buildStep1Media(),
                _buildStep2Details(),
                _buildStep3Pricing(),
              ],
            ),
          ),

          // Bottom navigation
          _buildBottomNav(),
        ],
      ),
    );
  }

  void _populateFields(Product p) {
    _nameController.text = p.name;
    _descriptionController.text = p.description ?? '';
    _skuController.text = p.sku ?? '';
    _barcodeController.text = p.barcode ?? '';
    _priceController.text = p.pricePerDay > 0 ? p.pricePerDay.toStringAsFixed(0) : '';
    _depositController.text = p.securityDeposit > 0 ? p.securityDeposit.toStringAsFixed(0) : '';
    _quantityController.text = '${p.quantity}';
    if (p.minRentalDays != null) _minDaysController.text = '${p.minRentalDays}';
    if (p.maxRentalDays != null) _maxDaysController.text = '${p.maxRentalDays}';
    _selectedMaterial = p.material;
    _selectedMetalColor = p.metalColor;
    _selectedCondition = p.condition;
    _imageUrls.clear();
    _imageUrls.addAll(p.images.map((i) => i.url));
    setState(() {});
  }

  // ── Step Indicator ──
  Widget _buildStepIndicator() {
    // Step labels not shown on indicator but could be added below circles
    return Container(
      padding: Responsive.symmetric(horizontal: 24, vertical: 14),
      color: Colors.white,
      child: Row(
        children: List.generate(3, (i) {
          final isActive = i == _currentStep;
          final isDone = i < _currentStep;
          return Expanded(
            child: Row(
              children: [
                if (i > 0)
                  Expanded(
                    child: Container(
                      height: 2,
                      color: isDone || isActive ? _primary : Colors.grey[300],
                    ),
                  ),
                Container(
                  width: Responsive.w(28),
                  height: Responsive.w(28),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: isDone
                        ? _primary
                        : isActive
                            ? _accent
                            : Colors.grey[200],
                  ),
                  child: Center(
                    child: isDone
                        ? Icon(Icons.check_rounded, size: Responsive.icon(16), color: Colors.white)
                        : Text(
                            '${i + 1}',
                            style: TextStyle(
                              fontSize: Responsive.sp(12),
                              fontWeight: FontWeight.w700,
                              color: isActive ? _primary : Colors.grey[500],
                            ),
                          ),
                  ),
                ),
                if (i < 2)
                  Expanded(
                    child: Container(
                      height: 2,
                      color: isDone ? _primary : Colors.grey[300],
                    ),
                  ),
              ],
            ),
          );
        }),
      ),
    );
  }

  // ── Step 1: Media ──
  Widget _buildStep1Media() {
    return SingleChildScrollView(
      padding: Responsive.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Product Images',
              style: TextStyle(fontSize: Responsive.sp(18), fontWeight: FontWeight.w700, color: _primary)),
          SizedBox(height: Responsive.h(6)),
          Text('Add images of your product. The first image will be the primary.',
              style: TextStyle(fontSize: Responsive.sp(13), color: Colors.grey[600])),
          SizedBox(height: Responsive.h(16)),

          // Image grid
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 3,
              crossAxisSpacing: Responsive.w(10),
              mainAxisSpacing: Responsive.h(10),
            ),
            itemCount: _imageUrls.length + _newImages.length + 1,
            itemBuilder: (_, i) {
              // Add button
              if (i == _imageUrls.length + _newImages.length) {
                return _buildAddImageButton();
              }
              // Existing URL images
              if (i < _imageUrls.length) {
                return _buildImageTile(
                  child: CachedNetworkImage(
                    imageUrl: _imageUrls[i],
                    fit: BoxFit.cover,
                    placeholder: (_, __) => Container(color: Colors.grey[200]),
                    errorWidget: (_, __, ___) =>
                        Icon(Icons.broken_image, size: Responsive.icon(24), color: Colors.grey),
                  ),
                  onRemove: () => setState(() => _imageUrls.removeAt(i)),
                  isPrimary: i == 0 && _newImages.isEmpty,
                );
              }
              // New local images
              final fileIdx = i - _imageUrls.length;
              return _buildImageTile(
                child: Image.file(_newImages[fileIdx], fit: BoxFit.cover),
                onRemove: () => setState(() => _newImages.removeAt(fileIdx)),
                isPrimary: i == 0,
              );
            },
          ),

          if (_isUploading) ...[
            SizedBox(height: Responsive.h(12)),
            const Center(child: CircularProgressIndicator()),
            SizedBox(height: Responsive.h(4)),
            Center(
              child: Text('Uploading images...',
                  style: TextStyle(fontSize: Responsive.sp(12), color: Colors.grey)),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildAddImageButton() {
    return GestureDetector(
      onTap: _pickImage,
      child: Container(
        decoration: BoxDecoration(
          color: _primary.withValues(alpha: 0.06),
          borderRadius: BorderRadius.circular(Responsive.r(12)),
          border: Border.all(color: _primary.withValues(alpha: 0.2), style: BorderStyle.solid),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.add_a_photo_outlined, size: Responsive.icon(28), color: _primary.withValues(alpha: 0.5)),
            SizedBox(height: Responsive.h(4)),
            Text('Add',
                style: TextStyle(fontSize: Responsive.sp(11), color: _primary.withValues(alpha: 0.6)),
                maxLines: 1,
                overflow: TextOverflow.ellipsis),
          ],
        ),
      ),
    );
  }

  Widget _buildImageTile({required Widget child, required VoidCallback onRemove, bool isPrimary = false}) {
    return Stack(
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(Responsive.r(12)),
          child: SizedBox.expand(child: child),
        ),
        // Remove button
        Positioned(
          top: Responsive.h(4),
          right: Responsive.w(4),
          child: GestureDetector(
            onTap: onRemove,
            child: Container(
              padding: Responsive.all(3),
              decoration: BoxDecoration(
                color: Colors.black.withValues(alpha: 0.5),
                shape: BoxShape.circle,
              ),
              child: Icon(Icons.close_rounded, size: Responsive.icon(14), color: Colors.white),
            ),
          ),
        ),
        // Primary badge
        if (isPrimary)
          Positioned(
            bottom: Responsive.h(4),
            left: Responsive.w(4),
            child: Container(
              padding: Responsive.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: _accent,
                borderRadius: BorderRadius.circular(Responsive.r(4)),
              ),
              child: Text('Primary',
                  style: TextStyle(fontSize: Responsive.sp(9), fontWeight: FontWeight.w700, color: _primary)),
            ),
          ),
      ],
    );
  }

  Future<void> _pickImage() async {
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(Responsive.r(16)))),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: Responsive.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                leading: Icon(Icons.camera_alt_rounded, color: _primary, size: Responsive.icon(24)),
                title: Text('Camera', style: TextStyle(fontSize: Responsive.sp(15))),
                onTap: () => Navigator.pop(ctx, ImageSource.camera),
              ),
              ListTile(
                leading: Icon(Icons.photo_library_rounded, color: _primary, size: Responsive.icon(24)),
                title: Text('Gallery', style: TextStyle(fontSize: Responsive.sp(15))),
                onTap: () => Navigator.pop(ctx, ImageSource.gallery),
              ),
            ],
          ),
        ),
      ),
    );

    if (source == null) return;

    final picker = ImagePicker();
    final picked = await picker.pickImage(source: source, maxWidth: 1200, imageQuality: 80);
    if (picked != null) {
      setState(() => _newImages.add(File(picked.path)));
    }
  }

  // ── Step 2: Details ──
  Widget _buildStep2Details() {
    return SingleChildScrollView(
      padding: Responsive.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Product Details',
              style: TextStyle(fontSize: Responsive.sp(18), fontWeight: FontWeight.w700, color: _primary)),
          SizedBox(height: Responsive.h(16)),

          _buildTextField('Product Name *', _nameController, TextInputType.text),
          SizedBox(height: Responsive.h(14)),
          _buildTextField('Description', _descriptionController, TextInputType.multiline, maxLines: 3),
          SizedBox(height: Responsive.h(14)),

          Row(
            children: [
              Expanded(child: _buildTextField('SKU', _skuController, TextInputType.text)),
              SizedBox(width: Responsive.w(12)),
              Expanded(child: _buildTextField('Barcode', _barcodeController, TextInputType.text)),
            ],
          ),
          SizedBox(height: Responsive.h(20)),

          // Material choice chips
          Text('Material',
              style: TextStyle(fontSize: Responsive.sp(13), fontWeight: FontWeight.w600, color: _primary)),
          SizedBox(height: Responsive.h(8)),
          Wrap(
            spacing: Responsive.w(8),
            runSpacing: Responsive.h(8),
            children: _materials.map((m) => _buildChoiceChip(m, _selectedMaterial == m, () {
              setState(() => _selectedMaterial = _selectedMaterial == m ? null : m);
            })).toList(),
          ),
          SizedBox(height: Responsive.h(18)),

          // Metal Color choice chips
          Text('Metal Color',
              style: TextStyle(fontSize: Responsive.sp(13), fontWeight: FontWeight.w600, color: _primary)),
          SizedBox(height: Responsive.h(8)),
          Wrap(
            spacing: Responsive.w(8),
            runSpacing: Responsive.h(8),
            children: _metalColors.map((c) => _buildChoiceChip(c, _selectedMetalColor == c, () {
              setState(() => _selectedMetalColor = _selectedMetalColor == c ? null : c);
            })).toList(),
          ),
          SizedBox(height: Responsive.h(18)),

          // Condition choice chips
          Text('Condition',
              style: TextStyle(fontSize: Responsive.sp(13), fontWeight: FontWeight.w600, color: _primary)),
          SizedBox(height: Responsive.h(8)),
          Wrap(
            spacing: Responsive.w(8),
            runSpacing: Responsive.h(8),
            children: _conditions.map((c) => _buildChoiceChip(c, _selectedCondition == c, () {
              setState(() => _selectedCondition = _selectedCondition == c ? null : c);
            })).toList(),
          ),

          SizedBox(height: Responsive.h(40)),
        ],
      ),
    );
  }

  Widget _buildChoiceChip(String label, bool isSelected, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: Responsive.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? _primary : Colors.white,
          borderRadius: BorderRadius.circular(Responsive.r(20)),
          border: Border.all(color: isSelected ? _primary : Colors.grey.shade300),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: Responsive.sp(12),
            fontWeight: FontWeight.w600,
            color: isSelected ? Colors.white : _primary,
          ),
        ),
      ),
    );
  }

  Widget _buildTextField(String label, TextEditingController controller, TextInputType type, {int maxLines = 1}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label,
            style: TextStyle(fontSize: Responsive.sp(13), fontWeight: FontWeight.w600, color: _primary)),
        SizedBox(height: Responsive.h(6)),
        TextField(
          controller: controller,
          keyboardType: type,
          maxLines: maxLines,
          style: TextStyle(fontSize: Responsive.sp(14)),
          decoration: InputDecoration(
            contentPadding: Responsive.symmetric(horizontal: 14, vertical: 12),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(Responsive.r(10))),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(Responsive.r(10)),
              borderSide: BorderSide(color: Colors.grey.shade300),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(Responsive.r(10)),
              borderSide: const BorderSide(color: _primary, width: 1.5),
            ),
            filled: true,
            fillColor: Colors.white,
          ),
        ),
      ],
    );
  }

  // ── Step 3: Pricing & Stock ──
  Widget _buildStep3Pricing() {
    return SingleChildScrollView(
      padding: Responsive.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Pricing & Inventory',
              style: TextStyle(fontSize: Responsive.sp(18), fontWeight: FontWeight.w700, color: _primary)),
          SizedBox(height: Responsive.h(16)),

          Row(
            children: [
              Expanded(child: _buildNumberField('Price/Day (₹) *', _priceController)),
              SizedBox(width: Responsive.w(12)),
              Expanded(child: _buildNumberField('Security Deposit (₹)', _depositController)),
            ],
          ),
          SizedBox(height: Responsive.h(14)),

          _buildNumberField('Quantity *', _quantityController),
          SizedBox(height: Responsive.h(14)),

          Row(
            children: [
              Expanded(child: _buildNumberField('Min Rental Days', _minDaysController)),
              SizedBox(width: Responsive.w(12)),
              Expanded(child: _buildNumberField('Max Rental Days', _maxDaysController)),
            ],
          ),

          SizedBox(height: Responsive.h(40)),
        ],
      ),
    );
  }

  Widget _buildNumberField(String label, TextEditingController controller) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label,
            style: TextStyle(fontSize: Responsive.sp(13), fontWeight: FontWeight.w600, color: _primary)),
        SizedBox(height: Responsive.h(6)),
        TextField(
          controller: controller,
          keyboardType: TextInputType.number,
          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
          style: TextStyle(fontSize: Responsive.sp(16), fontWeight: FontWeight.w600),
          decoration: InputDecoration(
            contentPadding: Responsive.symmetric(horizontal: 14, vertical: 12),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(Responsive.r(10))),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(Responsive.r(10)),
              borderSide: BorderSide(color: Colors.grey.shade300),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(Responsive.r(10)),
              borderSide: const BorderSide(color: _primary, width: 1.5),
            ),
            filled: true,
            fillColor: Colors.white,
          ),
        ),
      ],
    );
  }

  // ── Bottom Navigation ──
  Widget _buildBottomNav() {
    return Container(
      padding: Responsive.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
              color: Colors.black.withValues(alpha: 0.06),
              blurRadius: Responsive.r(10),
              offset: Offset(0, -Responsive.h(2)))
        ],
      ),
      child: SafeArea(
        child: Row(
          children: [
            if (_currentStep > 0)
              Expanded(
                child: OutlinedButton(
                  onPressed: _goBack,
                  style: OutlinedButton.styleFrom(
                    padding: Responsive.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(Responsive.r(12))),
                    side: BorderSide(color: Colors.grey.shade400),
                  ),
                  child: Text('Back',
                      style: TextStyle(fontSize: Responsive.sp(14), fontWeight: FontWeight.w600)),
                ),
              ),
            if (_currentStep > 0) SizedBox(width: Responsive.w(12)),
            Expanded(
              flex: 2,
              child: ElevatedButton(
                onPressed: _isLoading ? null : _onNextOrSubmit,
                style: ElevatedButton.styleFrom(
                  backgroundColor: _currentStep == 2 ? const Color(0xFF2ECC71) : _primary,
                  foregroundColor: Colors.white,
                  padding: Responsive.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(Responsive.r(12))),
                ),
                child: _isLoading
                    ? SizedBox(
                        height: Responsive.h(20),
                        width: Responsive.w(20),
                        child: const CircularProgressIndicator(
                            color: Colors.white, strokeWidth: 2))
                    : Text(
                        _currentStep == 2 ? (isEdit ? 'Update Product' : 'Create Product') : 'Next',
                        style: TextStyle(fontSize: Responsive.sp(15), fontWeight: FontWeight.w700),
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _goBack() {
    _pageController.previousPage(
        duration: const Duration(milliseconds: 300), curve: Curves.easeInOut);
  }

  void _onNextOrSubmit() {
    if (_currentStep < 2) {
      // Validate current step
      if (_currentStep == 1 && _nameController.text.trim().isEmpty) {
        _showError('Product name is required');
        return;
      }
      _pageController.nextPage(
          duration: const Duration(milliseconds: 300), curve: Curves.easeInOut);
    } else {
      _submitForm();
    }
  }

  void _showError(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), backgroundColor: Colors.red[400]),
    );
  }

  Future<void> _submitForm() async {
    // Validate
    if (_nameController.text.trim().isEmpty) {
      _showError('Product name is required');
      return;
    }
    final price = double.tryParse(_priceController.text) ?? 0;
    if (price <= 0) {
      _showError('Price per day is required');
      return;
    }

    setState(() => _isLoading = true);

    try {
      // Upload new images first
      final uploadedUrls = <String>[];
      if (_newImages.isNotEmpty) {
        final uploadRepo = UploadRepository();
        for (final file in _newImages) {
          final url = await uploadRepo.uploadFile(file);
          uploadedUrls.add(url);
        }
      }

      // Build images list
      final allImageUrls = [..._imageUrls, ...uploadedUrls];
      final images = allImageUrls.asMap().entries.map((e) => {
        'url': e.value,
        'is_primary': e.key == 0,
        'sort_order': e.key,
        'alt_text': _nameController.text.trim(),
      }).toList();

      final body = <String, dynamic>{
        'name': _nameController.text.trim(),
        'price_per_day': price,
        'security_deposit': double.tryParse(_depositController.text) ?? 0,
        'quantity': int.tryParse(_quantityController.text) ?? 1,
        'available_quantity': int.tryParse(_quantityController.text) ?? 1,
        'images': images,
        'is_active': true,
      };

      // Optional fields
      if (_descriptionController.text.trim().isNotEmpty) {
        body['description'] = _descriptionController.text.trim();
      }
      if (_skuController.text.trim().isNotEmpty) {
        body['sku'] = _skuController.text.trim();
      }
      if (_barcodeController.text.trim().isNotEmpty) {
        body['barcode'] = _barcodeController.text.trim();
      }
      if (_selectedMaterial != null) body['material'] = _selectedMaterial;
      if (_selectedMetalColor != null) body['metal_color'] = _selectedMetalColor;
      if (_selectedCondition != null) body['condition'] = _selectedCondition;
      if (_minDaysController.text.isNotEmpty) {
        body['min_rental_days'] = int.tryParse(_minDaysController.text);
      }
      if (_maxDaysController.text.isNotEmpty) {
        body['max_rental_days'] = int.tryParse(_maxDaysController.text);
      }

      if (isEdit) {
        await ref.read(productsProvider.notifier).updateProduct(widget.productId!, body);
      } else {
        await ref.read(productsProvider.notifier).addProduct(body);
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(isEdit ? 'Product updated!' : 'Product created!'),
            backgroundColor: const Color(0xFF2ECC71),
          ),
        );
        Navigator.of(context).pop();
      }
    } catch (e) {
      _showError(e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }
}
