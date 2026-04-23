import Sidebar from "@/components/admin/Sidebar";
import TopBar from "@/components/admin/TopBar";
import Toasts from "@/components/admin/Toasts";
import QueryProvider from "@/components/providers/QueryProvider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryProvider>
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-auto">
          <TopBar />
          <main className="flex-1 p-8">
            {children}
          </main>
        </div>
      </div>
      <Toasts />
    </QueryProvider>
  );
}
