import Link from "next/link";
import { Plus, MoreHorizontal, Trash2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getStores, deleteStore, type Store } from "@/lib/supabase/queries";

export default async function StoresPage() {
  const stores = await getStores();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Stores</h1>
          <p className="text-slate-500 mt-1">Manage store locations and branches</p>
        </div>
        <Link href="/dashboard/stores/create">
          <Button className="shadow-lg shadow-primary/25">
            <Plus className="w-4 h-4 mr-2" />
            Add Store
          </Button>
        </Link>
      </div>

      {/* Stores Grid */}
      {stores.length === 0 ? (
        <Card className="border-0 shadow-lg">
          <CardContent className="p-12 text-center">
            <p className="text-slate-500">No stores found. Click "Add Store" to create your first store.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stores.map((store) => (
            <Card key={store.id} className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-200">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-md">
                  <span className="text-xl font-bold text-white">
                    {store.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </span>
                </div>
                <div className="flex gap-1">
                  <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                    <Edit className="w-4 h-4 text-slate-400" />
                  </button>
                  <button className="p-2 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                <CardTitle className="text-lg mb-2 text-slate-900">{store.name}</CardTitle>
                <p className="text-sm text-slate-500 mb-4">{store.address || 'No address provided'}</p>
                <div className="flex items-center gap-4 text-sm text-slate-600">
                  <span className="font-medium">{store.email}</span>
                  {store.phone && <span className="text-slate-300">•</span>}
                  {store.phone && <span className="font-medium">{store.phone}</span>}
                </div>
                <div className="mt-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    store.is_active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {store.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
