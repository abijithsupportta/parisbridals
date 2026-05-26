import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/auth_models.dart';
import '../../../../core/supabase_client.dart';

/// Auth Repository - Handles all Supabase authentication operations
/// Optimized for low latency (10-50ms)
class AuthRepository {
  final AppSupabaseClient _supabase;

  AuthRepository(this._supabase);

  /// Sign in with email and password
  /// Returns AppAuthUser with role from user_metadata (mobile app uses anon key, cannot access staff table directly)
  Future<AuthResult> signInWithEmailAndPassword({
    required String email,
    required String password,
  }) async {
    try {
      final response = await _supabase.client.auth.signInWithPassword(
        email: email,
        password: password,
      );

      final user = response.user;
      if (user == null) {
        return AuthResult.error('Authentication failed: No user returned');
      }

      // Mobile app uses anon key - cannot access staff table directly due to RLS
      // Use user_metadata for role and store info
      final metaRole = user.userMetadata?['role'] as String?;
      final metaStoreId = user.userMetadata?['store_id'] as String?;
      final metaBranchId = user.userMetadata?['branch_id'] as String?;
      final metaStaffId = user.userMetadata?['staff_id'] as String?;

      final authUser = AppAuthUser(
        id: user.id,
        email: user.email ?? '',
        role: StaffRole.values.firstWhere(
          (e) => e.name == metaRole,
          orElse: () => StaffRole.admin,
        ),
        storeId: metaStoreId,
        branchId: metaBranchId,
        staffId: metaStaffId,
      );

      return AuthResult.success(authUser);
    } on AuthException catch (e) {
      return AuthResult.error(e.message);
    } catch (e) {
      return AuthResult.error('Error: ${e.toString()}');
    }
  }

  /// Sign out current user
  Future<AuthResult> signOut() async {
    try {
      await _supabase.client.auth.signOut();
      return AuthResult.success(null);
    } catch (e) {
      return AuthResult.error('Failed to sign out');
    }
  }

  /// Get current authenticated user
  Future<AppAuthUser?> getCurrentUser() async {
    try {
      final response = await _supabase.client.auth.getUser();
      final user = response.user;
      
      if (user == null) return null;

      // Mobile app uses anon key - use user_metadata for role info
      final metaRole = user.userMetadata?['role'] as String?;
      final metaStoreId = user.userMetadata?['store_id'] as String?;
      final metaBranchId = user.userMetadata?['branch_id'] as String?;
      final metaStaffId = user.userMetadata?['staff_id'] as String?;

      return AppAuthUser(
        id: user.id,
        email: user.email ?? '',
        role: StaffRole.values.firstWhere(
          (e) => e.name == metaRole,
          orElse: () => StaffRole.admin,
        ),
        storeId: metaStoreId,
        branchId: metaBranchId,
        staffId: metaStaffId,
      );
    } catch (e) {
      return null;
    }
  }

  /// Listen to auth state changes
  Stream<AppAuthUser?> onAuthStateChange() {
    return _supabase.client.auth.onAuthStateChange
        .map((data) => data.session?.user)
        .map((user) {
      if (user == null) return null;
      
      // Mobile app uses anon key - use user_metadata for role info
      final metaRole = user.userMetadata?['role'] as String?;
      final metaStoreId = user.userMetadata?['store_id'] as String?;
      final metaBranchId = user.userMetadata?['branch_id'] as String?;
      final metaStaffId = user.userMetadata?['staff_id'] as String?;

      return AppAuthUser(
        id: user.id,
        email: user.email ?? '',
        role: StaffRole.values.firstWhere(
          (e) => e.name == metaRole,
          orElse: () => StaffRole.admin,
        ),
        storeId: metaStoreId,
        branchId: metaBranchId,
        staffId: metaStaffId,
      );
    });
  }
}

/// Auth Result wrapper
class AuthResult {
  final bool success;
  final AppAuthUser? user;
  final String? error;

  AuthResult.success(this.user)
      : success = true,
        error = null;

  AuthResult.error(this.error)
      : success = false,
        user = null;
}
