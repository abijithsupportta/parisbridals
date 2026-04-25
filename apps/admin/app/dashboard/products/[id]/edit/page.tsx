/**
 * Edit Product Page
 *
 * Server component that fetches the product,
 * then passes it to the ProductForm in edit mode.
 *
 * @route /dashboard/products/[id]/edit
 */

import ProductForm from "@/components/admin/ProductForm";
import { productService } from "@/services";
import { notFound } from "next/navigation";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  
  const productResult = await productService.getProductById(id);

  if (!productResult.success || !productResult.data) {
    notFound();
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        <ProductForm product={productResult.data} />
      </div>
    </div>
  );
}
