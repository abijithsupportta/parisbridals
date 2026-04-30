"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { 
  useGSTPercentage, 
  useUpdateGSTPercentage,
  useIsGSTEnabled,
  useUpdateIsGSTEnabled,
  useInvoicePrefix,
  usePaymentTerms,
  useAuthorizedSignature,
  useUpdateSetting
} from "@/hooks";
import { useAppStore } from "@/stores";

export default function SettingsPage() {
  const { data: gstResult, isLoading: loadingGST } = useGSTPercentage();
  const { updateGSTPercentage, isLoading: updatingGST } = useUpdateGSTPercentage();
  
  const { data: isGstEnabledResult, isLoading: loadingGstEnabled } = useIsGSTEnabled();
  const { updateIsGSTEnabled, isLoading: updatingGstEnabled } = useUpdateIsGSTEnabled();
  
  const { updateSetting, isLoading: updatingSettings } = useUpdateSetting();
  const { showSuccess, showError, user } = useAppStore();
  
  // Invoice settings hooks
  const { data: invoicePrefixResult, isLoading: loadingPrefix } = useInvoicePrefix();
  const { data: paymentTermsResult, isLoading: loadingTerms } = usePaymentTerms();
  const { data: signatureResult, isLoading: loadingSig } = useAuthorizedSignature();
  
  const gstData = (gstResult?.success && gstResult.data !== null) ? gstResult.data : 18;
  const [gstPercentage, setGstPercentage] = useState(gstData);
  
  const isGstEnabledData = (isGstEnabledResult?.success && isGstEnabledResult.data !== null) ? isGstEnabledResult.data : false;
  const [isGstEnabled, setIsGstEnabled] = useState(isGstEnabledData);
  
  // Invoice settings state
  const [invoicePrefix, setInvoicePrefix] = useState('INV-');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [authorizedSignature, setAuthorizedSignature] = useState('');

  // Sync hooks with state when data loads
  useEffect(() => {
    if (gstResult?.success && gstResult.data !== null) setGstPercentage(gstResult.data);
    if (isGstEnabledResult?.success && isGstEnabledResult.data !== null) setIsGstEnabled(isGstEnabledResult.data);
    if (invoicePrefixResult?.success && invoicePrefixResult.data) setInvoicePrefix(invoicePrefixResult.data.value);
    if (paymentTermsResult?.success && paymentTermsResult.data) setPaymentTerms(paymentTermsResult.data.value);
    if (signatureResult?.success && signatureResult.data) setAuthorizedSignature(signatureResult.data.value);
  }, [gstResult, isGstEnabledResult, invoicePrefixResult, paymentTermsResult, signatureResult]);

  const handleSaveGST = () => {
    if (gstPercentage !== null) {
      updateGSTPercentage(gstPercentage);
      updateIsGSTEnabled(isGstEnabled);
    }
  };

  const handleSaveInvoiceSettings = async () => {
    try {
      await Promise.all([
        updateSetting({ key: 'invoice_prefix', value: invoicePrefix }),
        updateSetting({ key: 'payment_terms', value: paymentTerms }),
        updateSetting({ key: 'authorized_signature', value: authorizedSignature }),
      ]);
      showSuccess("Invoice settings saved successfully");
    } catch (err) {
      // updateSetting hook will handle showing the error toast
    }
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
            <div className="flex items-center justify-between bg-slate-50 p-4 rounded-lg border border-slate-200">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Enable GST Calculation</h3>
                <p className="text-xs text-slate-500 mt-0.5">When enabled, GST will be applied to all new orders.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isGstEnabled}
                  onChange={(e) => setIsGstEnabled(e.target.checked)}
                  disabled={loadingGstEnabled || updatingGstEnabled}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:ring-2 peer-focus:ring-slate-900/20 rounded-full peer peer-checked:bg-slate-900 transition-colors"></div>
                <div className={`absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${isGstEnabled ? 'translate-x-5' : 'translate-x-0'}`}></div>
              </label>
            </div>

            {isGstEnabled && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
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
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  This GST percentage will be applied to all new orders. Changes only affect future orders.
                </p>
              </div>
            )}
            
            <div className="pt-4 border-t border-slate-100">
              <Button 
                onClick={handleSaveGST}
                disabled={updatingGST || updatingGstEnabled}
                className="shadow-lg shadow-primary/25 bg-slate-900 text-white hover:bg-slate-800"
              >
                {(updatingGST || updatingGstEnabled) ? "Saving..." : "Save GST Settings"}
              </Button>
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
              disabled={updatingSettings || loadingPrefix || loadingTerms || loadingSig}
              className="shadow-lg shadow-primary/25 bg-slate-900 text-white hover:bg-slate-800"
            >
              {updatingSettings ? "Saving..." : "Save Invoice Settings"}
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
              <label className="text-sm font-semibold text-slate-700">Name</label>
              <Input
                type="text"
                value={user?.name || 'Unknown'}
                disabled
                className="bg-slate-50 border-slate-200 focus:border-primary opacity-60"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Email</label>
              <Input
                type="email"
                value={user?.email || 'Not available'}
                disabled
                className="bg-slate-50 border-slate-200 focus:border-primary opacity-60"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Role</label>
              <Input
                type="text"
                value={user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Unknown'}
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
