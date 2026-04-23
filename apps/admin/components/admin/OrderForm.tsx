"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCreateCustomer, useCustomerByPhone, useCreateOrder, useProducts, useGSTPercentage, useCreatePayment, useBranches } from "@/hooks";
import { useRouter } from "next/navigation";
import { Plus, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreateOrderDTO, DeliveryMethod } from "@/domain/types/order";
import { PaymentType, PaymentMode } from "@/domain/types/payment";
import { useAppStore } from "@/stores";

interface CartItem {
  product_id: string;
  quantity: number;
  price_per_day: number;
  security_deposit: number;
}

export default function OrderForm() {
  const router = useRouter();
  const { showError } = useAppStore();
  const user = useAppStore((state) => state.user);
  const [loading, setLoading] = useState(false);
  const [searchingCustomer, setSearchingCustomer] = useState(false);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [customer, setCustomer] = useState<any>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  
  const [phone, setPhone] = useState("");
  const [customerData, setCustomerData] = useState({
    name: "",
    email: "",
    address: "",
  });
  
  const [orderData, setOrderData] = useState({
    rental_start_date: "",
    rental_end_date: "",
    pickup_time: "",
    return_time: "",
    pickup_branch_id: "",
    event_date: "",
    delivery_method: DeliveryMethod.PICKUP,
    delivery_address: "",
    pickup_address: "",
    notes: "",
  });

  const [paymentData, setPaymentData] = useState({
    payment_type: PaymentType.DEPOSIT,
    payment_mode: PaymentMode.CASH,
    amount: 0,
    transaction_id: "",
    notes: "",
  });

  const { data: gstResult } = useGSTPercentage();
  const gstPercentage = (gstResult?.success && gstResult.data !== null) ? gstResult.data : 18;

  const { products, isLoading: loadingProducts } = useProducts();
  const { data: existingCustomerResult, refetch: searchCustomer } = useCustomerByPhone(phone, false);
  const { createCustomer, isLoading: creatingCustomer } = useCreateCustomer();
  const { createOrder, isLoading: creatingOrder } = useCreateOrder();
  const { createPayment } = useCreatePayment();
  const { branches } = useBranches();

  const existingCustomer = existingCustomerResult;

  const clearZeroOnFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (e.target.value === "0") {
      e.target.value = "";
    }
  };

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.target instanceof HTMLInputElement && e.target.type === "number") {
        e.preventDefault();
      }
    };

    document.addEventListener("wheel", handleWheel, { passive: false });
    return () => document.removeEventListener("wheel", handleWheel);
  }, []);

  const handlePhoneSearch = async () => {
    if (phone.length < 10) {
      showError("Please enter a valid phone number");
      return;
    }

    setSearchingCustomer(true);
    await searchCustomer();
    setSearchingCustomer(false);
    
    if (existingCustomer) {
      setCustomer(existingCustomer);
      setCustomerData({
        name: existingCustomer.name,
        email: existingCustomer.email || "",
        address: typeof existingCustomer.address === 'string' ? existingCustomer.address : "",
      });
      setIsNewCustomer(false);
    } else {
      setCustomer(null);
      setCustomerData({ name: "", email: "", address: "" });
      setIsNewCustomer(true);
    }
  };

  const addToCart = () => {
    if (!selectedProductId) {
      showError("Please select a product");
      return;
    }

    const product = products.find((p: any) => p.id === selectedProductId);
    if (!product) return;

    if (selectedQuantity <= 0) {
      showError("Please enter a valid quantity");
      return;
    }

    if (selectedQuantity > product.available_quantity) {
      showError(`Only ${product.available_quantity} items available`);
      return;
    }

    const existingItem = cart.find(item => item.product_id === selectedProductId);
    if (existingItem) {
      const newQuantity = existingItem.quantity + selectedQuantity;
      if (newQuantity > product.available_quantity) {
        showError(`Only ${product.available_quantity} items available`);
        return;
      }
      setCart(cart.map(item => 
        item.product_id === selectedProductId 
          ? { ...item, quantity: newQuantity }
          : item
      ));
    } else {
      setCart([...cart, { 
        product_id: selectedProductId, 
        quantity: selectedQuantity,
        price_per_day: product.price_per_day,
        security_deposit: product.security_deposit || 0
      }]);
    }

    setSelectedProductId("");
    setSelectedQuantity(1);
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product_id !== productId));
  };

  const updateCartQuantity = (productId: string, newQuantity: number) => {
    const product = products.find((p: any) => p.id === productId);
    if (!product) return;

    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    if (newQuantity > product.available_quantity) {
      showError(`Only ${product.available_quantity} items available`);
      return;
    }

    setCart(cart.map(item => 
      item.product_id === productId 
        ? { ...item, quantity: newQuantity }
        : item
    ));
  };

  const calculateTotal = () => {
    const startDate = new Date(orderData.rental_start_date);
    const endDate = new Date(orderData.rental_end_date);
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (days <= 0 || isNaN(days)) return { subtotal: 0, gst: 0, total: 0, totalSecurityDeposit: 0 };
    
    const subtotal = cart.reduce((total, item) => {
      return total + (item.price_per_day * item.quantity * days);
    }, 0);
    
    const totalSecurityDeposit = cart.reduce((total, item) => {
      return total + (item.security_deposit * item.quantity);
    }, 0);
    
    const gst = subtotal * (gstPercentage / 100);
    const total = subtotal + gst + totalSecurityDeposit;
    
    return { subtotal, gst, total, totalSecurityDeposit };
  };

  const validateForm = () => {
    if (!phone) {
      showError("Please enter customer phone number");
      return false;
    }

    if (!customerData.name) {
      showError("Please enter customer name");
      return false;
    }

    if (cart.length === 0) {
      showError("Please add at least one product to the order");
      return false;
    }

    if (!orderData.rental_start_date) {
      showError("Please select rental start date");
      return false;
    }

    if (!orderData.rental_end_date) {
      showError("Please select rental end date");
      return false;
    }

    const startDate = new Date(orderData.rental_start_date);
    const endDate = new Date(orderData.rental_end_date);
    
    if (endDate <= startDate) {
      showError("End date must be after start date");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      let customerId: string;

      if (isNewCustomer || !customer) {
        const result: any = await new Promise((resolve, reject) => {
          createCustomer({
            name: customerData.name,
            email: customerData.email || undefined,
            phone: phone,
            address: typeof customerData.address === 'string' ? customerData.address : undefined,
          }, {
            onSuccess: resolve,
            onError: reject,
          });
        });
        
        if (!result.customer) {
          showError('Failed to create customer', 'Unknown error');
          setLoading(false);
          return;
        }
        
        customerId = result.customer.id;
      } else {
        customerId = customer.id;
      }

      const orderPayload: CreateOrderDTO = {
        customer_id: customerId,
        branch_id: "default-branch", // TODO: Get from context
        items: cart,
        rental_start_date: orderData.rental_start_date,
        rental_end_date: orderData.rental_end_date,
        pickup_time: orderData.pickup_time || undefined,
        return_time: orderData.return_time || undefined,
        pickup_branch_id: orderData.pickup_branch_id || undefined,
        event_date: orderData.event_date || undefined,
        delivery_method: orderData.delivery_method,
        delivery_address: orderData.delivery_address || undefined,
        pickup_address: orderData.pickup_address || undefined,
        notes: orderData.notes || undefined,
      };

      const orderResult: any = await new Promise((resolve, reject) => {
        createOrder(orderPayload, {
          onSuccess: resolve,
          onError: reject,
        });
      });
      
      if (orderResult.order) {
        // Create payment after order is created
        if (paymentData.amount > 0) {
          const paymentPayload = {
            order_id: orderResult.order.id,
            payment_type: paymentData.payment_type,
            amount: paymentData.amount,
            payment_mode: paymentData.payment_mode,
            transaction_id: paymentData.transaction_id || undefined,
            notes: paymentData.notes || undefined,
            created_by: user?.id,
          };

          const paymentResult: any = await new Promise((resolve, reject) => {
            createPayment(paymentPayload, {
              onSuccess: resolve,
              onError: reject,
            });
          });

          if (!paymentResult) {
            showError('Order created but payment failed', 'Unknown error');
            // Still redirect to orders page since order was created
          }
        }
        
        router.push('/dashboard/orders');
      } else {
        showError('Failed to create order', 'Unknown error');
      }
    } catch (error) {
      console.error("Error creating order:", error);
      showError("Failed to create order");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCustomer = async () => {
    createCustomer({ ...customerData, phone });
  };

  const selectedProduct = products.find((p: any) => p.id === selectedProductId);
  const { subtotal, gst, total, totalSecurityDeposit } = calculateTotal();
  const rentalDays = orderData.rental_start_date && orderData.rental_end_date 
    ? Math.max(1, Math.ceil((new Date(orderData.rental_end_date).getTime() - new Date(orderData.rental_start_date).getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  // Auto-fill payment amount with security deposit
  useEffect(() => {
    if (totalSecurityDeposit > 0 && paymentData.amount === 0) {
      setPaymentData(prev => ({ ...prev, amount: totalSecurityDeposit }));
    }
  }, [totalSecurityDeposit]);

  // Auto-select user's branch if Staff or Manager
  useEffect(() => {
    if (user && (user.role === 'staff' || user.role === 'manager')) {
      // For now, we'll need to get the user's branch from somewhere
      // This would typically come from the user object or a separate hook
      // For now, we'll leave it empty and let the user select
    }
  }, [user]);

  return (
    <Card className="border-0 shadow-2xl w-full max-w-6xl">
      <CardHeader className="rounded-t-xl bg-gradient-to-r from-purple-600 to-primary text-white">
        <CardTitle className="text-2xl text-white">Create New Order</CardTitle>
        <p className="text-slate-100 text-sm mt-1">Create a new jewellery rental order</p>
      </CardHeader>
      <CardContent className="p-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Customer Lookup Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">Customer Information</h3>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 block">Customer Phone Number *</label>
              <div className="flex gap-4">
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="h-12 border-slate-300 focus:border-primary flex-1"
                />
                <Button
                  type="button"
                  onClick={handlePhoneSearch}
                  disabled={searchingCustomer}
                  className="h-12 px-6"
                >
                  {searchingCustomer ? "Searching..." : "Search"}
                </Button>
              </div>
              <p className="text-xs text-slate-500">Enter phone number to search for existing customer or create new one</p>
            </div>

            {isNewCustomer && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                <p className="text-sm text-blue-700 font-medium">New Customer Detected</p>
                <p className="text-sm text-blue-600 mt-1">Please fill in the customer details below</p>
              </div>
            )}

            {!isNewCustomer && customer && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mt-4">
                <p className="text-sm text-emerald-700 font-medium">Existing Customer Found</p>
                <p className="text-sm text-emerald-600 mt-1">Name: {customer.name}</p>
                {customer.email && <p className="text-sm text-emerald-600">Email: {customer.email}</p>}
              </div>
            )}
          </div>

          {/* Customer Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">
              {isNewCustomer ? "New Customer Details" : "Customer Details"}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 block">Customer Name *</label>
                <Input
                  value={customerData.name}
                  onChange={(e) => setCustomerData({ ...customerData, name: e.target.value })}
                  disabled={!isNewCustomer && !!customer}
                  required
                  placeholder="Customer full name"
                  className="h-12 border-slate-300 focus:border-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 block">Email</label>
                <Input
                  type="email"
                  value={customerData.email}
                  onChange={(e) => setCustomerData({ ...customerData, email: e.target.value })}
                  disabled={!isNewCustomer && !!customer}
                  placeholder="customer@example.com"
                  className="h-12 border-slate-300 focus:border-primary"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 block">Address</label>
              <Input
                value={customerData.address}
                onChange={(e) => setCustomerData({ ...customerData, address: e.target.value })}
                disabled={!isNewCustomer && !!customer}
                placeholder="Full delivery address"
                className="h-12 border-slate-300 focus:border-primary"
              />
            </div>
          </div>

          {/* Rental Dates and Times */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">Rental Period</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 block">Start Date *</label>
                <Input
                  type="date"
                  value={orderData.rental_start_date}
                  onChange={(e) => setOrderData({ ...orderData, rental_start_date: e.target.value })}
                  required
                  className="h-12 border-slate-300 focus:border-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 block">End Date *</label>
                <Input
                  type="date"
                  value={orderData.rental_end_date}
                  onChange={(e) => setOrderData({ ...orderData, rental_end_date: e.target.value })}
                  required
                  className="h-12 border-slate-300 focus:border-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 block">Pickup Time</label>
                <Input
                  type="time"
                  value={orderData.pickup_time}
                  onChange={(e) => setOrderData({ ...orderData, pickup_time: e.target.value })}
                  className="h-12 border-slate-300 focus:border-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 block">Return Time</label>
                <Input
                  type="time"
                  value={orderData.return_time}
                  onChange={(e) => setOrderData({ ...orderData, return_time: e.target.value })}
                  className="h-12 border-slate-300 focus:border-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 block">Pickup Branch</label>
                <Select 
                  value={orderData.pickup_branch_id} 
                  onValueChange={(value) => setOrderData({ ...orderData, pickup_branch_id: value })}
                  disabled={user?.role === 'staff' || user?.role === 'manager'}
                >
                  <SelectTrigger className="h-12 border-slate-300 focus:border-primary">
                    <SelectValue placeholder="Select pickup branch..." />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map(branch => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(user?.role === 'staff' || user?.role === 'manager') && (
                  <p className="text-xs text-slate-500">Branch selection is restricted for your role</p>
                )}
              </div>
            </div>
          </div>

          {/* Product Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">Add Products</h3>
            {products.length === 0 ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-700 font-medium">No products available</p>
                <p className="text-sm text-amber-600 mt-1">Please add products first before creating an order.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 block">Select Product</label>
                  <Select value={selectedProductId} onValueChange={setSelectedProductId} disabled={loadingProducts}>
                    <SelectTrigger className="h-12 border-slate-300 focus:border-primary">
                      <SelectValue placeholder="Choose a product..." />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map(product => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} - ₹{product.price_per_day}/day ({product.available_quantity} available)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 block">Quantity</label>
                <Input
                  type="number"
                  value={selectedQuantity}
                  onChange={(e) => setSelectedQuantity(parseInt(e.target.value) || 1)}
                  onFocus={clearZeroOnFocus}
                  min="1"
                  className="h-12 border-slate-300 focus:border-primary"
                />
                {selectedProduct && (
                  <p className="text-xs text-slate-500">Available: {selectedProduct.available_quantity}</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 block">&nbsp;</label>
                <Button
                  type="button"
                  onClick={addToCart}
                  disabled={!selectedProductId}
                  className="h-12 w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add to Cart
                </Button>
              </div>
              </div>
            )}

            {/* Cart */}
            {cart.length > 0 && (
              <div className="mt-6 space-y-4">
                <h4 className="text-md font-semibold text-slate-900">Order Items ({cart.length})</h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  {cart.map((item) => {
                    const product = products.find((p: any) => p.id === item.product_id);
                    if (!product) return null;
                    return (
                      <div key={item.product_id} className="flex items-center justify-between p-4 border-b border-slate-200 last:border-b-0 bg-slate-50">
                        <div className="flex-1">
                          <p className="font-medium text-slate-900">{product.name}</p>
                          <p className="text-sm text-slate-600">₹{item.price_per_day}/day</p>
                          <p className="text-xs text-slate-500">Security Deposit: ₹{item.security_deposit}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => updateCartQuantity(item.product_id, item.quantity - 1)}
                              className="w-8 h-8 rounded bg-slate-200 hover:bg-slate-300 flex items-center justify-center"
                            >
                              -
                            </button>
                            <span className="w-8 text-center font-medium">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateCartQuantity(item.product_id, item.quantity + 1)}
                              className="w-8 h-8 rounded bg-slate-200 hover:bg-slate-300 flex items-center justify-center"
                            >
                              +
                            </button>
                          </div>
                          <Badge className="bg-purple-100 text-purple-700">
                            ₹{item.price_per_day * item.quantity * rentalDays}
                          </Badge>
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.product_id)}
                            className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Order Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">Rental Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 block">Rental Start Date *</label>
                <Input
                  type="date"
                  value={orderData.rental_start_date}
                  onChange={(e) => setOrderData({ ...orderData, rental_start_date: e.target.value })}
                  required
                  className="h-12 border-slate-300 focus:border-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 block">Rental End Date *</label>
                <Input
                  type="date"
                  value={orderData.rental_end_date}
                  onChange={(e) => setOrderData({ ...orderData, rental_end_date: e.target.value })}
                  required
                  className="h-12 border-slate-300 focus:border-primary"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 block">Notes</label>
              <Input
                value={orderData.notes}
                onChange={(e) => setOrderData({ ...orderData, notes: e.target.value })}
                placeholder="Any special instructions or notes"
                className="h-12 border-slate-300 focus:border-primary"
              />
            </div>

            {rentalDays > 0 && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-700">Rental Duration:</span>
                  <span className="font-semibold text-slate-900">{rentalDays} day{rentalDays > 1 ? 's' : ''}</span>
                </div>
                {cart.length > 0 && (
                  <>
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-300">
                      <span className="text-slate-700">Rental Subtotal:</span>
                      <span className="font-medium text-slate-900">₹{subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-slate-700">GST ({gstPercentage}%):</span>
                      <span className="font-medium text-slate-900">₹{gst.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-slate-700">Security Deposit:</span>
                      <span className="font-medium text-slate-900">₹{totalSecurityDeposit.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-300">
                      <span className="text-slate-700 font-medium">Total Amount:</span>
                      <span className="font-bold text-xl text-primary">₹{total.toLocaleString()}</span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Payment Section */}
          {cart.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">Payment Collection</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 block">Payment Type</label>
                  <Select 
                    value={paymentData.payment_type} 
                    onValueChange={(value: PaymentType) => setPaymentData({ ...paymentData, payment_type: value })}
                  >
                    <SelectTrigger className="h-12 border-slate-300 focus:border-primary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={PaymentType.DEPOSIT}>Deposit</SelectItem>
                      <SelectItem value={PaymentType.FINAL}>Final Payment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 block">Payment Mode</label>
                  <Select 
                    value={paymentData.payment_mode} 
                    onValueChange={(value: PaymentMode) => setPaymentData({ ...paymentData, payment_mode: value })}
                  >
                    <SelectTrigger className="h-12 border-slate-300 focus:border-primary">
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
                  <label className="text-sm font-semibold text-slate-700 block">Amount (₹)</label>
                  <Input
                    type="number"
                    value={paymentData.amount}
                    onChange={(e) => setPaymentData({ ...paymentData, amount: parseFloat(e.target.value) || 0 })}
                    min="0"
                    step="0.01"
                    className="h-12 border-slate-300 focus:border-primary"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 block">Transaction ID (Optional)</label>
                  <Input
                    value={paymentData.transaction_id}
                    onChange={(e) => setPaymentData({ ...paymentData, transaction_id: e.target.value })}
                    placeholder="Enter transaction ID..."
                    className="h-12 border-slate-300 focus:border-primary"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 block">Payment Notes (Optional)</label>
                <Input
                  value={paymentData.notes}
                  onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                  placeholder="Any additional payment notes..."
                  className="h-12 border-slate-300 focus:border-primary"
                />
              </div>
            </div>
          )}

          <div className="flex gap-4 pt-6 border-t border-slate-200">
            <Button type="submit" disabled={loading || cart.length === 0} variant="gradient" className="flex-1 h-12 text-base">
              {loading ? "Creating..." : "Create Order"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="flex-1 h-12 text-base border-slate-300 hover:bg-slate-50"
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
