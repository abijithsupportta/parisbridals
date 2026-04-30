/**
 * Staff Detail Page
 *
 * Displays a staff member's full profile with contact info,
 * role/branch assignment, and system metadata.
 * Matches the product detail page layout pattern.
 *
 * @module app/dashboard/staff/[id]/page
 */

"use client";

import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Edit,
  AlertTriangle,
  Mail,
  Phone,
  Building2,
  Shield,
  Calendar,
  UserCircle,
  UserCheck,
  UserX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Modal from "@/components/admin/Modal";
import { useStaffMember, useToggleStaffStatus } from "@/hooks";
import { useState } from "react";
import type { StaffRole } from "@/domain/types/branch";

const roleColors: Record<StaffRole, string> = {
  super_admin: "bg-purple-100 text-purple-700 border-purple-200",
  admin: "bg-red-100 text-red-700 border-red-200",
  manager: "bg-amber-100 text-amber-700 border-amber-200",
  staff: "bg-blue-100 text-blue-700 border-blue-200",
};

const roleLabels: Record<StaffRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  manager: "Manager",
  staff: "Staff",
};

export default function StaffDetailPage() {
  const params = useParams();
  const router = useRouter();
  const staffId = params.id as string;
  const { staff, isLoading } = useStaffMember(staffId);
  const toggleStatus = useToggleStaffStatus();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const handleToggle = async () => {
    if (!staff) return;
    try {
      await toggleStatus.mutateAsync({
        id: staffId,
        is_active: !staff.is_active,
      });
      // If deactivating, navigate back to list
      if (staff.is_active) {
        router.push("/dashboard/staff");
      }
    } catch {
      // Error toast shown by hook
    } finally {
      setIsDeleteModalOpen(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 pb-12">
        {/* Header skeleton */}
        <div className="flex items-start gap-4">
          <div className="w-9 h-9 bg-slate-200 rounded-lg animate-pulse" />
          <div className="space-y-2 flex-1">
            <div className="h-7 w-48 bg-slate-200 rounded animate-pulse" />
            <div className="h-4 w-32 bg-slate-100 rounded animate-pulse" />
          </div>
        </div>
        {/* Cards skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-slate-200 rounded-lg p-6 h-48 animate-pulse" />
          </div>
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-lg p-6 h-40 animate-pulse" />
            <div className="bg-white border border-slate-200 rounded-lg p-6 h-32 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!staff) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 p-12 text-center">
          <UserCircle className="mb-4 h-12 w-12 text-slate-300" />
          <h3 className="mb-2 text-lg font-semibold text-slate-900">
            Staff Member Not Found
          </h3>
          <p className="mb-6 text-sm text-slate-500 max-w-sm">
            The staff member you are looking for does not exist or has been
            removed.
          </p>
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard/staff")}
          >
            Return to Staff
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* ── Page Header ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push("/dashboard/staff")}
            className="w-9 h-9 mt-0.5 shrink-0 border-slate-200 text-slate-500 hover:text-slate-900 bg-white"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {staff.name}
              </h1>
              <Badge
                className={`px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${roleColors[staff.role]}`}
              >
                <Shield className="w-3 h-3 mr-1" />
                {roleLabels[staff.role]}
              </Badge>
              <Badge
                variant="secondary"
                className={`px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${
                  staff.is_active
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {staff.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              {staff.branch?.name || "No branch"} • Joined{" "}
              {new Date(staff.created_at).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => router.push(`/dashboard/staff/${staff.id}/edit`)}
            className="gap-2 bg-slate-900 text-white hover:bg-slate-800"
          >
            <Edit className="h-4 w-4" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDeleteModalOpen(true)}
            className={`gap-2 ${staff.is_active
              ? "border-amber-200 text-amber-700 hover:bg-amber-50 hover:border-amber-300"
              : "border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300"
            } bg-white`}
          >
            {staff.is_active ? (
              <><UserX className="h-4 w-4" /> Deactivate</>
            ) : (
              <><UserCheck className="h-4 w-4" /> Activate</>
            )}
          </Button>
        </div>
      </div>

      {/* ── Main Layout ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* LEFT COLUMN: Contact Information */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-sm border-slate-200 bg-white">
            <CardHeader className="border-b border-slate-200 py-4 px-6">
              <CardTitle className="text-base font-semibold text-slate-900">
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <dl className="divide-y divide-slate-100">
                <div className="px-6 py-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-violet-600">
                      {staff.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Full Name
                    </dt>
                    <dd className="text-sm font-semibold text-slate-900 mt-0.5">
                      {staff.name}
                    </dd>
                  </div>
                </div>

                <div className="px-6 py-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4 text-slate-500" />
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Email
                    </dt>
                    <dd className="text-sm font-medium text-slate-900 mt-0.5">
                      {staff.email}
                    </dd>
                  </div>
                </div>

                <div className="px-6 py-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    <Phone className="w-4 h-4 text-slate-500" />
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Phone
                    </dt>
                    <dd className="text-sm font-medium text-slate-900 mt-0.5">
                      {staff.phone || "Not provided"}
                    </dd>
                  </div>
                </div>

                <div className="px-6 py-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    <Building2 className="w-4 h-4 text-slate-500" />
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Branch
                    </dt>
                    <dd className="text-sm font-medium text-slate-900 mt-0.5">
                      {staff.branch?.name || "No branch assigned"}
                    </dd>
                  </div>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: System Info */}
        <div className="space-y-6">
          {/* Role Card */}
          <Card className="shadow-sm border-slate-200 bg-white">
            <CardHeader className="border-b border-slate-200 py-4 px-5">
              <CardTitle className="text-sm font-semibold text-slate-900">
                Role & Permissions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div
                className={`p-3 rounded-lg border ${roleColors[staff.role]}`}
              >
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  <span className="font-semibold text-sm">
                    {roleLabels[staff.role]}
                  </span>
                </div>
                <p className="text-xs mt-1 opacity-75">
                  {staff.role === "admin" &&
                    "Full access to all features and settings"}
                  {staff.role === "manager" &&
                    "Can manage products, orders, and view staff"}
                  {staff.role === "staff" &&
                    "View-only access with order operations"}
                  {staff.role === "super_admin" &&
                    "System-level access with all privileges"}
                </p>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>

      {/* ── Status Toggle Confirmation Modal ──────────────────────── */}
      <Modal
        open={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title={staff.is_active ? "Deactivate Staff Member" : "Activate Staff Member"}
        maxWidth="max-w-md"
      >
        <div className="p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${staff.is_active ? "bg-amber-50" : "bg-emerald-50"}`}>
              {staff.is_active ? (
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              ) : (
                <UserCheck className="w-5 h-5 text-emerald-600" />
              )}
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-900 mb-1">
                {staff.is_active ? "Confirm Deactivation" : "Confirm Activation"}
              </h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                {staff.is_active ? (
                  <>Are you sure you want to deactivate{" "}
                  <span className="font-semibold text-slate-900">{staff.name}</span>
                  ? This will revoke their login access immediately. Their data
                  will be preserved for historical records.</>
                ) : (
                  <>Are you sure you want to activate{" "}
                  <span className="font-semibold text-slate-900">{staff.name}</span>
                  ? This will restore their login access and they will be able to
                  use the system again.</>
                )}
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
              className="border-slate-200"
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={handleToggle}
              disabled={toggleStatus.isPending}
              className={staff.is_active
                ? "bg-amber-600 text-white hover:bg-amber-700 border-transparent"
                : "bg-emerald-600 text-white hover:bg-emerald-700 border-transparent"
              }
            >
              {toggleStatus.isPending
                ? (staff.is_active ? "Deactivating..." : "Activating...")
                : (staff.is_active ? "Deactivate Staff" : "Activate Staff")
              }
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
