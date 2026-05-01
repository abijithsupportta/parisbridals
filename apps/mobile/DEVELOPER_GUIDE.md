# Paris Bridals Mobile - Developer Quick Reference

**Last Updated:** May 1, 2026

---

## 🚀 Quick Start

### Prerequisites
```bash
flutter --version  # Should be >= 3.11.4
dart --version     # Should be >= 3.11.4
```

### Setup
```bash
cd apps/mobile
flutter pub get
flutter run
```

### Environment Variables (.env)
```env
API_BASE_URL=https://admin.parisbridals.com/api
R2_ENDPOINT=https://b0bb2b028f469eafb38442f5a306a3e2.r2.cloudflarestorage.com
R2_BUCKET_NAME=praisbridals
R2_PUBLIC_URL=https://pub-0034dd36936640008811a977b5359f89.r2.dev
```

---

## 📁 Project Structure Cheat Sheet

```
lib/
├── main.dart                    # Entry point
├── core/                        # Shared infrastructure
│   ├── api_client.dart          # Dio singleton
│   ├── main_layout.dart         # Main scaffold
│   ├── responsive.dart          # Responsive utility
│   └── theme.dart               # App theme
├── features/                    # Feature modules
│   └── <feature>/
│       ├── models/              # Data classes
│       ├── repositories/        # API calls
│       ├── providers/           # Riverpod state
│       └── views/               # UI widgets
└── utils/                       # Helper functions
```

---

## 🎨 Design System Quick Reference

### Colors
```dart
// Use these constants in your widgets
static const _primary = Color(0xFF434343);   // Charcoal
static const _accent = Color(0xFFF7C873);    // Golden
static const _surface = Color(0xFFFAEBCD);   // Almond
static const _bg = Color(0xFFF8F8F8);        // Off-White
static const _danger = Color(0xFFFF6B8A);    // Red
static const _success = Color(0xFF10B981);   // Green
```

### Responsive Sizing
```dart
// ALWAYS use Responsive helpers, NEVER hardcode sizes
Responsive.init(context);  // Call once in build()

// Sizing
width: Responsive.w(100)           // Width
height: Responsive.h(50)           // Height
fontSize: Responsive.sp(14)        // Font size
size: Responsive.icon(24)          // Icon size
borderRadius: Responsive.r(12)     // Border radius

// Padding
padding: Responsive.all(16)
padding: Responsive.symmetric(horizontal: 16, vertical: 8)
padding: Responsive.only(left: 16, top: 8)
```

### Typography Scale
```dart
// Body text
TextStyle(fontSize: Responsive.sp(13), fontWeight: FontWeight.normal)

// Card title
TextStyle(fontSize: Responsive.sp(14), fontWeight: FontWeight.bold)

// Section header
TextStyle(fontSize: Responsive.sp(16), fontWeight: FontWeight.bold)

// Page title
TextStyle(fontSize: Responsive.sp(18), fontWeight: FontWeight.bold)
```

---

## 🔧 Common Patterns

### 1. Creating a New Feature Module

```bash
# Create directory structure
mkdir -p lib/features/my_feature/{models,repositories,providers,views}
```

**Step 1: Create Model** (`models/my_model.dart`)
```dart
class MyModel {
  final String id;
  final String name;
  
  MyModel({required this.id, required this.name});
  
  factory MyModel.fromJson(Map<String, dynamic> json) {
    return MyModel(
      id: json['id'] as String,
      name: json['name'] as String,
    );
  }
  
  Map<String, dynamic> toJson() {
    return {'id': id, 'name': name};
  }
}
```

**Step 2: Create Repository** (`repositories/my_repository.dart`)
```dart
import 'package:dio/dio.dart';
import '../../../core/api_client.dart';
import '../models/my_model.dart';

class MyRepository {
  final Dio _client = apiClient;
  
  Future<List<MyModel>> getAll() async {
    final response = await _client.get('/my-endpoint');
    if (response.statusCode == 200) {
      final data = response.data;
      if (data['success'] == true && data['data'] != null) {
        final list = data['data'] as List;
        return list.map((e) => MyModel.fromJson(e)).toList();
      }
    }
    throw Exception('Failed to load data');
  }
  
  Future<MyModel> create(Map<String, dynamic> data) async {
    final response = await _client.post('/my-endpoint', data: data);
    if (response.statusCode == 201) {
      return MyModel.fromJson(response.data['data']);
    }
    throw Exception('Failed to create');
  }
}
```

