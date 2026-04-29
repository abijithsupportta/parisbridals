"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import OrderForm from "@/components/admin/OrderForm";
import { useOrder } from "@/hooks";
import { ShoppingCart, ShieldAlert } from "lucide-react";
import { OrderStatus } from "@/domain/types/order";
import { Button } from "@/components/ui/button";

const NON_EDITABLE_STATUSES = [OrderStatus.CANCELLED, OrderStatus.COMPLETED, OrderStatus.RETURNED, OrderStatus.ONGOING, OrderStatus.IN_USE];

export default function EditOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { data: orderResponse, isLoading } = useOrder(resolvedParams.id);
  
  const order = orderResponse?.data;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium animate-pulse">Loading order details...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4 bg-slate-50 rounded-2xl border border-slate-100">
        <ShoppingCart className="w-12 h-12 text-slate-300" />
        <p className="text-slate-500 font-medium">Order not found.</p>
      </div>
    );
  }

  if (NON_EDITABLE_STATUSES.includes(order.status as OrderStatus)) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4 bg-slate-50 rounded-2xl border border-slate-100">
        <ShieldAlert className="w-12 h-12 text-slate-300" />
        <p className="text-slate-700 font-semibold">This order cannot be edited</p>
        <p className="text-sm text-slate-500">Orders with status <span className="font-bold uppercase">{order.status}</span> are not editable.</p>
        <Button variant="outline" onClick={() => router.push(`/dashboard/orders/${order.id}`)} className="mt-2">
          View Order Details
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Edit Order</h1>
        <p className="text-sm text-slate-500 mt-1">
          Modify items, rental dates, or deposit status.
        </p>
      </div>

      <OrderForm initialData={order} />
    </div>
  );
}
