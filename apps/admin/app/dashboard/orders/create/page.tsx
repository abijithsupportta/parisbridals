import OrderForm from "@/components/admin/OrderForm";

export default function CreateOrderPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        <OrderForm />
      </div>
    </div>
  );
}
