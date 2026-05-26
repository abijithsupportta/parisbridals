/**
 * Edit Banner Page
 *
 * Client component that loads existing banner data and mounts BannerForm in edit mode.
 *
 * @route /dashboard/banners/edit/:id
 */

"use client";

import { useBanner } from "@/hooks";
import BannerForm from "@/components/admin/BannerForm";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function EditBannerPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  const { data: banner, isLoading, error } = useBanner(id);

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] p-6 md:p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mx-auto"></div>
          <p className="mt-4 text-sm text-slate-500">Loading banner...</p>
        </div>
      </div>
    );
  }

  if (error || !banner) {
    return (
      <div className="min-h-[calc(100vh-4rem)] p-6 md:p-8 flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-red-600 mb-4">Failed to load banner</p>
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="border-slate-200 text-slate-600 hover:text-slate-900"
          >
            Go back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        <BannerForm mode="edit" initialData={banner} />
      </div>
    </div>
  );
}
