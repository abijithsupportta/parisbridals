import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ApiClient {
  static final ApiClient _instance = ApiClient._internal();
  late Dio dio;
  final _storage = const FlutterSecureStorage();
  static const _tokenKey = 'auth_token';
  static const _refreshKey = 'refresh_token';
  bool _isRefreshing = false;

  factory ApiClient() {
    return _instance;
  }

  ApiClient._internal() {
    final baseUrl = dotenv.env['API_BASE_URL'] ?? 'http://localhost:3001/api';
    
    dio = Dio(
      BaseOptions(
        baseUrl: baseUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 15),
        // Use Dio's built-in contentType (NOT in headers map).
        // This lets Dio auto-switch to multipart/form-data for FormData
        // without needing headers: {'Content-Type': null} hacks.
        contentType: Headers.jsonContentType,
        headers: {
          'Accept': 'application/json',
        },
      ),
    );

    // Add interceptors for error handling, token injection, and auto-refresh
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          // Inject Auth token from secure storage
          final token = await _storage.read(key: _tokenKey);
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onError: (DioException e, handler) async {
          // Handle 401 unauthorized errors — try to refresh the token
          if (e.response?.statusCode == 401 && !_isRefreshing) {
            final refreshed = await _tryRefreshToken();
            if (refreshed) {
              // Retry the original request with the new token
              try {
                final token = await _storage.read(key: _tokenKey);
                final opts = e.requestOptions;
                opts.headers['Authorization'] = 'Bearer $token';
                final response = await dio.fetch(opts);
                return handler.resolve(response);
              } catch (retryError) {
                // Retry also failed, give up
              }
            }
            // Refresh failed — clear auth state (forces re-login)
            await _storage.delete(key: _tokenKey);
            await _storage.delete(key: _refreshKey);
            await _storage.delete(key: 'auth_user');
          }
          return handler.next(e);
        },
      ),
    );
  }

  /// Try to refresh the access token using the stored refresh token.
  /// Returns true if successful, false otherwise.
  Future<bool> _tryRefreshToken() async {
    _isRefreshing = true;
    try {
      final refreshToken = await _storage.read(key: _refreshKey);
      if (refreshToken == null || refreshToken.isEmpty) return false;

      final baseUrl = dotenv.env['API_BASE_URL'] ?? 'http://localhost:3001/api';
      
      // Use a separate Dio instance to avoid interceptor loops
      final refreshDio = Dio(BaseOptions(
        baseUrl: baseUrl,
        connectTimeout: const Duration(seconds: 10),
        receiveTimeout: const Duration(seconds: 10),
      ));

      final response = await refreshDio.post('/auth/refresh', data: {
        'refresh_token': refreshToken,
      });

      if (response.statusCode == 200 && response.data['success'] == true) {
        final newAccessToken = response.data['data']['access_token'] as String;
        final newRefreshToken = response.data['data']['refresh_token'] as String;
        
        await _storage.write(key: _tokenKey, value: newAccessToken);
        await _storage.write(key: _refreshKey, value: newRefreshToken);
        
        debugPrint('[ApiClient] Token refreshed successfully');
        return true;
      }
      return false;
    } catch (e) {
      debugPrint('[ApiClient] Token refresh failed: $e');
      return false;
    } finally {
      _isRefreshing = false;
    }
  }
}

// Global instance to be used by Riverpod providers
final apiClient = ApiClient().dio;
