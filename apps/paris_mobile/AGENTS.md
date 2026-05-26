# Paris Mobile - Direct Supabase Implementation Rules

This document outlines the strict, non-negotiable rules for developing the Paris Mobile Flutter application with **direct Supabase connection** (NOT using Next.js API).

---

## 1. 🏗️ Architecture: Feature-First (Screaming Architecture)

Do NOT organize folders by type (e.g., all models together, all views together).
The app MUST follow a **Feature-First Architecture** grouped by domain.

```text
lib/
 ├── core/                 # Shared resources (theme, constants, supabase client, routing)
 ├── exceptions/           # Global custom exception classes
 ├── utils/                # Helper functions (date formatters, validators)
 └── features/             # Business domains
      ├── auth/            # Authentication feature
      │    ├── models/      # Data models (matching Supabase tables)
      │    ├── repositories/ # Supabase direct queries
      │    ├── providers/  # Riverpod state controllers
      │    └── views/      # Flutter UI screens
      ├── categories/
      ├── products/
      ├── orders/
      └── customers/
```

---

## 2. 🗄️ Database Access: Direct Supabase (CRITICAL)

**CRITICAL RULE**: This app connects **DIRECTLY** to Supabase. Do NOT use Next.js API.

- **Rule**: Use `supabase_flutter` package for all database operations
- **Rule**: All queries go through `supabaseClient.database.from(tableName)`
- **Rule**: Use `supabaseClient.auth` for authentication
- **Rule**: Use `supabaseClient.storage` for file uploads
- **Rule**: Respect Row Level Security (RLS) policies defined in Supabase
- **Rule**: Use the anon key for client-side operations (subject to RLS)
- **Rule**: NEVER use service role key in the Flutter app (security risk)

### Supabase Query Pattern

```dart
// Read
final response = await supabaseClient.database
  .from('categories')
  .select()
  .order('sort_order');

// Create
final response = await supabaseClient.database
  .from('categories')
  .insert({
    'name': 'Earrings',
    'slug': 'earrings',
    'is_active': true,
  })
  .select()
  .single();

// Update
final response = await supabaseClient.database
  .from('categories')
  .update({ 'name': 'Updated Name' })
  .eq('id', categoryId)
  .select()
  .single();

// Delete
await supabaseClient.database
  .from('categories')
  .delete()
  .eq('id', categoryId);
```

---

## 3. 🧠 State Management: Riverpod

- **Rule**: Use `flutter_riverpod` with code generation for ALL state management
- **Rule**: Do NOT use `setState` for business logic or network states
- **Rule**: Use `AsyncValue` (data, loading, error) to handle all asynchronous operations
- **Rule**: Use `AsyncNotifier` for complex state with mutations

### Provider Pattern

```dart
// Repository provider
final categoryRepositoryProvider = Provider<CategoryRepository>((ref) {
  return CategoryRepository();
});

// Data provider
final categoriesProvider = FutureProvider<List<Category>>((ref) async {
  final repo = ref.read(categoryRepositoryProvider);
  return repo.getCategories();
});

// AsyncNotifier for mutations
class CategoryNotifier extends AsyncNotifier<List<Category>> {
  @override
  Future<List<Category>> build() async {
    final repo = ref.read(categoryRepositoryProvider);
    return repo.getCategories();
  }

  Future<void> addCategory(CreateCategoryDTO data) async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      final repo = ref.read(categoryRepositoryProvider);
      await repo.createCategory(data);
      return repo.getCategories();
    });
  }
}

final categoryProvider = AsyncNotifierProvider<CategoryNotifier, List<Category>>(
  CategoryNotifier.new,
);
```

---

## 4. 💾 Offline-First Storage & Caching: Isar

- **Rule**: Use **Isar Database** for all complex offline caching (Products, Categories, Orders)
- **Rule**: The app MUST be offline-first - read from Isar instantly, sync with Supabase in background
- **Rule**: Use `shared_preferences` ONLY for simple key-value pairs (e.g., `isDarkMode`)
- **Rule**: Use `flutter_secure_storage` for sensitive data (e.g., auth tokens if needed)

