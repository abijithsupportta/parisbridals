/**
 * CategoryTreeActions Component
 *
 * Provides edit and delete action buttons for each category in the hierarchy tree.
 * Delete action is protected by a safety check: categories can only be deleted
 * if zero products are linked to them (across category_id, subcategory_id, and
 * subvariant_id relationships). This prevents accidental data loss.
 *
 * @component
 * @param {Object} props
 * @param {Category} props.category - The category entity to render actions for
 *
 * @example
 * <CategoryTreeActions category={category} />
 */

"use client";

import { useState } from "react";
import { Trash2, Edit, AlertTriangle, X, Eye } from "lucide-react";
import { type Category } from "@/domain/types/category";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-client";

/** Shape returned by GET /api/categories/:id/can-delete */
interface DeleteStatus {
  canDelete: boolean;
  productCount: number;
  childCount: number;
  reason?: string;
}

export default function CategoryTreeActions({ category }: { category: Category }) {
  const queryClient = useQueryClient();

  // Controls visibility of the delete confirmation modal
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Holds the result of the pre-delete safety check
  const [deleteStatus, setDeleteStatus] = useState<DeleteStatus | null>(null);

  // Tracks the async delete operation state for UI feedback
  const [isDeleting, setIsDeleting] = useState(false);

  // Error message from the last delete attempt, if any
  const [deleteError, setDeleteError] = useState("");

  /**
   * Handles the initial delete button click.
   * Calls GET /api/categories/:id/can-delete to determine whether
   * the category has any linked products or child categories.
   */
  const handleDeleteClick = async () => {
    setDeleteError("");
    try {
      const res = await fetch(`/api/categories/${category.id}/can-delete`);
      if (!res.ok) throw new Error("Failed to check delete eligibility");
      const payload = await res.json();
      const status: DeleteStatus = payload.data ?? payload;
      setDeleteStatus(status);
    } catch {
      setDeleteStatus({
        canDelete: false,
        productCount: 0,
        childCount: 0,
        reason: "Unable to verify category usage. Try again.",
      });
    }
    setShowDeleteDialog(true);
  };

  /**
   * Confirms and executes deletion via DELETE /api/categories/:id.
   * The server re-runs the safety check and returns 409 if unsafe.
   *
   * After successful deletion, we only invalidate the TanStack Query cache.
   * Do NOT call router.refresh() — it causes a full server re-render which
   * unmounts components and loses client state, leading to blank/loading pages.
   */
  const confirmDelete = async () => {
    if (!deleteStatus?.canDelete) return;
    setIsDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch(`/api/categories/${category.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error?.message || payload.error || `Delete failed (${res.status})`);
      }
      // Invalidate the cache — TanStack Query will refetch and the tree re-renders automatically.
      await queryClient.invalidateQueries({ queryKey: queryKeys.categories });
      setShowDeleteDialog(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Delete failed";
      console.error("Delete failed:", err);
      setDeleteError(message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      {/* Inline action buttons: View, Edit, Delete */}
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        {/* Open the category detail page (shows children + add-child affordance) */}
        <Link href={`/dashboard/categories/${category.id}`}>
          <button
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            title="View details"
          >
            <Eye className="w-4 h-4 text-slate-500" />
          </button>
        </Link>
        {/* Navigate to the edit page for this category */}
        <Link href={`/dashboard/categories/edit/${category.id}`}>
          <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <Edit className="w-4 h-4 text-slate-400" />
          </button>
        </Link>
        {/* Trigger delete flow with pre-check for linked products */}
        <button
          onClick={handleDeleteClick}
          className="p-2 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4 text-red-400" />
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                {/* Modal title changes based on whether deletion is allowed */}
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  {deleteStatus?.canDelete ? (
                    <>
                      <Trash2 className="w-5 h-5 text-red-500" />
                      Delete Category
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-5 h-5 text-amber-500" />
                      Cannot Delete
                    </>
                  )}
                </h2>
                <button
                  onClick={() => setShowDeleteDialog(false)}
                  className="p-1 hover:bg-slate-100 rounded-lg"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>
              {/* Contextual message: confirmation or blocked-with-reason */}
              <p className="text-sm text-slate-600">
                {deleteStatus?.canDelete
                  ? `Are you sure you want to delete "${category.name}"? This action cannot be undone.`
                  : `"${category.name}" cannot be deleted. ${deleteStatus?.reason ?? ""}`}
              </p>
              {/* Show server-side delete errors (e.g., 409 from API) */}
              {deleteError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600">{deleteError}</p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 p-6 pt-0">
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                Cancel
              </Button>
              {/* Only render the Delete button if the safety check passed */}
              {deleteStatus?.canDelete && (
                <Button
                  variant="destructive"
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
