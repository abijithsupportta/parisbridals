import { Metadata } from "next";
import OrderForm from "@/components/admin/OrderForm";

export const metadata: Metadata = {
  title: "Create Order | Paris Bridals",
  description: "Create a new rental order",
};

export default function CreateOrderPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">New Order</h1>
        <p className="text-sm text-slate-500 mt-1">
          Create a new rental order. The system will automatically check item availability.
        </p>
      </div>

      <OrderForm />
    </div>
  );
}
