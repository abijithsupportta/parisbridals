enum IdType { aadhaar, pan, drivingLicence, passport, others }

class IdDocument {
  final String url;
  final String type; // 'front' or 'back'

  IdDocument({
    required this.url,
    required this.type,
  });

  factory IdDocument.fromJson(Map<String, dynamic> json) {
    return IdDocument(
      url: json['url'] as String,
      type: json['type'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'url': url,
      'type': type,
    };
  }
}

class Customer {
  final String id;
  final String storeId;
  final String name;
  final String phone;
  final String? email;
  final String? address;
  final String? gstin;
  final String? photoUrl;
  final IdType? idType;
  final String? idNumber;
  final List<IdDocument>? idDocuments;
  final String createdAt;
  final String updatedAt;
  final String? createdBy;
  final String? createdAtBranchId;
  final String? updatedBy;
  final String? updatedAtBranchId;

  Customer({
    required this.id,
    required this.storeId,
    required this.name,
    required this.phone,
    this.email,
    this.address,
    this.gstin,
    this.photoUrl,
    this.idType,
    this.idNumber,
    this.idDocuments,
    required this.createdAt,
    required this.updatedAt,
    this.createdBy,
    this.createdAtBranchId,
    this.updatedBy,
    this.updatedAtBranchId,
  });

  factory Customer.fromJson(Map<String, dynamic> json) {
    return Customer(
      id: json['id'] as String,
      storeId: json['store_id'] as String,
      name: json['name'] as String,
      phone: json['phone'] as String,
      email: json['email'] as String?,
      address: json['address'] as String?,
      gstin: json['gstin'] as String?,
      photoUrl: json['photo_url'] as String?,
      idType: json['id_type'] != null ? _parseIdType(json['id_type'] as String) : null,
      idNumber: json['id_number'] as String?,
      idDocuments: (json['id_documents'] as List<dynamic>?)
          ?.map((e) => IdDocument.fromJson(e as Map<String, dynamic>))
          .toList(),
      createdAt: json['created_at'] as String? ?? '',
      updatedAt: json['updated_at'] as String? ?? '',
      createdBy: json['created_by'] as String?,
      createdAtBranchId: json['created_at_branch_id'] as String?,
      updatedBy: json['updated_by'] as String?,
      updatedAtBranchId: json['updated_at_branch_id'] as String?,
    );
  }

  static IdType _parseIdType(String value) {
    switch (value.toLowerCase()) {
      case 'aadhaar':
        return IdType.aadhaar;
      case 'pan':
        return IdType.pan;
      case 'driving licence':
        return IdType.drivingLicence;
      case 'passport':
        return IdType.passport;
      default:
        return IdType.others;
    }
  }

  String _idTypeToString() {
    switch (idType) {
      case IdType.aadhaar:
        return 'Aadhaar';
      case IdType.pan:
        return 'PAN';
      case IdType.drivingLicence:
        return 'Driving Licence';
      case IdType.passport:
        return 'Passport';
      case IdType.others:
        return 'Others';
      case null:
        return '';
    }
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'store_id': storeId,
      'name': name,
      'phone': phone,
      'email': email,
      'address': address,
      'gstin': gstin,
      'photo_url': photoUrl,
      'id_type': _idTypeToString(),
      'id_number': idNumber,
      'id_documents': idDocuments?.map((e) => e.toJson()).toList(),
      'created_at': createdAt,
      'updated_at': updatedAt,
      'created_by': createdBy,
      'created_at_branch_id': createdAtBranchId,
      'updated_by': updatedBy,
      'updated_at_branch_id': updatedAtBranchId,
    };
  }
}