**Step 3: Create Provider** (`providers/my_provider.dart`)
```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/my_model.dart';
import '../repositories/my_repository.dart';

final myRepositoryProvider = Provider<MyRepository>((ref) {
  return MyRepository();
});

final myListProvider = FutureProvider<List<MyModel>>((ref) async {
  final repo = ref.read(myRepositoryProvider);
  return repo.getAll();
});
```

**Step 4: Create View** (`views/my_view.dart`)
```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/responsive.dart';
import '../providers/my_provider.dart';

class MyView extends ConsumerWidget {
  const MyView({super.key});
  
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    Responsive.init(context);
    final dataAsync = ref.watch(myListProvider);
    
    return dataAsync.when(
      data: (items) => ListView.builder(
        itemCount: items.length,
        itemBuilder: (context, index) {
          final item = items[index];
          return ListTile(title: Text(item.name));
        },
      ),
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => Center(child: Text('Error: $error')),
    );
  }
}
```

---

### 2. Pagination Pattern

```dart
class MyNotifier extends AsyncNotifier<PaginatedData> {
  int _currentPage = 1;
  bool _isLoadingMore = false;
  
  @override
  Future<PaginatedData> build() async {
    _currentPage = 1;
    final repo = ref.read(myRepositoryProvider);
    return repo.getData(page: _currentPage);
  }
  
  Future<void> loadMore() async {
    if (_isLoadingMore || !state.hasValue) return;
    
    final currentData = state.value!;
    if (currentData.page >= currentData.totalPages) return;
    
    _isLoadingMore = true;
    try {
      final repo = ref.read(myRepositoryProvider);
      final nextPageData = await repo.getData(page: _currentPage + 1);
      
      _currentPage++;
      state = AsyncValue.data(PaginatedData(
        items: [...currentData.items, ...nextPageData.items],
        page: nextPageData.page,
        totalPages: nextPageData.totalPages,
      ));
    } finally {
      _isLoadingMore = false;
    }
  }
}
```

**Usage in ListView:**
```dart
NotificationListener<ScrollNotification>(
  onNotification: (notification) {
    if (notification.metrics.pixels >= 
        notification.metrics.maxScrollExtent - 200) {
      ref.read(myProvider.notifier).loadMore();
    }
    return false;
  },
  child: ListView.builder(...),
)
```

---

### 3. Search Pattern

```dart
class MyNotifier extends AsyncNotifier<List<MyModel>> {
  String _currentSearch = '';
  
  @override
  Future<List<MyModel>> build() async {
    final repo = ref.read(myRepositoryProvider);
    return repo.getAll(search: _currentSearch);
  }
  
  Future<void> search(String query) async {
    _currentSearch = query;
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      final repo = ref.read(myRepositoryProvider);
      return repo.getAll(search: query);
    });
  }
}
```

**Usage with TextField:**
```dart
TextField(
  onChanged: (value) {
    // Debounce recommended (use Timer)
    ref.read(myProvider.notifier).search(value);
  },
  decoration: InputDecoration(
    hintText: 'Search...',
    prefixIcon: Icon(Icons.search),
  ),
)
```

---

### 4. Form Validation Pattern

