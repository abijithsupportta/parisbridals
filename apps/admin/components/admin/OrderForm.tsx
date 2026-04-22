"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createOrder, createCustomer, getCustomerByPhone, getProducts, type Customer, type Product } from "@/lib/supabase/queries";
import { useRouter } from "next/navigation";
import { Plus, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CartItem {
  product: Product;
  quantity: number;
}

export default function OrderForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [searchingCustomer, setSearchingCustomer] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
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
    notes: "",
  });

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

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoadingProducts(true);
    try {
      const productsData = await getProducts();
      setProducts(productsData.filter(p => p.is_active && p.available_quantity > 0));
    } catch (error) {
      console.error("Error loading products:", error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handlePhoneSearch = async () => {
    if (phone.length < 10) {
      alert("Please enter a valid phone number");
      return;
    }

    setSearchingCustomer(true);
    try {
      const existingCustomer = await getCustomerByPhone(phone);
      if (existingCustomer) {
        setCustomer(existingCustomer);
        setCustomerData({
          name: existingCustomer.name,
          email: existingCustomer.email || "",
          address: existingCustomer.address || "",
        });
        setIsNewCustomer(false);
      } else {
        setCustomer(null);
        setCustomerData({ name: "", email: "", address: "" });
        setIsNewCustomer(true);
      }
    } catch (error) {
      console.error("Error searching customer:", error);
    } finally {
      setSearchingCustomer(false);
    }
  };

  const addToCart = () => {
    if (!selectedProductId) {
      alert("Please select a product");
      return;
    }

    const product = products.find(p => p.id === selectedProductId);
    if (!product) return;

    if (selectedQuantity <= 0) {
      alert("Please enter a valid quantity");
      return;
    }

    if (selectedQuantity > product.available_quantity) {
      alert(`Only ${product.available_quantity} items available`);
      return;
    }

    const existingItem = cart.find(item => item.product.id === selectedProductId);
    if (existingItem) {
      const newQuantity = existingItem.quantity + selectedQuantity;
      if (newQuantity > product.available_quantity) {
        alert(`Only ${product.available_quantity} items available`);
        return;
      }
      setCart(cart.map(item => 
        item.product.id === selectedProductId 
          ? { ...item, quantity: newQuantity }
          : item
      ));
    } else {
      setCart([...cart, { product, quantity: selectedQuantity }]);
    }

    setSelectedProductId("");
    setSelectedQuantity(1);
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const updateCartQuantity = (productId: string, newQuantity: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    if (newQuantity > product.available_quantity) {
      alert(`Only ${product.available_quantity} items available`);
      return;
    }

    setCart(cart.map(item => 
      item.product.id === productId 
        ? { ...item, quantity: newQuantity }
        : item
    ));
  };

  const calculateTotal = () => {
    const startDate = new Date(orderData.rental_start_date);
    const endDate = new Date(orderData.rental_end_date);
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (days <= 0 || isNaN(days)) return 0;
    
    return cart.reduce((total, item) => {
      return total + (item.product.price_per_day * item.quantity * days);
    }, 0);
  };

  const validateForm = () => {
    if (!phone) {
      alert("Please enter customer phone number");
      return false;
    }

    if (!customerData.name) {
      alert("Please enter customer name");
      return false;
    }

    if (cart.length === 0) {
      alert("Please add at least one product to the order");
      return false;
    }

    if (!orderData.rental_start_date) {
      alert("Please select rental start date");
      return false;
    }

    if (!orderData.rental_end_date) {
      alert("Please select rental end date");
      return false;
    }

    const startDate = new Date(orderData.rental_start_date);
    const endDate = new Date(orderData.rental_end_date);
    
    if (endDate <= startDate) {
      alert("End date must be after start date");
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
        const newCustomer = await createCustomer({
          name: customerData.name,
          email: customerData.email || null,
          phone: phone,
          address: customerData.address || null,
        });
        
        if (!newCustomer) {
          throw new Error("Failed to create customer");
        }
        customerId = newCustomer.id;
      } else {
        customerId = customer.id;
      }

      const startDate = new Date(orderData.rental_start_date);
      const endDate = new Date(orderData.rental_end_date);
      const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

      const orderItems = cart.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity,
        price_per_day: item.product.price_per_day,
      }));

      const totalAmount = calculateTotal();

      const order = await createOrder({
        customer_id: customerId,
        customer: customer || { id: customerId, name: customerData.name, email: customerData.email || null, phone, address: customerData.address || null, created_at: new Date().toISOString() },
        items: orderItems as any,
        total_amount: totalAmount,
        status: 'pending',
        rental_start_date: orderData.rental_start_date,
        rental_end_date: orderData.rental_end_date,
        notes: orderData.notes || null,
      });

      if (order) {
        router.push("/dashboard/orders");
        router.refresh();
      } else {
        throw new Error("Failed to create order");
      }
    } catch (error) {
      console.error("Error creating order:", error);
      alert("Failed to create order");
    } finally {
      setLoading(false);
    }
  };

  const selectedProduct = products.find(p => p.id === selectedProductId);
  const totalAmount = calculateTotal();
  const rentalDays = orderData.rental_start_date && orderData.rental_end_date 
    ? Math.max(1, Math.ceil((new Date(orderData.rental_end_date).getTime() - new Date(orderData.rental_start_date).getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

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
                  {cart.map((item) => (
                    <div key={item.product.id} className="flex items-center justify-between p-4 border-b border-slate-200 last:border-b-0 bg-slate-50">
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">{item.product.name}</p>
                        <p className="text-sm text-slate-600">₹{item.product.price_per_day}/day</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                            className="w-8 h-8 rounded bg-slate-200 hover:bg-slate-300 flex items-center justify-center"
                          >
                            -
                          </button>
                          <span className="w-8 text-center font-medium">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                            className="w-8 h-8 rounded bg-slate-200 hover:bg-slate-300 flex items-center justify-center"
                          >
                            +
                          </button>
                        </div>
                        <Badge className="bg-purple-100 text-purple-700">
                          ₹{item.product.price_per_day * item.quantity * rentalDays}
                        </Badge>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.product.id)}
                          className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </div>
                  ))}
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
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-300">
                    <span className="text-slate-700 font-medium">Total Amount:</span>
                    <span className="font-bold text-xl text-primary">₹{totalAmount.toLocaleString()}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-4 pt-6 border-t border-slate-200">
            <Button type="submit" loading={loading} disabled={cart.length === 0} className="flex-1 h-12 text-base shadow-lg shadow-primary/25">
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
