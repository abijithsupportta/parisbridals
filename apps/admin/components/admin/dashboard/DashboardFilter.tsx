"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

export function DashboardFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const currentRange = searchParams.get("range") || "this_month";
  const customFrom = searchParams.get("from") || "";
  const customTo = searchParams.get("to") || "";

  const [isCustom, setIsCustom] = useState(currentRange === "custom");
  const [from, setFrom] = useState(customFrom);
  const [to, setTo] = useState(customTo);

  useEffect(() => {
    setIsCustom(currentRange === "custom");
  }, [currentRange]);

  const handleRangeChange = (value: string) => {
    if (value === "custom") {
      setIsCustom(true);
      return;
    }
    
    setIsCustom(false);
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", value);
    params.delete("from");
    params.delete("to");
    router.push(`?${params.toString()}`);
  };

  const applyCustomRange = () => {
    if (!from || !to) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", "custom");
    params.set("from", from);
    params.set("to", to);
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-2 items-center">
      <Select value={currentRange} onValueChange={handleRangeChange}>
        <SelectTrigger className="w-[180px] bg-white">
          <SelectValue placeholder="Select period" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="today">Today</SelectItem>
          <SelectItem value="yesterday">Yesterday</SelectItem>
          <SelectItem value="this_week">This Week</SelectItem>
          <SelectItem value="last_week">Last Week</SelectItem>
          <SelectItem value="this_month">This Month</SelectItem>
          <SelectItem value="last_month">Last Month</SelectItem>
          <SelectItem value="custom">Custom Range</SelectItem>
        </SelectContent>
      </Select>

      {isCustom && (
        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2">
          <Input 
            type="date" 
            value={from} 
            onChange={(e) => setFrom(e.target.value)}
            className="w-auto bg-white" 
          />
          <span className="text-slate-400 text-sm">to</span>
          <Input 
            type="date" 
            value={to} 
            onChange={(e) => setTo(e.target.value)}
            className="w-auto bg-white"
          />
          <Button onClick={applyCustomRange} size="sm" className="bg-slate-900 text-white">Apply</Button>
        </div>
      )}
    </div>
  );
}
