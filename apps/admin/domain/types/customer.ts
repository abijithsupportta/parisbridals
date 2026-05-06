import { BaseEntity, SearchParams } from './common';

export type IdType = 'Aadhaar' | 'PAN' | 'Driving Licence' | 'Passport' | 'Others';

export interface IdDocument {
  url: string;
  type: 'front' | 'back';
}

/**
 * Customer Entity
 */
export interface Customer extends BaseEntity {
  name: string;
  phone: string;
  alt_phone?: string | null;
  email?: string | null;
  address?: string | null;
  gstin?: string | null;
  photo_url?: string | null;
  id_type?: IdType | null;
  id_number?: string | null;
  id_documents?: IdDocument[];
  
  // Audit fields
  created_by?: string | null;
  created_at_branch_id?: string | null;
  updated_by?: string | null;
  updated_at_branch_id?: string | null;
}

/**
 * DTO for creating a customer
 */
export interface CreateCustomerDTO {
  name: string;
  phone: string;
  alt_phone?: string | null;
  email?: string | null;
  address?: string | null;
  gstin?: string | null;
  photo_url?: string | null;
  id_type?: IdType | null;
  id_number?: string | null;
  id_documents?: IdDocument[];
}

/**
 * DTO for updating a customer
 */
export interface UpdateCustomerDTO extends Partial<CreateCustomerDTO> {}

/**
 * Customer Search Parameters
 */
export interface CustomerSearchParams extends SearchParams {
  query?: string;
  phone?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

/**
 * Search Results
 */
export interface CustomerSearchResult {
  customers: Customer[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}
