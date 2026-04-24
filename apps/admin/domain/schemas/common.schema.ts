/**
 * Common Validation Schemas
 *
 * Shared validation schemas used across different domains.
 *
 * @module domain/schemas/common.schema
 */

import { z } from 'zod';
import { UserRole, Permission, Status, SortOrder } from '../types/common';

// Base validation schemas
const uuidSchema = z.string().uuid('Invalid ID format');
const nonEmptyString = z.string().min(1, 'This field is required');
const optionalString = z.string().optional();
const optionalNumber = z.number().optional();
const positiveNumber = z.number().min(0, 'Must be a positive number');
const emailSchema = z.string().email('Invalid email address');
const phoneSchema = z.string().regex(/^[+]?[\d\s\-\(\)]+$/, 'Invalid phone number');

// Common schemas
export const UuidSchema = uuidSchema;
export const NonEmptyStringSchema = nonEmptyString;
export const OptionalStringSchema = optionalString;
export const PositiveNumberSchema = positiveNumber;
export const EmailSchema = emailSchema;
export const PhoneSchema = phoneSchema;

// Pagination schemas
export const PaginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export const SortSchema = z.object({
  sort_by: optionalString,
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});

// Search schemas
export const SearchSchema = z.object({
  query: optionalString,
  ...PaginationSchema.shape,
  ...SortSchema.shape,
});

// File upload schemas
export const FileUploadSchema = z.object({
  url: z.string().url('Invalid URL'),
  alt_text: optionalString,
});

// Address schema
export const AddressSchema = z.object({
  street: nonEmptyString.max(200, 'Street address must be less than 200 characters'),
  city: nonEmptyString.max(100, 'City must be less than 100 characters'),
  state: nonEmptyString.max(100, 'State must be less than 100 characters'),
  postal_code: nonEmptyString.max(20, 'Postal code must be less than 20 characters'),
  country: nonEmptyString.max(100, 'Country must be less than 100 characters'),
});

// Contact info schema
export const ContactInfoSchema = z.object({
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
  website: z.string().url('Invalid website URL').optional(),
});

// Money schema
export const MoneySchema = z.object({
  amount: positiveNumber.max(999999999, 'Amount is too large'),
  currency: z.string().length(3, 'Currency must be a 3-letter code'),
});

// Date range schema
export const DateRangeSchema = z.object({
  start: z.string().datetime('Invalid start date'),
  end: z.string().datetime('Invalid end date'),
}).refine((data) => new Date(data.start) <= new Date(data.end), {
  message: 'Start date must be before or equal to end date',
  path: ['start'],
});

// User schemas
export const CreateUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters').optional(),
  email: emailSchema.optional(),
  role: z.nativeEnum(UserRole).optional(),
  permissions: z.array(z.nativeEnum(Permission)).optional(),
});

export const UpdateUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters').optional(),
  email: emailSchema.optional(),
  role: z.nativeEnum(UserRole).optional(),
  permissions: z.array(z.nativeEnum(Permission)).optional(),
});

// Store schemas
export const CreateStoreSchema = z.object({
  name: z.string().min(1, 'Store name is required').max(100, 'Store name must be less than 100 characters'),
  slug: z.string().min(1, 'Slug is required').max(100, 'Slug must be less than 100 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  logo_url: z.string().url('Invalid logo URL').optional(),
  contact_info: ContactInfoSchema.optional(),
  address: AddressSchema.optional(),
  settings: z.object({
    currency: z.string().length(3, 'Currency must be a 3-letter code').default('INR'),
    timezone: z.string().default('Asia/Kolkata'),
    tax_rate: z.number().min(0).max(1).default(0.18),
    shipping_enabled: z.boolean().default(true),
    rental_enabled: z.boolean().default(true),
  }).default(() => ({
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    tax_rate: 0.18,
    shipping_enabled: true,
    rental_enabled: true,
  })),
  is_active: z.boolean().default(true),
});

export const UpdateStoreSchema = z.object({
  name: z.string().min(1, 'Store name is required').max(100, 'Store name must be less than 100 characters').optional(),
  slug: z.string().min(1, 'Slug is required').max(100, 'Slug must be less than 100 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .optional(),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  logo_url: z.string().url('Invalid logo URL').optional(),
  contact_info: ContactInfoSchema.optional(),
  address: AddressSchema.optional(),
  settings: z.object({
    currency: z.string().length(3, 'Currency must be a 3-letter code').optional(),
    timezone: z.string().optional(),
    tax_rate: z.number().min(0).max(1).optional(),
    shipping_enabled: z.boolean().optional(),
    rental_enabled: z.boolean().optional(),
  }).optional(),
  is_active: z.boolean().optional(),
});

// (Customer schemas moved to customer.schema.ts)

// API Response schemas
export const ApiResponseSchema = <T>(dataSchema: z.ZodType<T>) => z.object({
  data: dataSchema,
  message: optionalString,
  success: z.boolean(),
});

export const PaginatedResponseSchema = <T>(dataSchema: z.ZodType<T>) => z.object({
  data: z.array(dataSchema),
  pagination: z.object({
    page: z.number().int().min(1),
    limit: z.number().int().min(1),
    total: z.number().int().min(0),
    total_pages: z.number().int().min(0),
    has_next: z.boolean(),
    has_prev: z.boolean(),
  }),
});

// Validation helpers
export const validateSlug = (slug: string): boolean => {
  return /^[a-z0-9-]+$/.test(slug);
};

export const generateSlug = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
};

export const validateUuid = (id: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

// Type exports
export type PaginationInput = z.infer<typeof PaginationSchema>;
export type SortInput = z.infer<typeof SortSchema>;
export type SearchInput = z.infer<typeof SearchSchema>;
export type FileUploadInput = z.infer<typeof FileUploadSchema>;
export type AddressInput = z.infer<typeof AddressSchema>;
export type ContactInfoInput = z.infer<typeof ContactInfoSchema>;
export type MoneyInput = z.infer<typeof MoneySchema>;
export type DateRangeInput = z.infer<typeof DateRangeSchema>;
export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type CreateStoreInput = z.infer<typeof CreateStoreSchema>;
export type UpdateStoreInput = z.infer<typeof UpdateStoreSchema>;

