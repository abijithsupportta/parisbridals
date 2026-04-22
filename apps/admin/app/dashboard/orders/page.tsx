import Link from "next/link";
import { Search, Filter, MoreHorizontal, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getOrders, type Order } from "@/lib/supabase/queries";

export default async function OrdersPage() {
  const orders = await getOrders();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Orders</h1>
          <p className="text-slate-500 mt-1">Manage customer orders and rentals</p>
        </div>
        <Link href="/dashboard/orders/create">
          <Button className="shadow-lg shadow-primary/25">
            <Plus className="w-4 h-4 mr-2" />
            Add Order
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
                placeholder="Search orders..."
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

      {/* Orders Table */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-0">
          {orders.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-slate-500">No orders found. Click "Add Order" to create your first order.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left p-4 font-semibold text-slate-700">Order ID</th>
                  <th className="text-left p-4 font-semibold text-slate-700">Customer</th>
                  <th className="text-left p-4 font-semibold text-slate-700">Items</th>
                  <th className="text-left p-4 font-semibold text-slate-700">Total</th>
                  <th className="text-left p-4 font-semibold text-slate-700">Status</th>
                  <th className="text-left p-4 font-semibold text-slate-700">Date</th>
                  <th className="text-left p-4 font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order: Order) => (
                  <tr key={order.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-semibold text-slate-900">#{order.id.slice(0, 8)}</td>
                    <td className="p-4 text-slate-700">{order.customer.name}</td>
                    <td className="p-4 text-slate-700">{order.items.length}</td>
                    <td className="p-4 text-slate-700 font-medium">₹{order.total_amount.toLocaleString()}</td>
                    <td className="p-4">
                      <Badge className={
                        order.status === 'pending' ? "bg-amber-100 text-amber-700 hover:bg-amber-200" :
                        order.status === 'confirmed' ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" :
                        order.status === 'in_progress' ? "bg-blue-100 text-blue-700 hover:bg-blue-200" :
                        order.status === 'completed' ? "bg-green-100 text-green-700 hover:bg-green-200" :
                        "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </Badge>
                    </td>
                    <td className="p-4 text-slate-500 text-sm">{new Date(order.created_at).toLocaleDateString()}</td>
                    <td className="p-4">
                      <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                        <MoreHorizontal className="w-4 h-4 text-slate-400" />
                      </button>
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
