/**
 * Customer Detail Page
 *
 * View page showing customer info, ID details/documents, and order history.
 * Clicking a customer name from the list page navigates here.
 *
 * @route /dashboard/customers/[id]
 */

import { notFound } from "next/navigation";
import { customerService } from "@/services";
import CustomerDetailView from "./CustomerDetailView";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const result = await customerService.getCustomerById(id);

  if (!result.success || !result.data) {
    notFound();
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        <CustomerDetailView customer={result.data} />
      </div>
    </div>
  );
}
