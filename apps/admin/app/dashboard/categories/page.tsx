import Link from "next/link";
import { Plus, Search, Filter, MoreHorizontal, Trash2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCategories, type Category } from "@/lib/supabase/queries";

export default async function CategoriesPage() {
  const categories = await getCategories();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Categories</h1>
          <p className="text-slate-500 mt-1">Manage product categories</p>
        </div>
        <Link href="/dashboard/categories/create">
          <Button className="shadow-lg shadow-primary/25">
            <Plus className="w-4 h-4 mr-2" />
            Add Category
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
                placeholder="Search categories..."
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

      {/* Categories Table */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-0">
          {categories.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-slate-500">No categories found. Click "Add Category" to create your first category.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left p-4 font-semibold text-slate-700">Category</th>
                  <th className="text-left p-4 font-semibold text-slate-700">Slug</th>
                  <th className="text-left p-4 font-semibold text-slate-700">Sort Order</th>
                  <th className="text-left p-4 font-semibold text-slate-700">Status</th>
                  <th className="text-left p-4 font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category: Category) => (
                  <tr key={category.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {category.image_url ? (
                          <img 
                            src={category.image_url} 
                            alt={category.name}
                            className="w-12 h-12 rounded-xl object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-200 to-slate-300" />
                        )}
                        <div>
                          <p className="font-semibold text-slate-900">{category.name}</p>
                          <p className="text-sm text-slate-500">{category.description || 'No description'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-slate-700">{category.slug}</td>
                    <td className="p-4 text-slate-700">{category.sort_order}</td>
                    <td className="p-4">
                      <Badge className={category.is_active 
                        ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" 
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }>
                        {category.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      {category.is_global && (
                        <Badge className="ml-2 bg-blue-100 text-blue-700 hover:bg-blue-200">
                          Global
                        </Badge>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-1">
                        <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                          <Edit className="w-4 h-4 text-slate-400" />
                        </button>
                        <button className="p-2 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
