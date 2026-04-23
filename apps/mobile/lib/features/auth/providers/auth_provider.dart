import 'package:flutter_riverpod/flutter_riverpod.dart';

/// User roles matching the admin panel's RBAC system.
enum UserRole {
  admin,
  manager,
  staff,
}

/// Holds the current logged-in user's info and role.
class AuthUser {
  final String id;
  final String email;
  final String name;
  final UserRole role;
  final String? branchId;

  const AuthUser({
    required this.id,
    required this.email,
    required this.name,
    required this.role,
    this.branchId,
  });

  /// Admin and Manager can create/edit/delete.
  bool get canManage => role == UserRole.admin || role == UserRole.manager;

  /// Only admin can access settings-level features.
  bool get isAdmin => role == UserRole.admin;
}

/// Current authenticated user provider.
/// TODO: Populate from actual login API response and persist via secure storage.
/// For now defaults to admin for development.
final authUserProvider = Provider<AuthUser?>((ref) {
  // This will be set after login. Default to admin for dev.
  return const AuthUser(
    id: 'dev-user',
    email: 'admin@parisbridals.com',
    name: 'Admin',
    role: UserRole.admin,
  );
});

/// Convenience provider: can the current user manage (create/edit/delete)?
final canManageProvider = Provider<bool>((ref) {
  final user = ref.watch(authUserProvider);
  return user?.canManage ?? false;
});
