import 'dart:io';
import 'package:dio/dio.dart';
import 'api_client.dart';

/// Shared upload repository for uploading files to the server.
/// Calls POST /api/upload with multipart form data.
/// The API returns: { success: true, data: { url, key } }
class UploadRepository {
  final Dio _client = apiClient;

  /// Upload a file to the server.
  /// [file] — the local file to upload.
  /// [folder] — logical folder name on the server (e.g. "categories").
  /// Returns the public URL of the uploaded file.
  Future<String> uploadFile(File file, {String folder = 'uploads'}) async {
    try {
      final fileName = file.path.split(Platform.pathSeparator).last;
      final formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(file.path, filename: fileName),
        'folder': folder,
      });

      // Dio auto-detects FormData and sets multipart/form-data with boundary.
      // No manual Content-Type override needed.
      final response = await _client.post(
        '/upload',
        data: formData,
      );

      if (response.statusCode == 200) {
        // API envelope: { success: true, data: { url, key } }
        final data = response.data;
        final url = data['data']?['url'] ?? data['url'];
        if (url != null) {
          return url as String;
        }
      }
      throw Exception(response.data?['error'] ?? 'Upload succeeded but no URL returned');
    } on DioException catch (e) {
      final data = e.response?.data;
      if (data is Map && data['error'] != null) {
        throw Exception(data['error'].toString());
      }
      throw Exception(e.message ?? 'Failed to upload file');
    }
  }
}

