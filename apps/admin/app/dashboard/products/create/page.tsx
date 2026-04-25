/**
 * Create Product Page
 *
 * Server component that mounts the ProductForm.
 *
 * @route /dashboard/products/create
 */

import ProductForm from "@/components/admin/ProductForm";

export default function CreateProductPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        <ProductForm />
      </div>
    </div>
  );
}
