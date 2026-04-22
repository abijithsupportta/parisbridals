import { ShieldCheck, Truck, Sparkles, Star } from "lucide-react";
import { Card } from "@/components/ui/card";

const badges = [
  {
    icon: ShieldCheck,
    title: "Certified Quality",
    description: "Each piece is hand-selected and verified by experts",
  },
  {
    icon: Truck,
    title: "Safe Delivery",
    description: "Insured and tracked shipping to your doorstep",
  },
  {
    icon: Sparkles,
    title: "Pristine Condition",
    description: "Professionally cleaned and sanitized after every use",
  },
  {
    icon: Star,
    title: "Trusted Service",
    description: "Over 500+ brides adorned across the region",
  },
];

export default function TrustBadges() {
  return (
    <section className="bg-ivory py-6 sm:py-8 md:py-12 px-5 md:px-10 border-b border-[var(--border-silk)]">
      <div className="max-w-[1600px] mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 stagger-children">
          {badges.map((badge, index) => (
            <Card
              key={index}
              className="flex flex-col items-center text-center p-4 sm:p-6 md:p-8 group border-[var(--border-silk)] bg-white/60 backdrop-blur-sm hover:shadow-silk transition-all duration-500 hover:-translate-y-1 rounded-2xl"
            >
              <div className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded-full bg-rosegold/5 text-rosegold mb-4 sm:mb-5 transition-all duration-500 group-hover:bg-rosegold group-hover:text-white group-hover:shadow-lg group-hover:shadow-rosegold/20">
                <badge.icon size={22} strokeWidth={1.5} />
              </div>
              <h3 className="text-[11px] sm:text-xs font-serif uppercase tracking-[0.15em] mb-2 sm:mb-2.5 text-heading font-medium">
                {badge.title}
              </h3>
              <p className="text-[11px] sm:text-xs text-caption leading-relaxed max-w-[180px]">
                {badge.description}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
