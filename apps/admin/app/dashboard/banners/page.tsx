import Link from "next/link";
import { Plus, Search, Filter, MoreHorizontal, Trash2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getBanners, type Banner } from "@/lib/supabase/queries";

export default async function BannersPage() {
  const banners = await getBanners();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Banners</h1>
          <p className="text-slate-500 mt-1">Manage hero banners and promotional images</p>
        </div>
        <Link href="/dashboard/banners/create">
          <Button className="shadow-lg shadow-primary/25">
            <Plus className="w-4 h-4 mr-2" />
            Add Banner
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Search banners..."
                className="pl-10 bg-slate-50 border-slate-200 focus:border-primary"
              />
            </div>
            <Button variant="outline" className="border-slate-200">
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Banners Grid */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-0">
          {banners.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-slate-500">No banners found. Click "Add Banner" to create your first banner.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
              {banners.map((banner: Banner) => (
                <div key={banner.id} className="relative group">
                  <div className="relative aspect-video rounded-xl overflow-hidden shadow-lg">
                    <img 
                      src={banner.web_image_url} 
                      alt={banner.title || 'Banner'}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button className="p-2 bg-white rounded-lg hover:bg-slate-100 transition-colors">
                        <Edit className="w-4 h-4 text-slate-700" />
                      </button>
                      <button className="p-2 bg-white rounded-lg hover:bg-red-50 transition-colors">
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3">
                    <h3 className="font-semibold text-slate-900">{banner.title || 'Untitled'}</h3>
                    <p className="text-sm text-slate-500">{banner.subtitle || ''}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className={banner.is_active 
                        ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" 
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }>
                        {banner.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <Badge className="bg-purple-100 text-purple-700">
                        {banner.banner_type}
                      </Badge>
                      <Badge className="bg-slate-100 text-slate-700">
                        Priority: {banner.priority}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
