"use client";

import { useEffect } from "react";
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react";
import { useAppStore } from "@/stores";
import { cn } from "@/lib/utils";

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const styles = {
  success: "bg-emerald-50 border-emerald-200 text-emerald-800",
  error: "bg-red-50 border-red-200 text-red-800",
  warning: "bg-amber-50 border-amber-200 text-amber-800",
  info: "bg-blue-50 border-blue-200 text-blue-800",
};

const iconStyles = {
  success: "text-emerald-500",
  error: "text-red-500",
  warning: "text-amber-500",
  info: "text-blue-500",
};

/**
 * Toast notifications — renders from the app store's notification queue.
 * Auto-dismisses after 5s (success/info) or 8s (error/warning).
 * Must be placed in the root layout.
 */
export default function Toasts() {
  const notifications = useAppStore((s) => s.notifications);
  const removeNotification = useAppStore((s) => s.removeNotification);

  // Auto-dismiss notifications
  useEffect(() => {
    notifications.forEach((n) => {
      const duration = n.type === "error" || n.type === "warning" ? 8000 : 5000;
      const timer = setTimeout(() => removeNotification(n.id), duration);
      return () => clearTimeout(timer);
    });
  }, [notifications, removeNotification]);

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-96 pointer-events-none">
      {notifications.map((n) => {
        const Icon = icons[n.type];
        return (
          <div
            key={n.id}
            className={cn(
              "pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg",
              "animate-in slide-in-from-right-full fade-in duration-300",
              styles[n.type]
            )}
          >
            <Icon className={cn("w-5 h-5 shrink-0 mt-0.5", iconStyles[n.type])} />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">{n.title}</p>
              {n.message && <p className="text-xs mt-0.5 opacity-80">{n.message}</p>}
            </div>
            <button
              onClick={() => removeNotification(n.id)}
              className="p-0.5 rounded hover:bg-black/5 transition-colors shrink-0"
            >
              <X className="w-4 h-4 opacity-50" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
