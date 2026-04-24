"use client";

import { useBanner } from "@/hooks";
import BannerForm from "@/components/admin/BannerForm";
import { useParams, useRouter } from "next/navigation";

export default function EditBannerPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  const { data: banner, isLoading, error } = useBanner(id);

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading banner...</p>
        </div>
      </div>
    );
  }

  if (error || !banner) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg">Failed to load banner</p>
          <button 
            onClick={() => router.back()} 
            className="mt-4 text-primary hover:underline"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        <BannerForm mode="edit" initialData={banner} />
      </div>
    </div>
  );
}
