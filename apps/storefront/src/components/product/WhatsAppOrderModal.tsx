"use client";

import { useEffect, useState } from "react";
import { X, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { buildOrderMessage, buildWhatsAppUrl } from "@/lib/whatsapp";

interface ProductSummary {
  name: string;
  price_per_day: number;
  categoryName?: string | null;
  image?: string | null;
}

interface WhatsAppOrderModalProps {
  open: boolean;
  onClose: () => void;
  product: ProductSummary;
}

export default function WhatsAppOrderModal({
  open,
  onClose,
  product,
}: WhatsAppOrderModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [errors, setErrors] = useState<{ name?: string; phone?: string; address?: string; startDate?: string; endDate?: string }>({});

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Reset form when closed
  useEffect(() => {
    if (!open) {
      setErrors({});
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: typeof errors = {};
    if (!name.trim() || name.trim().length < 2) {
      newErrors.name = "Please enter your full name";
    }
    const cleanPhone = phone.replace(/\s|-/g, "");
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      newErrors.phone = "Enter a valid 10-digit Indian mobile number";
    }
    if (!address.trim() || address.trim().length < 5) {
      newErrors.address = "Please enter your delivery address";
    }
    if (!startDate) {
      newErrors.startDate = "Select a start date";
    }
    if (!endDate) {
      newErrors.endDate = "Select an end date";
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    const message = buildOrderMessage({
      productName: product.name,
      price: product.price_per_day,
      categoryName: product.categoryName,
      quantity,
      customerName: name.trim(),
      customerPhone: cleanPhone,
      customerAddress: address.trim(),
      startDate,
      endDate,
    });

    window.open(buildWhatsAppUrl(message), "_blank");
    onClose();
  };

  return (
    <div
      className={cn(
        "fixed inset-0 z-[80] flex items-end sm:items-center justify-center transition-opacity duration-300",
        open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      )}
      aria-hidden={!open}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-heading/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={cn(
          "relative w-full sm:max-w-md mx-auto bg-ivory rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]",
          open ? "translate-y-0 sm:scale-100" : "translate-y-full sm:translate-y-0 sm:scale-95"
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-[var(--border-silk)]">
          <div>
            <span className="text-[10px] uppercase tracking-[0.3em] text-rosegold font-semibold">
              Reserve Now
            </span>
            <h3 className="text-2xl font-serif text-heading mt-1.5 leading-tight">
              Order on WhatsApp
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-silk hover:bg-silk-dark flex items-center justify-center text-heading transition-colors shrink-0"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Product summary */}
        <div className="px-6 py-4 bg-silk border-b border-[var(--border-silk)] flex items-center gap-4">
          {product.image && (
            <div className="w-14 h-14 rounded-2xl overflow-hidden bg-white border border-[var(--border-silk)] shrink-0">
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-caption mb-0.5">
              You&apos;re ordering
            </p>
            <p className="text-sm font-serif text-heading line-clamp-1">{product.name}</p>
            <p className="text-sm text-rosegold font-semibold">
              ₹{product.price_per_day.toLocaleString("en-IN")} for event
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
          <div>
            <label className="text-[10px] uppercase tracking-[0.2em] text-body font-semibold block mb-2">
              Your Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((p) => ({ ...p, name: undefined }));
              }}
              className={cn(
                "w-full px-4 py-3 bg-white border rounded-full text-sm focus:outline-none transition-colors placeholder:text-caption",
                errors.name
                  ? "border-red-400 focus:border-red-500"
                  : "border-[var(--border-silk)] focus:border-rosegold"
              )}
              placeholder="Enter your full name"
            />
            {errors.name && (
              <p className="text-xs text-red-500 mt-1.5 ml-4">{errors.name}</p>
            )}
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-[0.2em] text-body font-semibold block mb-2">
              Phone Number *
            </label>
            <div className="flex gap-2">
              <div className="flex items-center justify-center px-3 bg-silk border border-[var(--border-silk)] rounded-full text-sm text-heading font-medium shrink-0">
                +91
              </div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
                  if (errors.phone) setErrors((p) => ({ ...p, phone: undefined }));
                }}
                className={cn(
                  "flex-1 px-4 py-3 bg-white border rounded-full text-sm focus:outline-none transition-colors placeholder:text-caption",
                  errors.phone
                    ? "border-red-400 focus:border-red-500"
                    : "border-[var(--border-silk)] focus:border-rosegold"
                )}
                placeholder="10-digit mobile number"
                inputMode="numeric"
                maxLength={10}
              />
            </div>
            {errors.phone && (
              <p className="text-xs text-red-500 mt-1.5 ml-4">{errors.phone}</p>
            )}
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-[0.2em] text-body font-semibold block mb-2">
              Delivery Address *
            </label>
            <textarea
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                if (errors.address) setErrors((p) => ({ ...p, address: undefined }));
              }}
              rows={2}
              className={cn(
                "w-full px-4 py-3 bg-white border rounded-2xl text-sm focus:outline-none transition-colors placeholder:text-caption resize-none",
                errors.address
                  ? "border-red-400 focus:border-red-500"
                  : "border-[var(--border-silk)] focus:border-rosegold"
              )}
              placeholder="Full address with pincode"
            />
            {errors.address && (
              <p className="text-xs text-red-500 mt-1.5 ml-4">{errors.address}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] uppercase tracking-[0.2em] text-body font-semibold block mb-2">
                Start Date *
              </label>
              <input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (errors.startDate) setErrors((p) => ({ ...p, startDate: undefined }));
                }}
                className={cn(
                  "w-full px-4 py-3 bg-white border rounded-full text-sm focus:outline-none transition-colors",
                  errors.startDate
                    ? "border-red-400 focus:border-red-500"
                    : "border-[var(--border-silk)] focus:border-rosegold"
                )}
              />
              {errors.startDate && (
                <p className="text-[10px] text-red-500 mt-1 ml-2">{errors.startDate}</p>
              )}
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-[0.2em] text-body font-semibold block mb-2">
                End Date *
              </label>
              <input
                type="date"
                min={startDate || new Date().toISOString().split('T')[0]}
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  if (errors.endDate) setErrors((p) => ({ ...p, endDate: undefined }));
                }}
                className={cn(
                  "w-full px-4 py-3 bg-white border rounded-full text-sm focus:outline-none transition-colors",
                  errors.endDate
                    ? "border-red-400 focus:border-red-500"
                    : "border-[var(--border-silk)] focus:border-rosegold"
                )}
              />
              {errors.endDate && (
                <p className="text-[10px] text-red-500 mt-1 ml-2">{errors.endDate}</p>
              )}
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-[0.2em] text-body font-semibold block mb-2">
              Quantity
            </label>
            <div className="flex items-center gap-2 bg-white border border-[var(--border-silk)] rounded-full p-1 w-fit">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                className="w-9 h-9 rounded-full hover:bg-silk text-heading flex items-center justify-center transition-colors disabled:opacity-30"
                aria-label="Decrease quantity"
              >
                <Minus size={14} />
              </button>
              <span className="text-base font-serif text-heading w-8 text-center">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="w-9 h-9 rounded-full hover:bg-silk text-heading flex items-center justify-center transition-colors"
                aria-label="Increase quantity"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="shimmer-btn w-full py-4 rounded-full text-sm font-semibold tracking-[0.15em] text-white uppercase mt-2"
          >
            Send Order on WhatsApp
          </button>

          <p className="text-[10px] text-center text-caption uppercase tracking-[0.2em]">
            We&apos;ll confirm availability on WhatsApp shortly
          </p>
        </form>
      </div>
    </div>
  );
}
