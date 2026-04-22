import BannerForm from "@/components/admin/BannerForm";

export default function CreateBannerPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        <BannerForm />
      </div>
    </div>
  );
}
