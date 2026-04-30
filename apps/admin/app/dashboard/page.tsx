import { 
  TrendingUp,
  DollarSign,
  AlertCircle,
  Clock,
  Package,
  CalendarDays,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { dashboardService } from "@/services/dashboardService";
import Link from "next/link";
import { DashboardFilter } from "@/components/admin/dashboard/DashboardFilter";
import { 
  startOfToday, endOfToday, 
  startOfYesterday, endOfYesterday,
  startOfWeek, endOfWeek, subWeeks,
  startOfMonth, endOfMonth, subMonths,
  differenceInDays, subDays, startOfDay, endOfDay
} from "date-fns";

export default async function DashboardPage(props: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const range = searchParams.range || "this_month";
  
  let startDate = startOfMonth(new Date());
  let endDate = new Date();
  let prevStartDate = startOfMonth(subMonths(new Date(), 1));
  let prevEndDate = endOfMonth(subMonths(new Date(), 1));

  const now = new Date();

  switch(range) {
    case "today":
      startDate = startOfToday();
      endDate = endOfToday();
      prevStartDate = startOfYesterday();
      prevEndDate = endOfYesterday();
      break;
    case "yesterday":
      startDate = startOfYesterday();
      endDate = endOfYesterday();
      prevStartDate = startOfDay(subDays(now, 2));
      prevEndDate = endOfDay(subDays(now, 2));
      break;
    case "this_week":
      startDate = startOfWeek(now, { weekStartsOn: 1 });
      endDate = now;
      prevStartDate = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
      prevEndDate = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
      break;
    case "last_week":
      startDate = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
      endDate = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
      prevStartDate = startOfWeek(subWeeks(now, 2), { weekStartsOn: 1 });
      prevEndDate = endOfWeek(subWeeks(now, 2), { weekStartsOn: 1 });
      break;
    case "this_month":
      startDate = startOfMonth(now);
      endDate = now;
      prevStartDate = startOfMonth(subMonths(now, 1));
      prevEndDate = endOfMonth(subMonths(now, 1));
      break;
    case "last_month":
      startDate = startOfMonth(subMonths(now, 1));
      endDate = endOfMonth(subMonths(now, 1));
      prevStartDate = startOfMonth(subMonths(now, 2));
      prevEndDate = endOfMonth(subMonths(now, 2));
      break;
    case "custom":
      if (searchParams.from && searchParams.to) {
        startDate = startOfDay(new Date(searchParams.from));
        endDate = endOfDay(new Date(searchParams.to));
        const diff = differenceInDays(endDate, startDate);
        prevEndDate = endOfDay(subDays(startDate, 1));
        prevStartDate = startOfDay(subDays(prevEndDate, diff));
      }
      break;
  }

  // Fetch REAL data from the database using precise ranges
  const metrics = await dashboardService.getMetrics(startDate, endDate, prevStartDate, prevEndDate);

  // Helper to format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  };

  const rangeLabels: Record<string, string> = {
    today: "Yesterday",
    yesterday: "Previous Day",
    this_week: "Last Week",
    last_week: "Previous Week",
    this_month: "Last Month",
    last_month: "Previous Month",
    custom: "Previous Period"
  };

  const prevLabel = rangeLabels[range] || "Previous Period";

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Executive Overview</h1>
          <p className="text-slate-500 mt-1">Good morning. Here is the pulse of Paris Bridals today.</p>
        </div>
        <div className="flex gap-2 items-center">
           <DashboardFilter />
           <Button className="bg-slate-900 text-white hover:bg-slate-800 ml-2">Export Report</Button>
        </div>
      </div>

      {/* Row 1: The Pulse */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-0 shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Revenue Pacing</CardTitle>
            <DollarSign className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-slate-900">
              {formatCurrency(metrics.revenuePacing.current)}
            </div>
            <p className="text-xs flex items-center gap-1 mt-2">
              {metrics.revenuePacing.isPositive ? (
                <ArrowUpRight className="h-3 w-3 text-emerald-500" />
              ) : (
                <ArrowDownRight className="h-3 w-3 text-rose-500" />
              )}
              <span className={metrics.revenuePacing.isPositive ? "text-emerald-600 font-medium" : "text-rose-600 font-medium"}>
                {metrics.revenuePacing.isPositive ? "+" : "-"}{metrics.revenuePacing.percentageChange}%
              </span>
              <span className="text-slate-500">vs {prevLabel.toLowerCase()}</span>
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Asset Exposure</CardTitle>
            <ShieldAlert className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-slate-900">
               {metrics.assetExposure.depositsHeld > 0 ? formatCurrency(metrics.assetExposure.depositsHeld) : "₹0"}
            </div>
            <p className="text-xs mt-2 text-slate-500">
               Total Security Deposits Held
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Inventory Utilization</CardTitle>
            <CalendarDays className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-slate-900">
              {metrics.utilization.percentage}%
            </div>
            <p className="text-xs mt-2 text-slate-500">
              Estimated active rentals
            </p>
          </CardContent>
        </Card>

        <Card className={`border-0 shadow-sm ${metrics.actionRequired.totalIssues > 0 ? 'bg-rose-50/50' : 'bg-white'}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Action Required</CardTitle>
            <AlertCircle className={`h-4 w-4 ${metrics.actionRequired.totalIssues > 0 ? 'text-rose-500' : 'text-slate-400'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold tracking-tight ${metrics.actionRequired.totalIssues > 0 ? 'text-rose-700' : 'text-slate-900'}`}>
              {metrics.actionRequired.totalIssues} Issues
            </div>
            <p className={`text-xs mt-2 ${metrics.actionRequired.totalIssues > 0 ? 'text-rose-600 font-medium' : 'text-slate-500'}`}>
              {metrics.actionRequired.overdueCount} overdue orders
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Future Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-0 shadow-sm bg-white">
          <CardHeader>
            <CardTitle>Upcoming Booking Velocity</CardTitle>
            <CardDescription>Scheduled pickups for the next 15 days</CardDescription>
          </CardHeader>
          <CardContent className="h-[250px] flex items-end gap-2 pt-4">
             {metrics.bookingVelocity.map((day, i) => {
                // Normalize height to max 100% based on the max value
                const maxCount = Math.max(...metrics.bookingVelocity.map(d => d.count), 5); // min scale of 5
                const heightPercent = (day.count / maxCount) * 100;
                return (
                  <div key={i} className="flex-1 bg-slate-100 hover:bg-slate-200 rounded-t-sm relative group transition-colors" style={{ height: '100%' }}>
                    <div 
                        className={`absolute bottom-0 w-full rounded-t-sm transition-all duration-500 ${heightPercent > 75 ? 'bg-amber-400' : 'bg-slate-800'}`} 
                        style={{ height: `${Math.max(heightPercent, 2)}%` }}
                    />
                    <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] py-1 px-2 rounded pointer-events-none z-10 whitespace-nowrap">
                        {day.count} pickups on {day.date}
                    </div>
                  </div>
                );
             })}
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-sm bg-white">
          <CardHeader>
            <CardTitle>Category Revenue</CardTitle>
            <CardDescription>Selected period distribution</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
             {metrics.categoryRevenue.length > 0 ? (
               <div className="space-y-6">
                 {metrics.categoryRevenue.map((cat, i) => {
                   const colors = ['bg-slate-800', 'bg-amber-400', 'bg-slate-300', 'bg-emerald-400', 'bg-violet-400'];
                   return (
                     <div key={cat.name} className="space-y-2">
                       <div className="flex justify-between text-sm">
                         <span className="font-medium text-slate-700">{cat.name}</span>
                         <span className="text-slate-500 font-medium">{cat.percentage}%</span>
                       </div>
                       <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                         <div className={`h-full ${colors[i % colors.length]} rounded-full`} style={{ width: `${cat.percentage}%` }} />
                       </div>
                     </div>
                   );
                 })}
               </div>
             ) : (
               <div className="py-8 text-center text-slate-500 text-sm">No category revenue data for this period.</div>
             )}
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Assets & Bottlenecks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm bg-white overflow-hidden flex flex-col">
          <CardHeader className="border-b border-slate-50 bg-slate-50/50 pb-4">
            <CardTitle>Inventory ROI (Top 3)</CardTitle>
            <CardDescription>Highest revenue generating products</CardDescription>
          </CardHeader>
          <div className="flex-1 p-0 flex flex-col">
            {metrics.topPerformers.length > 0 ? (
              <table className="w-full text-sm text-left">
                <thead className="bg-white text-slate-400 text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Product</th>
                    <th className="px-6 py-3 font-semibold text-right">Rentals</th>
                    <th className="px-6 py-3 font-semibold text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {metrics.topPerformers.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-3.5 font-medium text-slate-900">{item.name}</td>
                      <td className="px-6 py-3.5 text-right text-slate-600">{item.rentals}</td>
                      <td className="px-6 py-3.5 text-right text-emerald-600 font-semibold">{formatCurrency(item.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-slate-500 text-sm">No rental data for this period.</div>
            )}
            
            <div className="bg-slate-50/50 px-6 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-y border-slate-100">
              Dead Stock (90+ Days)
            </div>
            <table className="w-full text-sm text-left">
               <tbody className="divide-y divide-slate-50">
                {metrics.deadStock.map((item) => (
                  <tr key={`dead-${item.id}`} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-3.5 font-medium text-slate-900">{item.name}</td>
                    <td className="px-6 py-3.5 text-right text-rose-600 font-medium">{item.daysIdle} days idle</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="border-0 shadow-sm bg-white">
          <CardHeader>
            <CardTitle>Operational Bottlenecks</CardTitle>
            <CardDescription>Items stuck in process preventing revenue</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {metrics.bottlenecks.length > 0 ? (
              <div className="space-y-3">
                {metrics.bottlenecks.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                    <div className={`p-2 rounded-lg shrink-0 ${item.severity === 'high' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
                      {item.type === 'cleaning' ? <Package className="w-4 h-4" /> : item.type === 'approval' ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900 leading-snug">{item.message}</p>
                      <div className="mt-2.5 flex gap-2">
                         <Button size="sm" variant="outline" className="h-6 text-[10px] px-2.5">
                           <Link href={`/dashboard/orders/${item.id}`}>View Order</Link>
                         </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-emerald-600 text-sm font-medium">
                No active bottlenecks! Everything is running smoothly.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
