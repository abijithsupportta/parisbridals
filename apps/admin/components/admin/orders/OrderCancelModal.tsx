/**
 * OrderCancelModal Component
 *
 * Confirmation dialog for cancelling a scheduled order.
 * Uses the shared Modal component for consistent look & feel.
 *
 * @component
 * @module components/admin/orders/OrderCancelModal
 */

"use client";

import React from "react";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Modal from "@/components/admin/Modal";
import { type OrderWithRelations } from "@/domain";

interface OrderCancelModalProps {
  open: boolean;
  order: OrderWithRelations | null;
  onClose: () => void;
  onConfirm: () => void;
}

function OrderCancelModalInner({
  open,
  order,
  onClose,
  onConfirm,
}: OrderCancelModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Cancel Order" maxWidth="max-w-md">
      <div className="p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
            <XCircle className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-900 mb-1">
              Confirm Cancellation
            </h4>
            <p className="text-sm text-slate-600 leading-relaxed">
              Are you sure you want to cancel order{" "}
              <span className="font-semibold text-slate-900">
                #{order?.id.slice(0, 8)}
              </span>
              ?
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Button variant="outline" onClick={onClose} className="border-slate-200">
            Keep Order
          </Button>
          <Button
            onClick={onConfirm}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            Cancel Order
          </Button>
        </div>
      </div>
    </Modal>
  );
}

const OrderCancelModal = React.memo(OrderCancelModalInner);
OrderCancelModal.displayName = "OrderCancelModal";

export default OrderCancelModal;
