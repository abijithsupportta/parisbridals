import Sidebar from "@/components/admin/Sidebar";
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
        <main className="flex-1 p-8 overflow-auto">
          {children}
        </main>
      </div>
    </QueryProvider>
  );
}
