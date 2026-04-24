/**
 * Create Customer Page
 *
 * Server component that renders the CustomerForm in create mode.
 *
 * @route /dashboard/customers/create
 */

import CustomerForm from "@/components/admin/CustomerForm";

export default function CreateCustomerPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        <CustomerForm />
      </div>
    </div>
  );
}
