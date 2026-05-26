/// Custom exception classes for Paris Bridals mobile app.
///
/// These exceptions provide domain-specific error handling and user-friendly
/// error messages instead of exposing raw network/database errors.
library;

/// Base exception class for all app-specific exceptions.
class AppException implements Exception {
  final String message;
  final String? code;
  final dynamic originalError;

  AppException(this.message, {this.code, this.originalError});

  @override
  String toString() => message;
}

/// Exception thrown when network operations fail.
class NetworkException extends AppException {
  NetworkException(super.message, {super.code, super.originalError});

  factory NetworkException.noConnection() {
    return NetworkException(
      'No internet connection. Please check your network settings.',
      code: 'NO_CONNECTION',
    );
  }

  factory NetworkException.timeout() {
    return NetworkException(
      'Request timed out. Please try again.',
      code: 'TIMEOUT',
    );
  }

  factory NetworkException.serverError([String? details]) {
    return NetworkException(
      details ?? 'Server error occurred. Please try again later.',
      code: 'SERVER_ERROR',
    );
  }
}

/// Exception thrown when validation fails.
class ValidationException extends AppException {
  final Map<String, String>? fieldErrors;

  ValidationException(super.message, {this.fieldErrors, super.code});

  factory ValidationException.required(String fieldName) {
    return ValidationException(
      '$fieldName is required',
      code: 'REQUIRED_FIELD',
      fieldErrors: {fieldName: 'This field is required'},
    );
  }

  factory ValidationException.invalid(String fieldName, [String? reason]) {
    return ValidationException(
      reason ?? '$fieldName is invalid',
      code: 'INVALID_FIELD',
      fieldErrors: {fieldName: reason ?? 'Invalid value'},
    );
  }
}

/// Exception thrown when authentication fails.
class AuthException extends AppException {
  AuthException(super.message, {super.code, super.originalError});

  factory AuthException.unauthorized() {
    return AuthException(
      'Session expired. Please login again.',
      code: 'UNAUTHORIZED',
    );
  }

  factory AuthException.forbidden() {
    return AuthException(
      'You do not have permission to perform this action.',
      code: 'FORBIDDEN',
    );
  }
}

/// Exception thrown when a resource is not found.
class NotFoundException extends AppException {
  NotFoundException(super.message, {super.code, super.originalError});

  factory NotFoundException.resource(String resourceType, String id) {
    return NotFoundException(
      '$resourceType with ID $id not found',
      code: 'NOT_FOUND',
    );
  }
}

/// Exception thrown when a business rule is violated.
class BusinessRuleException extends AppException {
  BusinessRuleException(super.message, {super.code, super.originalError});

  factory BusinessRuleException.insufficientStock(String productName) {
    return BusinessRuleException(
      'Insufficient stock for $productName',
      code: 'INSUFFICIENT_STOCK',
    );
  }

  factory BusinessRuleException.invalidDateRange() {
    return BusinessRuleException(
      'End date must be after start date',
      code: 'INVALID_DATE_RANGE',
    );
  }
}
