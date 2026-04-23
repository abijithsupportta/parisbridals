"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, MapPin, Phone, Edit, Trash2, Users, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AddButton from "@/components/admin/AddButton";
import { useBranches, useCreateBranch, useUpdateBranch, useDeleteBranch } from "@/hooks";
import { useAppStore } from "@/stores";
import type { Branch, BranchWithStaffCount } from "@/domain/types/branch";

export default function BranchesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editBranch, setEditBranch] = useState<BranchWithStaffCount | null>(null);

  const { branches, isLoading } = useBranches();
  const createBranch = useCreateBranch();
  const updateBranch = useUpdateBranch();
  const deleteBranch = useDeleteBranch();
  const { showError } = useAppStore();

  const filtered = branches.filter((b: BranchWithStaffCount) =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async (branch: BranchWithStaffCount) => {
    if (!confirm(`Delete "${branch.name}"? This cannot be undone.`)) return;
    deleteBranch.mutate(branch.id);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = {
      name: fd.get("name") as string,
      address: fd.get("address") as string,
      phone: (fd.get("phone") as string) || undefined,
      is_main: fd.get("is_main") === "on",
      is_active: true,
    };

    try {
      if (editBranch) {
        await updateBranch.mutateAsync({ id: editBranch.id, data });
      } else {
        await createBranch.mutateAsync(data);
      }
      setShowModal(false);
      setEditBranch(null);
    } catch {
      // Error is handled by the mutation's onError callback (shows toast)
    }
  };

  const openCreate = () => { setEditBranch(null); setShowModal(true); };
  const openEdit = (b: BranchWithStaffCount) => { setEditBranch(b); setShowModal(true); };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Branches</h1>
          <p className="text-slate-500 mt-1">Manage your store branches ({branches.length} total)</p>
        </div>
        <AddButton label="Add Branch" onClick={openCreate} />
      </div>

      {/* Search */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search branches..."
              className="pl-10 bg-slate-50 border-slate-200"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
              <p className="text-slate-500 mt-2">Loading branches...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">{searchQuery ? "No branches found" : "No branches yet. Create your first branch."}</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left p-4 font-semibold text-slate-700">Branch</th>
                  <th className="text-left p-4 font-semibold text-slate-700">Address</th>
                  <th className="text-left p-4 font-semibold text-slate-700">Phone</th>
                  <th className="text-left p-4 font-semibold text-slate-700">Staff</th>
                  <th className="text-left p-4 font-semibold text-slate-700">Status</th>
                  <th className="text-left p-4 font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((branch: BranchWithStaffCount) => (
                  <tr key={branch.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <Link href={`/dashboard/branches/${branch.id}`} className="group">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-violet-500" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 group-hover:text-violet-600 transition-colors">{branch.name}</p>
                            {branch.is_main && <span className="text-[10px] font-bold uppercase text-violet-500">Main Branch</span>}
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5 text-sm text-slate-600">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[200px]">{branch.address}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      {branch.phone ? (
                        <div className="flex items-center gap-1.5 text-sm text-slate-600">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />{branch.phone}
                        </div>
                      ) : <span className="text-sm text-slate-400">—</span>}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-sm font-medium text-slate-700">{branch.staff_count ?? 0}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge className={branch.is_active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-700"}>
                        {branch.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-1">
                        <Link href={`/dashboard/branches/${branch.id}`} className="p-2 hover:bg-slate-100 rounded-lg transition-colors" title="View">
                          <Users className="w-4 h-4 text-slate-400" />
                        </Link>
                        <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors" onClick={() => openEdit(branch)} title="Edit">
                          <Edit className="w-4 h-4 text-slate-400" />
                        </button>
                        <button className="p-2 hover:bg-red-50 rounded-lg transition-colors" onClick={() => handleDelete(branch)} title="Delete">
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

      {/* Create/Edit Modal — same structure as products */}
      {showModal && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => { setShowModal(false); setEditBranch(null); }} />
          <div className="relative z-50 flex items-start justify-center min-h-full p-4 pt-8">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
              <div className="p-5 border-b border-slate-100">
                <h2 className="text-lg font-semibold text-slate-800">{editBranch ? "Edit Branch" : "Create Branch"}</h2>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Branch Name *</label>
                  <Input name="name" defaultValue={editBranch?.name || ""} placeholder="e.g. Main Store" required className="mt-1 h-10" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Address *</label>
                  <Input name="address" defaultValue={editBranch?.address || ""} placeholder="Full address" required className="mt-1 h-10" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Phone</label>
                  <Input name="phone" defaultValue={editBranch?.phone || ""} placeholder="+91 9876543210" className="mt-1 h-10" />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" name="is_main" id="is_main" defaultChecked={editBranch?.is_main || false} className="rounded border-slate-300" />
                  <label htmlFor="is_main" className="text-sm text-slate-700">Main Branch</label>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="ghost" onClick={() => { setShowModal(false); setEditBranch(null); }}>Cancel</Button>
                  <Button type="submit" disabled={createBranch.isPending || updateBranch.isPending} className="bg-violet-600 hover:bg-violet-700 text-white px-6">
                    {editBranch ? "Update" : "Create Branch"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
