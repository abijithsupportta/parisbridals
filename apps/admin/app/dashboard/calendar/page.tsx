import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays } from "lucide-react";

export default function CalendarPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Calendar View</h1>
      </div>
      
      <Card className="border-0 shadow-lg">
        <CardContent className="p-12 text-center">
          <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">
            Calendar view is currently under development. It will show scheduled orders and bookings for each day.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
