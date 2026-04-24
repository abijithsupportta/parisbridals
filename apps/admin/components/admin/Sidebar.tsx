"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  Settings,
  LogOut,
  ChevronDown,
  ImageIcon,
  Building2,
  UserCircle,
  CalendarDays,
  FolderTree
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { usePermissions } from "@/hooks";
import { routePermissionMap, type Permission } from "@/lib/permissions";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Orders", href: "/dashboard/orders", icon: ShoppingCart },
  { name: "Calendar", href: "/dashboard/calendar", icon: CalendarDays },
  { name: "Products", href: "/dashboard/products", icon: Package },
  { name: "Categories", href: "/dashboard/categories", icon: FolderTree },
  { name: "Customers", href: "/dashboard/customers", icon: Users },
  { name: "Banners", href: "/dashboard/banners", icon: ImageIcon },
  { name: "Staff", href: "/dashboard/staff", icon: UserCircle },
  { name: "Branches", href: "/dashboard/branches", icon: Building2 },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { role, can } = usePermissions();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  // Filter navigation items based on user role
  const visibleNav = navigation.filter((item) => {
    const permission = routePermissionMap[item.href] as Permission | undefined;
    if (!permission) return true; // Show if no permission mapping
    return can(permission);
  });

  // Role labels for the user info section
  const roleLabel: Record<string, string> = {
    admin: "Shop Admin",
    manager: "Manager",
    staff: "Staff",
  };

  const roleColor: Record<string, string> = {
    admin: "from-violet-500 to-purple-600",
    manager: "from-amber-500 to-orange-600",
    staff: "from-blue-500 to-cyan-600",
  };

  return (
    <aside className="w-72 bg-gradient-to-b from-slate-900 to-slate-800 min-h-screen flex flex-col sticky top-0 h-screen">
      {/* Logo */}
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="Paris Bridals" className="w-10 h-10" />
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Paris Bridals</h1>
            <p className="text-xs text-slate-400">Admin Dashboard</p>
          </div>
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-400/25 hover:[&::-webkit-scrollbar-thumb]:bg-slate-400/50 [&::-webkit-scrollbar-thumb]:rounded-full">
        {visibleNav.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary text-white shadow-lg shadow-primary/25"
                  : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User Info with Dropdown */}
      <div className="p-4 border-t border-slate-700">
        <div className="relative">
          <button 
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-700/50 hover:bg-slate-700 transition-all duration-200 w-full"
          >
            <div className={cn("w-10 h-10 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-semibold", roleColor[role] || roleColor.admin)}>
              {role.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium text-white truncate">{roleLabel[role] || "User"}</p>
              <p className="text-xs text-slate-400 truncate">{role === "admin" ? "admin@parisbridals.com" : `${role}@parisbridals.com`}</p>
            </div>
            <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", showUserMenu && "rotate-180")} />
          </button>

          {/* Dropdown Menu */}
          {showUserMenu && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white w-full transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
