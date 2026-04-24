"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Package, User, Calendar, CheckCircle2, AlertTriangle,
  ArrowLeft, ArrowRight, XCircle, Clock
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useOrder, useOrderStatusHistory, useProcessOrderReturn } from "@/hooks";
import { useAppStore } from "@/stores";
import { formatCurrency } from "@/lib/shared-utils";
import { OrderStatus, ConditionRating } from "@/domain/types/order";

export default function OrderDetailsView({ orderId }: { orderId: string }) {
  const router = useRouter();
  const { data: orderResponse, isLoading } = useOrder(orderId);
  const { data: historyResponse } = useOrderStatusHistory(orderId);
  const { processOrderReturn, isPending: isReturning } = useProcessOrderReturn();
  const { showSuccess, showError } = useAppStore();

  const order = orderResponse?.data;
  const history = historyResponse?.data || [];

  // Local state for the return checklist
  const [returnItems, setReturnItems] = useState<Record<string, {
    status: 'excellent' | 'damaged' | 'missing' | null,
    damage_fee: number,
    notes: string,
  }>>({});

  const [lateFee, setLateFee] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);

  const isReturnable = order?.status === OrderStatus.IN_USE || order?.status === OrderStatus.ONGOING || order?.status === OrderStatus.LATE_RETURN;

  // Initialize return state when order loads
  useMemo(() => {
    if (order && Object.keys(returnItems).length === 0 && isReturnable) {
      const initial: any = {};
      order.items.forEach(item => {
        initial[item.id] = { status: null, damage_fee: 0, notes: "" };
      });
      setReturnItems(initial);
    }
  }, [order, isReturnable]);

  // Calculations
  const calculatedDamage = Object.values(returnItems).reduce((sum, item) => sum + (item.damage_fee || 0), 0);
  const totalDeductions = calculatedDamage + lateFee - discount;

  const getImageUrl = (product: any) => {
    if (!product?.images || !Array.isArray(product.images) || product.images.length === 0) return null;
    const img = product.images[0];
    return typeof img === "string" ? img : img?.url || null;
  };

  const handleMarkAllExcellent = () => {
    const updated: any = {};
    Object.keys(returnItems).forEach(key => {
      updated[key] = { ...returnItems[key], status: 'excellent', damage_fee: 0, notes: "" };
    });
    setReturnItems(updated);
  };

  const handleItemUpdate = (itemId: string, field: string, value: any) => {
    setReturnItems(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], [field]: value }
    }));
  };

  const submitReturn = () => {
    if (!order) return;

    const unmarked = Object.entries(returnItems).filter(([_, val]) => val.status === null);
    if (unmarked.length > 0) {
      showError("Incomplete", "Please mark the condition of all items before settling.");
      return;
    }

    const returnPayload = {
      order_id: order.id,
      notes: `Late Fee: ${lateFee}, Discount: ${discount}`,
      items: order.items.map(item => {
        const rItem = returnItems[item.id];
        return {
          item_id: item.id,
          returned_quantity: rItem.status === 'missing' ? 0 : item.quantity,
          condition_rating: rItem.status === 'damaged' ? ConditionRating.DAMAGED : ConditionRating.EXCELLENT,
          damage_description: rItem.notes,
          damage_charges: rItem.damage_fee,
        };
      })
    };

    processOrderReturn({ orderId: order.id, returnData: returnPayload });
  };

  if (isLoading || !order) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <div className="w-8 h-8 border-4 border-slate-300 border-t-slate-900 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': case 'returned': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'late_return': case 'flagged': return 'bg-red-50 text-red-700 border-red-200';
      case 'cancelled': return 'bg-slate-100 text-slate-600 border-slate-200';
      default: return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header — same as product module */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push("/dashboard/orders")}
            className="w-9 h-9 border-slate-200 text-slate-500 hover:text-slate-900 bg-white"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Order #{order.id.slice(0, 6).toUpperCase()}
              </h1>
              <span className={`text-xs font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${getStatusColor(order.status)}`}>
                {order.status.replace('_', ' ')}
              </span>
            </div>
            <p className="text-sm text-slate-500">
              {order.customer?.name} · {format(new Date(order.start_date), "MMM dd")} – {format(new Date(order.end_date), "MMM dd, yyyy")}
            </p>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT COLUMN (2/3) — Order Info + Checklist */}
        <div className="lg:col-span-2 space-y-6">

          {/* Order Summary */}
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Customer</p>
                <p className="text-sm font-semibold text-slate-900 mt-1 flex items-center gap-1"><User className="w-3.5 h-3.5 text-slate-400" /> {order.customer?.name}</p>
                <p className="text-xs text-slate-500">{order.customer?.phone}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Pickup</p>
                <p className="text-sm font-semibold text-slate-900 mt-1 flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-slate-400" /> {format(new Date(order.start_date), "MMM dd, yyyy")}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Return</p>
                <p className="text-sm font-semibold text-slate-900 mt-1 flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-slate-400" /> {format(new Date(order.end_date), "MMM dd, yyyy")}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Amount</p>
                <p className="text-lg font-bold text-slate-900 mt-1">{formatCurrency(order.total_amount)}</p>
              </div>
            </div>
          </div>

          {/* Return Checklist */}
          <div className="bg-white border border-slate-200 rounded-lg">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Package className="w-4 h-4 text-slate-400" />
                {isReturnable ? "Return Checklist" : "Order Items"}
              </h3>
              {isReturnable && (
                <Button
                  onClick={handleMarkAllExcellent}
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs border-slate-200 text-slate-700 hover:bg-slate-50 font-medium"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Mark All Excellent
                </Button>
              )}
            </div>

            <div className="divide-y divide-slate-100">
              {order.items.map((item) => {
                const rItem = returnItems[item.id] || { status: null, damage_fee: 0, notes: "" };
                const isExcellent = rItem.status === 'excellent';
                const isDamaged = rItem.status === 'damaged';
                const isMissing = rItem.status === 'missing';
                const product = (item as any).product;
                const imgUrl = getImageUrl(product);

                return (
                  <div key={item.id} className={`p-5 ${isExcellent ? 'bg-emerald-50/30' : isDamaged ? 'bg-orange-50/30' : isMissing ? 'bg-red-50/30' : ''}`}>
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      <div className="w-12 h-12 rounded-md bg-slate-100 flex-shrink-0 border border-slate-200 overflow-hidden">
                        {imgUrl ? (
                          <img src={imgUrl} alt={product?.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <Package className="w-5 h-5" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-900">{product?.name || `Product #${item.product_id?.slice(0, 6).toUpperCase()}`}</h4>
                        <p className="text-xs text-slate-500">Qty: {item.quantity} · {formatCurrency(item.price_per_day)}</p>
                      </div>

                      {isReturnable ? (
                        <div className="flex items-center gap-1.5">
                          <Button
                            type="button"
                            onClick={() => handleItemUpdate(item.id, 'status', 'excellent')}
                            variant="outline"
                            size="sm"
                            className={`h-9 text-xs font-medium ${isExcellent ? 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800 hover:text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Excellent
                          </Button>
                          <Button
                            type="button"
                            onClick={() => handleItemUpdate(item.id, 'status', 'damaged')}
                            variant="outline"
                            size="sm"
                            className={`h-9 text-xs font-medium ${isDamaged ? 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800 hover:text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                          >
                            <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Damaged
                          </Button>
                          <Button
                            type="button"
                            onClick={() => handleItemUpdate(item.id, 'status', 'missing')}
                            variant="outline"
                            size="sm"
                            className={`h-9 text-xs font-medium ${isMissing ? 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800 hover:text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <span className={`text-xs font-medium px-2 py-1 rounded border ${item.is_returned ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                          {item.is_returned ? "Returned" : "Pending"}
                        </span>
                      )}
                    </div>

                    {/* Inline Damage Form */}
                    {isReturnable && isDamaged && (
                      <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg flex gap-3 items-start">
                        <div className="flex-1 space-y-1.5">
                          <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Damage Description</label>
                          <Input
                            value={rItem.notes}
                            onChange={(e) => handleItemUpdate(item.id, 'notes', e.target.value)}
                            placeholder="E.g. Broken clasp, missing stone..."
                            className="h-9 border-slate-200 focus:border-slate-900 text-sm"
                          />
                        </div>
                        <div className="w-36 space-y-1.5">
                          <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Fee (₹)</label>
                          <Input
                            type="number"
                            value={rItem.damage_fee || ""}
                            onChange={(e) => handleItemUpdate(item.id, 'damage_fee', parseFloat(e.target.value) || 0)}
                            placeholder="0"
                            className="h-9 border-slate-200 focus:border-slate-900 font-bold text-sm"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (1/3) — Settlement + History */}
        <div className="space-y-6">

          {/* Settlement */}
          {isReturnable && (
            <div className="bg-white border border-slate-200 rounded-lg">
              <div className="p-5 border-b border-slate-200">
                <h3 className="text-sm font-semibold text-slate-900">Settlement</h3>
              </div>
              <div className="p-5 space-y-3">
                <div className="flex justify-between text-sm py-2">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="font-medium text-slate-900">{formatCurrency(order.subtotal)}</span>
                </div>
                {order.gst_amount > 0 && (
                  <div className="flex justify-between text-sm py-2 border-b border-slate-100">
                    <span className="text-slate-500">GST</span>
                    <span className="font-medium text-slate-900">{formatCurrency(order.gst_amount)}</span>
                  </div>
                )}
                {calculatedDamage > 0 && (
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>Damage Fees</span>
                    <span className="font-medium text-red-600">+ {formatCurrency(calculatedDamage)}</span>
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Late Fee (₹)</label>
                  <Input
                    type="number"
                    value={lateFee || ""}
                    onChange={(e) => setLateFee(parseFloat(e.target.value) || 0)}
                    className="h-9 border-slate-200 focus:border-slate-900"
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Discount (₹)</label>
                  <Input
                    type="number"
                    value={discount || ""}
                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                    className="h-9 border-slate-200 focus:border-slate-900"
                    placeholder="0"
                  />
                </div>

                <div className="pt-3 border-t border-slate-200">
                  <div className="flex justify-between items-end">
                    <span className="text-sm font-medium text-slate-500">Total Deductions</span>
                    <span className="text-xl font-bold text-slate-900">{formatCurrency(totalDeductions)}</span>
                  </div>
                </div>

                <Button
                  onClick={submitReturn}
                  disabled={isReturning}
                  className="w-full h-10 bg-slate-900 text-white hover:bg-slate-800 font-semibold mt-2"
                >
                  {isReturning ? "Processing..." : "Settle & Complete"} <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Status History */}
          <div className="bg-white border border-slate-200 rounded-lg">
            <div className="p-5 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                Status History
              </h3>
            </div>
            <div className="p-5">
              {history.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">No history yet</p>
              ) : (
                <div className="space-y-3">
                  {history.map((h: any, i: number) => (
                    <div key={h.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-2 h-2 rounded-full bg-slate-900 mt-1.5" />
                        {i !== history.length - 1 && <div className="w-px flex-1 bg-slate-200 my-1" />}
                      </div>
                      <div className="pb-3">
                        <p className="text-sm font-medium text-slate-900 capitalize">{h.status.replace('_', ' ')}</p>
                        <p className="text-xs text-slate-500">{format(new Date(h.created_at), "MMM dd, h:mm a")}</p>
                        {h.notes && <p className="text-xs text-slate-400 mt-0.5">{h.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
