import 'dart:io';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../../core/responsive.dart';
import '../../../core/upload_repository.dart';
import '../../categories/providers/category_provider.dart';
import '../../categories/models/category.dart';
import '../providers/product_provider.dart';
import '../models/product.dart';

/// Single-page scrollable product form — mirrors the admin ProductForm layout.
///
/// Sections: Name/Description → Images → Category → Rent Price → Quantity
///           → Identifiers (SKU/Barcode) → Submit
class ProductFormView extends ConsumerStatefulWidget {
  final String? productId;
  const ProductFormView({super.key, this.productId});

  @override
  ConsumerState<ProductFormView> createState() => _ProductFormViewState();
}

class _ProductFormViewState extends ConsumerState<ProductFormView> {
  bool get isEdit => widget.productId != null;

  final ImagePicker _picker = ImagePicker();

  // Media
  final List<String> _imageUrls = [];
  final List<File> _newImages = [];

  // Details
  final _nameCtl = TextEditingController();
  final _descCtl = TextEditingController();
  String? _categoryId;
  String? _subcategoryId;
  String? _subvariantId;

  // Pricing & Stock
  final _priceCtl = TextEditingController();
  int _quantity = 1;
  String _sku = '';
  String _barcode = '';

  bool _isActive = true;
  bool _isLoading = false;
  bool _dataLoaded = false;

  @override
  void initState() {
    super.initState();
    // Android crash fix: recover lost camera data
    _retrieveLostData();
    // Auto-generate identifiers for create mode
    if (!isEdit) {
      _sku = _generateSKU();
      _barcode = _generateBarcode();
    }
  }

  Future<void> _retrieveLostData() async {
    final LostDataResponse response = await _picker.retrieveLostData();
    if (response.isEmpty || response.file == null) return;
    if (mounted) {
      setState(() => _newImages.add(File(response.file!.path)));
    }
  }

  @override
  void dispose() {
    _nameCtl.dispose();
    _descCtl.dispose();
    _priceCtl.dispose();
    super.dispose();
  }

  // ── Identifier generators ──
  String _generateSKU() {
    final r = Random();
    return 'PB-${r.nextInt(9000) + 1000}';
  }

  String _generateBarcode() {
    final ts = DateTime.now().millisecondsSinceEpoch.toRadixString(36).toUpperCase();
    final r = Random();
    final rand = (r.nextInt(9000) + 1000).toString();
    return 'PB$ts$rand';
  }

