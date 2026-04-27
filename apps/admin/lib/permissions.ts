/**
 * Role-Based Access Control (RBAC)
 *
 * Defines what each role can access in the admin panel.
 *
 * - Super Admin: Full access to everything, can create Admin accounts
 * - Admin: Full access to everything across all branches
 * - Manager: Products, categories, orders, dashboard. Locked to assigned branch (no branch switching)
 * - Staff: Orders only. Locked to their branch.
 *
 * @module lib/permissions
 */

import type { StaffRole } from '@/domain/types/branch';

export type Permission =
  | 'dashboard'
  | 'products'
  | 'categories'
  | 'branches'
  | 'staff'
  | 'banners'
  | 'orders'
  | 'customers'
  | 'settings'
  | 'switch_branches'
  | 'create_admin';

const rolePermissions: Record<StaffRole, Permission[]> = {
  super_admin: [
    'dashboard', 'products', 'categories', 'branches', 'staff',
    'banners', 'orders', 'customers', 'settings', 'switch_branches', 'create_admin',
  ],
  admin: [
    'dashboard', 'products', 'categories', 'branches', 'staff',
    'banners', 'orders', 'customers', 'settings', 'switch_branches',
  ],
  manager: [
    'dashboard', 'products', 'categories',
    'banners', 'orders', 'customers',
  ],
  staff: [
    'dashboard', 'orders',
  ],
};

/**
 * Check if a role has a specific permission.
 */
export function hasPermission(role: StaffRole, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) ?? false;
}

/**
 * Get all permissions for a role.
 */
export function getPermissions(role: StaffRole): Permission[] {
  return rolePermissions[role] || [];
}

/**
 * Map sidebar href to permission key.
 */
export const routePermissionMap: Record<string, Permission> = {
  '/dashboard': 'dashboard',
  '/dashboard/products': 'products',
  '/dashboard/categories': 'categories',
  '/dashboard/branches': 'branches',
  '/dashboard/staff': 'staff',
  '/dashboard/banners': 'banners',
  '/dashboard/orders': 'orders',
  '/dashboard/calendar': 'orders',
  '/dashboard/customers': 'customers',
  '/dashboard/settings': 'settings',
};