```dart
class MyFormView extends StatefulWidget {
  const MyFormView({super.key});
  
  @override
  State<MyFormView> createState() => _MyFormViewState();
}

class _MyFormViewState extends State<MyFormView> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  
  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }
  
  void _handleSubmit() {
    if (!_formKey.currentState!.validate()) return;
    
    // Submit data
    final data = {
      'name': _nameController.text.trim(),
    };
    
    // Call repository/provider
  }
  
  @override
  Widget build(BuildContext context) {
    return Form(
      key: _formKey,
      child: Column(
        children: [
          TextFormField(
            controller: _nameController,
            decoration: InputDecoration(labelText: 'Name'),
            validator: (value) {
              if (value == null || value.trim().isEmpty) {
                return 'Name is required';
              }
              return null;
            },
          ),
          ElevatedButton(
            onPressed: _handleSubmit,
            child: Text('Submit'),
          ),
        ],
      ),
    );
  }
}
```

---

### 5. Image Upload Pattern

```dart
import 'package:image_picker/image_picker.dart';
import 'dart:io';

class MyFormView extends ConsumerStatefulWidget {
  const MyFormView({super.key});
  
  @override
  ConsumerState<MyFormView> createState() => _MyFormViewState();
}

class _MyFormViewState extends ConsumerState<MyFormView> {
  File? _selectedImage;
  final _picker = ImagePicker();
  
  Future<void> _pickImage() async {
    final pickedFile = await _picker.pickImage(
      source: ImageSource.gallery,
      maxWidth: 1920,
      maxHeight: 1080,
      imageQuality: 85,
    );
    
    if (pickedFile != null) {
      setState(() {
        _selectedImage = File(pickedFile.path);
      });
    }
  }
  
  Future<void> _uploadImage() async {
    if (_selectedImage == null) return;
    
    final uploadRepo = ref.read(uploadRepositoryProvider);
    final imageUrl = await uploadRepo.uploadImage(_selectedImage!);
    
    // Use imageUrl in your data
  }
  
  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        if (_selectedImage != null)
          Image.file(_selectedImage!, height: 200),
        ElevatedButton(
          onPressed: _pickImage,
          child: Text('Pick Image'),
        ),
      ],
    );
  }
}
```

---

### 6. Error Handling Pattern

```dart
// In Repository
Future<MyModel> getData() async {
  try {
    final response = await _client.get('/endpoint');
    if (response.statusCode == 200) {
      return MyModel.fromJson(response.data['data']);
    }
    throw Exception('Failed to load data');
  } on DioException catch (e) {
    final data = e.response?.data;
    if (data is Map && data['error'] != null) {
      throw Exception(data['error']['message'] ?? 'Unknown error');
    }
    throw Exception(e.message ?? 'Network error');
  } catch (e) {
    throw Exception('Unexpected error: $e');
  }
}

// In View
dataAsync.when(
  data: (data) => _buildContent(data),
  loading: () => const Center(child: CircularProgressIndicator()),
  error: (error, stackTrace) => Center(
    child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(Icons.error_outline, size: 48, color: Colors.red),
        SizedBox(height: 16),
        Text('$error', textAlign: TextAlign.center),
        SizedBox(height: 16),
        ElevatedButton(
          onPressed: () => ref.invalidate(myProvider),
          child: Text('Retry'),
        ),
      ],
    ),
  ),
)
```

---

### 7. Navigation Pattern

```dart
// Push to new screen
Navigator.of(context).push(
  MaterialPageRoute(builder: (_) => MyDetailView(id: item.id)),
);

// Push and wait for result
final result = await Navigator.of(context).push(
  MaterialPageRoute(builder: (_) => MyFormView()),
);
if (result == true) {
  // Refresh data
  ref.invalidate(myProvider);
}

// Pop with result
Navigator.of(context).pop(true);

// Replace current screen
Navigator.of(context).pushReplacement(
  MaterialPageRoute(builder: (_) => MainLayout()),
);
```

---

### 8. Bottom Sheet Pattern

```dart
void _showBottomSheet(BuildContext context) {
  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (_) => DraggableScrollableSheet(
      initialChildSize: 0.6,
      maxChildSize: 0.9,
      minChildSize: 0.3,
      builder: (ctx, scrollCtrl) => Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(
            top: Radius.circular(Responsive.r(20)),
          ),
        ),
        child: ListView(
          controller: scrollCtrl,
          padding: Responsive.all(16),
          children: [
            // Drag handle
            Center(
              child: Container(
                width: Responsive.w(40),
                height: Responsive.h(4),
                margin: Responsive.only(bottom: 16),
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            // Content
            Text('Bottom Sheet Content'),
          ],
        ),
      ),
    ),
  );
}
```