### Isar Pattern

```dart
@collection
class Category {
  Id id = Isar.autoIncrement;
  
  late String supabaseId; // Store Supabase UUID separately
  late String name;
  late String slug;
  late bool isActive;
  
  @Index()
  late String parentId;
}
```

---

## 5. 🚨 Error Handling: Functional & Global

- **Rule**: Never leak raw Supabase exceptions to the UI layer
- **Rule**: The repository layer MUST catch Supabase errors and translate them to custom `AppException`
- **Rule**: The providers layer wraps data in `AsyncValue`
- **Rule**: The views layer handles `AsyncValue.error` with user-friendly error UI

### Exception Pattern

```dart
class AppException implements Exception {
  final String message;
  final String? code;
  
  AppException(this.message, {this.code});
}

class SupabaseException extends AppException {
  SupabaseException(String message, {String? code}) 
      : super(message, code: code ?? 'SUPABASE_ERROR');
}

class ValidationException extends AppException {
  ValidationException(String message) 
      : super(message, code: 'VALIDATION_ERROR');
}

// In repository
try {
  final response = await supabaseClient.database.from('categories').select();
  if (response.error != null) {
    throw SupabaseException(response.error!.message);
  }
  return response.data;
} catch (e) {
  throw AppException('Failed to load categories');
}
```

---

## 6. 🛡️ UI & Business Logic Separation

- **Rule**: A `Widget` (View) should ONLY contain layout code and styling
- **Rule**: A `Widget` MUST NOT contain Supabase queries, data parsing, or complex business logic
- **Rule**: All data operations MUST go through providers

### View Pattern

```dart
class CategoriesView extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final categoriesAsync = ref.watch(categoryProvider);

    return Scaffold(
      body: categoriesAsync.when(
        data: (categories) => ListView.builder(...),
        loading: () => CircularProgressIndicator(),
        error: (error, stack) => ErrorWidget(error: error),
      ),
    );
  }
}
```

---

## 7. 🔐 Authentication: Supabase Auth

- **Rule**: Use `supabase_flutter` built-in auth methods
- **Rule**: Support email/password, phone OTP, and social auth as needed
- **Rule**: Store session in Supabase's internal storage (handled by package)
- **Rule**: Listen to auth state changes using `supabaseClient.auth.onAuthStateChange`

### Auth Pattern

```dart
// Login
final response = await supabaseClient.auth.signInWithPassword(
  email: email,
  password: password,
);

// Logout
await supabaseClient.auth.signOut();

// Listen to auth state
supabaseClient.auth.onAuthStateChange.listen((data) {
  final session = data.session;
  // Update auth state provider
});
```

---

## 8. 📁 File Upload: Supabase Storage

- **Rule**: Use `supabaseClient.storage` for all file uploads
- **Rule**: Use `image_picker` to select images from device
- **Rule**: Upload to appropriate bucket (product-images, category-images)
- **Rule**: Store the public URL in the database record

### Upload Pattern

```dart
final file = await ImagePicker().pickImage(source: ImageSource.gallery);
final fileBytes = await File(file!.path).readAsBytes();
final fileName = '${DateTime.now().millisecondsSinceEpoch}_${file.name}';

await supabaseClient.storage
  .from('product-images')
  .uploadBinary(fileName, fileBytes);

final publicUrl = supabaseClient.storage
  .from('product-images')
  .getPublicUrl(fileName);
```

---

## 9. 🔗 Real-time Updates: Supabase Realtime

- **Rule**: Use Supabase Realtime for live updates (orders, inventory)
- **Rule**: Subscribe to table changes using `.on().subscribe()`
- **Rule**: Unsubscribe when widget is disposed

### Realtime Pattern

