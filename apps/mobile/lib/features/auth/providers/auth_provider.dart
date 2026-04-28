import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/providers/auth_provider.dart' as core_auth;

/// User roles matching the admin panel's RBAC system.
enum UserRole {
  superAdmin,
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
  bool get canManage => role == UserRole.superAdmin || role == UserRole.admin || role == UserRole.manager;

  /// Only admin can access settings-level features.
  bool get isAdmin => role == UserRole.superAdmin || role == UserRole.admin;

  /// Only owner/admin users can switch between branches.
  bool get canSwitchBranches => isAdmin;

  String get roleLabel {
    switch (role) {
      case UserRole.superAdmin:
        return 'OWNER';
      case UserRole.admin:
        return 'ADMIN';
      case UserRole.manager:
        return 'MANAGER';
      case UserRole.staff:
        return 'STAFF';
    }
  }
}

/// Current authenticated user provider.
final authUserProvider = Provider<AuthUser?>((ref) {
  final coreUser = ref.watch(core_auth.authProvider).user;
  if (coreUser == null) return null;

  return AuthUser(
    id: coreUser.id,
    email: coreUser.email,
    name: _nameFromEmail(coreUser.email),
    role: _roleFromApi(coreUser.role),
    branchId: coreUser.branchId,
  );
});

/// Convenience provider: can the current user manage (create/edit/delete)?
final canManageProvider = Provider<bool>((ref) {
  final user = ref.watch(authUserProvider);
  return user?.canManage ?? false;
});

final canSwitchBranchesProvider = Provider<bool>((ref) {
  final user = ref.watch(authUserProvider);
  return user?.canSwitchBranches ?? false;
});

UserRole _roleFromApi(String role) {
  switch (role) {
    case 'super_admin':
      return UserRole.superAdmin;
    case 'admin':
      return UserRole.admin;
    case 'manager':
      return UserRole.manager;
    case 'staff':
    default:
      return UserRole.staff;
  }
}

String _nameFromEmail(String email) {
  final localPart = email.split('@').first;
  if (localPart.isEmpty) return 'User';
  return localPart
      .split(RegExp(r'[._-]+'))
      .where((part) => part.isNotEmpty)
      .map((part) => part[0].toUpperCase() + part.substring(1))
      .join(' ');
}
