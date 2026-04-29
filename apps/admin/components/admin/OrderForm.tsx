"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { format, addDays, startOfDay } from "date-fns";
import {
  Search, Plus, Minus, Trash2, Calendar, User, Package,
  ArrowLeft, ArrowRight, ShieldCheck, AlertTriangle, CheckCircle2, Loader2, Info, ScanBarcode, Banknote
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCustomers, useProducts, useCreateOrder, useUpdateOrder, useCreateCustomer, useGSTPercentage, useIsGSTEnabled, useCheckOrderAvailability, useLookupProductByBarcode } from "@/hooks";
import { useAppStore } from "@/stores";
import { formatCurrency } from "@/lib/shared-utils";
import { PaymentMethod } from "@/domain/types/order";
import dynamic from 'next/dynamic';

const BarcodeScanner = dynamic(() => import('./BarcodeScanner'), { ssr: false });

interface OrderFormProps {
  initialData?: any;
}

export default function OrderForm({ initialData }: OrderFormProps) {
  const router = useRouter();
  const { showSuccess, showError } = useAppStore();
  const selectedBranchId = useAppStore((s: any) => s.selectedBranchId);
  const isEditing = !!initialData;

  const { createOrder, isPending: isCreating } = useCreateOrder();
  const { updateOrder, isPending: isUpdating } = useUpdateOrder();
  const { createCustomer, isPending: isCreatingCustomer } = useCreateCustomer();
  const { lookupByBarcode, isLooking: isScanningBarcode } = useLookupProductByBarcode();
  
  // Settings
  const { data: gstResult } = useGSTPercentage();
  const { data: isGstEnabledResult } = useIsGSTEnabled();
  
  const gstPercentage = (gstResult?.success && gstResult.data !== null) ? gstResult.data : 18;
  const isGstEnabled = (isGstEnabledResult?.success && isGstEnabledResult.data !== null) ? isGstEnabledResult.data : false;

  // Data Fetching for comboboxes
  const [customerSearch, setCustomerSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");

  const { data: customersData } = useCustomers({ query: customerSearch, limit: 10 });
  const { data: productsData } = useProducts({ query: productSearch, limit: 10, branch_id: selectedBranchId || undefined });

  const customers = customersData?.customers || [];
  const products = productsData?.products || [];

  // Local State
  const [selectedCustomer, setSelectedCustomer] = useState<any>(initialData?.customer || null);
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);

  const [isQuickAddMode, setIsQuickAddMode] = useState(false);
  const [quickAddName, setQuickAddName] = useState("");
  const [quickAddPhone, setQuickAddPhone] = useState("");
  const [quickAddAddress, setQuickAddAddress] = useState("");

  // Delivery / Customer Address
  const [deliveryAddress, setDeliveryAddress] = useState(initialData?.delivery_address || "");

  // Cart State
  const [cartItems, setCartItems] = useState<any[]>(
    initialData?.items?.map((item: any) => ({
      product: item.product || { id: item.product_id, name: "Product", price_per_day: item.price_per_day },
      quantity: item.quantity,
      price_per_day: item.price_per_day
    })) || []
  );

  // Date State
  const [startDate, setStartDate] = useState<Date>(initialData ? new Date(initialData.start_date || initialData.rental_start_date) : new Date());
  const [endDate, setEndDate] = useState<Date>(initialData ? new Date(initialData.end_date || initialData.rental_end_date) : addDays(new Date(), 1));

  // Notes
  const [notes, setNotes] = useState(initialData?.notes || "");

  // Deposit State
  const [depositCollected, setDepositCollected] = useState(initialData?.deposit_collected || false);
  const [depositAmount, setDepositAmount] = useState<number>(initialData?.security_deposit || 0);
  const [depositPaymentMethod, setDepositPaymentMethod] = useState<string>(initialData?.deposit_payment_method || PaymentMethod.CASH);

  // Advance Payment State
  const [advanceCollected, setAdvanceCollected] = useState(initialData?.advance_collected || false);
  const [advanceAmount, setAdvanceAmount] = useState<number>(initialData?.advance_amount || 0);
  const [advancePaymentMethod, setAdvancePaymentMethod] = useState<string>(initialData?.advance_payment_method || PaymentMethod.CASH);

  // Barcode Scanner
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Close dropdowns when clicking outside
  const customerRef = useRef<HTMLDivElement>(null);
  const productRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (customerRef.current && !customerRef.current.contains(event.target as Node)) setIsCustomerDropdownOpen(false);
      if (productRef.current && !productRef.current.contains(event.target as Node)) setIsProductDropdownOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sync selected customer's address to delivery address if empty
  useEffect(() => {
    if (selectedCustomer?.address && !deliveryAddress && !isEditing) {
      setDeliveryAddress(selectedCustomer.address);
    }
  }, [selectedCustomer, deliveryAddress, isEditing]);

  // Set Dates Quick Action — uses the currently selected start date
  const handleQuickDate = (days: number) => {
    setEndDate(addDays(startDate, days));
  };

  const rentalDays = useMemo(() => {
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(1, diffDays);
  }, [startDate, endDate]);

  // Date validation: return date must be strictly after pickup date
  const isDateInvalid = useMemo(() => {
    // Compare dates only (ignore time)
    const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    return end <= start;
  }, [startDate, endDate]);

  // Cart Calculations — flat rent price, NOT per-day
  const cartTotals = useMemo(() => {
    let subtotal = 0;
    cartItems.forEach((item) => {
      subtotal += item.price_per_day * item.quantity;
    });
    const gstAmount = isGstEnabled ? subtotal * (gstPercentage / 100) : 0;
    const grandTotal = subtotal + gstAmount;
    return { subtotal, gstAmount, grandTotal };
  }, [cartItems, isGstEnabled, gstPercentage]);

  // Payment validation
  const advanceExceedsTotal = advanceCollected && advanceAmount > cartTotals.grandTotal;
  const depositExceedsTotal = depositCollected && depositAmount > cartTotals.grandTotal;
  const isFullAdvancePayment = advanceCollected && advanceAmount > 0 && advanceAmount === cartTotals.grandTotal;
  const isPaymentInvalid = advanceExceedsTotal || depositExceedsTotal;

  // ─── Live Availability Check (Search Dropdown) ──────────────────
  const availableProducts = useMemo(() => {
    return products.filter((p: any) => !cartItems.some((item: any) => item.product.id === p.id));
  }, [products, cartItems]);

  const searchItems = useMemo(() => {
    if (!isProductDropdownOpen || productSearch.length === 0) return [];
    return availableProducts.map((p: any) => ({
      product_id: p.id,
      quantity: 1,
      product_name: p.name,
    }));
  }, [availableProducts, isProductDropdownOpen, productSearch]);

  const { data: searchAvailabilityData, isLoading: isCheckingSearch } = useCheckOrderAvailability(
    searchItems,
    format(startDate, "yyyy-MM-dd"),
    format(endDate, "yyyy-MM-dd"),
    selectedBranchId || undefined,
    initialData?.id,
    searchItems.length > 0 && isProductDropdownOpen
  );

  const searchAvailabilityMap = useMemo(() => {
    const map = new Map<string, { available: number; isAvailable: boolean; peakReserved: number; overlappingOrders: any[] }>();
    if (searchAvailabilityData?.data?.items) {
      for (const item of searchAvailabilityData.data.items) {
        map.set(item.product_id, item);
      }
    }
    return map;
  }, [searchAvailabilityData]);

  // ─── Live Availability Check (Interval Scheduling) ─────────────────
  // Debounce the availability items so rapid qty clicks don't spam the API
  const availabilityItems = useMemo(() => {
    return cartItems.map(item => ({
      product_id: item.product.id,
      quantity: item.quantity,
      product_name: item.product.name,
    }));
  }, [cartItems]);

  const [debouncedAvailItems, setDebouncedAvailItems] = useState(availabilityItems);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedAvailItems(availabilityItems), 500);
    return () => clearTimeout(timer);
  }, [availabilityItems]);

  const { data: availabilityData, isLoading: isCheckingAvailability } = useCheckOrderAvailability(
    debouncedAvailItems,
    format(startDate, "yyyy-MM-dd"),
    format(endDate, "yyyy-MM-dd"),
    selectedBranchId || undefined,
    initialData?.id, // exclude current order when editing
    debouncedAvailItems.length > 0, // enabled
  );

  const availabilityMap = useMemo(() => {
    const map = new Map<string, { available: number; isAvailable: boolean; peakReserved: number; overlappingOrders: any[] }>();
    if (availabilityData?.data?.items) {
      for (const item of availabilityData.data.items) {
        map.set(item.product_id, item);
      }
    }
    return map;
  }, [availabilityData]);



  const hasUnavailableItems = availabilityData?.data ? !availabilityData.data.allAvailable : false;

  // Handlers
  const addToCart = (product: any) => {
    if (product.available_quantity !== undefined && product.available_quantity < 1) {
      showError("Out of Stock", "This product is currently out of stock.");
      return;
    }

    const searchAvail = searchAvailabilityMap.get(product.id);
    if (searchAvail && searchAvail.available < 1) {
      showError("Unavailable for Dates", `0 free for the selected dates.`);
      return;
    }

    const existing = cartItems.find(p => p.product.id === product.id);
    if (existing && product.available_quantity !== undefined && existing.quantity >= product.available_quantity) {
      showError("Stock Limit Reached", `Only ${product.available_quantity} available in stock.`);
      return;
    }

    const cartAvail = availabilityMap.get(product.id);
    if (existing && cartAvail && existing.quantity >= cartAvail.available) {
      showError("Unavailable for Dates", `Only ${cartAvail.available} free for these dates.`);
      return;
    }

    setCartItems(prev => {
      const ex = prev.find(p => p.product.id === product.id);
      if (ex) {
        return prev.map(p => p.product.id === product.id ? { ...p, quantity: p.quantity + 1 } : p);
      }
      return [...prev, { product, quantity: 1, price_per_day: product.price_per_day }];
    });
    setProductSearch("");
    setIsProductDropdownOpen(false);
  };

  const updateCartQty = (productId: string, delta: number) => {
    if (delta > 0) {
      const itemToUpdate = cartItems.find(p => p.product.id === productId);
      if (itemToUpdate && itemToUpdate.product.available_quantity !== undefined && itemToUpdate.quantity >= itemToUpdate.product.available_quantity) {
        showError("Stock Limit Reached", `Only ${itemToUpdate.product.available_quantity} available in stock.`);
        return;
      }

      const cartAvail = availabilityMap.get(productId);
      if (cartAvail && itemToUpdate && itemToUpdate.quantity >= cartAvail.available) {
        showError("Unavailable for Dates", `Only ${cartAvail.available} free for these dates.`);
        return;
      }
    }

    setCartItems(prev => prev.map(p => {
      if (p.product.id === productId) {
        const newQty = Math.max(1, p.quantity + delta);
        return { ...p, quantity: newQty };
      }
      return p;
    }));
  };

  const removeCartItem = (productId: string) => {
    setCartItems(prev => prev.filter(p => p.product.id !== productId));
  };

  // Barcode scan handler — used by both camera scanner and USB/keyboard
  // Uses functional setCartItems to avoid stale closure over cartItems
  const scanInProgressRef = useRef<string | null>(null);
  const handleBarcodeScan = async (barcode: string) => {
    // Prevent concurrent lookups for the same barcode
    if (scanInProgressRef.current === barcode) return;
    scanInProgressRef.current = barcode;

    try {
      const product = await lookupByBarcode(barcode);
      if (!product) return;

      // Use functional update — always reads the latest cart state
      let wasExisting = false;
      setCartItems(prev => {
        const existing = prev.find(p => p.product.id === product.id);
        if (existing) {
          wasExisting = true;
          return prev.map(p =>
            p.product.id === product.id ? { ...p, quantity: p.quantity + 1 } : p
          );
        }
        return [...prev, { product, quantity: 1, price_per_day: product.price_per_day }];
      });
      showSuccess(wasExisting ? `${product.name} — quantity increased` : `${product.name} added to cart`);
    } catch {
      // Error already shown by the hook
    } finally {
      scanInProgressRef.current = null;
    }
  };

  // USB/Bluetooth keyboard scanner support — detect rapid input + Enter
  const handleProductSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && productSearch.trim().length > 0) {
      const val = productSearch.trim();
      // Heuristic: if the value looks like a barcode (alphanumeric, no spaces, 4+ chars)
      if (/^[a-zA-Z0-9\-_]+$/.test(val) && val.length >= 4) {
        e.preventDefault();
        handleBarcodeScan(val);
        setProductSearch('');
        setIsProductDropdownOpen(false);
      }
    }
  };

  // Get product primary image URL
  const getImageUrl = (product: any) => {
    if (!product?.images || !Array.isArray(product.images) || product.images.length === 0) return null;
    const img = product.images[0];
    return typeof img === "string" ? img : img?.url || null;
  };

  // Quick Add Customer
  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddName.trim() || !quickAddPhone.trim()) {
      showError("Validation Error", "Name and Phone are required.");
      return;
    }
    createCustomer({ name: quickAddName, phone: quickAddPhone, address: quickAddAddress || undefined }, {
      onSuccess: (res: any) => {
        const newCustomer = res.customer;
        setSelectedCustomer(newCustomer);
        setIsCustomerDropdownOpen(false);
        setIsQuickAddMode(false);
        setCustomerSearch("");
        setQuickAddName("");
        setQuickAddPhone("");
        setQuickAddAddress("");
      }
    });
  };

  // Submit
  const handleCheckout = async () => {
    if (!selectedCustomer) {
      showError("Missing Customer", "Please select or create a customer.");
      return;
    }
    if (cartItems.length === 0) {
      showError("Empty Cart", "Please add at least one item to the order.");
      return;
    }
    if (!selectedBranchId) {
      showError("Missing Branch", "Please select a branch from the top navigation.");
      return;
    }

    if (startOfDay(endDate) < startOfDay(startDate)) {
      showError("Invalid Dates", "Return date cannot be earlier than the pickup date.");
      return;
    }

    const basePayload = {
      notes: notes || undefined,
      delivery_address: deliveryAddress || undefined,
      deposit_collected: depositCollected,
      security_deposit: depositCollected ? depositAmount : 0,
      deposit_payment_method: depositCollected ? depositPaymentMethod : undefined,
      deposit_collected_at: depositCollected ? new Date().toISOString() : undefined,
      advance_amount: advanceCollected ? advanceAmount : 0,
      advance_collected: advanceCollected,
      advance_payment_method: advanceCollected ? advancePaymentMethod : undefined,
    };

    if (isEditing) {
      updateOrder({ id: initialData.id, data: { ...basePayload, start_date: startDate.toISOString(), end_date: endDate.toISOString() } as any }, {
        onSuccess: () => {
          router.push("/dashboard/orders");
        }
      });
    } else {
      createOrder({
        ...basePayload,
        customer_id: selectedCustomer.id,
        branch_id: selectedBranchId,
        rental_start_date: startDate.toISOString(),
        rental_end_date: endDate.toISOString(),
        items: cartItems.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity,
          price_per_day: item.price_per_day
        }))
      } as any, {
        onSuccess: () => {
          router.push("/dashboard/orders");
        }
      });
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
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              {isEditing ? "Edit Order" : "New Order"}
            </h1>
            <p className="text-sm text-slate-500">
              {isEditing ? "Update order details" : "Search customer, add items, and confirm"}
            </p>
          </div>
        </div>
      </div>

      {/* Two-column layout — 50/50 split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* LEFT COLUMN */}
        <div className="space-y-6">

          {/* Customer Section */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <User className="w-4 h-4 text-slate-400" />
              Customer
            </h3>
            {!selectedCustomer ? (
              <div className="relative" ref={customerRef}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    placeholder="Search customer by name or phone..."
                    className="pl-10 h-12 border-slate-200 focus:border-slate-900 text-base"
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setIsCustomerDropdownOpen(true);
                    }}
                    onFocus={() => setIsCustomerDropdownOpen(true)}
                  />
                </div>
                {isCustomerDropdownOpen && customerSearch.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                    {isQuickAddMode ? (
                      <div className="p-4 space-y-3">
                        <h5 className="text-sm font-semibold text-slate-900">Create New Customer</h5>
                        <form onSubmit={handleQuickAddSubmit} className="space-y-3">
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Full Name</label>
                            <Input
                              value={quickAddName}
                              onChange={e => setQuickAddName(e.target.value)}
                              placeholder="Customer name"
                              className="h-9 border-slate-200 focus:border-slate-900"
                              autoFocus
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Phone Number</label>
                            <Input
                              value={quickAddPhone}
                              onChange={e => setQuickAddPhone(e.target.value)}
                              placeholder="9876543210"
                              className="h-9 border-slate-200 focus:border-slate-900"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Address (Optional)</label>
                            <textarea
                              value={quickAddAddress}
                              onChange={e => setQuickAddAddress(e.target.value)}
                              placeholder="Customer address"
                              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 resize-none"
                              rows={2}
                            />
                          </div>
                          <div className="flex gap-2 pt-1">
                            <Button type="button" variant="outline" size="sm" onClick={() => setIsQuickAddMode(false)} className="flex-1 h-9 border-slate-200 text-slate-600">
                              Cancel
                            </Button>
                            <Button type="submit" size="sm" className="flex-1 h-9 bg-slate-900 text-white hover:bg-slate-800 font-semibold" disabled={isCreatingCustomer}>
                              {isCreatingCustomer ? "Saving..." : "Save & Select"}
                            </Button>
                          </div>
                        </form>
                      </div>
                    ) : customers.length > 0 ? (
                      <ul className="py-1">
                        {customers.map((c: any) => (
                          <li
                            key={c.id}
                            className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer flex flex-col"
                            onClick={() => { setSelectedCustomer(c); setIsCustomerDropdownOpen(false); setCustomerSearch(""); }}
                          >
                            <span className="font-medium text-slate-900 text-sm">{c.name}</span>
                            <span className="text-xs text-slate-500">{c.phone}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="p-4 text-center">
                        <p className="text-sm text-slate-500 mb-2">No customer found.</p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full h-9 border-slate-200 text-slate-700 hover:bg-slate-50 font-medium"
                          onClick={() => {
                            setIsQuickAddMode(true);
                            const isPhone = /^\d+$/.test(customerSearch.trim());
                            if (isPhone) {
                              setQuickAddPhone(customerSearch.trim());
                              setQuickAddName("");
                            } else {
                              setQuickAddName(customerSearch.trim());
                              setQuickAddPhone("");
                            }
                          }}
                        >
                          <Plus className="w-4 h-4 mr-1" /> Quick Add &quot;{customerSearch}&quot;
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div>
                  <h4 className="font-semibold text-slate-900">{selectedCustomer.name}</h4>
                  <p className="text-xs text-slate-500">{selectedCustomer.phone}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setSelectedCustomer(null)} className="h-8 border-slate-200 text-slate-500 hover:text-slate-900 text-xs">
                  Change
                </Button>
              </div>
            )}
          </div>

          {/* Rental Period */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              Rental Period
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {[1, 2, 3, 4, 5, 7].map(days => (
                <Button
                  key={days}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickDate(days)}
                  className={`h-8 text-xs border-slate-200 ${rentalDays === days ? 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800 hover:text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  {days} {days === 1 ? 'Day' : 'Days'}
                </Button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-600">Pickup Date</label>
                <Input
                  type="date"
                  className="h-12 border-slate-200 focus:border-slate-900 text-base"
                  value={format(startDate, "yyyy-MM-dd")}
                  onChange={(e) => {
                    const newDate = new Date(e.target.value);
                    if (!isNaN(newDate.getTime())) {
                      setStartDate(newDate);
                      if (startOfDay(endDate) < startOfDay(newDate)) {
                        setEndDate(newDate);
                      }
                    }
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-600">Return Date</label>
                <Input
                  type="date"
                  className="h-12 border-slate-200 focus:border-slate-900 text-base"
                  value={format(endDate, "yyyy-MM-dd")}
                  min={format(startDate, "yyyy-MM-dd")}
                  onChange={(e) => {
                    const newDate = new Date(e.target.value);
                    if (!isNaN(newDate.getTime())) {
                      setEndDate(newDate);
                    }
                  }}
                />
              </div>
            </div>
            {isDateInvalid && (
              <div className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-500" />
                <span>Return date must be after the pickup date. Please choose a valid return date.</span>
              </div>
            )}

            <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 rounded-lg p-2.5 border border-slate-100">
              <span className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs">{rentalDays}</span>
              <span>Total rental days</span>
            </div>

            {/* Buffer days info */}
            <div className="flex items-center gap-2 p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
              <Info className="w-4 h-4 flex-shrink-0 text-blue-500" />
              <span>Products are blocked <strong>1 day before pickup</strong> and <strong>1 day after return</strong> for cleaning &amp; preparation.</span>
            </div>
          </div>

          {/* Address & Notes */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-5">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-900">Customer / Delivery Address</h3>
              <textarea
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="Enter address for delivery or record..."
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none resize-y"
                rows={2}
              />
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-900">Notes</h3>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes about this order..."
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none resize-y"
                rows={2}
              />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN — Cart & Totals */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-lg overflow-visible">

            {/* Cart header with search */}
            <div className="p-5 border-b border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Package className="w-4 h-4 text-slate-400" />
                  Cart Items
                </h3>
                <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                  {cartItems.length} items
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative flex-1" ref={productRef}>
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    placeholder="Search products or scan barcode..."
                    className="pl-10 h-12 border-slate-200 focus:border-slate-900 text-base"
                    value={productSearch}
                    onChange={(e) => {
                      setProductSearch(e.target.value);
                      setIsProductDropdownOpen(true);
                    }}
                    onFocus={() => setIsProductDropdownOpen(true)}
                    onKeyDown={handleProductSearchKeyDown}
                  />
                  {isProductDropdownOpen && productSearch.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-72 overflow-y-auto">
                      {(() => {
                        return availableProducts.length > 0 ? (
                          <ul className="py-1">
                            {availableProducts.map((p: any) => {
                            const imgUrl = getImageUrl(p);
                            const sAvail = searchAvailabilityMap.get(p.id);
                            const isAvail = sAvail ? sAvail.available > 0 : p.available_quantity > 0;
                            
                            return (
                              <li
                                key={p.id}
                                className={`px-3 py-2.5 flex items-center gap-3 border-b border-slate-50 last:border-0 ${isAvail ? 'hover:bg-slate-50 cursor-pointer' : 'opacity-60 cursor-not-allowed'}`}
                                onClick={() => isAvail ? addToCart(p) : null}
                              >
                                <div className="w-10 h-10 rounded-md bg-slate-100 border border-slate-200 flex-shrink-0 overflow-hidden">
                                  {imgUrl ? (
                                    <img src={imgUrl} alt={p.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                                      <Package className="w-4 h-4" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-slate-900 text-sm truncate">{p.name}</div>
                                  <div className="text-xs text-slate-500 flex gap-2 mt-0.5">
                                    <span>{formatCurrency(p.price_per_day)}</span>
                                    <span className={isAvail ? "text-emerald-600" : "text-red-500 font-bold"}>
                                      {isCheckingSearch 
                                        ? "Checking dates..." 
                                        : sAvail 
                                          ? `${sAvail.available} free for dates` 
                                          : `${p.available_quantity} in stock`}
                                    </span>
                                  </div>
                                </div>
                                <Plus className="w-4 h-4 text-slate-300 flex-shrink-0" />
                              </li>
                            );
                          })}
                          </ul>
                        ) : (
                          <div className="p-4 text-center text-sm text-slate-500">
                            {products.length > 0 ? "All matching products are already in the cart." : "No products found."}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsScannerOpen(prev => !prev)}
                  className={`h-12 w-12 p-0 flex-shrink-0 ${isScannerOpen ? 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800 hover:text-white' : 'border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-400'}`}
                  title={isScannerOpen ? "Close scanner" : "Scan barcode"}
                >
                  <ScanBarcode className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Inline Barcode Scanner */}
            {isScannerOpen && (
              <div className="p-3 border-b border-slate-200">
                <BarcodeScanner
                  onScan={handleBarcodeScan}
                  onClose={() => setIsScannerOpen(false)}
                />
              </div>
            )}

            {/* Cart items */}
            <div className="p-4 min-h-[200px] max-h-[450px] overflow-y-auto">
              {cartItems.length === 0 ? (
                <div className="h-[200px] flex flex-col items-center justify-center text-slate-400 space-y-2">
                  <Package className="w-10 h-10 text-slate-200" />
                  <p className="text-sm">Search and add products</p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {cartItems.map((item) => {
                    const imgUrl = getImageUrl(item.product);
                    const avail = availabilityMap.get(item.product.id);
                    const isItemUnavailable = avail && !avail.isAvailable;
                    return (
                      <li key={item.product.id} className={`p-3 rounded-lg border bg-white ${isItemUnavailable ? 'border-red-200 bg-red-50/30' : 'border-slate-100'}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-lg bg-slate-100 flex-shrink-0 overflow-hidden border border-slate-200">
                            {imgUrl ? (
                              <img src={imgUrl} alt={item.product.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-300">
                                <Package className="w-4 h-4" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h5 className="font-medium text-slate-900 text-sm truncate">{item.product.name}</h5>
                            <span className="text-xs text-slate-500">{formatCurrency(item.price_per_day)}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeCartItem(item.product.id)}
                            className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors flex-shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Live Availability Badge */}
                        {avail && (
                          <div className={`mt-2 px-2 py-1.5 rounded-md text-xs flex items-center gap-1.5 ${isItemUnavailable ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                            {isCheckingAvailability ? (
                              <><Loader2 className="w-3 h-3 animate-spin" /> Checking...</>
                            ) : isItemUnavailable ? (
                              <><AlertTriangle className="w-3 h-3 flex-shrink-0" /> <span>Unavailable — only <strong>{avail.available}</strong> free for these dates (need {item.quantity})</span></>
                            ) : avail.available === avail.peakReserved + item.quantity ? (
                              <><Info className="w-3 h-3 flex-shrink-0" /> <span>Last {avail.available} available for this period</span></>
                            ) : (
                              <><CheckCircle2 className="w-3 h-3 flex-shrink-0" /> <span>{avail.available} of {avail.available + avail.peakReserved} free for this period</span></>
                            )}
                          </div>
                        )}
                        {avail && avail.overlappingOrders.length > 0 && (
                          <div className="mt-1 px-2 py-1.5 rounded bg-slate-50 border border-slate-100">
                            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Overlapping bookings <span className="normal-case font-normal text-slate-400">(±1 day buffer for cleaning)</span></p>
                            {avail.overlappingOrders.slice(0, 3).map((o: any, idx: number) => (
                              <div key={idx} className="text-[10px] text-slate-500">
                                {o.customerName} — {o.quantity} unit{o.quantity > 1 ? 's' : ''} ({new Date(o.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – {new Date(o.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })})
                              </div>
                            ))}
                            {avail.overlappingOrders.length > 3 && (
                              <div className="text-[10px] text-slate-400">+{avail.overlappingOrders.length - 3} more</div>
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-50">
                          <div className="flex items-center border border-slate-200 rounded-md bg-white overflow-hidden">
                            <button type="button" onClick={() => updateCartQty(item.product.id, -1)} className="px-2.5 py-1 hover:bg-slate-50 text-slate-500">
                              <Minus className="w-3 h-3" />
                            </button>
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              defaultValue={item.quantity}
                              key={`qty-${item.product.id}-${item.quantity}`}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => {
                                const raw = e.target.value.replace(/[^0-9]/g, '');
                                e.target.value = raw;
                                if (raw === '') return; // allow empty while typing
                                const val = Math.max(1, parseInt(raw));
                                setCartItems(prev => prev.map(p =>
                                  p.product.id === item.product.id ? { ...p, quantity: val } : p
                                ));
                              }}
                              onBlur={(e) => {
                                const val = parseInt(e.target.value) || 1;
                                const clamped = Math.max(1, val);
                                e.target.value = String(clamped);
                                setCartItems(prev => prev.map(p =>
                                  p.product.id === item.product.id ? { ...p, quantity: clamped } : p
                                ));
                              }}
                              className="w-12 text-center text-xs font-bold text-slate-900 bg-slate-50 border-x border-slate-100 outline-none py-1"
                            />
                            <button type="button" onClick={() => updateCartQty(item.product.id, 1)} className="px-2.5 py-1 hover:bg-slate-50 text-slate-500">
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="text-sm font-bold text-slate-900">
                            {formatCurrency(item.price_per_day * item.quantity)}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Totals */}
            <div className="bg-slate-50 border-t border-slate-200 p-5 space-y-3">
              <div className="flex justify-between text-sm text-slate-600">
                <span>Subtotal</span>
                <span className="font-medium">{formatCurrency(cartTotals.subtotal)}</span>
              </div>
              {isGstEnabled && (
                <div className="flex justify-between text-sm text-slate-600">
                  <span>GST ({gstPercentage}%)</span>
                  <span className="font-medium">{formatCurrency(cartTotals.gstAmount)}</span>
                </div>
              )}
              <div className="flex justify-between items-end pt-3 border-t border-slate-200">
                <div className="text-base font-semibold text-slate-900">Grand Total</div>
                <div className="text-3xl font-bold text-slate-900 tracking-tight">
                  {formatCurrency(cartTotals.grandTotal)}
                </div>
              </div>
            </div>

            {/* Security Deposit & Advance — below totals */}
            {cartItems.length > 0 && (
              <div className="border-t border-slate-200 p-5 space-y-4">
                {/* Security Deposit */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                      Security Deposit
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={depositCollected} onChange={(e) => setDepositCollected(e.target.checked)} className="sr-only peer" />
                      <div className="w-8 h-[18px] bg-slate-200 peer-focus:ring-2 peer-focus:ring-slate-900/20 rounded-full peer peer-checked:bg-slate-900 transition-colors"></div>
                      <div className={`absolute left-0.5 top-[1px] w-4 h-4 bg-white rounded-full transition-transform ${depositCollected ? 'translate-x-3.5' : 'translate-x-0'}`}></div>
                    </label>
                  </div>
                  {depositCollected && (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 font-semibold text-sm">₹</span>
                          <Input
                            type="number"
                            value={depositAmount || ""}
                            onChange={(e) => setDepositAmount(parseFloat(e.target.value) || 0)}
                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                            placeholder="0"
                            className={`h-10 pl-7 font-bold text-base ${depositExceedsTotal ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-slate-900'}`}
                          />
                        </div>
                        <Select value={depositPaymentMethod} onValueChange={setDepositPaymentMethod}>
                          <SelectTrigger className="h-10 w-[110px] border-slate-200 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={PaymentMethod.CASH}>Cash</SelectItem>
                            <SelectItem value={PaymentMethod.UPI}>UPI</SelectItem>
                            <SelectItem value={PaymentMethod.CARD}>Card</SelectItem>
                            <SelectItem value={PaymentMethod.BANK_TRANSFER}>Bank</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {depositExceedsTotal && (
                        <p className="text-xs text-red-600 font-medium flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Deposit cannot exceed grand total ({formatCurrency(cartTotals.grandTotal)})
                        </p>
                      )}
                      {!depositExceedsTotal && depositAmount > 0 && (
                        <p className="text-xs text-slate-500">Refundable deposit of {formatCurrency(depositAmount)}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div className="border-t border-slate-100"></div>

                {/* Advance Payment */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                      <Banknote className="w-3.5 h-3.5 text-slate-400" />
                      Advance Payment
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={advanceCollected} onChange={(e) => setAdvanceCollected(e.target.checked)} className="sr-only peer" />
                      <div className="w-8 h-[18px] bg-slate-200 peer-focus:ring-2 peer-focus:ring-slate-900/20 rounded-full peer peer-checked:bg-slate-900 transition-colors"></div>
                      <div className={`absolute left-0.5 top-[1px] w-4 h-4 bg-white rounded-full transition-transform ${advanceCollected ? 'translate-x-3.5' : 'translate-x-0'}`}></div>
                    </label>
                  </div>
                  {advanceCollected && (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 font-semibold text-sm">₹</span>
                          <Input
                            type="number"
                            value={advanceAmount || ""}
                            onChange={(e) => setAdvanceAmount(parseFloat(e.target.value) || 0)}
                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                            placeholder="0"
                            className={`h-10 pl-7 font-bold text-base ${advanceExceedsTotal ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-slate-900'}`}
                          />
                        </div>
                        <Select value={advancePaymentMethod} onValueChange={setAdvancePaymentMethod}>
                          <SelectTrigger className="h-10 w-[110px] border-slate-200 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={PaymentMethod.CASH}>Cash</SelectItem>
                            <SelectItem value={PaymentMethod.UPI}>UPI</SelectItem>
                            <SelectItem value={PaymentMethod.CARD}>Card</SelectItem>
                            <SelectItem value={PaymentMethod.BANK_TRANSFER}>Bank</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {advanceExceedsTotal && (
                        <p className="text-xs text-red-600 font-medium flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Advance cannot exceed grand total ({formatCurrency(cartTotals.grandTotal)})
                        </p>
                      )}
                      {isFullAdvancePayment && (
                        <div className="px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700 font-medium flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Full payment collected — no balance due at return
                        </div>
                      )}
                      {!advanceExceedsTotal && !isFullAdvancePayment && advanceAmount > 0 && (
                        <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 flex items-center gap-1.5">
                          <Info className="w-3.5 h-3.5 flex-shrink-0" />
                          Balance due at return: {formatCurrency(cartTotals.grandTotal - advanceAmount)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Final Summary & Confirm */}
            <div className="border-t border-slate-200 p-5 space-y-3">
              {advanceCollected && advanceAmount > 0 && !advanceExceedsTotal && (
                <>
                  <div className="flex justify-between text-sm text-blue-700 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
                    <span className="font-medium">Less: Advance Paid</span>
                    <span className="font-bold">−{formatCurrency(advanceAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-slate-900">
                    <span>Balance Due</span>
                    <span>{formatCurrency(Math.max(0, cartTotals.grandTotal - advanceAmount))}</span>
                  </div>
                </>
              )}
              {depositCollected && depositAmount > 0 && !depositExceedsTotal && (
                <div className="flex justify-between text-sm text-slate-600 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                  <span className="font-medium">Security Deposit (refundable)</span>
                  <span className="font-bold">{formatCurrency(depositAmount)}</span>
                </div>
              )}
              {hasUnavailableItems && (
                <div className="flex items-center gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>Some items are <strong>not available</strong> for the selected dates. Adjust quantities or change dates.</span>
                </div>
              )}
              {isPaymentInvalid && (
                <div className="flex items-center gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>Amount exceeds grand total. Please adjust before confirming.</span>
                </div>
              )}
              <Button
                onClick={handleCheckout}
                disabled={isCreating || isUpdating || hasUnavailableItems || isDateInvalid || isPaymentInvalid}
                className={`w-full h-14 font-bold text-lg mt-2 shadow-lg ${hasUnavailableItems || isDateInvalid || isPaymentInvalid ? 'bg-slate-400 cursor-not-allowed shadow-none' : 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-900/20'}`}
              >
                {isCreating || isUpdating ? "Processing..." : isPaymentInvalid ? "Amount Exceeds Total" : isDateInvalid ? "Invalid Dates" : hasUnavailableItems ? "Items Unavailable" : isEditing ? "Save Changes" : "Confirm Order"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
