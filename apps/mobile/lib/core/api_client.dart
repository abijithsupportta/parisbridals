import 'package:dio/dio.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ApiClient {
  static final ApiClient _instance = ApiClient._internal();
  late Dio dio;
  final _storage = const FlutterSecureStorage();
  static const _tokenKey = 'auth_token';

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
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    // Add interceptors for error handling and token injection
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
        onError: (DioException e, handler) {
          // Handle 401 unauthorized errors
          if (e.response?.statusCode == 401) {
            // Token expired, clear storage
            _storage.delete(key: _tokenKey);
            _storage.delete(key: 'auth_user');
          }
          return handler.next(e);
        },
      ),
    );
  }
}

// Global instance to be used by Riverpod providers
final apiClient = ApiClient().dio;
