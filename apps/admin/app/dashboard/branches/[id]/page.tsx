"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2, MapPin, Phone, Edit, Trash2, Mail, Shield, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AddButton from "@/components/admin/AddButton";
import Modal from "@/components/admin/Modal";
import PasswordInput from "@/components/admin/PasswordInput";
import { useBranch, useStaffByBranch, useCreateStaff, useUpdateStaff, useDeleteStaff, useBranches } from "@/hooks";
import type { Staff, StaffRole } from "@/domain/types/branch";

export default function BranchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = params.id as string;
  const { branch, isLoading } = useBranch(branchId);
  const { staff, isLoading: staffLoading } = useStaffByBranch(branchId);
  const { branches } = useBranches();
  const createStaff = useCreateStaff();
  const updateStaff = useUpdateStaff();
  const deleteStaff = useDeleteStaff();

  const [showModal, setShowModal] = useState(false);
  const [editStaff, setEditStaff] = useState<Staff | null>(null);
  const [role, setRole] = useState<StaffRole>("staff");
  const [staffBranch, setStaffBranch] = useState(branchId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
      </div>
    );
  }

  if (!branch) {
    return (
      <div className="text-center py-20">
        <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-slate-700 mb-2">Branch Not Found</h2>
        <Link href="/dashboard/branches"><Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" />Back</Button></Link>
      </div>
    );
  }

  const handleDelete = (s: Staff) => {
    if (!confirm(`Delete staff "${s.name}"? Their login will also be removed.`)) return;
    deleteStaff.mutate(s.id);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    try {
      if (editStaff) {
        await updateStaff.mutateAsync({
          id: editStaff.id,
          data: {
            name: fd.get("name") as string,
            email: fd.get("email") as string,
            phone: (fd.get("phone") as string) || undefined,
            role,
            branch_id: staffBranch,
          },
        });
      } else {
        await createStaff.mutateAsync({
          name: fd.get("name") as string,
          email: fd.get("email") as string,
          password: fd.get("password") as string,
          phone: (fd.get("phone") as string) || undefined,
          role,
          branch_id: staffBranch,
        });
      }
      setShowModal(false);
      setEditStaff(null);
    } catch {
      // Error handled by mutation's onError (shows toast)
    }
  };

  const openCreate = () => { setEditStaff(null); setRole("staff"); setStaffBranch(branchId); setShowModal(true); };
  const openEdit = (s: Staff) => { setEditStaff(s); setRole(s.role); setStaffBranch(s.branch_id); setShowModal(true); };

  const roleColors: Record<StaffRole, string> = {
    admin: "bg-red-100 text-red-700",
    manager: "bg-amber-100 text-amber-700",
    staff: "bg-blue-100 text-blue-700",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/branches"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" />Back</Button></Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">{branch.name}</h1>
              {branch.is_main && <Badge className="bg-violet-100 text-violet-700">Main</Badge>}
            </div>
            <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{branch.address}</span>
              {branch.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{branch.phone}</span>}
            </div>
          </div>
        </div>
        <AddButton label="Add Staff" onClick={openCreate} />
      </div>

      {/* Staff Table */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-sm font-semibold text-slate-700">Staff Members ({staff.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {staffLoading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
            </div>
          ) : staff.length === 0 ? (
            <div className="p-12 text-center">
              <UserIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No staff in this branch yet.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left p-4 font-semibold text-slate-700">Name</th>
                  <th className="text-left p-4 font-semibold text-slate-700">Email</th>
                  <th className="text-left p-4 font-semibold text-slate-700">Phone</th>
                  <th className="text-left p-4 font-semibold text-slate-700">Role</th>
                  <th className="text-left p-4 font-semibold text-slate-700">Status</th>
                  <th className="text-left p-4 font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((s: Staff) => (
                  <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center text-sm font-bold text-violet-600">
                          {s.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-slate-900">{s.name}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5 text-sm text-slate-600"><Mail className="w-3.5 h-3.5 text-slate-400" />{s.email}</div>
                    </td>
                    <td className="p-4 text-sm text-slate-600">{s.phone || "—"}</td>
                    <td className="p-4">
                      <Badge className={roleColors[s.role]}>
                        <Shield className="w-3 h-3 mr-1" />{s.role}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <Badge className={s.is_active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-700"}>
                        {s.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-1">
                        <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors" onClick={() => openEdit(s)} title="Edit">
                          <Edit className="w-4 h-4 text-slate-400" />
                        </button>
                        <button className="p-2 hover:bg-red-50 rounded-lg transition-colors" onClick={() => handleDelete(s)} title="Delete">
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Staff Modal */}
      <Modal open={showModal} onClose={() => { setShowModal(false); setEditStaff(null); }} title={editStaff ? "Edit Staff" : "Add Staff Member"}>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Full Name *</label>
            <Input name="name" defaultValue={editStaff?.name || ""} placeholder="John Doe" required className="mt-1 h-10" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Email *</label>
            <Input name="email" type="email" defaultValue={editStaff?.email || ""} placeholder="staff@parisbridals.com" required className="mt-1 h-10" />
          </div>
          {!editStaff && (
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Password *</label>
              <PasswordInput name="password" placeholder="Min 6 characters" required minLength={6} className="mt-1 h-10" />
            </div>
          )}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Phone</label>
            <Input name="phone" defaultValue={editStaff?.phone || ""} placeholder="+91 9876543210" className="mt-1 h-10" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Role *</label>
            <Select value={role} onValueChange={(v) => setRole(v as StaffRole)}>
              <SelectTrigger className="mt-1 h-10 bg-white border-slate-200"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-white border border-slate-200 shadow-lg">
                <SelectItem value="admin" className="hover:bg-slate-100 focus:bg-slate-100">Admin</SelectItem>
                <SelectItem value="manager" className="hover:bg-slate-100 focus:bg-slate-100">Manager</SelectItem>
                <SelectItem value="staff" className="hover:bg-slate-100 focus:bg-slate-100">Staff</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Branch *</label>
            <Select value={staffBranch} onValueChange={setStaffBranch}>
              <SelectTrigger className="mt-1 h-10 bg-white border-slate-200"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-white border border-slate-200 shadow-lg">
                {branches.map((b: any) => (
                  <SelectItem key={b.id} value={b.id} className="hover:bg-slate-100 focus:bg-slate-100">{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <Button type="button" variant="ghost" onClick={() => { setShowModal(false); setEditStaff(null); }}>Cancel</Button>
            <Button type="submit" disabled={createStaff.isPending || updateStaff.isPending} className="bg-violet-600 hover:bg-violet-700 text-white px-6">
              {(createStaff.isPending || updateStaff.isPending) ? "Saving..." : editStaff ? "Update" : "Add Staff"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
