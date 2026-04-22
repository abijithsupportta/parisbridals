import { 
  Package, 
  ShoppingCart, 
  Users, 
  TrendingUp,
  DollarSign,
  ArrowUpRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const stats = [
  {
    name: "Total Products",
    value: "1,234",
    change: "+12.5%",
    icon: Package,
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    name: "Active Orders",
    value: "89",
    change: "+5.2%",
    icon: ShoppingCart,
    gradient: "from-violet-500 to-purple-500",
  },
  {
    name: "Customers",
    value: "456",
    change: "+8.1%",
    icon: Users,
    gradient: "from-emerald-500 to-teal-500",
  },
  {
    name: "Revenue",
    value: "₹4,56,789",
    change: "+15.3%",
    icon: DollarSign,
    gradient: "from-orange-500 to-amber-500",
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">Welcome back! Here's what's happening today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.name} className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">{stat.name}</CardTitle>
              <div className={`p-2 rounded-lg bg-gradient-to-br ${stat.gradient}`}>
                <stat.icon className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{stat.value}</div>
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-2">
                <TrendingUp className="h-3 w-3 text-emerald-500" />
                <span className="text-emerald-600 font-medium">{stat.change}</span>
                <span className="text-slate-400">from last month</span>
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="text-xl text-slate-900">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-md">
                  <ShoppingCart className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">New order received</p>
                  <p className="text-xs text-slate-500">Order #{1000 + i} - 2 items</p>
                </div>
                <span className="text-xs text-slate-400">2 hours ago</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
