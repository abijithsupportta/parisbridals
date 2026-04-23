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
