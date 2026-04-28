class Branch {
  final String id;
  final String storeId;
  final String name;
  final String address;
  final String? phone;
  final bool isMain;
  final bool isActive;
  final String createdAt;
  final String updatedAt;
  final String? createdBy;
  final String? createdAtBranchId;
  final String? updatedBy;
  final String? updatedAtBranchId;
  final int? staffCount;

  Branch({
    required this.id,
    required this.storeId,
    required this.name,
    required this.address,
    this.phone,
    this.isMain = false,
    this.isActive = true,
    required this.createdAt,
    required this.updatedAt,
    this.createdBy,
    this.createdAtBranchId,
    this.updatedBy,
    this.updatedAtBranchId,
    this.staffCount,
  });

  factory Branch.fromJson(Map<String, dynamic> json) {
    return Branch(
      id: json['id'] as String,
      storeId: json['store_id'] as String,
      name: json['name'] as String,
      address: json['address'] as String,
      phone: json['phone'] as String?,
      isMain: json['is_main'] as bool? ?? false,
      isActive: json['is_active'] as bool? ?? true,
      createdAt: json['created_at'] as String? ?? '',
      updatedAt: json['updated_at'] as String? ?? '',
      createdBy: json['created_by'] as String?,
      createdAtBranchId: json['created_at_branch_id'] as String?,
      updatedBy: json['updated_by'] as String?,
      updatedAtBranchId: json['updated_at_branch_id'] as String?,
      staffCount: json['staff_count'] as int?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'store_id': storeId,
      'name': name,
      'address': address,
      'phone': phone,
      'is_main': isMain,
      'is_active': isActive,
      'created_at': createdAt,
      'updated_at': updatedAt,
      'created_by': createdBy,
      'created_at_branch_id': createdAtBranchId,
      'updated_by': updatedBy,
      'updated_at_branch_id': updatedAtBranchId,
      'staff_count': staffCount,
    };
  }
}