```dart
final subscription = supabaseClient.database
  .from('orders')
  .on(PostgresChangesEventType.all, '*')
  .subscribe();

// In dispose
subscription.unsubscribe();
```

---

## 10. 📝 Model Definitions

- **Rule**: Models MUST match Supabase table structure exactly
- **Rule**: Use snake_case for field names in JSON (matching Supabase)
- **Rule**: Use camelCase for Dart properties
- **Rule**: Include `fromJson` and `toJson` methods
- **Rule**: Include audit fields if table has them (created_at, updated_at, etc.)

### Model Pattern

```dart
class Category {
  final String id;
  final String name;
  final String slug;
  final String? description;
  final String? imageUrl;
  final String? parentId;
  final int sortOrder;
  final bool isActive;
  final String createdAt;
  final String? updatedAt;

  Category({
    required this.id,
    required this.name,
    required this.slug,
    this.description,
    this.imageUrl,
    this.parentId,
    this.sortOrder = 0,
    this.isActive = true,
    required this.createdAt,
    this.updatedAt,
  });

  factory Category.fromJson(Map<String, dynamic> json) {
    return Category(
      id: json['id'] as String,
      name: json['name'] as String,
      slug: json['slug'] as String,
      description: json['description'] as String?,
      imageUrl: json['image_url'] as String?,
      parentId: json['parent_id'] as String?,
      sortOrder: json['sort_order'] ?? 0,
      isActive: json['is_active'] ?? true,
      createdAt: json['created_at'] as String,
      updatedAt: json['updated_at'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'slug': slug,
      'description': description,
      'image_url': imageUrl,
      'parent_id': parentId,
      'sort_order': sortOrder,
      'is_active': isActive,
      'created_at': createdAt,
      'updated_at': updatedAt,
    };
  }
}
```

---

## 11. 🎯 Repository Pattern

- **Rule**: Repository layer encapsulates ALL Supabase queries
- **Rule**: Repository methods return typed data or throw `AppException`
- **Rule**: No business logic in repository - just data access
- **Rule**: Use proper error handling and translate Supabase errors

### Repository Pattern

```dart
class CategoryRepository {
  final PostgrestClient _db = supabaseClient.database;

  Future<List<Category>> getCategories() async {
    try {
      final response = await _db
        .from('categories')
        .select()
        .order('sort_order', ascending: true);

      if (response.error != null) {
        throw SupabaseException(response.error!.message);
      }

      return (response.data as List)
        .map((json) => Category.fromJson(json))
        .toList();
    } catch (e) {
      throw AppException('Failed to load categories');
    }
  }

  Future<Category> getCategoryById(String id) async {
    try {
      final response = await _db
        .from('categories')
        .select()
        .eq('id', id)
        .single();

      if (response.error != null) {
        throw SupabaseException(response.error!.message);
      }

      return Category.fromJson(response.data);
    } catch (e) {
      throw AppException('Failed to load category');
    }
  }

  Future<Category> createCategory(CreateCategoryDTO data) async {
    try {
      final response = await _db
        .from('categories')
        .insert(data.toJson())
        .select()
        .single();

      if (response.error != null) {
        throw SupabaseException(response.error!.message);
      }

      return Category.fromJson(response.data);
    } catch (e) {
      throw AppException('Failed to create category');
    }
  }
}
```

---

## 12. 🔒 Security Best Practices

- **Rule**: ALWAYS use the anon key (never service role key)
- **Rule**: Rely on Supabase RLS policies for data access control
- **Rule**: Never trust client-side data - validate on server (RLS)
- **Rule**: Use `flutter_secure_storage` for any sensitive local data
- **Rule**: Implement proper session management with Supabase Auth

---

## 13. 🧪 Testing

- **Rule**: Write unit tests for repositories (mock Supabase client)
- **Rule**: Write widget tests for views
- **Rule**: Use integration tests for critical user flows

---

> **Agent Instruction**: Before writing or modifying any Flutter code, you MUST review these rules to ensure the proposed solution strictly adheres to this architecture.
