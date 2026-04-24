"use client";

import { use } from "react";
import OrderForm from "@/components/admin/OrderForm";
import { useOrders } from "@/hooks";
import { ShoppingCart } from "lucide-react";

export default function EditOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { data: orderResponse, isLoading } = useOrders({ query: resolvedParams.id });
  
  // Since useOrders returns a paginated list, we find our specific order
  const order = orderResponse?.data?.find(o => o.id === resolvedParams.id);

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Edit Order #{order.id.slice(0, 8)}</h1>
        <p className="text-sm text-slate-500 mt-1">
          Modify items, rental dates, or deposit status.
        </p>
      </div>

      <OrderForm initialData={order} />
    </div>
  );
}
