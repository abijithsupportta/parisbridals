/// Staff Role Enum (matches admin)
enum StaffRole {
  admin,
  manager,
  staff,
}

/// Auth User Model (matches admin's AuthUser interface)
class AppAuthUser {
  final String id;
  final String email;
  final StaffRole role;
  final String? storeId;
  final String? branchId;
  final String? staffId;

  AppAuthUser({
    required this.id,
    required this.email,
    required this.role,
    this.storeId,
    this.branchId,
    this.staffId,
  });

  factory AppAuthUser.fromJson(Map<String, dynamic> json) {
    return AppAuthUser(
      id: json['id'] as String,
      email: json['email'] as String,
      role: _parseRole(json['role'] as String?),
      storeId: json['store_id'] as String?,
      branchId: json['branch_id'] as String?,
      staffId: json['staff_id'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'role': role.name,
      'store_id': storeId,
      'branch_id': branchId,
      'staff_id': staffId,
    };
  }

  static StaffRole _parseRole(String? role) {
    switch (role?.toLowerCase()) {
      case 'admin':
        return StaffRole.admin;
      case 'manager':
        return StaffRole.manager;
      case 'staff':
        return StaffRole.staff;
      default:
        return StaffRole.admin;
    }
  }

  /// Check if user has admin privileges
  bool get isAdmin => role == StaffRole.admin;

  /// Check if user can manage (admin or manager)
  bool get canManage => role == StaffRole.admin || role == StaffRole.manager;

  /// Check if user is staff only
  bool get isStaffOnly => role == StaffRole.staff;
}

/// Auth State
class AuthState {
  final AppAuthUser? user;
  final bool isAuthenticated;
  final bool isLoading;
  final String? error;

  AuthState({
    this.user,
    this.isAuthenticated = false,
    this.isLoading = false,
    this.error,
  });

  AuthState copyWith({
    AppAuthUser? user,
    bool? isAuthenticated,
    bool? isLoading,
    String? error,
  }) {
    return AuthState(
      user: user ?? this.user,
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }

  AuthState loading() => copyWith(isLoading: true, error: null);

  AuthState authenticated(AppAuthUser user) => copyWith(
        user: user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      );

  AuthState unauthenticated() => copyWith(
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      );

  AuthState withError(String message) => copyWith(
        isLoading: false,
        error: message,
      );
}
