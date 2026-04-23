/**
 * usePermissions Hook
 *
 * Reads the current user's role from app store and provides
 * permission checks for RBAC across the admin panel.
 *
 * @module hooks/usePermissions
 */

import { useAppStore } from '@/stores';
import { hasPermission, getPermissions, type Permission } from '@/lib/permissions';
import type { StaffRole } from '@/domain/types/branch';

export function usePermissions() {
  const user = useAppStore((s) => s.user);

  // Default to admin if no user is set (backward compat during development)
  const role: StaffRole = (user?.role as StaffRole) || 'admin';

  return {
    role,
    can: (permission: Permission) => hasPermission(role, permission),
    permissions: getPermissions(role),
    isAdmin: role === 'admin',
    isManager: role === 'manager',
    isStaff: role === 'staff',
  };
}
