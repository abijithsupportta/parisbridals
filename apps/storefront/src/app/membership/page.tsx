import Header from "@/components/home/Header";
import Footer from "@/components/home/Footer";
import { getParisBridalsStore } from "@/lib/actions/store";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, ShieldCheck, Zap, Heart } from "lucide-react";

export default async function MembershipPage() {
  const store = await getParisBridalsStore();
  if (!store) return null;

  const benefits = [
    {
      title: "Priority Booking",
      desc: "Reserve our most popular masterpieces 12 months in advance before they open to the public.",
      icon: Zap,
    },
    {
      title: "Complimentary Sanitization",
      desc: "Every piece undergoes medical-grade ultrasonic cleaning and UV sterilization at no extra cost.",
      icon: ShieldCheck,
    },
    {
      title: "Exclusive Previews",
      desc: "Be the first to browse and rent new arrivals before they are listed on the website.",
      icon: Sparkles,
    },
    {
      title: "Personal Stylist",
      desc: "One-on-one consultation with our bridal jewellery experts to match your outfit and theme.",
      icon: Heart,
    },
  ];

  return (
    <main className="min-h-screen bg-silk">
      <Header store={store} />
      
      {/* Hero */}
      <section className="py-20 sm:py-32 px-4 text-center">
        <div className="section-eyebrow justify-center">The Circle of Elegance</div>
        <h1 className="text-5xl sm:text-7xl font-serif text-heading mb-6 leading-tight">
          Paris <em className="text-rosegold italic">Privé</em>
        </h1>
        <p className="text-body max-w-2xl mx-auto font-light text-lg">
          Join our exclusive membership program designed for brides and jewellery enthusiasts who seek the extraordinary.
        </p>
      </section>

      {/* Benefits Grid */}
      <section className="pb-20 sm:pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {benefits.map((benefit) => (
            <div key={benefit.title} className="bg-white p-8 rounded-[2.5rem] border border-[var(--border-silk)] shadow-sm hover:shadow-silk transition-all duration-500 hover:-translate-y-2 group">
              <div className="w-12 h-12 bg-rosegold/5 text-rosegold rounded-2xl flex items-center justify-center mb-6 group-hover:bg-rosegold group-hover:text-white transition-colors duration-500">
                <benefit.icon size={24} />
              </div>
              <h3 className="text-xl font-serif text-heading mb-3">{benefit.title}</h3>
              <p className="text-sm text-body leading-relaxed opacity-80">{benefit.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing/CTA */}
      <section className="pb-32 px-4">
        <div className="max-w-4xl mx-auto bg-white rounded-[4rem] overflow-hidden shadow-2xl border border-[var(--border-silk)] flex flex-col md:flex-row">
           <div className="flex-1 p-8 sm:p-16 space-y-8">
              <h2 className="text-4xl font-serif text-heading">Become a <em className="text-rosegold italic">Privé Member</em></h2>
              <div className="space-y-4">
                 {[
                   "Zero security deposit on selected sets",
                   "Free delivery & doorstep pickup",
                   "10% off your first rental",
                   "Access to the Vault collections",
                 ].map(item => (
                   <div key={item} className="flex items-center gap-3 text-body">
                      <div className="w-5 h-5 bg-rosegold/10 text-rosegold rounded-full flex items-center justify-center flex-shrink-0">
                         <Check size={12} strokeWidth={3} />
                      </div>
                      <span className="text-sm">{item}</span>
                   </div>
                 ))}
              </div>
              <div className="pt-4">
                <Button className="shimmer-btn w-full sm:w-auto px-10 py-6 rounded-full text-sm font-bold uppercase tracking-widest">
                   Join The Circle — ₹4,999/yr
                </Button>
              </div>
           </div>
           <div className="w-full md:w-[40%] bg-rosegold/5 p-8 sm:p-16 flex flex-col justify-center text-center">
              <div className="text-5xl font-serif text-rosegold mb-2">₹4,999</div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-8">Annual Membership</div>
              <p className="text-xs text-body italic opacity-60">"The best investment for a grand bridal look."</p>
           </div>
        </div>
      </section>

      <Footer store={store} />
    </main>
  );
}
