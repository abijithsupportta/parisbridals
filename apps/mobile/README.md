# Paris Bridals Mobile App

This directory contains the Flutter mobile application for **Paris Bridals**, acting as the mobile version of the admin dashboard.

## Overview
The mobile app mirrors the functionality of the web admin portal, allowing store managers, administrators, and staff to manage products, categories, stores, branches, customers, and orders right from their mobile devices. 

It consumes the identical Next.js API (`https://parisbridals-admin.vercel.app/api`) built for the web admin portal, meaning business logic is centralized and synchronized in real-time.

---

## Users & Roles
The app is primarily for internal staff and management:
1. **Super Admin**: Has access to all stores, settings, branches, and staff management.
2. **Store Manager / Branch Manager**: Can manage inventory, orders, and customers for their assigned store/branch.
3. **Staff / Agent**: Primarily accesses order fulfillment, viewing available products, and assisting customers.

*(Note: Fine-grained Role-Based Access Control (RBAC) is enforced at the API level.)*

---

## Architecture & Technology Stack

The app uses a **Feature-First Architecture**. Instead of grouping by technical type (e.g., all models in one folder, all views in another), files are grouped by the feature they belong to (e.g., `features/products/`).

### Core Technologies
*   **Framework**: Flutter (Dart)
*   **State Management**: Riverpod (`flutter_riverpod`, `riverpod_annotation`)
*   **Networking / HTTP**: Dio (`dio`)
*   **Environment Config**: `flutter_dotenv` (loading `.env` files)
*   **Local Storage**: `flutter_secure_storage` (for auth tokens), Isar (for offline caching if implemented)

---

## Directory Structure

```text
lib/
├── core/                       # Shared code applicable across all features
│   ├── api_client.dart         # Singleton Dio client with base URL & interceptors
│   ├── main_layout.dart        # Scaffold containing the Drawer and main body switching
│   └── theme.dart              # Global UI theme (Black & White aesthetic)
├── exceptions/                 # Custom Exception classes
├── features/                   # Feature modules
│   ├── auth/                   # Authentication feature (Login, Tokens, etc.)
│   ├── products/               # Products Management
│   │   ├── models/             # Data models (e.g., product.dart)
│   │   ├── providers/          # Riverpod providers for state/fetching
│   │   └── views/              # UI screens (e.g., products_view.dart)
│   └── ...                     # Future modules (orders, categories, etc.)
├── utils/                      # Helper utilities (formatting, validators)
└── main.dart                   # Application entry point
```

---

## Detailed Data Flow (A to Z)

Here is a step-by-step example of how data flows in the application when navigating to the **Products** screen:

1. **App Initialization**:
   - `main.dart` is executed.
   - `WidgetsFlutterBinding.ensureInitialized()` is called.
   - Environment variables are loaded using `dotenv.load()`.
   - The app is wrapped in `ProviderScope` to enable Riverpod state management.

2. **UI Navigation**:
   - The user opens the **Drawer** in `MainLayout` and taps on **Products**.
   - `_selectedIndex` state updates, and `MainLayout` renders `ProductsView`.

3. **State Observation (View Level)**:
   - `ProductsView` is a `ConsumerWidget`. In its `build` method, it calls `ref.watch(productsProvider)`.

4. **Data Fetching (Provider Level)**:
   - `productsProvider` (in `product_provider.dart`) is a `FutureProvider`. 
   - Since it's being watched for the first time, it executes its asynchronous function.
   - It calls `apiClient.get('/products')`.

5. **Networking (Core Level)**:
   - The singleton `ApiClient` receives the request.
   - Dio appends the `baseUrl` (`https://parisbridals-admin.vercel.app/api`) and applies any interceptors (e.g., adding Authorization tokens).
   - The HTTP GET request goes to the Next.js API.

6. **Data Parsing**:
   - The API returns JSON data.
   - `productsProvider` verifies `response.statusCode == 200` and extracts `data['data']['products']`.
   - It maps the raw JSON maps into strongly-typed `Product` objects using `Product.fromJson(json)`.

7. **UI Update**:
   - `productsProvider` yields an `AsyncValue`.
   - While fetching, `ProductsView` renders the `loading:` state (a `CircularProgressIndicator`).
   - If an error occurs, it renders the `error:` state with a retry button.
   - On success, it renders the `data:` state, building a `ListView` of product cards using the loaded `List<Product>`.

---

## Design System

The app follows a premium **Black & White** aesthetic, stripping away default material colors (like purple/violet).
*   **Primary Color**: Black
*   **Scaffold Background**: White
*   **Cards/Containers**: White with subtle grey borders (`#E0E0E0`) or light grey backgrounds (`#F9F9F9`).
*   **Typography**: Clean, sans-serif fonts using standard Material 3, optimized for readability.

All theme configurations are strictly controlled in `lib/core/theme.dart`.

---

## Next Steps / Roadmap
*   Implement Authentication flow (Login screen & token persistence).
*   Build out specific Create/Edit Product forms in `features/products/views/product_detail_view.dart`.
*   Expand other feature directories (Orders, Categories, Customers).
