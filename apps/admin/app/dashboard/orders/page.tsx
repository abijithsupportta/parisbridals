"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Filter, MoreHorizontal, Plus, Package, CheckCircle, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useOrders, useMarkDepositReturned } from "@/hooks";
import { OrderStatus } from "@/domain";
import OrderReturnModal from "@/components/admin/OrderReturnModal";

export default function OrdersPage() {
  const { data: ordersResult, isLoading } = useOrders();
  const { markDepositReturned, isLoading: markingDeposit } = useMarkDepositReturned();
  const orders = ordersResult?.success ? ordersResult.data || [] : [];
  
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const handleReturnClick = (order: any) => {
    setSelectedOrder(order);
    setShowReturnModal(true);
  };

  const handleDepositReturned = (orderId: string) => {
    markDepositReturned(orderId);
  };

  const handleDownloadInvoice = (orderId: string, type: 'deposit' | 'final') => {
    window.open(`/api/orders/${orderId}/invoice?type=${type}`, '_blank');
  };

  const getStatusBadgeClass = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING:
        return "bg-amber-100 text-amber-700 hover:bg-amber-200";
      case OrderStatus.CONFIRMED:
        return "bg-emerald-100 text-emerald-700 hover:bg-emerald-200";
      case OrderStatus.DELIVERED:
        return "bg-blue-100 text-blue-700 hover:bg-blue-200";
      case OrderStatus.IN_USE:
        return "bg-purple-100 text-purple-700 hover:bg-purple-200";
      case OrderStatus.RETURNED:
        return "bg-cyan-100 text-cyan-700 hover:bg-cyan-200";
      case OrderStatus.LATE_RETURN:
        return "bg-red-100 text-red-700 hover:bg-red-200";
      case OrderStatus.COMPLETED:
        return "bg-green-100 text-green-700 hover:bg-green-200";
      case OrderStatus.CANCELLED:
        return "bg-gray-100 text-gray-700 hover:bg-gray-200";
      default:
        return "bg-gray-100 text-gray-700 hover:bg-gray-200";
    }
  };

  const canReturn = (status: OrderStatus) => {
    return status === OrderStatus.IN_USE || status === OrderStatus.LATE_RETURN;
  };

  const canMarkDepositReturned = (status: OrderStatus, depositReturned: boolean) => {
    return (status === OrderStatus.RETURNED || status === OrderStatus.LATE_RETURN || status === OrderStatus.COMPLETED) && !depositReturned;
  };

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
          {isLoading ? (
            <div className="p-12 text-center">
              <p className="text-slate-500">Loading orders...</p>
            </div>
          ) : orders.length === 0 ? (
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
                  <th className="text-left p-4 font-semibold text-slate-700">Subtotal</th>
                  <th className="text-left p-4 font-semibold text-slate-700">GST</th>
                  <th className="text-left p-4 font-semibold text-slate-700">Total</th>
                  <th className="text-left p-4 font-semibold text-slate-700">Status</th>
                  <th className="text-left p-4 font-semibold text-slate-700">Date</th>
                  <th className="text-left p-4 font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-semibold text-slate-900">#{order.id.slice(0, 8)}</td>
                    <td className="p-4 text-slate-700">{order.customer.name}</td>
                    <td className="p-4 text-slate-700">{order.items.length}</td>
                    <td className="p-4 text-slate-700">₹{order.subtotal?.toLocaleString() || '0'}</td>
                    <td className="p-4 text-slate-700">₹{order.gst_amount?.toLocaleString() || '0'}</td>
                    <td className="p-4 text-slate-700 font-medium">₹{order.total_amount.toLocaleString()}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusBadgeClass(order.status)}>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1).replace('_', ' ')}
                        </Badge>
                        {order.status === OrderStatus.LATE_RETURN && (
                          <Badge className="bg-red-100 text-red-700">Late</Badge>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-slate-500 text-sm">{new Date(order.created_at).toLocaleDateString()}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {canReturn(order.status) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReturnClick(order)}
                            className="text-xs"
                          >
                            <Package className="w-3 h-3 mr-1" />
                            Return
                          </Button>
                        )}
                        {canMarkDepositReturned(order.status, order.deposit_returned) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDepositReturned(order.id)}
                            disabled={markingDeposit}
                            className="text-xs"
                          >
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Deposit
                          </Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                              <MoreHorizontal className="w-4 h-4 text-slate-400" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleDownloadInvoice(order.id, 'deposit')}>
                              <FileText className="w-4 h-4 mr-2" />
                              Deposit Invoice
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDownloadInvoice(order.id, 'final')}>
                              <Download className="w-4 h-4 mr-2" />
                              Final Invoice
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Return Modal */}
      {showReturnModal && selectedOrder && (
        <OrderReturnModal
          orderId={selectedOrder.id}
          orderItems={selectedOrder.items}
          onClose={() => {
            setShowReturnModal(false);
            setSelectedOrder(null);
          }}
          onSuccess={() => {
            // Refetch orders
          }}
        />
      )}
    </div>
  );
}
