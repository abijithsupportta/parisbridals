"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useCreateBranch } from "@/hooks";
import { useRouter } from "next/navigation";

export default function StoreForm() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    phone: "",
    is_main: false,
    is_active: true,
  });

  const { createBranch, isLoading } = useCreateBranch();

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    createBranch(formData);
  };

  return (
    <Card className="border-0 shadow-2xl w-full max-w-6xl">
      <CardHeader className="rounded-t-xl bg-gradient-to-r from-purple-600 to-primary text-white">
        <CardTitle className="text-2xl text-white">Create New Store</CardTitle>
        <p className="text-slate-100 text-sm mt-1">Add a new store to your Paris Bridals network</p>
      </CardHeader>
      <CardContent className="p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 block">Store Name *</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="e.g., Paris Bridals Chennai"
              className="h-12 border-slate-300 focus:border-primary"
            />
          </div>


          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 block">Phone</label>
            <Input
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+91 98765 43210"
              className="h-12 border-slate-300 focus:border-primary"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 block">Address</label>
            <Input
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Full address with city and pincode"
              className="h-12 border-slate-300 focus:border-primary"
            />
          </div>


          <div className="flex items-center gap-3 pt-4">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-slate-700">
              Store is active and visible to customers
            </label>
          </div>

          <div className="flex gap-4 pt-6 border-t border-slate-200">
            <Button type="submit" disabled={isLoading} variant="gradient" className="flex-1 h-12 text-base">
              {isLoading ? "Creating..." : "Create Store"}
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
