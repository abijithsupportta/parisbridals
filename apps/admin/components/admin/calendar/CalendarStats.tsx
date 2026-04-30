/**
 * CalendarStats
 *
 * 4 mini stat cards for the current month.
 * Matches the stat card pattern from staff and orders pages.
 *
 * @component
 */

"use client";

import { Clock, CalendarCheck, PackageOpen, AlertTriangle } from "lucide-react";
import type { CalendarMonthStats } from "@/domain";

interface CalendarStatsProps {
  stats: CalendarMonthStats;
  isLoading: boolean;
}

const statCards = [
  {
    key: "ongoingToday",
    label: "Active Today",
    icon: Clock,
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
  {
    key: "scheduledThisMonth",
    label: "Scheduled",
    icon: CalendarCheck,
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    key: "endingToday",
    label: "Ending Today",
    icon: PackageOpen,
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  {
    key: "lateReturns",
    label: "Late Returns",
    icon: AlertTriangle,
    color: "text-red-600",
    bg: "bg-red-50",
  },
] as const;

export default function CalendarStats({ stats, isLoading }: CalendarStatsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {statCards.map((card) => {
        const Icon = card.icon;
        const value = stats[card.key as keyof CalendarMonthStats];
        return (
          <div
            key={card.key}
            className="flex items-center gap-3 p-3 bg-white border border-slate-200 shadow-sm rounded-lg"
          >
            <div
              className={`w-9 h-9 rounded-lg ${card.bg} flex items-center justify-center shrink-0`}
            >
              <Icon className={`w-4 h-4 ${card.color}`} />
            </div>
            <div>
              {isLoading ? (
                <div className="h-5 w-8 bg-slate-100 animate-pulse rounded" />
              ) : (
                <p className="text-lg font-bold text-slate-900 leading-none">
                  {typeof value === "number" ? value : 0}
                </p>
              )}
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                {card.label}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
