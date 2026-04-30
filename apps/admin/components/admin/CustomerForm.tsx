/**
 * CustomerForm Component
 *
 * Create / Edit form for customers. Same premium UX as ProductForm.
 * - Canvas-based client-side compression (< 100KB) before R2 upload
 * - Instant save via raw fetch + immediate router.push
 * - Supports profile photo + dual-sided ID document uploads
 *
 * @component
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, User, CreditCard, Camera, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileUpload } from "@/components/ui/file-upload";
import { type Customer, type IdType } from "@/domain";
import { useAppStore } from "@/stores";
import { useQueryClient } from "@tanstack/react-query";

const ID_TYPE_OPTIONS: { value: IdType; label: string }[] = [
  { value: "Aadhaar", label: "Aadhaar Card" },
  { value: "PAN", label: "PAN Card" },
  { value: "Driving Licence", label: "Driving Licence" },
  { value: "Passport", label: "Passport" },
  { value: "Others", label: "Others" },
];

interface CustomerFormProps {
  customer?: Customer;
}

function emptyFormData() {
  return {
    name: "",
    phone: "",
    alt_phone: "",
    email: "",
    address: "",
    gstin: "",
    id_type: "" as string,
    id_number: "",
  };
}

export default function CustomerForm({ customer }: CustomerFormProps) {
  const router = useRouter();
  const isEdit = !!customer;
  const { showError, showSuccess } = useAppStore();
  const queryClient = useQueryClient();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Photo URL
  const [photoUrl, setPhotoUrl] = useState<string>(customer?.photo_url || "");

  // ID Document URLs — front and back
  const existingFront = customer?.id_documents?.find((d) => d.type === "front")?.url || "";
  const existingBack = customer?.id_documents?.find((d) => d.type === "back")?.url || "";
  const [idFrontUrl, setIdFrontUrl] = useState<string>(existingFront);
  const [idBackUrl, setIdBackUrl] = useState<string>(existingBack);

  const [formData, setFormData] = useState(() =>
    customer
      ? {
          name: customer.name ?? "",
          phone: customer.phone ?? "",
          alt_phone: customer.alt_phone ?? "",
          email: customer.email ?? "",
          address: typeof customer.address === "string" ? customer.address : "",
          gstin: customer.gstin ?? "",
          id_type: customer.id_type ?? "",
          id_number: customer.id_number ?? "",
        }
      : emptyFormData()
  );

  const handleFieldChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // ── Save ──────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError("Customer name is required");
      return;
    }
    if (!formData.phone.trim()) {
      setError("Phone number is required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Build id_documents array
      const id_documents: { url: string; type: "front" | "back" }[] = [];
      if (idFrontUrl) id_documents.push({ url: idFrontUrl, type: "front" });
      if (idBackUrl) id_documents.push({ url: idBackUrl, type: "back" });

      const payload = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        alt_phone: formData.alt_phone.trim() || null,
        email: formData.email.trim() || undefined,
        address: formData.address.trim() || undefined,
        gstin: formData.gstin.trim() || undefined,
        photo_url: photoUrl || undefined,
        id_type: formData.id_type || undefined,
        id_number: formData.id_number.trim() || undefined,
        id_documents,
      };

      const url = isEdit ? `/api/customers/${customer.id}` : "/api/customers";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "Failed to save customer");
        setLoading(false);
        return;
      }

      // Wipe cache so list page shows fresh data
      queryClient.removeQueries({ queryKey: ["customers"] });

      showSuccess(isEdit ? "Customer updated" : "Customer created");
      router.push("/dashboard/customers");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/dashboard/customers")}
          className="shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {isEdit ? "Edit Customer" : "Add Customer"}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {isEdit
              ? `Updating ${customer.name}`
              : "Fill in the customer details below"}
          </p>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Form Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left Column: Basic Info ────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Info Card */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <User className="w-4 h-4 text-slate-500" />
                Personal Information
              </h2>
            </div>
            <div className="p-6 space-y-5">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => handleFieldChange("name", e.target.value)}
                  placeholder="Enter customer full name"
                  className="border-slate-200 focus:border-slate-900"
                />
              </div>

              {/* Phone + Alt Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => handleFieldChange("phone", e.target.value)}
                    placeholder="e.g. +91 9876543210"
                    className="border-slate-200 focus:border-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Alternate Phone <span className="text-slate-400 text-xs">(Optional)</span>
                  </label>
                  <Input
                    value={formData.alt_phone}
                    onChange={(e) => handleFieldChange("alt_phone", e.target.value)}
                    placeholder="e.g. +91 9876543210"
                    className="border-slate-200 focus:border-slate-900"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Email <span className="text-slate-400 text-xs">(Optional)</span>
                  </label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleFieldChange("email", e.target.value)}
                    placeholder="customer@email.com"
                    className="border-slate-200 focus:border-slate-900"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Address <span className="text-slate-400 text-xs">(Optional)</span>
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => handleFieldChange("address", e.target.value)}
                  placeholder="Full postal address"
                  rows={3}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 resize-none"
                />
              </div>

              {/* GSTIN */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  GSTIN <span className="text-slate-400 text-xs">(Optional)</span>
                </label>
                <Input
                  value={formData.gstin}
                  onChange={(e) =>
                    handleFieldChange("gstin", e.target.value.toUpperCase())
                  }
                  placeholder="e.g. 22AAAAA0000A1Z5"
                  className="border-slate-200 focus:border-slate-900 uppercase"
                />
              </div>
            </div>
          </div>

          {/* ID Verification Card */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-slate-500" />
                Identity Verification
              </h2>
            </div>
            <div className="p-6 space-y-5">
              {/* ID Type + ID Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    ID Type
                  </label>
                  <select
                    value={formData.id_type}
                    onChange={(e) => handleFieldChange("id_type", e.target.value)}
                    className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                  >
                    <option value="">Select ID type</option>
                    {ID_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    ID Number
                  </label>
                  <Input
                    value={formData.id_number}
                    onChange={(e) => handleFieldChange("id_number", e.target.value)}
                    placeholder="Enter ID number"
                    className="border-slate-200 focus:border-slate-900"
                  />
                </div>
              </div>

              {/* Front + Back ID upload */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    ID Front Side
                  </label>
                  <FileUpload
                    accept="image/*"
                    maxFiles={1}
                    maxSize={20 * 1024 * 1024}
                    folder="customers/id-documents"
                    value={idFrontUrl ? [idFrontUrl] : []}
                    onChange={(urls) => setIdFrontUrl(urls[0] || "")}
                    helperText="Upload front side of ID"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    ID Back Side
                  </label>
                  <FileUpload
                    accept="image/*"
                    maxFiles={1}
                    maxSize={20 * 1024 * 1024}
                    folder="customers/id-documents"
                    value={idBackUrl ? [idBackUrl] : []}
                    onChange={(urls) => setIdBackUrl(urls[0] || "")}
                    helperText="Upload back side of ID"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right Column: Photo ─────────────────────────────── */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Camera className="w-4 h-4 text-slate-500" />
                Customer Photo
              </h2>
            </div>
            <div className="p-6">
              <FileUpload
                accept="image/*"
                maxFiles={1}
                maxSize={20 * 1024 * 1024}
                folder="customers/photos"
                value={photoUrl ? [photoUrl] : []}
                onChange={(urls) => setPhotoUrl(urls[0] || "")}
                helperText="Optional customer photo"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Sticky Save Bar ──────────────────────────────────────── */}
      <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm border-t border-slate-200 -mx-6 md:-mx-8 px-6 md:px-8 py-4 mt-8 flex items-center justify-between z-10">
        <Button
          variant="outline"
          onClick={() => router.push("/dashboard/customers")}
          className="border-slate-200"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={loading}
          className="bg-slate-900 text-white hover:bg-slate-800 gap-2 min-w-[140px]"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : isEdit ? (
            "Update Customer"
          ) : (
            "Create Customer"
          )}
        </Button>
      </div>
    </div>
  );
}
