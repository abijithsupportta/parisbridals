import ProductForm from "@/components/admin/ProductForm";

export default function CreateProductPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        <ProductForm />
      </div>
    </div>
  );
}
