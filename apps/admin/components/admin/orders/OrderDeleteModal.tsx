/**
 * OrderDeleteModal Component
 *
 * Confirmation dialog for permanently deleting an order.
 * Uses the shared Modal component for consistent look & feel.
 *
 * @component
 * @module components/admin/orders/OrderDeleteModal
 */

"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Modal from "@/components/admin/Modal";
import { type OrderWithRelations } from "@/domain";

interface OrderDeleteModalProps {
  open: boolean;
  order: OrderWithRelations | null;
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

function OrderDeleteModalInner({
  open,
  order,
  isPending,
  onClose,
  onConfirm,
}: OrderDeleteModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Delete Order" maxWidth="max-w-md">
      <div className="p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-900 mb-1">
              Confirm Deletion
            </h4>
            <p className="text-sm text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete order{" "}
              <span className="font-semibold text-slate-900">
                #{order?.id.slice(0, 8)}
              </span>
              ? This action cannot be undone.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Button variant="outline" onClick={onClose} className="border-slate-200">
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? "Deleting..." : "Delete Order"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

const OrderDeleteModal = React.memo(OrderDeleteModalInner);
OrderDeleteModal.displayName = "OrderDeleteModal";

export default OrderDeleteModal;
