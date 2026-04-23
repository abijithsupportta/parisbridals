/**
 * Delete Confirmation Dialog
 *
 * Reusable confirmation modal for destructive delete operations.
 * Prevents accidental deletions by requiring explicit user confirmation.
 *
 * @module components/ui/delete-confirmation
 */

"use client";

import * as React from "react";
import { useState } from "react";
import { AlertCircle, Loader2, Trash2 } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

export interface DeleteConfirmationProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback to close the dialog */
  onClose: () => void;
  /** Callback when user confirms deletion */
  onConfirm: () => Promise<void> | void;
  /** Name of the entity being deleted (e.g., "Gold Earrings") */
  entityName: string;
  /** Type of entity (e.g., "category", "product", "banner") */
  entityType: string;
  /** Optional warning message */
  warningMessage?: string;
}

export function DeleteConfirmation({
  open,
  onClose,
  onConfirm,
  entityName,
  entityType,
  warningMessage,
}: DeleteConfirmationProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!open) return null;

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error("Delete failed:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isDeleting) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in-0"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-2">
        {/* Icon */}
        <div className="flex flex-col items-center pt-8 pb-4">
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <Trash2 className="w-7 h-7 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">
            Delete {entityType}?
          </h3>
          <p className="text-sm text-slate-500 mt-1 text-center px-6">
            Are you sure you want to delete{" "}
            <span className="font-medium text-slate-700">"{entityName}"</span>?
            This action cannot be undone.
          </p>
        </div>

        {/* Warning */}
        {warningMessage && (
          <div className="mx-6 mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">{warningMessage}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 p-6 pt-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 h-11 border-slate-300"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="flex-1 h-11 bg-red-600 hover:bg-red-700 text-white"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Deleting…
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Delete
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
