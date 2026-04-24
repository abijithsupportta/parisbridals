"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { Search, MapPin, Phone, Edit, Trash2, Users, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AddButton from "@/components/admin/AddButton";
import Modal from "@/components/admin/Modal";
import { useBranches, useCreateBranch, useUpdateBranch, useDeleteBranch } from "@/hooks";
import type { Branch, BranchWithStaffCount } from "@/domain/types/branch";

export default function BranchesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editBranch, setEditBranch] = useState<BranchWithStaffCount | null>(null);

  const { branches, isLoading } = useBranches();
  const createBranch = useCreateBranch();
  const updateBranch = useUpdateBranch();
  const deleteBranch = useDeleteBranch();

  // Memoize filtered results
  const filtered = useMemo(() => {
    if (!searchQuery) return branches;
    const query = searchQuery.toLowerCase();
    return branches.filter((b: BranchWithStaffCount) =>
      b.name.toLowerCase().includes(query) ||
      b.address.toLowerCase().includes(query)
    );
  }, [branches, searchQuery]);

  const handleDelete = useCallback(async (branch: BranchWithStaffCount) => {
    if (!confirm(`Delete "${branch.name}"? This cannot be undone.`)) return;
    deleteBranch.mutate(branch.id);
  }, [deleteBranch]);

  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    // is_main is intentionally never sent from the form — main branch is fixed
    // at system setup and cannot be added/changed via this UI.
    const data = {
      name: fd.get("name") as string,
      address: fd.get("address") as string,
      phone: (fd.get("phone") as string) || undefined,
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
      // Error handled by mutation
    }
  }, [editBranch, createBranch, updateBranch]);

  const openCreate = useCallback(() => { 
    setEditBranch(null); 
    setShowModal(true); 
  }, []);

  const openEdit = useCallback((b: BranchWithStaffCount) => { 
    setEditBranch(b); 
    setShowModal(true); 
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setEditBranch(null);
  }, []);

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
                  <BranchRow 
                    key={branch.id} 
                    branch={branch} 
                    onEdit={openEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      {showModal && (
        <Modal open={showModal} onClose={closeModal} title={editBranch ? "Edit Branch" : "Create Branch"}>
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
            {editBranch?.is_main && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-violet-50 border border-violet-100">
                <Building2 className="w-4 h-4 text-violet-500" />
                <span className="text-sm font-medium text-violet-700">This is the Main Branch</span>
                <span className="ml-auto text-[10px] font-bold uppercase text-violet-500 bg-white px-2 py-0.5 rounded-full border border-violet-200">Fixed</span>
              </div>
            )}
            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
              <Button type="button" variant="ghost" onClick={closeModal}>Cancel</Button>
              <Button type="submit" disabled={createBranch.isPending || updateBranch.isPending} className="bg-violet-600 hover:bg-violet-700 text-white px-6">
                {(createBranch.isPending || updateBranch.isPending) ? "Saving..." : editBranch ? "Update" : "Create Branch"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// Memoized row component to prevent unnecessary re-renders
const BranchRow = ({ branch, onEdit, onDelete }: { 
  branch: BranchWithStaffCount; 
  onEdit: (b: BranchWithStaffCount) => void;
  onDelete: (b: BranchWithStaffCount) => void;
}) => (
  <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
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
        <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors" onClick={() => onEdit(branch)} title="Edit">
          <Edit className="w-4 h-4 text-slate-400" />
        </button>
        <button
          className="p-2 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          onClick={() => onDelete(branch)}
          disabled={branch.is_main}
          title={branch.is_main ? "The main branch cannot be deleted" : "Delete"}
        >
          <Trash2 className="w-4 h-4 text-red-400" />
        </button>
      </div>
    </td>
  </tr>
);
