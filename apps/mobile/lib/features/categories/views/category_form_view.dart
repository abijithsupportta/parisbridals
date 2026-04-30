import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import '../../../core/responsive.dart';
import '../../../core/upload_repository.dart';
import '../models/category.dart';
import '../providers/category_provider.dart';

/// Create / Edit form for a category.
/// If [category] is null → Create mode. Otherwise → Edit mode.
class CategoryFormView extends ConsumerStatefulWidget {
  final Category? category;
  final String? initialParentId;
  const CategoryFormView({super.key, this.category, this.initialParentId});

  @override
  ConsumerState<CategoryFormView> createState() => _CategoryFormViewState();
}

class _CategoryFormViewState extends ConsumerState<CategoryFormView> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _nameController;
  late TextEditingController _slugController;
  late TextEditingController _descriptionController;
  late TextEditingController _sortOrderController;
  bool _isActive = true;
  bool _isGlobal = false;
  String? _parentId;
  bool _isLoading = false;
  bool _isUploading = false;

  // Image state
  File? _pickedFile;           // Locally picked file (not yet uploaded)
  String? _uploadedImageUrl;   // URL from server after upload / existing URL
  bool _imageRemoved = false;  // User explicitly removed the image

  bool get isEditing => widget.category != null;

  static const _primary = Color(0xFF434343); // Charcoal
  static const _bg      = Color(0xFFF8F8F8); // Off-white

  final _imagePicker = ImagePicker();
  final _uploadRepo = UploadRepository();

  @override
  void initState() {
    super.initState();
    final c = widget.category;
    _nameController = TextEditingController(text: c?.name ?? '');
    _slugController = TextEditingController(text: c?.slug ?? '');
    _descriptionController = TextEditingController(text: c?.description ?? '');
    _sortOrderController = TextEditingController(text: '${c?.sortOrder ?? 0}');
    _isActive = c?.isActive ?? true;
    _isGlobal = c?.isGlobal ?? true;
    _parentId = c?.parentId ?? widget.initialParentId;
    _uploadedImageUrl = c?.imageUrl;

    // Auto-generate slug from name
    _nameController.addListener(_onNameChanged);

    // Recover image if Android killed the activity during image picker
    _retrieveLostImage();
  }

  /// Recovers a picked image if the Android OS killed our Activity
  /// while the camera/gallery was open.
  Future<void> _retrieveLostImage() async {
    try {
      final LostDataResponse response = await _imagePicker.retrieveLostData();
      if (response.isEmpty || response.file == null) return;
      if (!mounted) return;
      setState(() {
        _pickedFile = File(response.file!.path);
        _imageRemoved = false;
      });
    } catch (e) {
      debugPrint('Error retrieving lost image: $e');
    }
  }

  void _onNameChanged() {
    if (!isEditing || _slugController.text == _generateSlug(widget.category!.name)) {
      _slugController.text = _generateSlug(_nameController.text);
    }
  }

  String _generateSlug(String name) {
    return name.toLowerCase().replaceAll(RegExp(r'[^a-z0-9]+'), '-').replaceAll(RegExp(r'^-|-$'), '');
  }

  @override
  void dispose() {
    _nameController.removeListener(_onNameChanged);
    _nameController.dispose();
    _slugController.dispose();
    _descriptionController.dispose();
    _sortOrderController.dispose();
    super.dispose();
  }

  // ── Image Picking ──
  void _showImagePicker() {
    // CRITICAL: Unfocus any text field before launching external camera/gallery.
    // When a TextField holds focus, the keyboard + text input system keeps
    // extra native resources alive. This inflates the app's memory footprint
    // and makes Android's OOM killer more likely to terminate the process
    // while the camera Activity is in the foreground.
    FocusScope.of(context).unfocus();
    showModalBottomSheet(
      context: context,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(Responsive.r(20)))),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: Responsive.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: Responsive.w(40), height: Responsive.h(4),
                decoration: BoxDecoration(color: Colors.grey[300], borderRadius: BorderRadius.circular(Responsive.r(2))),
              ),
              SizedBox(height: Responsive.h(20)),
              Text('Choose Image', style: TextStyle(fontSize: Responsive.sp(16), fontWeight: FontWeight.bold)),
              SizedBox(height: Responsive.h(20)),
              Row(
                children: [
                  _buildPickerOption(Icons.camera_alt_rounded, 'Camera', _primary, () async {
                    Navigator.pop(ctx);
                    try {
                      final picked = await _imagePicker.pickImage(source: ImageSource.camera, imageQuality: 60, maxWidth: 1024, maxHeight: 1024);
                      if (picked != null && mounted) {
                        setState(() {
                          _pickedFile = File(picked.path);
                          _imageRemoved = false;
                        });
                      }
                    } catch (e) {
                      debugPrint('Camera error: $e');
                      if (mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to open camera: $e')));
                      }
                    }
                  }),
                  SizedBox(width: Responsive.w(16)),
                  _buildPickerOption(Icons.photo_library_rounded, 'Gallery', const Color(0xFF26C6DA), () async {
                    Navigator.pop(ctx);
                    try {
                      final picked = await _imagePicker.pickImage(source: ImageSource.gallery, imageQuality: 60, maxWidth: 1024, maxHeight: 1024);
                      if (picked != null && mounted) {
                        setState(() {
                          _pickedFile = File(picked.path);
                          _imageRemoved = false;
                        });
                      }
                    } catch (e) {
                      debugPrint('Gallery error: $e');
                      if (mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to open gallery: $e')));
                      }
                    }
                  }),
                ],
              ),
              SizedBox(height: Responsive.h(12)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPickerOption(IconData icon, String label, Color color, VoidCallback onTap) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: Responsive.symmetric(vertical: 20),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(Responsive.r(14)),
            border: Border.all(color: color.withValues(alpha: 0.2)),
          ),
          child: Column(
            children: [
              Icon(icon, size: Responsive.icon(32), color: color),
              SizedBox(height: Responsive.h(8)),
              Text(label, style: TextStyle(fontSize: Responsive.sp(13), fontWeight: FontWeight.w600, color: color)),
            ],
          ),
        ),
      ),
    );
  }

  void _removeImage() {
    setState(() {
      _pickedFile = null;
      _uploadedImageUrl = null;
      _imageRemoved = true;
    });
  }

  // ── Submit ──
  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    try {
      // Upload image if a new one was picked
      String? finalImageUrl = _imageRemoved ? null : _uploadedImageUrl;
      if (_pickedFile != null) {
        setState(() => _isUploading = true);
        debugPrint('[CategoryForm] Uploading image: ${_pickedFile!.path}');
        finalImageUrl = await _uploadRepo.uploadFile(_pickedFile!, folder: 'categories');
        debugPrint('[CategoryForm] Upload success: $finalImageUrl');
        setState(() => _isUploading = false);
      }

      final body = <String, dynamic>{
        'name': _nameController.text.trim(),
        'slug': _slugController.text.trim(),
        if (_descriptionController.text.trim().isNotEmpty) 'description': _descriptionController.text.trim(),
        if (finalImageUrl != null) 'image_url': finalImageUrl, // ignore: use_null_aware_elements
        if (_parentId != null) 'parent_id': _parentId, // ignore: use_null_aware_elements
        'sort_order': int.tryParse(_sortOrderController.text) ?? 0,
        'is_active': _isActive,
        'is_global': _isGlobal,
      };

      debugPrint('[CategoryForm] Submitting body: $body');

      final repo = ref.read(categoryRepositoryProvider);
      if (isEditing) {
        await repo.updateCategory(widget.category!.id, body);
      } else {
        await repo.createCategory(body);
      }
      debugPrint('[CategoryForm] Success!');
      ref.invalidate(categoriesProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(isEditing ? 'Category updated!' : 'Category created!'), backgroundColor: const Color(0xFF4CAF50)),
        );
        Navigator.pop(context);
      }
    } catch (e, stackTrace) {
      debugPrint('[CategoryForm] ERROR: $e');
      debugPrint('[CategoryForm] Stack: $stackTrace');
      if (mounted) {
        final errorMsg = e.toString().replaceAll('Exception: ', '');
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $errorMsg'), backgroundColor: Colors.red, duration: const Duration(seconds: 5)),
        );
      }
    } finally {
      if (mounted) setState(() { _isLoading = false; _isUploading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    Responsive.init(context);
    return Scaffold(
      backgroundColor: _bg,
      appBar: AppBar(
        title: Text(isEditing ? 'Edit Category' : 'New Category', style: TextStyle(fontSize: Responsive.sp(18))),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: Responsive.all(16),
          children: [
            // ── Image Section ──
            _buildImageSection(),
            SizedBox(height: Responsive.h(20)),

            // Name
            _buildLabel('Category Name *'),
            SizedBox(height: Responsive.h(6)),
            _buildTextField(_nameController, 'e.g. Bridal Wear',
              validator: (v) => v == null || v.trim().isEmpty ? 'Name is required' : null),
            SizedBox(height: Responsive.h(16)),

            // Slug
            _buildLabel('Slug *'),
            SizedBox(height: Responsive.h(6)),
            _buildTextField(_slugController, 'auto-generated-slug',
              validator: (v) => v == null || v.trim().isEmpty ? 'Slug is required' : null),
            SizedBox(height: Responsive.h(16)),

            

            // Description
            _buildLabel('Description'),
            SizedBox(height: Responsive.h(6)),
            _buildTextField(_descriptionController, 'Optional description...', maxLines: 3),
            SizedBox(height: Responsive.h(16)),

            // Sort Order
            _buildLabel('Sort Order'),
            SizedBox(height: Responsive.h(6)),
            _buildTextField(_sortOrderController, '0', keyboardType: TextInputType.number),
            SizedBox(height: Responsive.h(20)),

            // Toggles
            Container(
              padding: Responsive.all(16),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(Responsive.r(14))),
              child: Column(
                children: [
                  _buildToggleRow('Active', _isActive, (v) => setState(() => _isActive = v)),
                ],
              ),
            ),
            SizedBox(height: Responsive.h(28)),

            // Submit Button
            SizedBox(
              height: Responsive.h(52),
              child: ElevatedButton(
                onPressed: _isLoading ? null : _handleSubmit,
                style: ElevatedButton.styleFrom(
                  backgroundColor: _primary,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(Responsive.r(12))),
                ),
                child: _isLoading
                    ? Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          SizedBox(height: Responsive.icon(18), width: Responsive.icon(18),
                            child: const CircularProgressIndicator(color: Colors.white, strokeWidth: 2)),
                          SizedBox(width: Responsive.w(10)),
                          Text(_isUploading ? 'Uploading image...' : 'Saving...',
                            style: TextStyle(fontSize: Responsive.sp(13), color: Colors.white)),
                        ],
                      )
                    : Text(isEditing ? 'Update Category' : 'Create Category',
                        style: TextStyle(fontSize: Responsive.sp(14), fontWeight: FontWeight.bold)),
              ),
            ),
            SizedBox(height: Responsive.h(32)),
          ],
        ),
      ),
    );
  }

  // ── Image Section ──
  Widget _buildImageSection() {
    final bool hasImage = _pickedFile != null || (_uploadedImageUrl != null && !_imageRemoved);

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(Responsive.r(16)),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: Responsive.r(10), offset: Offset(0, Responsive.h(3)))],
      ),
      child: Column(
        children: [
          // Image preview
          GestureDetector(
            onTap: hasImage ? null : _showImagePicker,
            child: Container(
              width: double.infinity,
              height: Responsive.h(200),
              decoration: BoxDecoration(
                color: const Color(0xFFF8F8FC),
                borderRadius: BorderRadius.vertical(top: Radius.circular(Responsive.r(16))),
              ),
              child: hasImage ? _buildImagePreview() : _buildImagePlaceholder(),
            ),
          ),

          // Action buttons
          Padding(
            padding: Responsive.all(12),
            child: Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _showImagePicker,
                    icon: Icon(Icons.camera_alt_outlined, size: Responsive.icon(16)),
                    label: Text(hasImage ? 'Change' : 'Add Image', style: TextStyle(fontSize: Responsive.sp(12))),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: _primary,
                      side: BorderSide(color: _primary.withValues(alpha: 0.3)),
                      padding: Responsive.symmetric(vertical: 10),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(Responsive.r(8))),
                    ),
                  ),
                ),
                if (hasImage) ...[
                  SizedBox(width: Responsive.w(10)),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _removeImage,
                      icon: Icon(Icons.delete_outline, size: Responsive.icon(16)),
                      label: Text('Remove', style: TextStyle(fontSize: Responsive.sp(12))),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: const Color(0xFFFF6B8A),
                        side: BorderSide(color: const Color(0xFFFF6B8A).withValues(alpha: 0.3)),
                        padding: Responsive.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(Responsive.r(8))),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildImagePreview() {
    return ClipRRect(
      borderRadius: BorderRadius.vertical(top: Radius.circular(Responsive.r(16))),
      child: Stack(
        fit: StackFit.expand,
        children: [
          if (_pickedFile != null)
            Image.file(
              _pickedFile!,
              fit: BoxFit.cover,
              errorBuilder: (context, error, stackTrace) => _buildImagePlaceholder(),
            )
          else if (_uploadedImageUrl != null)
            Image.network(_uploadedImageUrl!, fit: BoxFit.cover,
              errorBuilder: (context, error, stackTrace) => _buildImagePlaceholder()),
          // Gradient overlay at bottom
          Positioned(
            bottom: 0, left: 0, right: 0,
            child: Container(
              height: Responsive.h(40),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.bottomCenter, end: Alignment.topCenter,
                  colors: [Colors.black.withValues(alpha: 0.4), Colors.transparent],
                ),
              ),
            ),
          ),
          // Badge
          Positioned(
            bottom: Responsive.h(8), left: Responsive.w(12),
            child: Container(
              padding: Responsive.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: _pickedFile != null ? _primary.withValues(alpha: 0.9) : const Color(0xFF4CAF50).withValues(alpha: 0.9),
                borderRadius: BorderRadius.circular(Responsive.r(6)),
              ),
              child: Text(
                _pickedFile != null ? 'New Image' : 'Current',
                style: TextStyle(fontSize: Responsive.sp(9), fontWeight: FontWeight.w700, color: Colors.white),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildImagePlaceholder() {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(Icons.add_a_photo_outlined, size: Responsive.icon(40), color: Colors.grey[350]),
        SizedBox(height: Responsive.h(10)),
        Text('Tap to add image', style: TextStyle(fontSize: Responsive.sp(12), color: Colors.grey)),
        SizedBox(height: Responsive.h(4)),
        Text('Camera or Gallery', style: TextStyle(fontSize: Responsive.sp(10), color: Colors.grey[400])),
      ],
    );
  }

  // ── Shared Form Widgets ──
  Widget _buildLabel(String text) {
    return Text(text, style: TextStyle(fontSize: Responsive.sp(14), fontWeight: FontWeight.w700, color: Colors.black87));
  }

  Widget _buildTextField(TextEditingController controller, String hint,
      {String? Function(String?)? validator, int maxLines = 1, TextInputType? keyboardType}) {
    return TextFormField(
      controller: controller,
      validator: validator,
      maxLines: maxLines,
      keyboardType: keyboardType,
      style: TextStyle(fontSize: Responsive.sp(15)),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: TextStyle(fontSize: Responsive.sp(14), color: Colors.grey),
        filled: true, fillColor: Colors.white,
        contentPadding: Responsive.symmetric(horizontal: 16, vertical: 16),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(Responsive.r(12)), borderSide: const BorderSide(color: Color(0xFFE0E0E0))),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(Responsive.r(12)), borderSide: const BorderSide(color: Color(0xFFE0E0E0))),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(Responsive.r(12)), borderSide: BorderSide(color: _primary, width: 2)),
      ),
    );
  }

  Widget _buildToggleRow(String label, bool value, ValueChanged<bool> onChanged) {
    return Row(
      children: [
        Text(label, style: TextStyle(fontSize: Responsive.sp(13))),
        const Spacer(),
        Switch(
          value: value,
          onChanged: onChanged,
          activeTrackColor: _primary,
        ),
      ],
    );
  }
}

