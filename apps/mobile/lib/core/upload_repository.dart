import 'dart:io';
import 'package:dio/dio.dart';
import 'api_client.dart';

/// Shared upload repository for uploading files to the server.
/// Calls POST /api/upload with multipart form data.
class UploadRepository {
  final Dio _client = apiClient;

  /// Upload a file to the server.
  /// [file] — the local file to upload.
  /// [folder] — logical folder name on the server (e.g. "categories").
  /// Returns the public URL of the uploaded file.
  Future<String> uploadFile(File file, {String folder = 'uploads'}) async {
    final fileName = file.path.split(Platform.pathSeparator).last;
    final formData = FormData.fromMap({
      'file': await MultipartFile.fromFile(file.path, filename: fileName),
      'folder': folder,
    });

    final response = await _client.post('/upload', data: formData);

    if (response.statusCode == 200 && response.data['url'] != null) {
      return response.data['url'] as String;
    }
    throw Exception(response.data?['error'] ?? 'Failed to upload file');
  }
}
