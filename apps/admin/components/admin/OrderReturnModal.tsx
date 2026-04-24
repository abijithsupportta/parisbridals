"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProcessOrderReturn, useCreatePayment } from "@/hooks";
import { ConditionRating, ReturnOrderDTO } from "@/domain/types/order";
import { PaymentType, PaymentMode } from "@/domain/types/payment";
import { useAppStore } from "@/stores";

interface OrderReturnModalProps {
  orderId: string;
  orderItems: Array<{ id: string; product_id: string; product_name?: string }>;
  orderDetails?: {
    total_amount: number;
    security_deposit_total: number;
    deposit_paid: number;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export default function OrderReturnModal({ orderId, orderItems, orderDetails, onClose, onSuccess }: OrderReturnModalProps) {
  const { processOrderReturn, isLoading: processing } = useProcessOrderReturn();
  const { createPayment } = useCreatePayment();
  const user = useAppStore((state) => state.user);
  
  const [returnItems, setReturnItems] = useState(
    orderItems.map(item => ({
      item_id: item.id,
      returned_quantity: 1,
      condition_rating: ConditionRating.EXCELLENT,
      damage_description: "",
      damage_charges: 0,
    }))
  );
  const [notes, setNotes] = useState("");
  const [finalPayment, setFinalPayment] = useState({
    payment_mode: PaymentMode.CASH,
    amount: 0,
    transaction_id: "",
    notes: "",
  });

  const handleConditionChange = (itemId: string, condition: ConditionRating) => {
    setReturnItems(prev => 
      prev.map(item => 
        item.item_id === itemId ? { ...item, condition_rating: condition } : item
      )
    );
  };

  const handleDamageDescriptionChange = (itemId: string, description: string) => {
    setReturnItems(prev => 
      prev.map(item => 
        item.item_id === itemId ? { ...item, damage_description: description } : item
      )
    );
  };

  const handleDamageChargesChange = (itemId: string, charges: number) => {
    setReturnItems(prev => 
      prev.map(item => 
        item.item_id === itemId ? { ...item, damage_charges: charges } : item
      )
    );
  };

  const handleSubmit = async () => {
    const returnData: ReturnOrderDTO = {
      order_id: orderId,
      items: returnItems,
      notes: notes || undefined,
    };

    processOrderReturn({ orderId, returnData }, {
      onSuccess: async () => {
        // Create final payment if amount > 0
        if (finalPayment.amount > 0) {
          const paymentPayload = {
            order_id: orderId,
            payment_type: PaymentType.FINAL,
            amount: finalPayment.amount,
            payment_mode: finalPayment.payment_mode,
            transaction_id: finalPayment.transaction_id || undefined,
            notes: finalPayment.notes || undefined,
            created_by: user?.id,
          };

          await new Promise((resolve, reject) => {
            createPayment(paymentPayload, {
              onSuccess: resolve,
              onError: reject,
            });
          });
        }
        
        onSuccess();
        onClose();
      },
    });
  };

  const totalDamageCharges = returnItems.reduce((sum, item) => sum + (item.damage_charges || 0), 0);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="text-xl text-slate-900">Process Order Return</CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {/* Return Items */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900">Items Condition Assessment</h3>
            {orderItems.map((item, index) => (
              <div key={item.id} className="border border-slate-200 rounded-lg p-4 space-y-3">
                <div className="font-medium text-slate-900">
                  {item.product_name || `Item ${index + 1}`}
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Condition Rating</label>
                  <Select
                    value={returnItems[index].condition_rating}
                    onValueChange={(value: ConditionRating) => handleConditionChange(item.id, value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ConditionRating.EXCELLENT}>Excellent</SelectItem>
                      <SelectItem value={ConditionRating.GOOD}>Good</SelectItem>
                      <SelectItem value={ConditionRating.FAIR}>Fair</SelectItem>
                      <SelectItem value={ConditionRating.DAMAGED}>Damaged</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Damage Description (if any)</label>
                  <Input
                    value={returnItems[index].damage_description}
                    onChange={(e) => handleDamageDescriptionChange(item.id, e.target.value)}
                    placeholder="Describe any damage..."
                    disabled={returnItems[index].condition_rating !== ConditionRating.DAMAGED}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Damage Charges (₹)</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={returnItems[index].damage_charges}
                    onChange={(e) => handleDamageChargesChange(item.id, parseFloat(e.target.value) || 0)}
                    disabled={returnItems[index].condition_rating !== ConditionRating.DAMAGED}
                    placeholder="0.00"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Return Notes</label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes about the return..."
            />
          </div>

          {/* Summary */}
          {totalDamageCharges > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-amber-900 font-medium">Total Damage Charges:</span>
                <span className="font-bold text-amber-900">₹{totalDamageCharges.toFixed(2)}</span>
              </div>
              <p className="text-xs text-amber-700 mt-1">
                This amount will be deducted from the security deposit.
              </p>
            </div>
          )}

          {/* Final Payment Section */}
          {orderDetails && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900">Final Payment</h3>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-700">Security Deposit Total:</span>
                  <span className="font-medium text-slate-900">₹{orderDetails.security_deposit_total?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-700">Damage Charges:</span>
                  <span className="font-medium text-slate-900">-₹{totalDamageCharges.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-300">
                  <span className="text-slate-700 font-medium">Refundable Amount:</span>
                  <span className="font-bold text-slate-900">₹{((orderDetails.security_deposit_total || 0) - totalDamageCharges).toFixed(2)}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 block">Payment Mode</label>
                  <Select 
                    value={finalPayment.payment_mode} 
                    onValueChange={(value: PaymentMode) => setFinalPayment({ ...finalPayment, payment_mode: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
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
                  <label className="text-sm font-semibold text-slate-700 block">Additional Payment (₹)</label>
                  <Input
                    type="number"
                    value={finalPayment.amount}
                    onChange={(e) => setFinalPayment({ ...finalPayment, amount: parseFloat(e.target.value) || 0 })}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 block">Transaction ID (Optional)</label>
                <Input
                  value={finalPayment.transaction_id}
                  onChange={(e) => setFinalPayment({ ...finalPayment, transaction_id: e.target.value })}
                  placeholder="Enter transaction ID..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 block">Payment Notes (Optional)</label>
                <Input
                  value={finalPayment.notes}
                  onChange={(e) => setFinalPayment({ ...finalPayment, notes: e.target.value })}
                  placeholder="Any additional payment notes..."
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4 pt-4 border-t border-slate-200">
            <Button
              onClick={handleSubmit}
              disabled={processing}
              className="flex-1"
            >
              {processing ? "Processing..." : "Process Return"}
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
              disabled={processing}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
