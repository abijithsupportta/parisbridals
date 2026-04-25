"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Package, CheckCircle2, AlertTriangle,
  ArrowLeft, XCircle, Phone
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Modal from "@/components/admin/Modal";
import { useOrder, useOrderStatusHistory, useProcessOrderReturn, useUpdateOrder, useCreatePayment } from "@/hooks";
import { useAppStore } from "@/stores";
import { formatCurrency } from "@/lib/shared-utils";
import { OrderStatus, ConditionRating, PaymentStatus } from "@/domain/types/order";
import { PaymentType, PaymentMode } from "@/domain/types/payment";

export default function OrderDetailsView({ orderId }: { orderId: string }) {
  const router = useRouter();
  const { data: orderResponse, isLoading } = useOrder(orderId);
  // We keep history for potential future use but hide it from the 2-second UX glance
  const { data: historyResponse } = useOrderStatusHistory(orderId);
  const { processOrderReturn, isPending: isReturning } = useProcessOrderReturn();
  const { updateOrder, isLoading: isUpdating } = useUpdateOrder();
  const { createPayment, isPending: isCreatingPayment } = useCreatePayment();
  const { showSuccess, showError } = useAppStore();

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: "0",
    paymentMode: PaymentMode.CASH,
    paymentType: PaymentType.FINAL,
    notes: ""
  });

  // Local state for the return checklist
  const [returnItems, setReturnItems] = useState<Record<string, {
    status: 'excellent' | 'damaged' | 'missing' | null,
    damage_fee: number,
    notes: string,
  }>>({});

  const [lateFee, setLateFee] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);

  const order = orderResponse?.data;
  
  const isReturnable = order?.status === OrderStatus.IN_USE || order?.status === OrderStatus.ONGOING || order?.status === OrderStatus.LATE_RETURN || order?.status === OrderStatus.PARTIAL;

  useEffect(() => {
    if (order && Object.keys(returnItems).length === 0 && isReturnable) {
      const initial: any = {};
      order.items.forEach(item => {
        initial[item.id] = { status: null, damage_fee: 0, notes: "" };
      });
      setReturnItems(initial);
    }
  }, [order, isReturnable]);

  const amount_due = order ? Math.max(0, order.total_amount - (order.amount_paid || 0)) : 0;
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

  const handleStartOrder = () => {
    if (!order) return;
    updateOrder({
      id: order.id,
      data: {
        status: OrderStatus.ONGOING,
        start_date: new Date().toISOString().split('T')[0]
      }
    });
  };

  const handleItemUpdate = (itemId: string, field: string, value: any) => {
    setReturnItems(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], [field]: value }
    }));
  };

  const handleCollectPayment = async () => {
    const amountVal = parseFloat(paymentForm.amount) || 0;
    if (!order || amountVal <= 0) {
      showError("Validation Error", "Amount must be greater than 0");
      return;
    }

    try {
      createPayment(
        {
          order_id: order.id,
          payment_type: paymentForm.paymentType,
          amount: amountVal,
          payment_mode: paymentForm.paymentMode,
          notes: paymentForm.notes,
        },
        {
          onSuccess: () => {
            const newAmountPaid = (order.amount_paid || 0) + amountVal;
            const newStatus = newAmountPaid >= order.total_amount ? PaymentStatus.PAID : PaymentStatus.PARTIAL;
            updateOrder({
              id: order.id,
              data: {
                amount_paid: newAmountPaid,
                payment_status: newStatus,
              },
            });
            setIsPaymentModalOpen(false);
            setPaymentForm({ amount: "0", paymentMode: PaymentMode.CASH, paymentType: PaymentType.FINAL, notes: "" });
          },
        }
      );
    } catch (e) {
      console.error(e);
    }
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

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case OrderStatus.SCHEDULED: return { color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Scheduled' };
      case OrderStatus.ONGOING: case OrderStatus.IN_USE: return { color: 'bg-emerald-100 text-emerald-800 border-emerald-200', label: 'Ongoing' };
      case OrderStatus.LATE_RETURN: return { color: 'bg-red-100 text-red-800 border-red-300 shadow-[0_0_10px_rgba(239,68,68,0.3)]', label: 'Late' };
      case OrderStatus.PARTIAL: return { color: 'bg-orange-100 text-orange-800 border-orange-200', label: 'Partial' };
      case OrderStatus.RETURNED: case OrderStatus.COMPLETED: return { color: 'bg-slate-100 text-slate-600 border-slate-200', label: 'Returned' };
      case OrderStatus.FLAGGED: return { color: 'bg-purple-100 text-purple-800 border-purple-200', label: '⚠️ Flagged' };
      case OrderStatus.CANCELLED: return { color: 'bg-slate-800 text-slate-300 border-slate-700 line-through', label: 'Cancelled' };
      default: return { color: 'bg-slate-100 text-slate-600 border-slate-200', label: status };
    }
  };

  const statusDisplay = getStatusDisplay(order.status);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      
      {/* 1. Hero Banner (The 2-Second Glance) */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/orders")} className="h-12 w-12 rounded-full bg-slate-50 hover:bg-slate-100">
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </Button>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-1">
              #{order.id.slice(0, 6).toUpperCase()}
            </h1>
            <p className="text-slate-500 font-bold uppercase tracking-wide text-sm">{order.customer?.name}</p>
          </div>
          <div className={`px-4 py-1.5 ml-2 rounded-full border-2 font-black uppercase tracking-wider text-sm ${statusDisplay.color}`}>
            {statusDisplay.label}
          </div>
        </div>

        <div className="flex items-center gap-4 w-full lg:w-auto">
          {/* Payment Pill */}
          {amount_due > 0 ? (
            <div className="bg-red-50 border-2 border-red-200 text-red-700 px-6 py-3 rounded-xl text-xl font-black flex-1 lg:flex-none text-center">
              DUE: {formatCurrency(amount_due)}
            </div>
          ) : (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-6 py-3 rounded-xl text-sm font-black flex-1 lg:flex-none text-center">
              PAID
            </div>
          )}

          {/* Primary Action Button */}
          {order.status === OrderStatus.SCHEDULED && (
            <Button onClick={handleStartOrder} disabled={isUpdating} className="h-14 px-8 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg rounded-xl flex-1 lg:flex-none">
              Start Rental
            </Button>
          )}
          {order.status !== OrderStatus.SCHEDULED && amount_due > 0 && (
            <Button onClick={() => setIsPaymentModalOpen(true)} className="h-14 px-8 bg-red-600 hover:bg-red-700 text-white font-bold text-lg rounded-xl flex-1 lg:flex-none">
              Collect Payment
            </Button>
          )}
        </div>
      </div>

      {/* 2. Logistics Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-1">Out (Pickup)</p>
          <p className="text-2xl font-bold text-slate-900">{format(new Date(order.start_date), "dd MMM, yyyy")}</p>
        </div>
        <div className={`bg-white rounded-2xl border p-5 ${order.status === OrderStatus.LATE_RETURN ? 'border-red-400 bg-red-50 ring-4 ring-red-50' : 'border-slate-200'}`}>
          <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${order.status === OrderStatus.LATE_RETURN ? 'text-red-600' : 'text-slate-500'}`}>
            In (Return)
          </p>
          <p className={`text-2xl font-bold ${order.status === OrderStatus.LATE_RETURN ? 'text-red-700' : 'text-slate-900'}`}>
            {format(new Date(order.end_date), "dd MMM, yyyy")}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-1">Items</p>
          <p className="text-2xl font-bold text-slate-900">{order.items.length} Pieces</p>
        </div>
      </div>

      {/* 3. Split View */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left Column: Physical Items */}
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="bg-slate-50 px-6 py-5 border-b border-slate-200 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <h2 className="text-lg font-bold text-slate-900 uppercase tracking-wide">Physical Items</h2>
              {isReturnable && (
                <Button onClick={handleMarkAllExcellent} variant="outline" className="font-bold border-slate-300 text-slate-700">
                  <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600" /> Mark All Good
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
                  <div key={item.id} className={`p-6 transition-colors ${isExcellent ? 'bg-emerald-50/50' : isDamaged ? 'bg-orange-50/50' : isMissing ? 'bg-red-50/50' : ''}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                      <div className="w-20 h-20 rounded-xl bg-slate-100 flex-shrink-0 border-2 border-slate-200 overflow-hidden shadow-sm">
                        {imgUrl ? (
                          <img src={imgUrl} alt={product?.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <Package className="w-8 h-8" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="text-lg font-bold text-slate-900">{product?.name || `Product #${item.product_id?.slice(0, 6).toUpperCase()}`}</h4>
                        <p className="text-sm font-medium text-slate-500 mt-1">Qty: {item.quantity} · {formatCurrency(item.price_per_day)}/day</p>
                      </div>

                      {isReturnable ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            type="button"
                            onClick={() => handleItemUpdate(item.id, 'status', 'excellent')}
                            variant="outline"
                            className={`h-12 px-4 font-bold rounded-xl transition-all ${isExcellent ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 hover:text-white' : 'border-slate-200 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200'}`}
                          >
                            <CheckCircle2 className={`w-5 h-5 mr-2 ${isExcellent ? 'text-white' : 'text-emerald-500'}`} /> Good
                          </Button>
                          <Button
                            type="button"
                            onClick={() => handleItemUpdate(item.id, 'status', 'damaged')}
                            variant="outline"
                            className={`h-12 px-4 font-bold rounded-xl transition-all ${isDamaged ? 'bg-orange-500 text-white border-orange-500 hover:bg-orange-600 hover:text-white' : 'border-slate-200 text-slate-600 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-200'}`}
                          >
                            <AlertTriangle className={`w-5 h-5 mr-2 ${isDamaged ? 'text-white' : 'text-orange-500'}`} /> Damaged
                          </Button>
                        </div>
                      ) : (
                        <span className={`text-sm font-bold px-3 py-1.5 rounded-lg border-2 ${item.is_returned ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                          {item.is_returned ? "Returned" : "Pending"}
                        </span>
                      )}
                    </div>

                    {isReturnable && isDamaged && (
                      <div className="mt-4 p-4 bg-white border-2 border-orange-200 rounded-xl flex flex-col sm:flex-row gap-4 items-start shadow-sm">
                        <div className="flex-1 space-y-2 w-full">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Damage Notes</label>
                          <Input
                            value={rItem.notes}
                            onChange={(e) => handleItemUpdate(item.id, 'notes', e.target.value)}
                            placeholder="Describe damage (e.g. Broken clasp)"
                            className="h-12 border-slate-300 focus:border-orange-400 text-base rounded-lg"
                          />
                        </div>
                        <div className="w-full sm:w-40 space-y-2">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Fee (₹)</label>
                          <Input
                            type="number"
                            value={rItem.damage_fee || ""}
                            onChange={(e) => handleItemUpdate(item.id, 'damage_fee', parseFloat(e.target.value) || 0)}
                            placeholder="0"
                            className="h-12 border-slate-300 focus:border-orange-400 font-bold text-lg rounded-lg"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* Settlement Footer (Only visible when processing returns) */}
            {isReturnable && (
               <div className="bg-slate-50 p-6 border-t border-slate-200">
                  <div className="flex flex-col sm:flex-row items-end justify-between gap-4">
                     <div className="flex gap-4 w-full sm:w-auto">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Extra Late Fee</label>
                          <Input type="number" value={lateFee || ""} onChange={(e) => setLateFee(parseFloat(e.target.value) || 0)} className="w-32 h-12 font-bold text-lg" placeholder="0" />
                        </div>
                     </div>
                     <Button
                        onClick={submitReturn}
                        disabled={isReturning}
                        className="w-full sm:w-auto h-14 px-8 bg-slate-900 hover:bg-slate-800 text-white font-bold text-lg rounded-xl shadow-md"
                     >
                        {isReturning ? "Processing..." : "Complete Return Process"}
                     </Button>
                  </div>
               </div>
            )}
          </div>
        </div>

        {/* Right Column: Customer & Money */}
        <div className="space-y-6">
          
          {/* Customer Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Customer</h2>
            <p className="text-2xl font-black text-slate-900 leading-tight">{order.customer?.name}</p>
            <a 
               href={`tel:${order.customer?.phone}`} 
               className="mt-6 flex items-center justify-center gap-3 w-full bg-green-50 hover:bg-green-100 text-green-700 border-2 border-green-200 py-4 rounded-xl font-black text-lg transition-colors shadow-sm"
            >
               <Phone className="w-5 h-5" /> {order.customer?.phone}
            </a>
          </div>

          {/* Receipt Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-5">Financial Receipt</h2>
            
            <div className="space-y-4">
              <div className="flex justify-between text-slate-600 font-bold text-sm">
                <span>Total Rental</span>
                <span>{formatCurrency(order.total_amount)}</span>
              </div>
              <div className="flex justify-between text-slate-600 font-bold text-sm">
                <span>Security Deposit</span>
                <span>{formatCurrency(order.security_deposit)}</span>
              </div>
              <div className="flex justify-between text-slate-600 font-bold text-sm pb-4 border-b-2 border-slate-100">
                <span>Total Paid</span>
                <span>{formatCurrency(order.amount_paid || 0)}</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-lg font-black text-slate-900">Remaining Due</span>
                <span className={`text-2xl font-black ${amount_due > 0 ? "text-red-600" : "text-emerald-600"}`}>
                  {formatCurrency(amount_due)}
                </span>
              </div>
            </div>

            {amount_due > 0 && (
              <Button 
                onClick={() => {
                  setPaymentForm({ amount: amount_due.toString(), paymentMode: PaymentMode.CASH, paymentType: PaymentType.FINAL, notes: "" });
                  setIsPaymentModalOpen(true);
                }} 
                className="w-full mt-8 h-14 bg-slate-900 hover:bg-slate-800 text-white font-bold text-lg rounded-xl shadow-md"
              >
                Record Payment
              </Button>
            )}
          </div>

        </div>
      </div>

      {/* Payment Modal */}
      <Modal
        open={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title={paymentForm.paymentType === PaymentType.DEPOSIT ? "Collect Security Deposit" : "Collect Payment"}
      >
        <div className="space-y-5 pt-2">
          <div className="space-y-2">
            <Label className="font-bold text-slate-700">Payment Method</Label>
            <Select
              value={paymentForm.paymentMode}
              onValueChange={(value) => setPaymentForm({ ...paymentForm, paymentMode: value as PaymentMode })}
            >
              <SelectTrigger className="w-full h-12 text-base rounded-lg border-slate-300">
                <SelectValue placeholder="Select a payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={PaymentMode.CASH}>Cash</SelectItem>
                <SelectItem value={PaymentMode.UPI}>UPI</SelectItem>
                <SelectItem value={PaymentMode.CARD}>Card</SelectItem>
                <SelectItem value={PaymentMode.BANK_TRANSFER}>Bank Transfer</SelectItem>
                <SelectItem value={PaymentMode.CHEQUE}>Cheque</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label className="font-bold text-slate-700">Amount (₹)</Label>
            <Input
              type="number"
              value={paymentForm.amount}
              onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
              className="w-full h-12 text-lg font-bold rounded-lg border-slate-300"
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label className="font-bold text-slate-700">Notes / Ref ID <span className="text-slate-400 font-normal">(Optional)</span></Label>
            <Input
              value={paymentForm.notes}
              onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
              className="w-full h-12 rounded-lg border-slate-300"
              placeholder="E.g. UPI Ref #123456"
            />
          </div>

          <div className="pt-6 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsPaymentModalOpen(false)} className="h-12 px-6 rounded-lg font-bold">Cancel</Button>
            <Button onClick={handleCollectPayment} disabled={isCreatingPayment} className="h-12 px-8 rounded-lg font-bold text-white bg-slate-900 hover:bg-slate-800">
              {isCreatingPayment ? "Saving..." : "Save Payment"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
