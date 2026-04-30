/**
 * Staff List Page
 *
 * Displays all staff members with stat cards, search/filter bar,
 * data table with shimmer loading, and delete confirmation modal.
 *
 * Performance: uses staleTime on the useStaff hook to avoid
 * unnecessary refetches; client-side filtering avoids API calls
 * for search/branch/role changes; useMemo prevents re-computation.
 *
 * @module app/dashboard/staff/page
 */

"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Edit,
  Eye,
  Plus,
  Mail,
  Shield,
  Building2,
  AlertTriangle,
  UserCircle,
  UserCheck,
  UserX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Modal from "@/components/admin/Modal";
import { useStaff, useSimpleBranches as useBranches, useToggleStaffStatus } from "@/hooks";
import type { StaffWithBranch, StaffRole } from "@/domain/types/branch";

const roleColors: Record<StaffRole, string> = {
  super_admin: "bg-purple-100 text-purple-700",
  admin: "bg-red-100 text-red-700",
  manager: "bg-amber-100 text-amber-700",
  staff: "bg-blue-100 text-blue-700",
};

export default function StaffPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterBranch, setFilterBranch] = useState("all");
  const [filterRole, setFilterRole] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<StaffWithBranch | null>(null);

  const { staff, isLoading } = useStaff();
  const { branches } = useBranches();
  const toggleStatus = useToggleStaffStatus();

  // Client-side filtering — staff list is always small (<50), no API calls needed
  const filtered = useMemo(() => {
    return staff.filter((s: StaffWithBranch) => {
      const matchQuery =
        !searchQuery ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchBranch =
        filterBranch === "all" || s.branch_id === filterBranch;
      const matchRole = filterRole === "all" || s.role === filterRole;
      return matchQuery && matchBranch && matchRole;
    });
  }, [staff, searchQuery, filterBranch, filterRole]);

  // Client-side stats — computed from cached data, no extra API call
  const stats = useMemo(() => {
    const total = staff.length;
    const active = staff.filter((s: StaffWithBranch) => s.is_active).length;
    const inactive = total - active;
    const admins = staff.filter(
      (s: StaffWithBranch) =>
        s.role === "admin" || s.role === "super_admin"
    ).length;
    const managers = staff.filter(
      (s: StaffWithBranch) => s.role === "manager"
    ).length;
    return { total, active, inactive, admins, managers };
  }, [staff]);

  const handleConfirmToggle = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await toggleStatus.mutateAsync({
        id: deleteTarget.id,
        is_active: !deleteTarget.is_active,
      });
    } catch {
      // Error handled by hook
    } finally {
      setDeleteTarget(null);
    }
  }, [deleteTarget, toggleStatus]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Staff Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage staff accounts and permissions ({stats.total} total)
          </p>
        </div>
        <Button
          asChild
          className="gap-2 bg-slate-900 text-white hover:bg-slate-800"
          disabled={branches.length === 0}
        >
          <Link href="/dashboard/staff/create">
            <Plus className="w-4 h-4" />
            Add Staff
          </Link>
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Staff"
          value={isLoading ? null : String(stats.total)}
          subtext="All staff members"
        />
        <StatCard
          label="Active"
          value={isLoading ? null : String(stats.active)}
          subtext="Can access the system"
        />
        <StatCard
          label="Admins & Managers"
          value={
            isLoading ? null : String(stats.admins + stats.managers)
          }
          subtext="Full or elevated access"
        />
        <StatCard
          label="Inactive"
          value={isLoading ? null : String(stats.inactive)}
          subtext="Login disabled"
          alert={stats.inactive > 0}
        />
      </div>

      {/* Search + Filters */}
      <Card className="shadow-sm border-slate-200 bg-white">
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search by name or email..."
              className="pl-9 border-slate-200 focus:border-slate-900"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <Select value={filterBranch} onValueChange={setFilterBranch}>
              <SelectTrigger className="w-40 h-9 bg-white border-slate-200 text-sm">
                <SelectValue placeholder="All Branches" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-slate-200 shadow-lg">
                <SelectItem
                  value="all"
                  className="hover:bg-slate-100 focus:bg-slate-100"
                >
                  All Branches
                </SelectItem>
                {branches.map((b: any) => (
                  <SelectItem
                    key={b.id}
                    value={b.id}
                    className="hover:bg-slate-100 focus:bg-slate-100"
                  >
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-36 h-9 bg-white border-slate-200 text-sm">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-slate-200 shadow-lg">
                <SelectItem
                  value="all"
                  className="hover:bg-slate-100 focus:bg-slate-100"
                >
                  All Roles
                </SelectItem>
                <SelectItem
                  value="admin"
                  className="hover:bg-slate-100 focus:bg-slate-100"
                >
                  Admin
                </SelectItem>
                <SelectItem
                  value="manager"
                  className="hover:bg-slate-100 focus:bg-slate-100"
                >
                  Manager
                </SelectItem>
                <SelectItem
                  value="staff"
                  className="hover:bg-slate-100 focus:bg-slate-100"
                >
                  Staff
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Staff Table */}
      <Card className="shadow-sm border-slate-200 overflow-hidden bg-white">
        {isLoading ? (
          /* Shimmer loading skeleton */
          <div className="divide-y divide-slate-100">
            <div className="hidden md:grid grid-cols-[1fr_180px_140px_100px_100px_100px] gap-4 p-4 bg-slate-50/50">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="h-4 bg-slate-200 rounded animate-pulse"
                  style={{ width: `${50 + ((i * 15) % 50)}%` }}
                />
              ))}
            </div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4">
                <div className="h-9 w-9 bg-slate-100 rounded-full animate-pulse shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-1/3 bg-slate-100 rounded animate-pulse" />
                  <div className="h-3 w-1/4 bg-slate-50 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          /* Empty state */
          <div className="p-16 text-center">
            <UserCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-slate-900 mb-1">
              {searchQuery || filterBranch !== "all" || filterRole !== "all"
                ? "No Staff Found"
                : "No Staff Yet"}
            </h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              {searchQuery || filterBranch !== "all" || filterRole !== "all"
                ? "Try adjusting your search or filters."
                : "Add your first staff member to get started."}
            </p>
            {!searchQuery && filterBranch === "all" && filterRole === "all" && (
              <Button
                className="mt-6 bg-slate-900 text-white hover:bg-slate-800"
                onClick={() => router.push("/dashboard/staff/create")}
              >
                Add Staff Member
              </Button>
            )}
          </div>
        ) : (
          /* Data table */
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Branch</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((s: StaffWithBranch) => (
                  <tr
                    key={s.id}
                    className="hover:bg-slate-50 transition-colors group"
                  >
                    <td className="px-4 py-4">
                      <Link
                        href={`/dashboard/staff/${s.id}`}
                        className="flex items-center gap-3"
                      >
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center text-sm font-bold text-violet-600 shrink-0">
                          {s.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-slate-900 group-hover:text-slate-600 transition-colors">
                          {s.name}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5 text-sm text-slate-600">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        {s.email}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5 text-sm text-slate-600">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        {s.branch?.name || "—"}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <Badge className={roleColors[s.role]}>
                        <Shield className="w-3 h-3 mr-1" />
                        {s.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-4">
                      <Badge
                        variant="secondary"
                        className={`text-xs font-medium px-2 py-0.5 ${
                          s.is_active
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}
                      >
                        {s.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-8 h-8 text-slate-400 hover:text-slate-900"
                          asChild
                        >
                          <Link href={`/dashboard/staff/${s.id}`}>
                            <Eye className="w-4 h-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-8 h-8 text-slate-400 hover:text-slate-900"
                          asChild
                        >
                          <Link href={`/dashboard/staff/${s.id}/edit`}>
                            <Edit className="w-4 h-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTarget(s)}
                          className={`w-8 h-8 text-slate-400 ${s.is_active ? "hover:text-amber-600 hover:bg-amber-50" : "hover:text-emerald-600 hover:bg-emerald-50"}`}
                          title={s.is_active ? "Deactivate" : "Activate"}
                        >
                          {s.is_active ? (
                            <UserX className="w-4 h-4" />
                          ) : (
                            <UserCheck className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Status Toggle Confirmation Modal */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={deleteTarget?.is_active ? "Deactivate Staff Member" : "Activate Staff Member"}
        maxWidth="max-w-md"
      >
        <div className="p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${deleteTarget?.is_active ? "bg-amber-50" : "bg-emerald-50"}`}>
              {deleteTarget?.is_active ? (
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              ) : (
                <UserCheck className="w-5 h-5 text-emerald-600" />
              )}
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-900 mb-1">
                {deleteTarget?.is_active ? "Confirm Deactivation" : "Confirm Activation"}
              </h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                {deleteTarget?.is_active ? (
                  <>Are you sure you want to deactivate{" "}
                  <span className="font-semibold text-slate-900">{deleteTarget?.name}</span>
                  ? This will revoke their login access immediately. Their data
                  will be preserved for historical records.</>
                ) : (
                  <>Are you sure you want to activate{" "}
                  <span className="font-semibold text-slate-900">{deleteTarget?.name}</span>
                  ? This will restore their login access and they will be able to
                  use the system again.</>
                )}
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              className="border-slate-200"
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={handleConfirmToggle}
              disabled={toggleStatus.isPending}
              className={deleteTarget?.is_active
                ? "bg-amber-600 text-white hover:bg-amber-700 border-transparent"
                : "bg-emerald-600 text-white hover:bg-emerald-700 border-transparent"
              }
            >
              {toggleStatus.isPending
                ? (deleteTarget?.is_active ? "Deactivating..." : "Activating...")
                : (deleteTarget?.is_active ? "Deactivate Staff" : "Activate Staff")
              }
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ── Minimalist Professional Stat Card ──────────────────── */
function StatCard({
  label,
  value,
  subtext,
  alert,
}: {
  label: string;
  value: string | null;
  subtext?: string;
  alert?: boolean;
}) {
  return (
    <Card className="shadow-sm border-slate-200 bg-white overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {label}
          </p>
          {alert && (
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          )}
        </div>
        <div className="space-y-1">
          {value === null ? (
            <div className="h-8 w-16 bg-slate-100 animate-pulse rounded" />
          ) : (
            <p
              className={`text-2xl font-bold tracking-tight ${
                alert ? "text-red-600" : "text-slate-900"
              }`}
            >
              {value}
            </p>
          )}
          {subtext && (
            <p className="text-xs font-medium text-slate-500">{subtext}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
