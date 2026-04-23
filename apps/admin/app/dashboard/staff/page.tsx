"use client";

import { useState } from "react";
import { Search, Edit, Trash2, Mail, Shield, Building2, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AddButton from "@/components/admin/AddButton";
import Modal from "@/components/admin/Modal";
import PasswordInput from "@/components/admin/PasswordInput";
import { useStaff, useBranches, useCreateStaff, useUpdateStaff, useDeleteStaff } from "@/hooks";
import type { StaffWithBranch, StaffRole } from "@/domain/types/branch";

export default function StaffPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterBranch, setFilterBranch] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editStaff, setEditStaff] = useState<StaffWithBranch | null>(null);
  const [role, setRole] = useState<StaffRole>("staff");
  const [staffBranch, setStaffBranch] = useState("");

  const { staff, isLoading } = useStaff();
  const { branches } = useBranches();
  const createStaff = useCreateStaff();
  const updateStaff = useUpdateStaff();
  const deleteStaffMutation = useDeleteStaff();

  const filtered = staff.filter((s: StaffWithBranch) => {
    const matchQuery = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchBranch = filterBranch === "all" || s.branch_id === filterBranch;
    return matchQuery && matchBranch;
  });

  const handleDelete = (s: StaffWithBranch) => {
    if (!confirm(`Delete "${s.name}"? Their login will also be removed.`)) return;
    deleteStaffMutation.mutate(s.id);
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

  const openCreate = () => {
    setEditStaff(null);
    setRole("staff");
    setStaffBranch(branches[0]?.id || "");
    setShowModal(true);
  };

  const openEdit = (s: StaffWithBranch) => {
    setEditStaff(s);
    setRole(s.role);
    setStaffBranch(s.branch_id);
    setShowModal(true);
  };

  const roleColors: Record<StaffRole, string> = {
    admin: "bg-red-100 text-red-700",
    manager: "bg-amber-100 text-amber-700",
    staff: "bg-blue-100 text-blue-700",
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Staff</h1>
          <p className="text-slate-500 mt-1">Manage staff across all branches ({staff.length} total)</p>
        </div>
        <AddButton label="Add Staff" onClick={openCreate} disabled={branches.length === 0} />
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Search staff..." className="pl-10 bg-slate-50 border-slate-200" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <Select value={filterBranch} onValueChange={setFilterBranch}>
              <SelectTrigger className="w-48 h-10 bg-white border-slate-200"><SelectValue placeholder="All Branches" /></SelectTrigger>
              <SelectContent className="bg-white border border-slate-200 shadow-lg">
                <SelectItem value="all" className="hover:bg-slate-100 focus:bg-slate-100">All Branches</SelectItem>
                {branches.map((b: any) => (
                  <SelectItem key={b.id} value={b.id} className="hover:bg-slate-100 focus:bg-slate-100">{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
              <p className="text-slate-500 mt-2">Loading staff...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <UserIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">{searchQuery || filterBranch !== "all" ? "No staff found" : "No staff yet."}</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left p-4 font-semibold text-slate-700">Name</th>
                  <th className="text-left p-4 font-semibold text-slate-700">Email</th>
                  <th className="text-left p-4 font-semibold text-slate-700">Branch</th>
                  <th className="text-left p-4 font-semibold text-slate-700">Role</th>
                  <th className="text-left p-4 font-semibold text-slate-700">Status</th>
                  <th className="text-left p-4 font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s: StaffWithBranch) => (
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
                    <td className="p-4">
                      <div className="flex items-center gap-1.5 text-sm text-slate-600">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />{s.branch?.name || "—"}
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge className={roleColors[s.role]}><Shield className="w-3 h-3 mr-1" />{s.role}</Badge>
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
