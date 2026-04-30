"use client";

import type { ReactNode } from "react";
import { FolderOpen, Globe2, Layers, Tag } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

export type CategoryLevelName = "main" | "sub" | "variant";

export const categoryLevelConfig = {
  main: {
    label: "Main Category",
    helper: "Top-level catalogue group",
    Icon: FolderOpen,
    badgeClass: "bg-slate-100 text-slate-800 border-slate-200",
  },
  sub: {
    label: "Sub Category",
    helper: "Sits inside a main category",
    Icon: Layers,
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
  },
  variant: {
    label: "Variant",
    helper: "Leaf category for specific styles",
    Icon: Tag,
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
  },
} as const;

export function CategoryFormPanel({
  title,
  description,
  children,
  action,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          {description && (
            <p className="text-xs text-slate-500 mt-1">{description}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function CategoryFieldLabel({
  children,
  required,
}: {
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <label className="text-sm font-medium text-slate-700">
      {children}
      {required && <span className="text-red-500"> *</span>}
    </label>
  );
}

export function CategoryPlacementSummary({
  level,
  parentName,
  locked,
}: {
  level: CategoryLevelName;
  parentName?: string | null;
  locked: boolean;
}) {
  const config = categoryLevelConfig[level];
  const Icon = config.Icon;

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
            <Icon className="h-5 w-5 text-slate-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">
              {config.label}
            </p>
            <p className="text-xs text-slate-500 truncate">
              {parentName ? `Parent: ${parentName}` : config.helper}
            </p>
          </div>
        </div>
        <Badge variant="outline" className={config.badgeClass}>
          {locked ? "Locked" : "Editable"}
        </Badge>
      </div>
    </div>
  );
}

export function CategoryToggleRow({
  title,
  description,
  checked,
  onCheckedChange,
  icon,
}: {
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  icon?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-100 px-3 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-9 w-9 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
          {icon ?? <Globe2 className="h-4 w-4 text-slate-500" />}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
