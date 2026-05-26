"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Plus, Trash2, Edit, MapPin, Phone, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBranches, useDeleteBranch } from "@/hooks";
import { type Branch } from "@/domain";

export default function StoresPage() {
  const { branches, isLoading } = useBranches();
  const { mutate: deleteBranch, isPending: isDeleting } = useDeleteBranch();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = useCallback(async (branch: Branch) => {
    if (!confirm(`Are you sure you want to delete "${branch.name}"? This action cannot be undone.`)) return;
    setDeletingId(branch.id);
    deleteBranch(branch.id, {
      onSettled: () => setDeletingId(null),
    } as any);
  }, [deleteBranch]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Stores</h1>
          <p className="text-slate-500 mt-1">Manage store locations and branches</p>
        </div>
        <Link href="/dashboard/stores/create">
          <Button className="shadow-lg shadow-primary/25">
            <Plus className="w-4 h-4 mr-2" />
            Add Store
          </Button>
        </Link>
      </div>

      {/* Stores Grid */}
      {branches.length === 0 ? (
        <Card className="border-0 shadow-lg">
          <CardContent className="p-12 text-center">
            <p className="text-slate-500">No stores found. Click &quot;Add Store&quot; to create your first store.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {branches.map((branch) => (
            <Card key={branch.id} className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-200">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-md">
                  <span className="text-xl font-bold text-white">
                    {branch.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </span>
                </div>
                <div className="flex gap-1">
                  <Link href={`/dashboard/branches/${branch.id}`}>
                    <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors" title="Edit store">
                      <Edit className="w-4 h-4 text-slate-400" />
                    </button>
                  </Link>
                  <button
                    onClick={() => handleDelete(branch)}
                    disabled={isDeleting && deletingId === branch.id}
                    className="p-2 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Delete store"
                  >
                    {isDeleting && deletingId === branch.id ? (
                      <Loader2 className="w-4 h-4 text-red-400 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4 text-red-400" />
                    )}
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                <CardTitle className="text-lg mb-2 text-slate-900">{branch.name}</CardTitle>
                {branch.address && (
                  <div className="flex items-start gap-2 text-sm text-slate-500 mb-3">
                    <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{branch.address}</span>
                  </div>
                )}
                {!branch.address && (
                  <p className="text-sm text-slate-500 mb-3">No address provided</p>
                )}
                <div className="flex items-center gap-4 text-sm text-slate-600">
                  {branch.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" />
                      <span className="font-medium">{branch.phone}</span>
                    </div>
                  )}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    branch.is_active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {branch.is_active ? 'Active' : 'Inactive'}
                  </span>
                  {branch.is_main && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Main Branch
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
