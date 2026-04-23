# AntiGravity Agent Rules - Flutter Mobile Application

This document outlines the strict, non-negotiable rules for developing the Flutter mobile application. These rules ensure long-term stability, maintainability, and a bug-free experience for a 5+ year lifespan.

---

## 1. 🏗️ Architecture: Feature-First (Screaming Architecture)

Do NOT organize folders by type (e.g., all models together, all views together).
The app MUST follow a **Feature-First Architecture** grouped by domain.

```text
lib/
 ├── core/                 # Shared resources (theme, constants, global providers, routing)
 ├── exceptions/           # Global custom exception classes
 ├── utils/                # Helper functions (date formatters, generic validators)
 └── features/             # Business domains
      ├── auth/            # E.g., Authentication feature
      │    ├── domain/     # Data models and entities
      │    ├── data/       # Repositories (Supabase API calls, caching)
      │    ├── providers/  # Riverpod state controllers / ViewModels
      │    └── views/      # Flutter UI screens and local widgets
      └── products/
           ├── domain/
           ├── data/
           ├── providers/
           └── views/
```

---

## 2. 🧠 State Management: Riverpod

- **Rule:** Use `flutter_riverpod` (specifically `riverpod_annotation` with code generation) for ALL state management.
- **Rule:** Do NOT use `setState` for business logic or network states. `setState` is strictly reserved for trivial local UI state (e.g., expanding a local accordion).
- **Rule:** Use `AsyncValue` (data, loading, error) to handle all asynchronous operations cleanly in the UI.

---

## 3. 💾 Offline-First Storage & Caching: Isar

- **Rule:** Use **Isar Database** for all complex offline caching (Products, Categories, Orders). The app MUST be offline-first, meaning it reads from Isar instantly while fetching updates from Supabase in the background.
- **Rule:** Use `shared_preferences` ONLY for simple, non-sensitive key-value pairs (e.g., `isDarkMode`, `hasSeenOnboarding`).
- **Rule:** Use `flutter_secure_storage` for storing sensitive data (e.g., Auth Tokens). NEVER store tokens in plain text.

---

## 4. 🚨 Error Handling: Functional & Global

- **Rule:** Never leak raw exceptions (e.g., `SocketException`, `SupabaseError`) to the UI layer.
- **Rule:** The `data` (Repository) layer MUST catch raw network/DB errors and translate them into custom `AppException` classes.
- **Rule:** The `providers` layer wraps data in `AsyncValue`.
- **Rule:** The `views` layer handles the `AsyncValue.error` state by displaying a standardized, user-friendly error UI component (e.g., "Network error, tap to retry") rather than crashing or showing a red screen of death.

---

## 5. 🛡️ UI & Business Logic Separation

- **Rule:** A `Widget` (View) should ONLY contain layout code and styling.
- **Rule:** A `Widget` MUST NOT contain API calls, data parsing, or complex business logic. It must delegate actions to its Riverpod Provider/Notifier (e.g., `ref.read(authProvider.notifier).login()`).

---

## 6. 🌐 Backend Integration (Supabase)

- **Rule:** The app interacts with Supabase exclusively via the `data` (Repository) layer.
- **Rule:** Environment variables (e.g., `SUPABASE_URL`, `SUPABASE_ANON_KEY`) must be loaded securely via `flutter_dotenv` from the `.env` file. Do not hardcode API keys in the Dart source code.

---

> **Agent Instruction:** Before writing or modifying any Flutter code, you MUST review these rules to ensure the proposed solution strictly adheres to this architecture.
