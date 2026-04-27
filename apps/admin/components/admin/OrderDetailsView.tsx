"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Package, CheckCircle2, AlertTriangle,
  ArrowLeft, XCircle, Phone, Banknote, CreditCard, Smartphone, Building2, Edit3, ReceiptText
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Modal from "@/components/admin/Modal";
import { useOrder, useOrderStatusHistory, useProcessOrderReturn, useUpdateOrder, useCreatePayment, useOrderPayments } from "@/hooks";
import { useAppStore } from "@/stores";
import { formatCurrency } from "@/lib/shared-utils";
import { OrderStatus, ConditionRating, PaymentStatus } from "@/domain/types/order";
import { PaymentType, PaymentMode } from "@/domain/types/payment";
import { startOfDay } from "date-fns";

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
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: "0",
    paymentMode: PaymentMode.CASH,
    paymentType: PaymentType.FINAL,
    notes: ""
  });
  const [refundForm, setRefundForm] = useState({
    paymentMode: PaymentMode.CASH,
    notes: ""
  });

  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [adjustmentForm, setAdjustmentForm] = useState({
    type: 'discount' as 'discount' | 'late_fee' | 'damage_fee' | 'extra_charge',
    amount: "0",
    notes: ""
  });
  const [isEditingDeposit, setIsEditingDeposit] = useState(false);
  const [editDepositValue, setEditDepositValue] = useState("");

  // Local state for the return checklist
  const [returnItems, setReturnItems] = useState<Record<string, {
    status: 'excellent' | 'damaged' | 'missing' | null,
    damage_fee: number,
    notes: string,
  }>>({});

  const [lateFee, setLateFee] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);

  const order = orderResponse?.data;
  const { data: paymentsResponse, isLoading: isLoadingPayments } = useOrderPayments(orderId);
  const payments = paymentsResponse || [];
  
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
    const maxAmount = paymentForm.paymentType === PaymentType.DEPOSIT ? (order?.security_deposit || 0) : amount_due;

    if (!order || amountVal <= 0) {
      showError("Validation Error", "Amount must be greater than 0");
      return;
    }

    if (amountVal > maxAmount) {
      showError("Validation Error", `Amount cannot exceed ${formatCurrency(maxAmount)}`);
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
            showSuccess("Payment Recorded", "Payment was successfully processed.");
          },
        }
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleRefundDeposit = async () => {
    if (!order || order.deposit_returned) return;

    try {
      createPayment(
        {
          order_id: order.id,
          payment_type: PaymentType.REFUND,
          amount: order.security_deposit,
          payment_mode: refundForm.paymentMode,
          notes: refundForm.notes || "Security Deposit Refund",
        },
        {
          onSuccess: () => {
            updateOrder({
              id: order.id,
              data: {
                deposit_returned: true,
                deposit_returned_at: new Date().toISOString(),
              },
            });
            setIsRefundModalOpen(false);
            setRefundForm({ paymentMode: PaymentMode.CASH, notes: "" });
            showSuccess("Deposit Refunded", "The security deposit was successfully refunded.");
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
      }),
      late_fee: lateFee,
      discount: discount,
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
          {order.status === OrderStatus.SCHEDULED && (() => {
            const today = startOfDay(new Date());
            const rentalStart = startOfDay(new Date(order.start_date));
            const canStart = today >= rentalStart;
            return (
              <div className="flex items-center gap-3 flex-1 lg:flex-none">
                <Button onClick={handleStartOrder} disabled={isUpdating || !canStart} className="h-14 px-8 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg rounded-xl flex-1 lg:flex-none disabled:opacity-50 disabled:cursor-not-allowed">
                  Start Rental
                </Button>
                <Button
                  onClick={() => setIsCancelModalOpen(true)}
                  disabled={isUpdating}
                  variant="outline"
                  className="h-14 px-6 border-2 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 font-bold text-lg rounded-xl"
                >
                  <XCircle className="w-5 h-5 mr-2" /> Cancel
                </Button>
                {!canStart && (
                  <p className="text-xs text-amber-600 font-semibold bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
                    Available on {format(rentalStart, "dd MMM, yyyy")}
                  </p>
                )}
              </div>
            );
          })()}
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

      {/* Payment History Block */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
            <Banknote className="w-5 h-5 text-slate-500" /> Payment History
          </h2>
        </div>
        {isLoadingPayments ? (
          <div className="p-8 text-center text-slate-500 font-medium">Loading payments...</div>
        ) : payments.length === 0 ? (
          <div className="p-8 text-center text-slate-500 font-medium bg-slate-50/50">No payments recorded yet.</div>
        ) : (
          <div className="divide-y divide-slate-100 overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-white">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-1/4">Date & Time</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-1/4">Type & Mode</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-1/4 text-right">Amount</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-1/4">Handled By</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {payments.map((payment: any) => (
                  <tr key={payment.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-slate-900">{format(new Date(payment.payment_date || payment.created_at), "dd MMM, yyyy")}</div>
                      <div className="text-xs text-slate-500">{format(new Date(payment.payment_date || payment.created_at), "h:mm a")}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-md border ${
                          payment.payment_type === PaymentType.REFUND ? 'bg-orange-50 text-orange-700 border-orange-200' :
                          payment.payment_type === PaymentType.DEPOSIT ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {payment.payment_type}
                        </span>
                        <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md uppercase border border-slate-200">
                          {payment.payment_mode}
                        </span>
                      </div>
                      {payment.notes && <div className="text-xs text-slate-500 mt-1.5 truncate max-w-[200px]" title={payment.notes}>{payment.notes}</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className={`text-base font-black ${payment.payment_type === PaymentType.REFUND ? 'text-orange-600' : 'text-emerald-600'}`}>
                        {payment.payment_type === PaymentType.REFUND ? '-' : '+'}{formatCurrency(payment.amount)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-slate-700">{(payment as any).staff?.name || (payment.created_by ? `Staff #${payment.created_by.slice(0,6)}` : 'System')}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
                        <p className="text-sm font-medium text-slate-500 mt-1">Qty: {item.quantity} · {formatCurrency(item.price_per_day)}</p>
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
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Discount</label>
                          <Input type="number" value={discount || ""} onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)} className="w-32 h-12 font-bold text-lg" placeholder="0" />
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
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <ReceiptText className="w-4 h-4" /> Financial Receipt
              </h2>
              <Button variant="ghost" size="sm" className="text-xs text-primary" onClick={() => setIsAdjustmentModalOpen(true)}>
                <Edit3 className="w-3 h-3 mr-1" /> Adjust
              </Button>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between text-slate-600 font-medium text-sm">
                <span>Subtotal (Rental)</span>
                <span>{formatCurrency(order.subtotal || order.total_amount)}</span>
              </div>
              {(order.gst_amount || 0) > 0 && (
                <div className="flex justify-between text-slate-600 font-medium text-sm">
                  <span>GST</span>
                  <span>{formatCurrency(order.gst_amount)}</span>
                </div>
              )}
              {/* Security Deposit - editable */}
              <div className="flex justify-between items-center text-slate-600 font-medium text-sm">
                <div className="flex flex-col">
                  <span>Security Deposit</span>
                  {order.deposit_payment_method && (
                    <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">{order.deposit_payment_method}</span>
                  )}
                </div>
                {isEditingDeposit ? (
                  <div className="flex items-center gap-1">
                    <Input type="number" value={editDepositValue} onChange={e => setEditDepositValue(e.target.value)} className="w-24 h-7 text-sm text-right" />
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-emerald-600" onClick={() => {
                      const val = parseFloat(editDepositValue) || 0;
                      updateOrder({ id: order.id, data: { security_deposit: val } });
                      setIsEditingDeposit(false);
                      showSuccess('Deposit Updated');
                    }}>✓</Button>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-red-500" onClick={() => setIsEditingDeposit(false)}>✕</Button>
                  </div>
                ) : (
                  <button className="flex items-center gap-1 hover:text-primary" onClick={() => { setEditDepositValue(String(order.security_deposit)); setIsEditingDeposit(true); }}>
                    {formatCurrency(order.security_deposit)} <Edit3 className="w-3 h-3 text-slate-400" />
                  </button>
                )}
              </div>

              {/* Late Fee */}
              {(order.late_fee || 0) > 0 && (
                <div className="flex justify-between text-red-600 font-bold text-sm">
                  <span>Late Fee</span>
                  <span>+ {formatCurrency(order.late_fee)}</span>
                </div>
              )}
              {/* Damage Charges */}
              {(order.damage_charges_total || 0) > 0 && (
                <div className="flex justify-between text-orange-600 font-bold text-sm">
                  <span>Damage Charges</span>
                  <span>+ {formatCurrency(order.damage_charges_total)}</span>
                </div>
              )}
              {/* Discount */}
              {(order.discount || 0) > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold text-sm">
                  <span>Discount</span>
                  <span>- {formatCurrency(order.discount)}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-800 font-black text-sm pt-3 border-t-2 border-slate-100">
                <span>Grand Total</span>
                <span>{formatCurrency(order.total_amount)}</span>
              </div>
              <div className="flex justify-between text-slate-600 font-bold text-sm">
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

            {(order.status === OrderStatus.RETURNED || order.status === OrderStatus.PARTIAL || order.status === OrderStatus.FLAGGED || order.status === OrderStatus.COMPLETED) && !order.deposit_returned && order.security_deposit > 0 && (
              <Button 
                onClick={() => {
                  setRefundForm({ paymentMode: PaymentMode.CASH, notes: "Security Deposit Refund" });
                  setIsRefundModalOpen(true);
                }} 
                className="w-full mt-4 h-14 bg-orange-100 hover:bg-orange-200 text-orange-800 border border-orange-300 font-bold text-lg rounded-xl shadow-sm transition-colors"
              >
                Refund Security Deposit
              </Button>
            )}
            
            {order.deposit_returned && (
               <div className="w-full mt-4 h-14 flex items-center justify-center bg-slate-50 border border-slate-200 text-slate-500 font-bold text-sm rounded-xl">
                 Security Deposit Refunded
               </div>
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
        <div className="p-6 space-y-6">
          {/* Summary Box */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex justify-between items-center shadow-sm">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
                {paymentForm.paymentType === PaymentType.DEPOSIT ? 'Security Deposit' : 'Remaining Due'}
              </p>
              <p className="text-2xl font-black text-slate-900">
                {formatCurrency(paymentForm.paymentType === PaymentType.DEPOSIT ? (order?.security_deposit || 0) : amount_due)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Paying</p>
              <p className={`text-2xl font-black ${parseFloat(paymentForm.amount) > (paymentForm.paymentType === PaymentType.DEPOSIT ? (order?.security_deposit || 0) : amount_due) ? 'text-red-600' : 'text-emerald-600'}`}>
                {formatCurrency(parseFloat(paymentForm.amount) || 0)}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="font-bold text-slate-700 uppercase tracking-wider text-xs">Payment Method</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { id: PaymentMode.CASH, label: "Cash", icon: Banknote },
                { id: PaymentMode.UPI, label: "UPI", icon: Smartphone },
                { id: PaymentMode.CARD, label: "Card", icon: CreditCard },
                { id: PaymentMode.BANK_TRANSFER, label: "Bank", icon: Building2 },
              ].map((method) => {
                const Icon = method.icon;
                const isSelected = paymentForm.paymentMode === method.id;
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setPaymentForm({ ...paymentForm, paymentMode: method.id })}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                      isSelected 
                        ? 'border-slate-900 bg-slate-900 text-white shadow-md' 
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className={`w-6 h-6 mb-2 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                    <span className="text-sm font-bold">{method.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
          
          <div className="space-y-3">
            <Label className="font-bold text-slate-700 uppercase tracking-wider text-xs flex justify-between items-center">
              <span>Amount (₹)</span>
              <button 
                type="button" 
                onClick={() => setPaymentForm({ ...paymentForm, amount: (paymentForm.paymentType === PaymentType.DEPOSIT ? (order?.security_deposit || 0) : amount_due).toString() })}
                className="text-emerald-600 hover:text-emerald-700 font-bold bg-emerald-50 px-3 py-1 rounded-full text-[10px]"
              >
                PAY FULL AMOUNT
              </button>
            </Label>
            <Input
              type="number"
              value={paymentForm.amount}
              onChange={(e) => {
                 const val = e.target.value;
                 const maxPayable = paymentForm.paymentType === PaymentType.DEPOSIT ? (order?.security_deposit || 0) : amount_due;
                 if (parseFloat(val) > maxPayable) {
                    setPaymentForm({ ...paymentForm, amount: maxPayable.toString() });
                 } else {
                    setPaymentForm({ ...paymentForm, amount: val });
                 }
              }}
              className="w-full h-14 text-2xl font-black rounded-xl border-slate-300 bg-slate-50 focus:bg-white shadow-inner px-4"
              placeholder="0"
            />
          </div>

          <div className="space-y-3">
            <Label className="font-bold text-slate-700 uppercase tracking-wider text-xs">Notes / Ref ID <span className="text-slate-400 font-normal capitalize">(Optional)</span></Label>
            <Input
              value={paymentForm.notes}
              onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
              className="w-full h-12 rounded-xl border-slate-300 bg-slate-50 focus:bg-white px-4"
              placeholder="E.g. UPI Ref #123456"
            />
          </div>

            <div className="pt-6 flex justify-end gap-3 border-t border-slate-100">
              <Button variant="outline" onClick={() => setIsPaymentModalOpen(false)} className="h-12 px-6 rounded-xl font-bold border-slate-200 text-slate-600 hover:bg-slate-50">Cancel</Button>
              <Button onClick={handleCollectPayment} disabled={isCreatingPayment} className="h-12 px-8 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md">
                {isCreatingPayment ? "Processing..." : "Confirm Payment"}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Refund Deposit Modal */}
        <Modal
          open={isRefundModalOpen}
          onClose={() => setIsRefundModalOpen(false)}
          title="Refund Security Deposit"
        >
          <div className="p-6 space-y-6">
            <div className="bg-orange-50 p-5 rounded-2xl border border-orange-200 flex justify-between items-center shadow-sm">
              <div>
                <p className="text-xs font-bold text-orange-600 uppercase tracking-widest mb-1">Refund Amount</p>
                <p className="text-2xl font-black text-orange-900">{formatCurrency(order?.security_deposit || 0)}</p>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="font-bold text-slate-700 uppercase tracking-wider text-xs">Refund Method</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { id: PaymentMode.CASH, label: "Cash", icon: Banknote },
                  { id: PaymentMode.UPI, label: "UPI", icon: Smartphone },
                  { id: PaymentMode.CARD, label: "Card", icon: CreditCard },
                  { id: PaymentMode.BANK_TRANSFER, label: "Bank", icon: Building2 },
                ].map((method) => {
                  const Icon = method.icon;
                  const isSelected = refundForm.paymentMode === method.id;
                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setRefundForm({ ...refundForm, paymentMode: method.id })}
                      className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                        isSelected 
                          ? 'border-orange-500 bg-orange-500 text-white shadow-md' 
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className={`w-6 h-6 mb-2 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                      <span className="text-sm font-bold">{method.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="font-bold text-slate-700 uppercase tracking-wider text-xs">Notes / Ref ID</Label>
              <Input
                value={refundForm.notes}
                onChange={(e) => setRefundForm({ ...refundForm, notes: e.target.value })}
                className="w-full h-12 rounded-xl border-slate-300 bg-slate-50 focus:bg-white px-4"
                placeholder="E.g. Refunded via UPI"
              />
            </div>

            <div className="pt-6 flex justify-end gap-3 border-t border-slate-100">
              <Button variant="outline" onClick={() => setIsRefundModalOpen(false)} className="h-12 px-6 rounded-xl font-bold border-slate-200 text-slate-600 hover:bg-slate-50">Cancel</Button>
              <Button onClick={handleRefundDeposit} disabled={isCreatingPayment || isUpdating} className="h-12 px-8 rounded-xl font-bold text-white bg-orange-600 hover:bg-orange-700 shadow-md">
                {isCreatingPayment || isUpdating ? "Processing..." : "Confirm Refund"}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Adjustment Modal */}
        <Modal
          open={isAdjustmentModalOpen}
          onClose={() => setIsAdjustmentModalOpen(false)}
          title="Apply Financial Adjustment"
        >
          <div className="p-6 space-y-6">
            <div className="space-y-3">
              <Label className="font-bold text-slate-700 uppercase tracking-wider text-xs">Adjustment Type</Label>
              <Select value={adjustmentForm.type} onValueChange={(v: any) => setAdjustmentForm({ ...adjustmentForm, type: v })}>
                <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="discount">Discount (reduces total)</SelectItem>
                  <SelectItem value="late_fee">Late Fee (increases total)</SelectItem>
                  <SelectItem value="damage_fee">Damage Fee (increases total)</SelectItem>
                  <SelectItem value="extra_charge">Extra Charge (increases total)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              <Label className="font-bold text-slate-700 uppercase tracking-wider text-xs">Amount (₹)</Label>
              <Input type="number" value={adjustmentForm.amount} onChange={e => setAdjustmentForm({ ...adjustmentForm, amount: e.target.value })} className="h-14 text-2xl font-black" placeholder="0" />
            </div>
            <div className="space-y-3">
              <Label className="font-bold text-slate-700 uppercase tracking-wider text-xs">Reason / Notes</Label>
              <Input value={adjustmentForm.notes} onChange={e => setAdjustmentForm({ ...adjustmentForm, notes: e.target.value })} className="h-12" placeholder="E.g. Loyal customer discount" />
            </div>
            <div className="pt-6 flex justify-end gap-3 border-t border-slate-100">
              <Button variant="outline" onClick={() => setIsAdjustmentModalOpen(false)} className="h-12 px-6 rounded-xl font-bold">Cancel</Button>
              <Button className="h-12 px-8 rounded-xl font-bold text-white bg-slate-900 hover:bg-slate-800" disabled={isUpdating || isCreatingPayment} onClick={() => {
                if (!order) return;
                const val = parseFloat(adjustmentForm.amount) || 0;
                if (val <= 0) { showError('Invalid', 'Amount must be greater than 0'); return; }

                const isDeduction = adjustmentForm.type === 'discount';
                const newTotal = isDeduction ? Math.max(0, order.total_amount - val) : order.total_amount + val;
                const newLateFee = adjustmentForm.type === 'late_fee' ? (order.late_fee || 0) + val : (order.late_fee || 0);
                const newDiscount = adjustmentForm.type === 'discount' ? (order.discount || 0) + val : (order.discount || 0);
                const newDamage = adjustmentForm.type === 'damage_fee' ? (order.damage_charges_total || 0) + val : (order.damage_charges_total || 0);
                const newAmountPaid = order.amount_paid || 0;
                const newPaymentStatus = newAmountPaid >= newTotal ? 'paid' : newAmountPaid > 0 ? 'partial' : 'pending';

                // Record as adjustment payment
                const label = adjustmentForm.type === 'discount' ? 'Discount' : adjustmentForm.type === 'late_fee' ? 'Late Fee' : adjustmentForm.type === 'damage_fee' ? 'Damage Fee' : 'Extra Charge';
                createPayment({
                  order_id: order.id,
                  payment_type: PaymentType.ADJUSTMENT,
                  amount: val,
                  payment_mode: PaymentMode.CASH,
                  notes: `${label}: ${adjustmentForm.notes || 'N/A'}`,
                }, {
                  onSuccess: () => {
                    updateOrder({ id: order.id, data: {
                      total_amount: newTotal,
                      late_fee: newLateFee,
                      discount: newDiscount,
                      damage_charges_total: newDamage,
                      payment_status: newPaymentStatus,
                    }});
                    setIsAdjustmentModalOpen(false);
                    setAdjustmentForm({ type: 'discount', amount: '0', notes: '' });
                    showSuccess('Adjustment Applied', `${label} of ${formatCurrency(val)} has been applied.`);
                  }
                });
              }}>
                {isUpdating || isCreatingPayment ? 'Processing...' : 'Apply Adjustment'}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Cancel Order Modal */}
        <Modal
          open={isCancelModalOpen}
          onClose={() => setIsCancelModalOpen(false)}
          title="Cancel Order"
          maxWidth="max-w-md"
        >
          <div className="p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-900 mb-1">Confirm Cancellation</h4>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Are you sure you want to cancel order <span className="font-semibold text-slate-900">#{order.id.slice(0, 6).toUpperCase()}</span>? This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button variant="outline" onClick={() => setIsCancelModalOpen(false)} className="h-12 px-6 rounded-xl font-bold border-slate-200 text-slate-600 hover:bg-slate-50">Keep Order</Button>
              <Button
                onClick={() => {
                  updateOrder({ id: order.id, data: { status: OrderStatus.CANCELLED } });
                  setIsCancelModalOpen(false);
                }}
                disabled={isUpdating}
                className="h-12 px-8 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 shadow-md"
              >
                {isUpdating ? "Cancelling..." : "Cancel Order"}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
  );
}
