/**
 * CalendarLegend
 *
 * Small horizontal legend explaining the dot colors.
 *
 * @component
 */

"use client";

export default function CalendarLegend() {
  const items = [
    { color: "bg-emerald-500", label: "Starting" },
    { color: "bg-purple-500", label: "Ongoing" },
    { color: "bg-amber-500", label: "Ending" },
    { color: "bg-red-500", label: "Late Return" },
  ];

  return (
    <div className="flex items-center justify-center gap-4 py-2">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${item.color}`} />
          <span className="text-[11px] text-slate-500 font-medium">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}