  @override
  Widget build(BuildContext context) {
    Responsive.init(context);
    final theme = Theme.of(context);
    final primary = theme.colorScheme.primary;

    // Load data for edit mode
    if (isEdit && !_dataLoaded) {
      ref.watch(productByIdProvider(widget.productId!)).whenData((p) {
        if (!_dataLoaded) {
          _populateFields(p);
          _dataLoaded = true;
        }
      });
    }

    // Categories
    final allCategories = ref.watch(categoriesProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(
          isEdit ? 'Edit Product' : 'Add Product',
          style: TextStyle(fontSize: Responsive.sp(18), fontWeight: FontWeight.w700),
        ),
      ),
      body: SingleChildScrollView(
        padding: Responsive.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── 1. Product Name & Description ──
            _card(
              children: [
                _label('Product Name', required: true),
                SizedBox(height: Responsive.h(6)),
                _input(_nameCtl, 'e.g., Diamond Necklace Set'),
                SizedBox(height: Responsive.h(14)),
                _label('Description'),
                SizedBox(height: Responsive.h(6)),
                _input(_descCtl, 'Materials, occasion, style... (optional)',
                    maxLines: 3, type: TextInputType.multiline),
              ],
            ),
            SizedBox(height: Responsive.h(12)),

            // ── 2. Images ──
            _card(
              children: [
                _sectionHeader('Images'),
                SizedBox(height: Responsive.h(10)),
                _buildImageGrid(),
              ],
            ),
            SizedBox(height: Responsive.h(12)),

            // ── 3. Category → Subcategory → Variant ──
            _card(
              children: [
                _sectionHeader('Category'),
                SizedBox(height: Responsive.h(10)),
                allCategories.when(
                  data: (cats) => _buildCategoryDropdowns(cats, primary),
                  loading: () => const Center(child: CircularProgressIndicator()),
                  error: (e, _) => Text('Failed to load categories',
                      style: TextStyle(fontSize: Responsive.sp(13), color: Colors.red)),
                ),
              ],
            ),
            SizedBox(height: Responsive.h(12)),

            // ── 4. Rent Price ──
            _card(
              children: [
                _label('Rent Price', required: true),
                SizedBox(height: Responsive.h(6)),
                TextField(
                  controller: _priceCtl,
                  keyboardType: TextInputType.number,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                  style: TextStyle(
                    fontSize: Responsive.sp(22),
                    fontWeight: FontWeight.w800,
                    color: primary,
                  ),
                  decoration: InputDecoration(
                    prefixText: '₹ ',
                    prefixStyle: TextStyle(
                      fontSize: Responsive.sp(22),
                      fontWeight: FontWeight.w800,
                      color: primary,
                    ),
                    hintText: '0',
                    contentPadding: Responsive.symmetric(horizontal: 14, vertical: 14),
                  ),
                ),
              ],
            ),
            SizedBox(height: Responsive.h(12)),

            // ── 5. Quantity (stepper) ──
            _card(
              children: [
                _sectionHeader('Quantity'),
                SizedBox(height: Responsive.h(10)),
                _buildQuantityStepper(primary),
              ],
            ),
            SizedBox(height: Responsive.h(12)),

            // ── 6. Identifiers (SKU + Barcode) ──
            _card(
              children: [
                _sectionHeader('Identifiers'),
                SizedBox(height: Responsive.h(10)),

                // SKU
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('SKU',
                              style: TextStyle(
                                  fontSize: Responsive.sp(11),
                                  fontWeight: FontWeight.w600,
                                  color: Colors.grey[500])),
                          SizedBox(height: Responsive.h(4)),
                          Container(
                            width: double.infinity,
                            padding: Responsive.symmetric(horizontal: 12, vertical: 10),
                            decoration: BoxDecoration(
                              color: Colors.grey[100],
                              borderRadius: BorderRadius.circular(Responsive.r(10)),
                            ),
                            child: Text(_sku,
                                style: TextStyle(
                                    fontSize: Responsive.sp(13),
                                    fontWeight: FontWeight.w600,
                                    fontFamily: 'monospace',
                                    color: primary)),
                          ),
                        ],
                      ),
                    ),
                    SizedBox(width: Responsive.w(8)),
                    IconButton(
                      onPressed: () => setState(() => _sku = _generateSKU()),
                      icon: Icon(Icons.refresh_rounded, size: Responsive.icon(22)),
                      tooltip: 'Regenerate SKU',
                    ),
                  ],
                ),
                SizedBox(height: Responsive.h(14)),

                // Barcode
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Barcode',
                              style: TextStyle(
                                  fontSize: Responsive.sp(11),
                                  fontWeight: FontWeight.w600,
                                  color: Colors.grey[500])),
                          SizedBox(height: Responsive.h(4)),
                          Container(
                            width: double.infinity,
                            padding: Responsive.symmetric(horizontal: 12, vertical: 10),
                            decoration: BoxDecoration(
                              color: Colors.grey[100],
                              borderRadius: BorderRadius.circular(Responsive.r(10)),
                            ),
                            child: Text(_barcode,
                                style: TextStyle(
                                    fontSize: Responsive.sp(12),
                                    fontWeight: FontWeight.w600,
                                    fontFamily: 'monospace',
                                    color: primary),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis),
                          ),
                        ],
                      ),
                    ),
                    SizedBox(width: Responsive.w(4)),
                    IconButton(
                      onPressed: () => setState(() => _barcode = _generateBarcode()),
                      icon: Icon(Icons.refresh_rounded, size: Responsive.icon(22)),
                      tooltip: 'Regenerate Barcode',
                    ),
                    IconButton(
                      onPressed: _scanBarcode,
                      icon: Icon(Icons.qr_code_scanner_rounded, size: Responsive.icon(22)),
                      tooltip: 'Scan Barcode',
                    ),
                  ],
                ),
              ],
            ),
            SizedBox(height: Responsive.h(12)),

            // ── 7. Active toggle ──
            _card(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Active Listing',
                            style: TextStyle(
                                fontSize: Responsive.sp(14),
                                fontWeight: FontWeight.w600,
                                color: primary)),
                        SizedBox(height: Responsive.h(2)),
                        Text('Visible in storefront',
                            style: TextStyle(
                                fontSize: Responsive.sp(11), color: Colors.grey[500])),
                      ],
                    ),
                    Switch.adaptive(
                      value: _isActive,
                      onChanged: (v) => setState(() => _isActive = v),
                      activeTrackColor: primary,
                    ),
                  ],
                ),
              ],
            ),
            SizedBox(height: Responsive.h(24)),

            // ── 8. Submit ──
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _isLoading ? null : _submitForm,
                style: ElevatedButton.styleFrom(
                  padding: Responsive.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(Responsive.r(12))),
                ),
                child: _isLoading
                    ? SizedBox(
                        height: Responsive.h(22),
                        width: Responsive.w(22),
                        child: const CircularProgressIndicator(
                            color: Colors.white, strokeWidth: 2))
                    : Text(
                        isEdit ? 'Save Changes' : 'Create Product',
                        style: TextStyle(
                            fontSize: Responsive.sp(16), fontWeight: FontWeight.w700),
                      ),
              ),
            ),
            SizedBox(height: Responsive.h(32)),
          ],
        ),
      ),
    );
  }

  // ────────────────────────────────────────────────────────────────────
  // Helpers
  // ────────────────────────────────────────────────────────────────────

  void _populateFields(Product p) {
    _nameCtl.text = p.name;
    _descCtl.text = p.description ?? '';
    _priceCtl.text = p.pricePerDay > 0 ? p.pricePerDay.toStringAsFixed(0) : '';
    _quantity = p.quantity;
    _sku = p.sku ?? _generateSKU();
    _barcode = p.barcode ?? _generateBarcode();
    _isActive = p.isActive;
    _imageUrls
      ..clear()
      ..addAll(p.images.map((i) => i.url));
    setState(() {});
  }

  Widget _card({required List<Widget> children}) {
    return Container(
      width: double.infinity,
      padding: Responsive.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(Responsive.r(12)),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: children),
    );
  }

  Widget _sectionHeader(String t) {
    return Text(t,
        style: TextStyle(
            fontSize: Responsive.sp(14),
            fontWeight: FontWeight.w700,
            color: Theme.of(context).colorScheme.primary));
  }

  Widget _label(String t, {bool required = false}) {
    return RichText(
      text: TextSpan(
        text: t,
        style: TextStyle(
            fontSize: Responsive.sp(13),
            fontWeight: FontWeight.w600,
            color: Theme.of(context).colorScheme.primary),
        children: required
            ? [TextSpan(text: ' *', style: TextStyle(color: Colors.red[400]))]
            : [],
      ),
    );
  }

  Widget _input(TextEditingController ctl, String hint,
      {int maxLines = 1, TextInputType type = TextInputType.text}) {
    return TextField(
      controller: ctl,
      keyboardType: type,
      maxLines: maxLines,
      style: TextStyle(fontSize: Responsive.sp(14)),
      decoration: InputDecoration(
        hintText: hint,
        contentPadding: Responsive.symmetric(horizontal: 14, vertical: 12),
      ),
    );
  }

  // ── Image Grid ──
  Widget _buildImageGrid() {
    final total = _imageUrls.length + _newImages.length;
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        crossAxisSpacing: Responsive.w(10),
        mainAxisSpacing: Responsive.h(10),
      ),
      itemCount: total + 1,
      itemBuilder: (_, i) {
        if (i == total) return _addImageBtn();
        if (i < _imageUrls.length) {
          return _imageTile(
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
        final fi = i - _imageUrls.length;
        return _imageTile(
          child: Image.file(_newImages[fi], fit: BoxFit.cover),
          onRemove: () => setState(() => _newImages.removeAt(fi)),
          isPrimary: i == 0,
        );
      },
    );
  }

  Widget _addImageBtn() {
    final primary = Theme.of(context).colorScheme.primary;
    return GestureDetector(
      onTap: _pickImage,
      child: Container(
        decoration: BoxDecoration(
          color: primary.withValues(alpha: 0.06),
          borderRadius: BorderRadius.circular(Responsive.r(12)),
          border: Border.all(color: primary.withValues(alpha: 0.2)),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.add_a_photo_outlined,
                size: Responsive.icon(26), color: primary.withValues(alpha: 0.5)),
            SizedBox(height: Responsive.h(4)),
            Text('Add',
                style: TextStyle(
                    fontSize: Responsive.sp(11), color: primary.withValues(alpha: 0.6))),
          ],
        ),
      ),
    );
  }

  Widget _imageTile({required Widget child, required VoidCallback onRemove, bool isPrimary = false}) {
    return Stack(
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(Responsive.r(12)),
          child: SizedBox.expand(child: child),
        ),
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
        if (isPrimary)
          Positioned(
            bottom: Responsive.h(4),
            left: Responsive.w(4),
            child: Container(
              padding: Responsive.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.secondary,
                borderRadius: BorderRadius.circular(Responsive.r(4)),
              ),
              child: Text('Primary',
                  style: TextStyle(
                      fontSize: Responsive.sp(9),
                      fontWeight: FontWeight.w700,
                      color: Theme.of(context).colorScheme.primary)),
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
                leading: Icon(Icons.camera_alt_rounded, size: Responsive.icon(24)),
                title: Text('Camera', style: TextStyle(fontSize: Responsive.sp(15))),
                onTap: () => Navigator.pop(ctx, ImageSource.camera),
              ),
              ListTile(
                leading: Icon(Icons.photo_library_rounded, size: Responsive.icon(24)),
                title: Text('Gallery', style: TextStyle(fontSize: Responsive.sp(15))),
                onTap: () => Navigator.pop(ctx, ImageSource.gallery),
              ),
            ],
          ),
        ),
      ),
    );
    if (source == null) return;

    final picked = await _picker.pickImage(
      source: source,
      maxWidth: 800,
      imageQuality: 60,
    );
    if (picked != null && mounted) {
      setState(() => _newImages.add(File(picked.path)));
    }
  }

  // ── Category Dropdowns ──
  Widget _buildCategoryDropdowns(List<Category> allCats, Color primary) {
    final mains = allCats.where((c) => c.parentId == null).toList();
    final subs = _categoryId != null
        ? allCats.where((c) => c.parentId == _categoryId).toList()
        : <Category>[];
    final variants = _subcategoryId != null
        ? allCats.where((c) => c.parentId == _subcategoryId).toList()
        : <Category>[];

    return Column(
      children: [
        _dropdown('Select category', mains, _categoryId, (v) {
          setState(() {
            _categoryId = v;
            _subcategoryId = null;
            _subvariantId = null;
            // Update SKU prefix with category name
            if (v != null) {
              final cat = mains.firstWhere((c) => c.id == v);
              final prefix = cat.name.length >= 3
                  ? cat.name.substring(0, 3).toUpperCase()
                  : cat.name.toUpperCase();
              _sku = '$prefix-${Random().nextInt(9000) + 1000}';
            }
          });
        }),
        if (subs.isNotEmpty) ...[
          SizedBox(height: Responsive.h(10)),
          _dropdown('Select subcategory (optional)', subs, _subcategoryId, (v) {
            setState(() {
              _subcategoryId = v;
              _subvariantId = null;
            });
          }),
        ],
        if (variants.isNotEmpty) ...[
          SizedBox(height: Responsive.h(10)),
          _dropdown('Select variant (optional)', variants, _subvariantId, (v) {
            setState(() => _subvariantId = v);
          }),
        ],
      ],
    );
  }

  Widget _dropdown(
      String hint, List<Category> items, String? value, ValueChanged<String?> onChanged) {
    return DropdownButtonFormField<String>(
      initialValue: value,
      decoration: InputDecoration(
        contentPadding: Responsive.symmetric(horizontal: 14, vertical: 12),
      ),
      hint: Text(hint, style: TextStyle(fontSize: Responsive.sp(13))),
      isExpanded: true,
      items: items
          .map((c) => DropdownMenuItem(value: c.id, child: Text(c.name)))
          .toList(),
      onChanged: onChanged,
    );
  }

  // ── Quantity Stepper ──
  Widget _buildQuantityStepper(Color primary) {
    return Row(
      children: [
        // Minus button
        _stepperBtn(Icons.remove_rounded, primary, () {
          if (_quantity > 1) setState(() => _quantity--);
        }),
        SizedBox(width: Responsive.w(8)),
        // Editable quantity
        Expanded(
          child: TextField(
            controller: TextEditingController(text: '$_quantity'),
            keyboardType: TextInputType.number,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: Responsive.sp(22),
              fontWeight: FontWeight.w800,
              color: primary,
            ),
            decoration: InputDecoration(
              contentPadding: Responsive.symmetric(vertical: 12),
            ),
            onChanged: (v) {
              final n = int.tryParse(v);
              if (n != null && n > 0) setState(() => _quantity = n);
            },
          ),
        ),
        SizedBox(width: Responsive.w(8)),
        // Plus button
        _stepperBtn(Icons.add_rounded, primary, () {
          setState(() => _quantity++);
        }),
      ],
    );
  }

  Widget _stepperBtn(IconData icon, Color primary, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: Responsive.w(48),
        height: Responsive.w(48),
        decoration: BoxDecoration(
          color: primary,
          borderRadius: BorderRadius.circular(Responsive.r(12)),
        ),
        child: Icon(icon, color: Colors.white, size: Responsive.icon(24)),
      ),
    );
  }

  // ── Barcode Scanner (placeholder — needs mobile_scanner package) ──
  void _scanBarcode() {
    // TODO: Integrate mobile_scanner or barcode_scan package
    _snack('Barcode scanner coming soon. Use auto-generate for now.');
  }

  // ── Submit ──
  Future<void> _submitForm() async {
    if (_nameCtl.text.trim().isEmpty) {
      _snack('Product name is required', isError: true);
      return;
    }
    final price = double.tryParse(_priceCtl.text) ?? 0;
    if (price <= 0) {
      _snack('Rent price is required', isError: true);
      return;
    }

    setState(() => _isLoading = true);

    try {
      // 1. Upload new images to R2
      final uploadedUrls = <String>[];
      if (_newImages.isNotEmpty) {
        final uploadRepo = UploadRepository();
        for (int i = 0; i < _newImages.length; i++) {
          _snack('Uploading image ${i + 1} of ${_newImages.length}…');
          final url = await uploadRepo.uploadFile(_newImages[i], folder: 'products');
          uploadedUrls.add(url);
        }
      }

      // 2. Build images JSONB
      final allUrls = [..._imageUrls, ...uploadedUrls];
      final images = allUrls.asMap().entries.map((e) => {
            'url': e.value,
            'is_primary': e.key == 0,
            'sort_order': e.key,
            'alt_text': _nameCtl.text.trim(),
          }).toList();

      // 3. Build payload
      final body = <String, dynamic>{
        'name': _nameCtl.text.trim(),
        'price_per_day': price,
        'security_deposit': 0,
        'quantity': _quantity,
        'available_quantity': _quantity,
        'images': images,
        'is_active': _isActive,
        'sku': _sku,
        'barcode': _barcode,
      };

      final desc = _descCtl.text.trim();
      if (desc.isNotEmpty) body['description'] = desc;
      if (_categoryId != null) body['category_id'] = _categoryId;
      if (_subcategoryId != null) body['subcategory_id'] = _subcategoryId;
      if (_subvariantId != null) body['subvariant_id'] = _subvariantId;

      // 4. Create or update
      if (isEdit) {
        await ref.read(productsProvider.notifier).updateProduct(widget.productId!, body);
      } else {
        await ref.read(productsProvider.notifier).addProduct(body);
      }

      if (mounted) {
        _snack(isEdit ? 'Product updated!' : 'Product created!');
        Navigator.of(context).pop();
      }
    } catch (e) {
      _snack(e.toString().replaceFirst('Exception: ', ''), isError: true);
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _snack(String msg, {bool isError = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg, maxLines: 2, overflow: TextOverflow.ellipsis),
        backgroundColor: isError ? Colors.red[400] : const Color(0xFF2ECC71),
        duration: Duration(seconds: isError ? 3 : 2),
      ),
    );
  }
}
