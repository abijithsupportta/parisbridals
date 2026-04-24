/**
 * Edit Customer Page
 *
 * Server component that fetches the customer and passes to CustomerForm in edit mode.
 *
 * @route /dashboard/customers/[id]/edit
 */

import CustomerForm from "@/components/admin/CustomerForm";
import { customerService } from "@/services";
import { notFound } from "next/navigation";

export default async function EditCustomerPage({
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
        <CustomerForm customer={result.data} />
      </div>
    </div>
  );
}
