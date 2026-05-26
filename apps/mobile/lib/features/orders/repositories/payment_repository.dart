import 'package:dio/dio.dart';
import '../../../core/api_client.dart';
import '../models/payment.dart';

/// Payment Repository
///
/// Data access layer for payment operations via the admin API.
/// All business logic (including order amount_paid updates) is handled
/// atomically on the server side in paymentRepository.create().
///
/// @module features/orders/repositories/payment_repository
class PaymentRepository {
  final Dio _client = apiClient;

  /// Fetch all payments for a given order.
  Future<List<Payment>> getPaymentsByOrder(String orderId) async {
    final response = await _client.get('/payments', queryParameters: {'order_id': orderId});

    if (response.statusCode == 200) {
      final data = response.data;
      if (data['success'] == true && data['data'] != null) {
        final paymentsData = data['data'] as List;
        return paymentsData.map((e) => Payment.fromJson(e)).toList();
      }
    }
    throw Exception('Failed to load payments');
  }

  /// Create a new payment record.
  ///
  /// The server handles updating the order's amount_paid atomically
  /// in paymentRepository.create() — no client-side calculation needed.
  Future<Payment> createPayment(CreatePaymentDTO dto) async {
    try {
      final response = await _client.post('/payments', data: dto.toJson());

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = response.data;
        if (data['success'] == true && data['data'] != null) {
          return Payment.fromJson(data['data']);
        } else {
          throw Exception(data['message'] ?? 'Failed to create payment: Invalid response');
        }
      } else {
        final responseData = response.data;
        String errorMessage = 'Failed to create payment: HTTP ${response.statusCode}';
        if (responseData != null) {
          if (responseData['message'] != null) {
            errorMessage += ' - ${responseData['message']}';
          }
          if (responseData['errors'] != null) {
            errorMessage += ' - Errors: ${responseData['errors']}';
          }
        }
        throw Exception(errorMessage);
      }
    } on DioException catch (e) {
      String errorMessage = 'Failed to create payment: ';
      switch (e.type) {
        case DioExceptionType.connectionTimeout:
          errorMessage += 'Connection timeout';
          break;
        case DioExceptionType.sendTimeout:
          errorMessage += 'Send timeout';
          break;
        case DioExceptionType.receiveTimeout:
          errorMessage += 'Receive timeout';
          break;
        case DioExceptionType.badResponse:
          errorMessage += 'HTTP ${e.response?.statusCode}';
          if (e.response?.data != null) {
            final data = e.response!.data;
            if (data['message'] != null) {
              errorMessage += ' - ${data['message']}';
            }
            if (data['errors'] != null) {
              errorMessage += ' - ${data['errors']}';
            }
          }
          break;
        case DioExceptionType.cancel:
          errorMessage += 'Request cancelled';
          break;
        case DioExceptionType.unknown:
          errorMessage += 'Network error: ${e.error}';
          break;
        default:
          errorMessage += 'Unknown error: ${e.message}';
      }
      throw Exception(errorMessage);
    } catch (e) {
      throw Exception('Failed to create payment: ${e.toString()}');
    }
  }
}
