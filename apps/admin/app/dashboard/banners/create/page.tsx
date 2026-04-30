/**
 * Create Banner Page
 *
 * Server component that mounts the BannerForm.
 *
 * @route /dashboard/banners/create
 */

import BannerForm from "@/components/admin/BannerForm";

export default function CreateBannerPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        <BannerForm />
      </div>
    </div>
  );
}
