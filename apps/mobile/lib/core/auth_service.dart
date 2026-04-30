import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'dart:convert';
import 'api_client.dart';

class AuthUser {
  final String id;
  final String email;
  final String role;
  final String? storeId;
  final String? branchId;
  final String? staffId;
  final String accessToken;
  final String? refreshToken;

  AuthUser({
    required this.id,
    required this.email,
    required this.role,
    this.storeId,
    this.branchId,
    this.staffId,
    required this.accessToken,
    this.refreshToken,
  });

  factory AuthUser.fromJson(Map<String, dynamic> json) {
    return AuthUser(
      id: json['id'] as String,
      email: json['email'] as String,
      role: json['role'] as String,
      storeId: json['store_id'] as String?,
      branchId: json['branch_id'] as String?,
      staffId: json['staff_id'] as String?,
      accessToken: json['access_token'] as String,
      refreshToken: json['refresh_token'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'role': role,
      'store_id': storeId,
      'branch_id': branchId,
      'staff_id': staffId,
      'access_token': accessToken,
      'refresh_token': refreshToken,
    };
  }
}

class AuthService {
  final Dio _client = apiClient;
  final _storage = const FlutterSecureStorage();
  static const _tokenKey = 'auth_token';
  static const _refreshKey = 'refresh_token';
  static const _userKey = 'auth_user';

  /// Login with email and password
  Future<AuthUser?> login(String email, String password) async {
    try {
      final response = await _client.post('/auth/login', data: {
        'email': email,
        'password': password,
      });

      if (response.statusCode == 200 && response.data['success'] == true) {
        final userData = response.data['data'];
        final authUser = AuthUser.fromJson(userData);
        
        // Store token and user data securely as JSON
        await _storage.write(key: _tokenKey, value: authUser.accessToken);
        if (authUser.refreshToken != null) {
          await _storage.write(key: _refreshKey, value: authUser.refreshToken!);
        }
        await _storage.write(key: _userKey, value: jsonEncode(authUser.toJson()));
        
        return authUser;
      }
      return null;
    } catch (e) {
      debugPrint('Login error: $e');
      return null;
    }
  }

  /// Logout the user
  Future<void> logout() async {
    await _storage.delete(key: _tokenKey);
    await _storage.delete(key: _refreshKey);
    await _storage.delete(key: _userKey);
  }

  /// Get the current auth token
  Future<String?> getAuthToken() async {
    return await _storage.read(key: _tokenKey);
  }

  /// Get the current user
  Future<AuthUser?> getCurrentUser() async {
    try {
      final token = await getAuthToken();
      if (token == null || token.isEmpty) return null;

      final response = await _client.get('/auth/me');
      if (response.statusCode == 200 && response.data['success'] == true) {
        final userData = response.data['data']?['user'] as Map<String, dynamic>?;
        if (userData != null) {
          final authUser = AuthUser.fromJson({
            ...userData,
            'access_token': token,
          });
          await _storage.write(key: _userKey, value: jsonEncode(authUser.toJson()));
          return authUser;
        }
      }

      final userDataString = await _storage.read(key: _userKey);
      if (userDataString == null) return null;

      final Map<String, dynamic> userMap = jsonDecode(userDataString);
      return AuthUser.fromJson(userMap);
    } catch (e) {
      debugPrint('Get current user error: $e');
      final userDataString = await _storage.read(key: _userKey);
      if (userDataString == null) return null;

      try {
        final Map<String, dynamic> userMap = jsonDecode(userDataString);
        return AuthUser.fromJson(userMap);
      } catch (_) {
        return null;
      }
    }
  }

  /// Check if user is authenticated
  Future<bool> isAuthenticated() async {
    final token = await getAuthToken();
    return token != null && token.isNotEmpty;
  }
}

// Global instance
final authService = AuthService();