---

### 9. Pull-to-Refresh Pattern

```dart
RefreshIndicator(
  onRefresh: () async {
    ref.invalidate(myProvider);
    // Wait for the provider to reload
    await ref.read(myProvider.future);
  },
  color: Color(0xFFF7C873), // Golden accent
  child: ListView(...),
)
```

---

### 10. Loading State Pattern

```dart
// Shimmer loading for lists
import 'package:shimmer/shimmer.dart';

Widget _buildLoadingState() {
  return ListView.builder(
    itemCount: 5,
    itemBuilder: (context, index) {
      return Shimmer.fromColors(
        baseColor: Colors.grey[300]!,
        highlightColor: Colors.grey[100]!,
        child: Container(
          margin: Responsive.all(8),
          height: Responsive.h(80),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(Responsive.r(12)),
          ),
        ),
      );
    },
  );
}
```

---

## 🔐 Authentication Helpers

### Check if User is Authenticated
```dart
final user = ref.watch(authUserProvider);
if (user == null) {
  // Not authenticated
}
```

### Check User Role
```dart
final canManage = ref.watch(canManageProvider);
if (canManage) {
  // Show admin features
}

final isAdmin = user?.isAdmin ?? false;
if (isAdmin) {
  // Show super admin features
}
```

### Logout
```dart
await ref.read(authProvider.notifier).logout();
Navigator.of(context).pushReplacement(
  MaterialPageRoute(builder: (_) => LoginView()),
);
```

---

## 🎯 Common Widgets

### Custom Card
```dart
Container(
  padding: Responsive.all(16),
  decoration: BoxDecoration(
    color: Colors.white,
    borderRadius: BorderRadius.circular(Responsive.r(12)),
    boxShadow: [
      BoxShadow(
        color: Colors.black.withValues(alpha: 0.05),
        blurRadius: 8,
        offset: Offset(0, 2),
      ),
    ],
  ),
  child: Column(
    children: [
      // Card content
    ],
  ),
)
```

### Status Badge
```dart
Container(
  padding: Responsive.symmetric(horizontal: 8, vertical: 4),
  decoration: BoxDecoration(
    color: statusColor.withValues(alpha: 0.12),
    borderRadius: BorderRadius.circular(Responsive.r(6)),
  ),
  child: Text(
    statusText,
    style: TextStyle(
      fontSize: Responsive.sp(10),
      fontWeight: FontWeight.bold,
      color: statusColor,
    ),
  ),
)
```

### Avatar Circle
```dart
Container(
  width: Responsive.w(40),
  height: Responsive.w(40),
  decoration: BoxDecoration(
    color: Color(0xFF434343).withValues(alpha: 0.1),
    shape: BoxShape.circle,
  ),
  child: Center(
    child: Text(
      name[0].toUpperCase(),
      style: TextStyle(
        fontSize: Responsive.sp(16),
        fontWeight: FontWeight.bold,
        color: Color(0xFF434343),
      ),
    ),
  ),
)
```

### Floating Action Button
```dart
FloatingActionButton.extended(
  heroTag: 'unique_tag',
  onPressed: () {
    // Action
  },
  backgroundColor: Color(0xFFF7C873), // Golden
  foregroundColor: Color(0xFF434343), // Charcoal
  icon: Icon(Icons.add_rounded, size: Responsive.icon(24)),
  label: Text(
    'New Item',
    style: TextStyle(
      fontSize: Responsive.sp(14),
      fontWeight: FontWeight.bold,
    ),
  ),
  elevation: 3,
)
```

---

## 🐛 Debugging Tips

### Print API Responses
```dart
// In repository
print('Response: ${response.data}');
```

### Check Provider State
```dart
// In view
print('State: ${ref.read(myProvider)}');
```

