import Header from "@/components/home/Header";
import Footer from "@/components/home/Footer";
import { getParisBridalsStore } from "@/lib/actions/store";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default async function FAQsPage() {
  const store = await getParisBridalsStore();
  if (!store) return null;

  const faqCategories = [
    {
      name: "Rental Process",
      items: [
        {
          q: "How does the rental process work?",
          a: "Select your jewellery, choose your dates, and pay the rental fee + security deposit. We deliver (or you pick up), you shine at your event, and then return the piece within the agreed time.",
        },
        {
          q: "How far in advance should I book?",
          a: "For weddings, we recommend booking at least 3-6 months in advance. For other events, 2-4 weeks is usually sufficient.",
        },
      ],
    },
    {
      name: "Care & Sanitization",
      items: [
        {
          q: "Is the jewellery sanitized?",
          a: "Absolutely. We pride ourselves on the 'Paris Standard' of hygiene. Every piece undergoes ultrasonic cleaning and UV sterilization before and after every rental.",
        },
        {
          q: "What if I accidentally damage a piece?",
          a: "We understand accidents happen. Minor wear is expected, but significant damage or loss of stones will be assessed and deducted from the security deposit. We recommend avoiding perfumes and hairsprays while wearing the jewellery.",
        },
      ],
    },
  ];

  return (
    <main className="min-h-screen bg-silk">
      <Header store={store} />
      
      <section className="py-20 sm:py-32 px-4">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <div className="section-eyebrow justify-center">Questions & Answers</div>
          <h1 className="text-5xl font-serif text-heading mb-6">Frequently Asked</h1>
          <p className="text-body font-light">
            Everything you need to know about renting our treasures.
          </p>
        </div>

        <div className="max-w-3xl mx-auto space-y-12 pb-20">
          {faqCategories.map((cat) => (
            <div key={cat.name} className="space-y-6">
              <h2 className="text-xs uppercase tracking-[0.3em] font-bold text-rosegold border-b border-[var(--border-silk)] pb-4">
                {cat.name}
              </h2>
              <Accordion type="single" collapsible className="w-full space-y-4">
                {cat.items.map((item, idx) => (
                  <AccordionItem
                    key={idx}
                    value={`${cat.name}-${idx}`}
                    className="bg-white rounded-3xl border border-[var(--border-silk)] px-6 shadow-sm overflow-hidden"
                  >
                    <AccordionTrigger className="hover:no-underline hover:text-rosegold text-left font-serif text-lg py-6">
                      {item.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-body leading-relaxed pb-6 opacity-80">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))}
        </div>
      </section>

      <Footer store={store} />
    </main>
  );
}
