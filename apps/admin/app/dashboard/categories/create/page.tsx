import CategoryForm from "@/components/admin/CategoryForm";

export default function CreateCategoryPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        <CategoryForm />
      </div>
    </div>
  );
}
