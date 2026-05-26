# Paris Bridals Mobile - Architecture Diagram

## 🏗️ System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         PARIS BRIDALS MOBILE APP                         │
│                         (Flutter + Riverpod)                             │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTPS
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         NEXT.JS BACKEND API                              │
│                  (https://admin.parisbridals.com/api)                    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ▼                               ▼
        ┌───────────────────────┐       ┌───────────────────────┐
        │   SUPABASE POSTGRES   │       │   CLOUDFLARE R2       │
        │   (Database)          │       │   (Image Storage)     │
        └───────────────────────┘       └───────────────────────┘
```

---

## 📱 Mobile App Layer Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              PRESENTATION LAYER                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                         UI VIEWS (Widgets)                       │   │
│  │  • LoginView          • DashboardView      • ProductsView       │   │
│  │  • OrdersView         • CustomersView      • CalendarView       │   │
│  │  • CategoriesView     • BranchesView                            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                     │
│                                    │ ref.watch / ref.read                │
│                                    ▼                                     │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    STATE MANAGEMENT (Riverpod)                   │   │
│  │  • AsyncNotifier (Products, Orders, Customers)                   │   │
│  │  • Notifier (Calendar Nav, Filters)                              │   │
│  │  • FutureProvider (Dashboard Metrics)                            │   │
│  │  • Provider (Repositories, Services)                             │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ calls
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                              BUSINESS LOGIC LAYER                        │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                         REPOSITORIES                             │   │
│  │  • ProductRepository      • OrderRepository                      │   │
│  │  • CustomerRepository     • CategoryRepository                   │   │
│  │  • BranchRepository       • CalendarRepository                   │   │
│  │  • UploadRepository       • DashboardRepository                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                     │
│                                    │ uses                                │
│                                    ▼                                     │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                         API CLIENT (Dio)                         │   │
│  │  • Base URL Configuration                                        │   │
│  │  • Auth Token Injection (Interceptor)                            │   │
│  │  • Auto Token Refresh (401 Handler)                              │   │
│  │  • Error Handling & Transformation                               │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTP Requests
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                              DATA LAYER                                  │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                         SECURE STORAGE                           │   │
│  │  • auth_token (Access Token)                                     │   │
│  │  • refresh_token (Refresh Token)                                 │   │
│  │  • auth_user (User Profile JSON)                                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                         DATA MODELS                              │   │
│  │  • Product, ProductImage, BranchInventory                        │   │
│  │  • Order, OrderItem, Payment                                     │   │
│  │  • Customer, Category, Branch                                    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow Diagram

### Example: Loading Products List

```
┌──────────────┐
│  User Opens  │
│ Products Tab │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ ProductsView                                                  │
│ • Calls: ref.watch(productsProvider)                          │
└──────┬───────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ ProductsNotifier (AsyncNotifier)                              │
│ • State: AsyncValue<PaginatedProducts>                        │
│ • build() → calls ProductRepository.getProducts()             │
└──────┬───────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ ProductRepository                                             │
│ • getProducts(page, limit, search, branchId)                  │
│ • Uses: apiClient (Dio)                                       │
└──────┬───────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ ApiClient (Dio)                                               │
│ • Interceptor: Injects auth token from FlutterSecureStorage  │
│ • Sends: GET /products?page=1&limit=20                        │
└──────┬───────────────────────────────────────────────────────┘
       │
       │ HTTPS
       ▼
┌──────────────────────────────────────────────────────────────┐
│ Next.js API                                                   │
│ • Route: /api/products                                        │
│ • Returns: { success: true, data: { products: [...] } }      │
└──────┬───────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ ProductRepository                                             │
│ • Parses JSON → List<Product>                                 │
│ • Returns: PaginatedProducts                                  │
└──────┬───────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ ProductsNotifier                                              │
│ • Updates state: AsyncValue.data(products)                    │
└──────┬───────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ ProductsView                                                  │
│ • Rebuilds with new data                                      │
│ • Displays: ListView of products                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 🔐 Authentication Flow

```
┌──────────────┐
│ User Enters  │
│ Credentials  │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ LoginView                                                     │
│ • Calls: ref.read(authProvider.notifier).login(email, pass)  │
└──────┬───────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ AuthProvider (AsyncNotifier)                                  │
│ • Calls: AuthService.login()                                  │
└──────┬───────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ AuthService                                                   │
│ • POST /auth/login { email, password }                        │
└──────┬───────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ Next.js API                                                   │
│ • Validates credentials                                       │
│ • Returns: { access_token, refresh_token, user }             │
└──────┬───────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ AuthService                                                   │
│ • Stores tokens in FlutterSecureStorage                       │
│ • Stores user profile                                         │
└──────┬───────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ AuthProvider                                                  │
│ • Updates state: AsyncValue.data(user)                        │
└──────┬───────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ LoginView                                                     │
│ • Navigates to: MainLayout (Dashboard)                        │
└──────────────────────────────────────────────────────────────┘
```

### Token Refresh Flow (on 401 Error)

```
┌──────────────┐
│ API Request  │
│ Returns 401  │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ ApiClient Interceptor (onError)                               │
│ • Detects: response.statusCode == 401                         │
│ • Calls: _tryRefreshToken()                                   │
└──────┬───────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ _tryRefreshToken()                                            │
│ • Reads refresh_token from FlutterSecureStorage              │
│ • POST /auth/refresh { refresh_token }                        │
└──────┬───────────────────────────────────────────────────────┘
       │
       ├─── Success ───┐
       │               │
       │               ▼
       │     ┌──────────────────────────────────────────────────┐
       │     │ • Stores new access_token & refresh_token        │
       │     │ • Retries original request with new token        │
       │     │ • Returns response to caller                     │
       │     └──────────────────────────────────────────────────┘
       │
       └─── Failure ───┐
                       │
                       ▼
             ┌──────────────────────────────────────────────────┐
             │ • Clears all tokens from storage                 │
             │ • User redirected to LoginView                   │
             └──────────────────────────────────────────────────┘
```

---

## 🎨 UI Component Hierarchy

```
MaterialApp
└── SplashView (Initial)
    └── (Auto-login check)
        ├── LoginView (if not authenticated)
        └── MainLayout (if authenticated)
            ├── AppBar
            │   ├── Logo (SVG)
            │   ├── Title
            │   ├── Branch Switcher (Dropdown)
            │   └── Notifications Icon
            ├── Drawer (Sidebar)
            │   ├── Header (Logo + User Info)
            │   ├── Navigation Items
            │   │   ├── Dashboard
            │   │   ├── Orders
            │   │   ├── Calendar
            │   │   ├── Products
            │   │   ├── Categories
            │   │   ├── Customers
            │   │   └── Branches
            │   └── Logout Button
            ├── Body (Selected View)
            │   ├── DashboardView
            │   ├── OrdersView
            │   ├── CalendarView
            │   ├── ProductsView
            │   ├── CategoriesView
            │   ├── CustomersView
            │   └── BranchesView
            └── BottomNavigationBar
                ├── Dashboard
                ├── Orders
                ├── Calendar
                └── Products
```

---

## 📦 Feature Module Structure

### Example: Products Feature

```
features/products/
├── models/
│   └── product.dart
│       ├── Product (main entity)
│       ├── ProductImage (nested)
│       ├── BranchInventory (nested)
│       └── ProductVariant (nested)
│
├── repositories/
│   └── product_repository.dart
│       ├── getProducts(page, limit, search, branchId)
│       ├── getProductById(id)
│       ├── createProduct(data)
│       ├── updateProduct(id, data)
│       ├── deleteProduct(id)
│       └── uploadProductImages(files)
│
├── providers/
│   └── product_provider.dart
│       ├── productRepositoryProvider (Provider)
│       ├── productsProvider (AsyncNotifier)
│       │   ├── build() → fetch initial data
│       │   ├── search(query)
│       │   ├── filterByBranch(branchId)
│       │   └── loadMore() → pagination
│       └── productStatusFilterProvider (Notifier)
│
└── views/
    ├── products_view.dart
    │   ├── Search bar
    │   ├── Filter chips
    │   ├── Product list (infinite scroll)
    │   └── FAB (New Product)
    │
    ├── product_detail_view.dart
    │   ├── Image carousel
    │   ├── Product info
    │   ├── Branch inventory
    │   └── Edit/Delete buttons
    │
    └── product_form_view.dart
        ├── Basic info fields
        ├── Category cascading dropdowns
        ├── Image picker
        ├── Branch inventory inputs
        └── Save button
```

---

## 🔄 State Management Patterns

### 1. AsyncNotifier Pattern (for paginated lists)

```
┌─────────────────────────────────────────────────────────────┐
│ ProductsNotifier extends AsyncNotifier<PaginatedProducts>   │
├─────────────────────────────────────────────────────────────┤
│ State: AsyncValue<PaginatedProducts>                        │
│   • AsyncLoading() → Show loading spinner                   │
│   • AsyncData(products) → Show list                         │
│   • AsyncError(error) → Show error message                  │
├─────────────────────────────────────────────────────────────┤
│ Methods:                                                     │
│   • build() → Initial fetch                                 │
│   • search(query) → Filter by search term                   │
│   • filterByBranch(id) → Filter by branch                   │
│   • loadMore() → Append next page                           │
│   • refresh() → Reload from page 1                          │
└─────────────────────────────────────────────────────────────┘
```

### 2. Notifier Pattern (for simple state)

```
┌─────────────────────────────────────────────────────────────┐
│ CalendarNavNotifier extends Notifier<CalendarNavState>      │
├─────────────────────────────────────────────────────────────┤
│ State: CalendarNavState { currentMonth, monthLabel }        │
├─────────────────────────────────────────────────────────────┤
│ Methods:                                                     │
│   • build() → Initialize with current month                 │
│   • goToPrevMonth() → Navigate to previous month            │
│   • goToNextMonth() → Navigate to next month                │
│   • goToToday() → Reset to current month                    │
└─────────────────────────────────────────────────────────────┘
```

### 3. FutureProvider Pattern (for one-time fetch)

```
┌─────────────────────────────────────────────────────────────┐
│ dashboardMetricsProvider = FutureProvider<DashboardMetrics> │
├─────────────────────────────────────────────────────────────┤
│ • Fetches data once on mount                                │
│ • Auto-caches result                                        │
│ • Invalidate with: ref.invalidate(dashboardMetricsProvider) │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Navigation Flow

```
SplashView
    │
    ├─── Not Authenticated ───► LoginView
    │                               │
    │                               │ (Login Success)
    │                               ▼
    └─── Authenticated ──────────► MainLayout
                                      │
                                      ├─► DashboardView
                                      │       │
                                      │       └─► CreateOrderView
                                      │               ├─► Step 1: Customer
                                      │               ├─► Step 2: Products
                                      │               ├─► Step 3: Rental Period
                                      │               └─► Step 4: Payment
                                      │
                                      ├─► OrdersView
                                      │       │
                                      │       └─► OrderDetailView
                                      │               ├─► Payment Modal
                                      │               └─► Return Processing
                                      │
                                      ├─► CalendarView
                                      │       │
                                      │       └─► Day Detail Bottom Sheet
                                      │
                                      ├─► ProductsView
                                      │       │
                                      │       ├─► ProductDetailView
                                      │       └─► ProductFormView (Create/Edit)
                                      │
                                      ├─► CategoriesView
                                      │       │
                                      │       ├─► CategoryDetailView
                                      │       └─► CategoryFormView (Create/Edit)
                                      │
                                      ├─► CustomersView
                                      │       │
                                      │       ├─► CustomerDetailView
                                      │       └─► CustomerFormView (Create/Edit)
                                      │
                                      └─► BranchesView
                                              │
                                              ├─► BranchDetailView
                                              └─► BranchFormView (Create/Edit)
```

---

## 🔧 Core Utilities

### Responsive Utility

```
┌─────────────────────────────────────────────────────────────┐
│ Responsive (Singleton)                                       │
├─────────────────────────────────────────────────────────────┤
│ Base Design: 375 × 812 (iPhone X)                           │
├─────────────────────────────────────────────────────────────┤
│ Methods:                                                     │
│   • init(context) → Calculate scale factors                 │
│   • w(size) → Scale width                                   │
│   • h(size) → Scale height                                  │
│   • sp(size) → Scale font size (clamped 0.8-1.4)            │
│   • icon(size) → Scale icon size                            │
│   • r(size) → Scale border radius                           │
│   • all(value) → EdgeInsets.all scaled                      │
│   • symmetric(h, v) → EdgeInsets.symmetric scaled           │
│   • only(l, t, r, b) → EdgeInsets.only scaled               │
└─────────────────────────────────────────────────────────────┘
```

### API Client (Dio)

```
┌─────────────────────────────────────────────────────────────┐
│ ApiClient (Singleton)                                        │
├─────────────────────────────────────────────────────────────┤
│ Configuration:                                               │
│   • Base URL: from .env (API_BASE_URL)                      │
│   • Timeout: 15 seconds                                     │
│   • Content-Type: application/json                          │
├─────────────────────────────────────────────────────────────┤
│ Interceptors:                                                │
│   • onRequest: Inject auth token from secure storage        │
│   • onError: Handle 401 → Auto-refresh token                │
├─────────────────────────────────────────────────────────────┤
│ Methods:                                                     │
│   • _tryRefreshToken() → Refresh access token               │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Data Models Relationships

```
Order
├── customer_id ──────► Customer
├── branch_id ────────► Branch
└── items[] ──────────► OrderItem[]
                            ├── product_id ──► Product
                            └── order_id ────► Order

Product
├── category_id ──────► Category
└── branch_inventory[]─► BranchInventory[]
                            └── branch_id ──► Branch

Category
└── parent_id ────────► Category (self-reference)
                         (3-level hierarchy: Main → Sub → Variant)

Payment
└── order_id ─────────► Order
```

---

## 🎨 Theme System

```
┌─────────────────────────────────────────────────────────────┐
│ AppTheme.lightTheme                                          │
├─────────────────────────────────────────────────────────────┤
│ Color Palette:                                               │
│   • Primary (Charcoal):   #434343                           │
│   • Accent (Golden):      #F7C873                           │
│   • Surface (Almond):     #FAEBCD                           │
│   • Background:           #F8F8F8                           │
├─────────────────────────────────────────────────────────────┤
│ Component Themes:                                            │
│   • AppBar: Charcoal background, white text                 │
│   • ElevatedButton: Charcoal background, white text         │
│   • TextButton: Charcoal text                               │
│   • InputDecoration: Almond fill, charcoal focus border     │
│   • FAB: Golden background, charcoal icon                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔒 Security Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Security Layers                                              │
├─────────────────────────────────────────────────────────────┤
│ 1. Secure Storage (FlutterSecureStorage)                    │
│    • Encrypted storage for tokens                           │
│    • Platform-specific encryption (Keychain/Keystore)       │
│                                                              │
│ 2. Token Management                                          │
│    • Access token (short-lived)                             │
│    • Refresh token (long-lived)                             │
│    • Auto-refresh on 401                                    │
│                                                              │
│ 3. API Communication                                         │
│    • HTTPS only                                             │
│    • Bearer token authentication                            │
│    • No direct Supabase access                              │
│                                                              │
│ 4. Role-Based Access Control (RBAC)                         │
│    • Super Admin: Full access                               │
│    • Store Manager: Manage inventory, orders                │
│    • Staff: Read-only access                                │
└─────────────────────────────────────────────────────────────┘
```

---

**End of Architecture Diagram**
