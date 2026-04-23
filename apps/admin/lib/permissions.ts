/**
 * Role-Based Access Control (RBAC)
 *
 * Defines what each role can access in the admin panel.
 *
 * - Admin: Full access to everything
 * - Manager: Products, categories, orders, banners, dashboard. Can switch branches.
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
  | 'switch_branches';

const rolePermissions: Record<StaffRole, Permission[]> = {
  admin: [
    'dashboard', 'products', 'categories', 'branches', 'staff',
    'banners', 'orders', 'customers', 'settings', 'switch_branches',
  ],
  manager: [
    'dashboard', 'products', 'categories',
    'banners', 'orders', 'customers', 'switch_branches',
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
  '/dashboard/customers': 'customers',
  '/dashboard/settings': 'settings',
};
