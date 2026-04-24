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
export { BranchInventoryRepository, branchInventoryRepository } from './branchInventoryRepository';
export { BannerRepository, bannerRepository } from './bannerRepository';
export { CustomerRepository, customerRepository } from './customerRepository';
export { orderRepository } from './orderRepository';
export { settingsRepository } from './settingsRepository';
export { paymentRepository } from './paymentRepository';
