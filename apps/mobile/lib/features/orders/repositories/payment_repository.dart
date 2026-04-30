import 'package:dio/dio.dart';
import '../../../core/api_client.dart';
import '../models/payment.dart';

class PaymentRepository {
  final Dio _client = apiClient;

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

  Future<Payment> createPayment(CreatePaymentDTO dto) async {
    final response = await _client.post('/payments', data: dto.toJson());

    if (response.statusCode == 200 || response.statusCode == 201) {
      final data = response.data;
      if (data['success'] == true && data['data'] != null) {
        return Payment.fromJson(data['data']);
      }
    }
    throw Exception('Failed to create payment');
  }
}
