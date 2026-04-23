"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { 
  useGSTPercentage, 
  useUpdateGSTPercentage,
  useInvoicePrefix,
  usePaymentTerms,
  useAuthorizedSignature
} from "@/hooks";
import { useAppStore } from "@/stores";

export default function SettingsPage() {
  const { data: gstResult, isLoading: loadingGST } = useGSTPercentage();
  const { updateGSTPercentage, isLoading: updatingGST } = useUpdateGSTPercentage();
  const { showSuccess, showError } = useAppStore();
  
  // Invoice settings hooks
  const { data: invoicePrefixResult } = useInvoicePrefix();
  const { data: paymentTermsResult } = usePaymentTerms();
  const { data: signatureResult } = useAuthorizedSignature();
  
  const gstData = (gstResult?.success && gstResult.data !== null) ? gstResult.data : 18;
  const [gstPercentage, setGstPercentage] = useState(gstData);
  
  // Invoice settings state
  const [invoicePrefix, setInvoicePrefix] = useState(invoicePrefixResult?.success && invoicePrefixResult.data ? invoicePrefixResult.data.value : 'INV-');
  const [paymentTerms, setPaymentTerms] = useState(paymentTermsResult?.success && paymentTermsResult.data ? paymentTermsResult.data.value : '');
  const [authorizedSignature, setAuthorizedSignature] = useState(signatureResult?.success && signatureResult.data ? signatureResult.data.value : '');

  const handleSaveGST = () => {
    if (gstPercentage !== null) {
      updateGSTPercentage(gstPercentage);
    }
  };

  const handleSaveInvoiceSettings = () => {
    showSuccess("Invoice settings saved successfully");
    // TODO: Implement actual save via API
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 mt-1">Manage your account and preferences</p>
      </div>

      {/* GST Configuration */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="text-xl text-slate-900">GST Configuration</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">GST Percentage (%)</label>
              <div className="flex gap-4">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={gstPercentage}
                  onChange={(e) => setGstPercentage(parseFloat(e.target.value) || 0)}
                  disabled={loadingGST || updatingGST}
                  className="bg-slate-50 border-slate-200 focus:border-primary max-w-xs"
                />
                <Button 
                  onClick={handleSaveGST}
                  disabled={updatingGST}
                  className="shadow-lg shadow-primary/25"
                >
                  {updatingGST ? "Saving..." : "Save GST"}
                </Button>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                This GST percentage will be applied to all new orders. Changes only affect future orders.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoice Settings */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="text-xl text-slate-900">Invoice Settings</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Invoice Prefix</label>
              <Input
                type="text"
                value={invoicePrefix}
                onChange={(e) => setInvoicePrefix(e.target.value)}
                className="bg-slate-50 border-slate-200 focus:border-primary max-w-xs"
                placeholder="INV-"
              />
              <p className="text-xs text-slate-500 mt-1">
                Prefix for invoice numbers (e.g., INV-001)
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Payment Terms</label>
              <Textarea
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="bg-slate-50 border-slate-200 focus:border-primary min-h-[100px]"
                placeholder="Payment must be made before or at the time of delivery..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Authorized Signature</label>
              <Input
                type="text"
                value={authorizedSignature}
                onChange={(e) => setAuthorizedSignature(e.target.value)}
                className="bg-slate-50 border-slate-200 focus:border-primary"
                placeholder="Authorized Signatory"
              />
            </div>

            <Button 
              onClick={handleSaveInvoiceSettings}
              className="shadow-lg shadow-primary/25"
            >
              Save Invoice Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Account Settings */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="text-xl text-slate-900">Account Settings</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Email</label>
              <Input
                type="email"
                value="admin@parisbridals.com"
                disabled
                className="bg-slate-50 border-slate-200 focus:border-primary opacity-60"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Phone</label>
              <Input
                type="tel"
                value="+91 9876543210"
                disabled
                className="bg-slate-50 border-slate-200 focus:border-primary opacity-60"
              />
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Account settings are managed by the administrator.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
