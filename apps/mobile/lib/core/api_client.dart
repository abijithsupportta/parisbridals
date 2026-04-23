import 'package:dio/dio.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

class ApiClient {
  static final ApiClient _instance = ApiClient._internal();
  late Dio dio;

  factory ApiClient() {
    return _instance;
  }

  ApiClient._internal() {
    final baseUrl = dotenv.env['API_BASE_URL'] ?? 'https://parisbridals-admin.vercel.app/api';
    
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
          // TODO: Inject Auth token from secure storage here
          // final token = await secureStorage.read(key: 'auth_token');
          // if (token != null) {
          //   options.headers['Authorization'] = 'Bearer $token';
          // }
          return handler.next(options);
        },
        onError: (DioException e, handler) {
          // Custom logging or error transformation can happen here
          return handler.next(e);
        },
      ),
    );
  }
}

// Global instance to be used by Riverpod providers
final apiClient = ApiClient().dio;
