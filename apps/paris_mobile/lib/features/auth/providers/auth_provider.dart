import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/auth_models.dart';
import '../repositories/auth_repository.dart';
import '../../../../core/supabase_client.dart';

/// Auth Repository Provider
final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(supabaseClient);
});

/// Auth State Notifier
class AuthNotifier extends StateNotifier<AuthState> {
  final AuthRepository _authRepository;

  AuthNotifier(this._authRepository) : super(AuthState()) {
    _initAuth();
  }

  /// Initialize auth state on app start
  Future<void> _initAuth() async {
    state = state.loading();
    final user = await _authRepository.getCurrentUser();
    if (user != null) {
      state = state.authenticated(user);
    } else {
      state = state.unauthenticated();
    }
  }

  /// Sign in with email and password
  Future<void> signIn({
    required String email,
    required String password,
  }) async {
    state = state.loading();
    final result = await _authRepository.signInWithEmailAndPassword(
      email: email,
      password: password,
    );

    if (result.success && result.user != null) {
      state = state.authenticated(result.user!);
    } else {
      state = state.withError(result.error ?? 'Sign in failed');
    }
  }

  /// Sign out
  Future<void> signOut() async {
    state = state.loading();
    final result = await _authRepository.signOut();
    if (result.success) {
      state = state.unauthenticated();
    } else {
      state = state.withError(result.error ?? 'Sign out failed');
    }
  }

  /// Clear error
  void clearError() {
    state = state.copyWith(error: null);
  }
}

/// Auth State Provider
final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  final repository = ref.watch(authRepositoryProvider);
  return AuthNotifier(repository);
});

/// Auth User Provider (convenience)
final authUserProvider = Provider<AppAuthUser?>((ref) {
  return ref.watch(authProvider).user;
});

/// Is Authenticated Provider (convenience)
final isAuthenticatedProvider = Provider<bool>((ref) {
  return ref.watch(authProvider).isAuthenticated;
});

/// Is Loading Provider (convenience)
final authLoadingProvider = Provider<bool>((ref) {
  return ref.watch(authProvider).isLoading;
});

/// Auth Error Provider (convenience)
final authErrorProvider = Provider<String?>((ref) {
  return ref.watch(authProvider).error;
});
