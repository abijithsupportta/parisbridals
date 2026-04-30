import { z } from 'zod';

export const ID_TYPES = ['Aadhaar', 'PAN', 'Driving Licence', 'Passport', 'Others'] as const;

/**
 * Common schema for validating a customer
 */
const baseCustomerSchema = {
  name: z.string().min(2, "Name must be at least 2 characters").max(255),
  phone: z.string().min(10, "Phone number must be at least 10 characters").max(20),
  alt_phone: z.string().min(10, "Alternate phone must be at least 10 characters").max(20).optional().or(z.literal('')).nullable(),
  email: z.string().email("Invalid email address").optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  gstin: z.string().optional().or(z.literal('')),
  photo_url: z.string().url().optional().or(z.literal('')),
  id_type: z.enum(ID_TYPES).optional().nullable(),
  id_number: z.string().optional().or(z.literal('')),
  id_documents: z.array(
    z.object({
      url: z.string().url(),
      type: z.enum(['front', 'back']),
    })
  ).optional().default([]),
};

/**
 * Schema for creating a new customer
 */
export const CreateCustomerSchema = z.object(baseCustomerSchema);

/**
 * Schema for updating an existing customer
 */
export const UpdateCustomerSchema = z.object(baseCustomerSchema).partial();

/**
 * Schema for searching customers
 */
export const CustomerSearchSchema = z.object({
  query: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().optional().default(20),
  sort_by: z.string().optional().default('created_at'),
  sort_order: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type CreateCustomerInput = z.infer<typeof CreateCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof UpdateCustomerSchema>;