### Riverpod DevTools
```dart
// Add to main.dart
runApp(
  ProviderScope(
    observers: [MyObserver()],
    child: MyApp(),
  ),
);

class MyObserver extends ProviderObserver {
  @override
  void didUpdateProvider(
    ProviderBase provider,
    Object? previousValue,
    Object? newValue,
    ProviderContainer container,
  ) {
    print('Provider: ${provider.name ?? provider.runtimeType}');
    print('New value: $newValue');
  }
}
```

---

## 📝 Code Style Guidelines

### Naming Conventions
```dart
// Classes: PascalCase
class MyClass {}

// Variables/Functions: camelCase
final myVariable = '';
void myFunction() {}

// Constants: camelCase with underscore prefix for private
static const _primary = Color(0xFF434343);

// Files: snake_case
my_file.dart
```

### Import Order
```dart
// 1. Dart imports
import 'dart:io';

// 2. Flutter imports
import 'package:flutter/material.dart';

// 3. Package imports
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';

// 4. Relative imports
import '../../../core/api_client.dart';
import '../models/my_model.dart';
```

### Widget Organization
```dart
class MyView extends ConsumerWidget {
  const MyView({super.key});
  
  // 1. Constants
  static const _primary = Color(0xFF434343);
  
  // 2. Build method
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    Responsive.init(context);
    // ...
  }
  
  // 3. Helper methods (private)
  Widget _buildHeader() {
    // ...
  }
  
  Widget _buildContent() {
    // ...
  }
}
```

---

## 🚨 Common Pitfalls

### ❌ DON'T: Hardcode sizes
```dart
// BAD
Container(width: 100, height: 50)
Text('Hello', style: TextStyle(fontSize: 14))
```

### ✅ DO: Use Responsive
```dart
// GOOD
Container(width: Responsive.w(100), height: Responsive.h(50))
Text('Hello', style: TextStyle(fontSize: Responsive.sp(14)))
```

---

### ❌ DON'T: Call API directly in widgets
```dart
// BAD
class MyView extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final response = await Dio().get('/api/data'); // ❌
  }
}
```

### ✅ DO: Use Repository + Provider
```dart
// GOOD
class MyView extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dataAsync = ref.watch(myProvider);
    return dataAsync.when(...);
  }
}
```

---

### ❌ DON'T: Forget to dispose controllers
```dart
// BAD
class MyView extends StatefulWidget {
  final _controller = TextEditingController();
  // No dispose() ❌
}
```

### ✅ DO: Always dispose
```dart
// GOOD
class MyView extends StatefulWidget {
  final _controller = TextEditingController();
  
  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }
}
```

---

### ❌ DON'T: Forget Responsive.init()
```dart
// BAD
@override
Widget build(BuildContext context) {
  return Container(width: Responsive.w(100)); // ❌ May crash
}
```

### ✅ DO: Call init() first
```dart
// GOOD
@override
Widget build(BuildContext context) {
  Responsive.init(context);
  return Container(width: Responsive.w(100));
}
```

---

## 📚 Useful Commands

```bash
# Run app
flutter run

# Run on specific device
flutter run -d <device_id>

# Build APK
flutter build apk --release

# Build iOS
flutter build ios --release

# Analyze code
flutter analyze

# Format code
dart format lib/

# Clean build
flutter clean && flutter pub get

# Generate code (Riverpod)
dart run build_runner build --delete-conflicting-outputs

# Watch for changes (Riverpod)
dart run build_runner watch --delete-conflicting-outputs
```

---

## 🔗 Useful Links

- **Flutter Docs:** https://docs.flutter.dev
- **Riverpod Docs:** https://riverpod.dev
- **Dio Docs:** https://pub.dev/packages/dio
- **Material Design:** https://m3.material.io
- **Project README:** `apps/mobile/README.md`
- **Architecture Rules:** `apps/mobile/AGENTS.md`
- **Implementation Plan:** `apps/mobile/IMPLEMENTATION_PLAN.md`

---

**Happy Coding! 🚀**
