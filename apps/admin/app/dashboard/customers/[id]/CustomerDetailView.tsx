/**
 * CustomerDetailView — Client component for the customer detail page.
 *
 * Shows all customer info, ID documents with preview, and order history.
 *
 * @component
 */

"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Edit,
  User,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  FileText,
  Calendar,
  ExternalLink,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { type Customer } from "@/domain";

interface CustomerDetailViewProps {
  customer: Customer;
}

export default function CustomerDetailView({ customer }: CustomerDetailViewProps) {
  const router = useRouter();

  const frontDoc = customer.id_documents?.find((d) => d.type === "front");
  const backDoc = customer.id_documents?.find((d) => d.type === "back");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard/customers")}
            className="shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden border-2 border-slate-200">
              {customer.photo_url ? (
                <img
                  src={customer.photo_url}
                  alt={customer.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xl font-bold text-slate-400">
                  {customer.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {customer.name}
              </h1>
              <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" />
                Customer since{" "}
                {new Date(customer.created_at).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>
        <Button
          className="bg-slate-900 text-white hover:bg-slate-800 gap-2"
          onClick={() => router.push(`/dashboard/customers/${customer.id}/edit`)}
        >
          <Edit className="w-4 h-4" />
          Edit
        </Button>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: Contact Details ──────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Card */}
          <Card className="shadow-sm border-slate-200 bg-white overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <User className="w-4 h-4 text-slate-500" />
                Contact Information
              </h2>
            </div>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <InfoField
                  icon={<Phone className="w-4 h-4" />}
                  label="Phone"
                  value={customer.phone}
                />
                <InfoField
                  icon={<Phone className="w-4 h-4" />}
                  label="Alternate Phone"
                  value={customer.alt_phone || "Not provided"}
                  muted={!customer.alt_phone}
                />
                <InfoField
                  icon={<Mail className="w-4 h-4" />}
                  label="Email"
                  value={customer.email || "Not provided"}
                  muted={!customer.email}
                />
                <InfoField
                  icon={<MapPin className="w-4 h-4" />}
                  label="Address"
                  value={
                    typeof customer.address === "string"
                      ? customer.address
                      : "Not provided"
                  }
                  muted={!customer.address}
                  className="sm:col-span-2"
                />
                {customer.gstin && (
                  <InfoField
                    icon={<FileText className="w-4 h-4" />}
                    label="GSTIN"
                    value={customer.gstin}
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {/* ID Verification Card */}
          <Card className="shadow-sm border-slate-200 bg-white overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-slate-500" />
                Identity Verification
              </h2>
            </div>
            <CardContent className="p-6">
              {customer.id_type ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <InfoField
                      icon={<CreditCard className="w-4 h-4" />}
                      label="ID Type"
                      value={customer.id_type}
                    />
                    <InfoField
                      icon={<FileText className="w-4 h-4" />}
                      label="ID Number"
                      value={customer.id_number || "Not provided"}
                      muted={!customer.id_number}
                    />
                  </div>

                  {/* ID Document Images */}
                  {(frontDoc || backDoc) && (
                    <div className="pt-4 border-t border-slate-100">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
                        Document Photos
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {frontDoc && (
                          <DocumentPreview
                            label="Front Side"
                            url={frontDoc.url}
                          />
                        )}
                        {backDoc && (
                          <DocumentPreview
                            label="Back Side"
                            url={backDoc.url}
                          />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CreditCard className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">
                    No identity document on file
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Right: Quick Stats ──────────────────────────────── */}
        <div className="space-y-6">
          {/* Customer Photo */}
          {customer.photo_url && (
            <Card className="shadow-sm border-slate-200 bg-white overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <h2 className="text-sm font-semibold text-slate-900">
                  Customer Photo
                </h2>
              </div>
              <CardContent className="p-4">
                <div className="aspect-square rounded-lg overflow-hidden border border-slate-200">
                  <img
                    src={customer.photo_url}
                    alt={customer.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Info */}
          <Card className="shadow-sm border-slate-200 bg-white overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-sm font-semibold text-slate-900">
                Quick Info
              </h2>
            </div>
            <CardContent className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Customer ID</span>
                <code className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                  {customer.id.slice(0, 8)}...
                </code>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Added</span>
                <span className="text-sm font-medium text-slate-700">
                  {new Date(customer.created_at).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
              {customer.updated_at && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Last Updated</span>
                  <span className="text-sm font-medium text-slate-700">
                    {new Date(customer.updated_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Documents</span>
                <span className="text-sm font-medium text-slate-700">
                  {customer.id_documents?.length || 0} uploaded
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ── Info field helper ────────────────────────────────────────── */
function InfoField({
  icon,
  label,
  value,
  muted,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  muted?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-slate-400">{icon}</span>
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p
        className={`text-sm font-medium ${
          muted ? "text-slate-400 italic" : "text-slate-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

/* ── Document preview card ────────────────────────────────────── */
function DocumentPreview({ label, url }: { label: string; url: string }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-slate-600">{label}</p>
      <div className="relative group rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
        <img
          src={url}
          alt={label}
          className="w-full h-48 object-contain bg-white"
        />
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center"
        >
          <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 text-slate-900 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-sm">
            <ExternalLink className="w-3.5 h-3.5" />
            View Full Size
          </span>
        </a>
      </div>
    </div>
  );
}
