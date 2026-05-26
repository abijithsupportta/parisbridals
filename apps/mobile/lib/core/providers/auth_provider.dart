import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../auth_service.dart';

// Auth state
class AuthState {
  final bool isAuthenticated;
  final AuthUser? user;
  final bool isLoading;
  final String? error;

  AuthState({
    this.isAuthenticated = false,
    this.user,
    this.isLoading = false,
    this.error,
  });

  AuthState copyWith({
    bool? isAuthenticated,
    AuthUser? user,
    bool? isLoading,
    String? error,
  }) {
    return AuthState(
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      user: user ?? this.user,
      isLoading: isLoading ?? this.isLoading,
      error: error ?? this.error,
    );
  }
}

// Auth notifier using Riverpod 3.x pattern
class AuthNotifier extends Notifier<AuthState> {
  AuthService get _authService => ref.read(authServiceProvider);

  @override
  AuthState build() {
    _checkAuthStatus();
    return AuthState();
  }

  Future<void> _checkAuthStatus() async {
    final isAuth = await _authService.isAuthenticated();
    if (isAuth) {
      final user = await _authService.getCurrentUser();
      state = AuthState(
        isAuthenticated: true,
        user: user,
        isLoading: false,
      );
    } else {
      state = AuthState(
        isAuthenticated: false,
        user: null,
        isLoading: false,
      );
    }
  }

  Future<bool> login(String email, String password) async {
    state = AuthState(isLoading: true, error: null);
    
    final user = await _authService.login(email, password);
    if (user != null) {
      state = AuthState(
        isAuthenticated: true,
        user: user,
        isLoading: false,
      );
      return true;
    } else {
      state = AuthState(
        isLoading: false,
        error: 'Login failed. Please check your credentials.',
      );
      return false;
    }
  }

  Future<void> logout() async {
    state = AuthState(isLoading: true);
    await _authService.logout();
    state = AuthState(
      isAuthenticated: false,
      user: null,
      isLoading: false,
    );
  }
}

// Auth service provider
final authServiceProvider = Provider<AuthService>((ref) {
  return authService;
});

// Auth state provider using Riverpod 3.x pattern
final authProvider = NotifierProvider<AuthNotifier, AuthState>(AuthNotifier.new);
