/**
 * Settings Domain Types
 *
 * Type definitions for the settings domain.
 *
 * @module domain/types/settings
 */

// Setting Key Enum
export enum SettingKey {
  GST_PERCENTAGE = 'gst_percentage',
  IS_GST_ENABLED = 'is_gst_enabled',
  INVOICE_PREFIX = 'invoice_prefix',
  PAYMENT_TERMS = 'payment_terms',
  AUTHORIZED_SIGNATURE = 'authorized_signature',
}

// Setting Entity
export interface Setting {
  readonly id: string;
  readonly store_id: string;
  key: SettingKey;
  value: string;
  readonly updated_by: string | null;
  readonly updated_at: string;
}

// Create Setting DTO
export interface CreateSettingDTO {
  store_id: string;
  key: SettingKey;
  value: string;
  updated_by?: string;
}

// Update Setting DTO
export interface UpdateSettingDTO {
  value: string;
  updated_by?: string;
}

// Setting Validation Result
export interface SettingValidationResult {
  is_valid: boolean;
  errors: string[];
}
