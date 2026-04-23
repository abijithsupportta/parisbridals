# Paris Bridals Mobile App

This directory contains the Flutter mobile application for **Paris Bridals**, acting as the mobile version of the admin dashboard.

## Overview
The mobile app mirrors the functionality of the web admin portal, allowing store managers, administrators, and staff to manage products, categories, stores, branches, customers, and orders right from their mobile devices. 

It consumes the exact same Next.js API (`https://parisbridals-admin.vercel.app/api`) built for the web admin portal, meaning business logic is centralized and synchronized in real-time.

---

## Architecture & Technology Stack

The app uses a **Feature-First Architecture**. Instead of grouping by technical type (e.g., all models in one folder, all views in another), files are grouped by the feature they belong to (e.g., `features/products/`).

### Core Technologies
*   **Framework**: Flutter (Dart)
*   **State Management**: Riverpod (`flutter_riverpod`, `riverpod_annotation`)
*   **Networking / HTTP**: Dio (`dio`)
*   **Performance Optimization**: `cached_network_image`, `shimmer`
*   **Environment Config**: `flutter_dotenv` (loading `.env` files)
*   **Local Storage**: `flutter_secure_storage` (for auth tokens)

---

## Implemented Features

### 1. Unified Dashboard
*   **Greeting Banner**: Dynamic greeting tailored to the logged-in user.
*   **Quick Actions & Summary**: Direct access to creating orders, adding products, and viewing high-level stats (Total Sales, Pending Orders, Customers).
*   **Recent Orders**: A snapshot of the latest order status natively embedded in the dashboard.

### 2. Product Management Module
*   **Infinite Scroll & Pagination**: The product list integrates `page` and `limit` to lazily load catalog items, eliminating lag for large datasets.
*   **Instant Fire-and-Forget Saving**: Editing or creating products pops the UI instantly. The Riverpod repository handles heavy image uploads and API submission in the background, updating the state upon success.
*   **Smart Quantity Stepper**: Uses deeply optimized custom `TextEditingController` steppers to modify quantities instantly without triggering expensive widget tree rebuilds.
*   **Barcode Auto-Generation**: One-tap 8-digit numeric barcode generation for new inventory items.
*   **Camera & Gallery Integration**: Uses `image_picker` to allow rapid image assignment to products.
*   **Cascading Categories**: Selecting a main category instantly fetches related sub-categories and variants.

### 3. Native Image Loading
*   Uses `Image.network` natively combined with a `loadingBuilder`.
*   Displays a beautiful `Shimmer` skeleton effect while images download to give a premium, polished user experience.

### 4. Role-Based Access Control (RBAC)
The app restricts UI based on the user's role:
*   **Super Admin**: Has access to all stores, settings, branches, and staff management.
*   **Store Manager**: Can manage inventory, edit product fields, and manage stock.
*   **Staff / Agent**: Restricted to read-only views for products. Staff can browse the catalog and assist customers, but cannot edit fields or add new inventory.

---

## Custom Premium Theme

The application strictly adheres to a luxurious, 4-color custom theme sourced from ColorHunt:

*   **`0xFFF8F8F8` (Off-White)**: The primary Scaffold Background, giving a clean and minimalist base.
*   **`0xFFFAEBCD` (Blanched Almond)**: The Surface color for cards, search bars, and avatar backgrounds.
*   **`0xFFF7C873` (Golden)**: The Accent color. Used for price tags, floating action buttons (FABs), and high-visibility badges.
*   **`0xFF434343` (Charcoal)**: The Primary Active color. Used for app bars, primary text, main buttons, and dominant gradients, replacing all default Material colors.

All theme configurations are strictly controlled in `lib/core/theme.dart`.

---

## Directory Structure

```text
lib/
├── core/                       # Shared code applicable across all features
│   ├── api_client.dart         # Singleton Dio client with base URL & interceptors
│   ├── main_layout.dart        # Scaffold containing the Drawer and main body switching
│   └── theme.dart              # Global UI theme (Charcoal/Golden aesthetic)
├── exceptions/                 # Custom Exception classes
├── features/                   # Feature modules
│   ├── auth/                   # Authentication feature (Login, Splash, Tokens)
│   ├── dashboard/              # Home view with greeting and summary metrics
│   ├── products/               # Products Management (List, Add, Edit, Detail)
│   ├── categories/             # Category Management
│   └── orders/                 # Order viewing
├── utils/                      # Helper utilities (formatting, validators)
└── main.dart                   # Application entry point
```

---

## Next Steps / Roadmap
*   Finalize Calendar & Date-picker module for tracking exact rental dates.
*   Implement Order Creation flow (adding products to a cart and assigning a customer).
