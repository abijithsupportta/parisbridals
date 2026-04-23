/**
 * Repository Layer Index
 *
 * Central export point for all repository classes and utilities.
 *
 * @module repository/index
 */

// Base repository
export { BaseRepository } from './supabaseClient';
export type { RepositoryResult } from './supabaseClient';
export { 
  createRepositoryResult, 
  isRepositorySuccess, 
  isRepositoryError 
} from './supabaseClient';

// Repository implementations
export { ProductRepository, productRepository } from './productRepository';
export { CategoryRepository, categoryRepository } from './categoryRepository';
export { UploadRepository, uploadRepository } from './uploadRepository';
export { BranchRepository, branchRepository } from './branchRepository';
export { StaffRepository, staffRepository } from './staffRepository';
export { ProductInventoryRepository, inventoryRepository } from './inventoryRepository';
export { BannerRepository, bannerRepository } from './bannerRepository';
export { customerRepository, type CreateCustomerDTO, type UpdateCustomerDTO, type CustomerSearchParams } from './customerRepository';
export { orderRepository } from './orderRepository';
export { settingsRepository } from './settingsRepository';
export { paymentRepository } from './paymentRepository';
