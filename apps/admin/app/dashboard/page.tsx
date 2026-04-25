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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Dummy data for Owner's View
const pulseStats = [
  {
    title: "Revenue Pacing",
    value: "$18,450",
    change: "+12% vs last month",
    isPositive: true,
    icon: DollarSign,
  },
  {
    title: "Asset Exposure",
    value: "$42,000",
    subtext: "$8,500 held in deposits",
    icon: ShieldAlert,
  },
  {
    title: "Utilization",
    value: "68%",
    subtext: "Booked for upcoming weekend",
    icon: CalendarDays,
  },
  {
    title: "Action Required",
    value: "7 Issues",
    subtext: "3 overdue, 2 damaged",
    isAlert: true,
    icon: AlertCircle,
  },
];

const topPerformers = [
  { id: 1, name: "Evelyn Gold Set", rentals: 14, revenue: "$1,400", status: "High Demand" },
  { id: 2, name: "Sapphire Choker", rentals: 11, revenue: "$880", status: "Trending" },
  { id: 3, name: "Classic Pearl Drops", rentals: 9, revenue: "$450", status: "Stable" },
];

const deadStock = [
  { id: 4, name: "Ruby Teardrop Pendant", daysIdle: 94, value: "$800" },
  { id: 5, name: "Vintage Emerald Cuff", daysIdle: 112, value: "$1,200" },
];

const bottlenecks = [
  { id: 1, type: "cleaning", message: "4 items in Maintenance > 72 hours", severity: "high" },
  { id: 2, type: "approval", message: "12 online requests pending > 24 hours", severity: "medium" },
  { id: 3, type: "overdue", message: "Customer John Doe 48 hrs overdue on Order #1042", severity: "high" },
];

export default function DashboardPage() {
  // We simulate the Owner's View
  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Executive Overview</h1>
          <p className="text-slate-500 mt-1">Good morning. Here is the pulse of Paris Bridals today.</p>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" className="bg-white">Last 30 Days</Button>
           <Button className="bg-slate-900 text-white hover:bg-slate-800">Export Report</Button>
        </div>
      </div>

      {/* Row 1: The Pulse */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {pulseStats.map((stat, i) => (
          <Card key={i} className={`border-0 shadow-sm ${stat.isAlert ? 'bg-rose-50/50' : 'bg-white'}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.isAlert ? 'text-rose-500' : 'text-slate-400'}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold tracking-tight ${stat.isAlert ? 'text-rose-700' : 'text-slate-900'}`}>
                {stat.value}
              </div>
              {stat.change && (
                <p className="text-xs flex items-center gap-1 mt-2">
                  {stat.isPositive ? (
                    <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 text-rose-500" />
                  )}
                  <span className={stat.isPositive ? "text-emerald-600 font-medium" : "text-rose-600 font-medium"}>
                    {stat.change}
                  </span>
                </p>
              )}
              {stat.subtext && (
                <p className={`text-xs mt-2 ${stat.isAlert ? 'text-rose-600 font-medium' : 'text-slate-500'}`}>
                  {stat.subtext}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Row 2: Future Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-0 shadow-sm bg-white">
          <CardHeader>
            <CardTitle>30-Day Booking Velocity</CardTitle>
            <CardDescription>Upcoming reservations and demand spikes</CardDescription>
          </CardHeader>
          <CardContent className="h-[250px] flex items-end gap-2 pt-4">
             {/* Simulating a bar chart with divs since no chart library is available */}
             {[40, 25, 60, 30, 85, 90, 45, 20, 15, 35, 75, 80, 50, 40, 20].map((h, i) => (
                <div key={i} className="flex-1 bg-slate-100 hover:bg-slate-200 rounded-t-sm relative group transition-colors" style={{ height: '100%' }}>
                   <div 
                      className={`absolute bottom-0 w-full rounded-t-sm transition-all duration-500 ${h > 75 ? 'bg-amber-400' : 'bg-slate-800'}`} 
                      style={{ height: `${h}%` }}
                   />
                   <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] py-1 px-2 rounded pointer-events-none z-10 whitespace-nowrap">
                      {h} bookings
                   </div>
                </div>
             ))}
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-sm bg-white">
          <CardHeader>
            <CardTitle>Category Revenue</CardTitle>
            <CardDescription>Current month distribution</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
             <div className="space-y-6">
                <div className="space-y-2">
                   <div className="flex justify-between text-sm">
                      <span className="font-medium text-slate-700">Bridal Sets</span>
                      <span className="text-slate-500 font-medium">55%</span>
                   </div>
                   <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-slate-800 w-[55%] rounded-full" />
                   </div>
                </div>
                <div className="space-y-2">
                   <div className="flex justify-between text-sm">
                      <span className="font-medium text-slate-700">Necklaces</span>
                      <span className="text-slate-500 font-medium">25%</span>
                   </div>
                   <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400 w-[25%] rounded-full" />
                   </div>
                </div>
                <div className="space-y-2">
                   <div className="flex justify-between text-sm">
                      <span className="font-medium text-slate-700">Earrings & Bangles</span>
                      <span className="text-slate-500 font-medium">20%</span>
                   </div>
                   <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-slate-300 w-[20%] rounded-full" />
                   </div>
                </div>
             </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Assets & Bottlenecks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm bg-white overflow-hidden flex flex-col">
          <CardHeader className="border-b border-slate-50 bg-slate-50/50 pb-4">
            <CardTitle>Inventory ROI</CardTitle>
            <CardDescription>Top performers vs Dead stock</CardDescription>
          </CardHeader>
          <div className="flex-1 p-0 flex flex-col">
            <table className="w-full text-sm text-left">
              <thead className="bg-white text-slate-400 text-[10px] uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3 font-semibold">Product (Top 3)</th>
                  <th className="px-6 py-3 font-semibold text-right">Rentals</th>
                  <th className="px-6 py-3 font-semibold text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {topPerformers.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-3.5 font-medium text-slate-900">{item.name}</td>
                    <td className="px-6 py-3.5 text-right text-slate-600">{item.rentals}</td>
                    <td className="px-6 py-3.5 text-right text-emerald-600 font-semibold">{item.revenue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <div className="bg-slate-50/50 px-6 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-y border-slate-100">
              Dead Stock (90+ Days)
            </div>
            <table className="w-full text-sm text-left">
               <tbody className="divide-y divide-slate-50">
                {deadStock.map((item) => (
                  <tr key={`dead-${item.id}`} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-3.5 font-medium text-slate-900">{item.name}</td>
                    <td className="px-6 py-3.5 text-right text-rose-600 font-medium">{item.daysIdle} days idle</td>
                    <td className="px-6 py-3.5 text-right text-slate-500">{item.value} value</td>
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
            <div className="space-y-3">
              {bottlenecks.map((item) => (
                <div key={item.id} className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                  <div className={`p-2 rounded-lg shrink-0 ${item.severity === 'high' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
                    {item.type === 'cleaning' ? <Package className="w-4 h-4" /> : item.type === 'approval' ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900 leading-snug">{item.message}</p>
                    <div className="mt-2.5 flex gap-2">
                       <Button size="sm" variant="outline" className="h-6 text-[10px] px-2.5">Resolve Issue</Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
