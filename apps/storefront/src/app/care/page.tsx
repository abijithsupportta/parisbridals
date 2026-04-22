import Header from "@/components/home/Header";
import Footer from "@/components/home/Footer";
import { getParisBridalsStore } from "@/lib/actions/store";
import { Button } from "@/components/ui/button";
import { Droplets, Sun, Sparkles, Shield, HelpCircle } from "lucide-react";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

export default async function CarePage() {
  const store = await getParisBridalsStore();
  if (!store) return null;

  const whatsappMessage = "Hi, I have a question about jewellery care.";
  const whatsappUrl = buildWhatsAppUrl(whatsappMessage);

  return (
    <main className="min-h-screen bg-silk">
      <Header store={store} />

      <section className="py-12 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <div className="section-eyebrow justify-center">Preservation</div>
            <h1 className="text-4xl sm:text-5xl font-serif text-heading mb-4">Care Instructions</h1>
            <p className="text-body font-light max-w-2xl mx-auto">
              Keep your rented treasures looking beautiful with these simple care guidelines.
            </p>
          </div>

          <div className="space-y-8 mb-16">
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-[var(--border-silk)]">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-rosegold/5 text-rosegold rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Droplets size={24} strokeWidth={1.5} />
                </div>
                <div>
                  <h2 className="font-serif text-heading text-xl mb-2">Avoid Water & Moisture</h2>
                  <p className="text-body text-sm leading-relaxed">
                    Remove jewellery before showering, swimming, or washing hands. Water can cause 
                    tarnishing and weaken adhesives. If jewellery gets wet, pat dry immediately with 
                    a soft cloth.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-8 shadow-sm border border-[var(--border-silk)]">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-rosegold/5 text-rosegold rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Sun size={24} strokeWidth={1.5} />
                </div>
                <div>
                  <h2 className="font-serif text-heading text-xl mb-2">Avoid Chemicals</h2>
                  <p className="text-body text-sm leading-relaxed mb-3">
                    Chemicals can damage metals and gemstones. Avoid contact with:
                  </p>
                  <ul className="text-body text-sm space-y-2">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-rosegold rounded-full"></span>
                      Perfumes and body sprays
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-rosegold rounded-full"></span>
                      Hairsprays and styling products
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-rosegold rounded-full"></span>
                      Lotions, creams, and oils
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-rosegold rounded-full"></span>
                      Cleaning products and bleach
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-8 shadow-sm border border-[var(--border-silk)]">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-rosegold/5 text-rosegold rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Sparkles size={24} strokeWidth={1.5} />
                </div>
                <div>
                  <h2 className="font-serif text-heading text-xl mb-2">Cleaning Tips</h2>
                  <p className="text-body text-sm leading-relaxed mb-3">
                    For light cleaning during your rental period:
                  </p>
                  <ul className="text-body text-sm space-y-2">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-rosegold rounded-full"></span>
                      Use a soft, lint-free cloth to gently wipe
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-rosegold rounded-full"></span>
                      Avoid harsh chemicals or abrasive materials
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-rosegold rounded-full"></span>
                      Don't use paper towels (can scratch)
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-rosegold rounded-full"></span>
                      For stubborn spots, contact us for guidance
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-8 shadow-sm border border-[var(--border-silk)]">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-rosegold/5 text-rosegold rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Shield size={24} strokeWidth={1.5} />
                </div>
                <div>
                  <h2 className="font-serif text-heading text-xl mb-2">Storage</h2>
                  <p className="text-body text-sm leading-relaxed mb-3">
                    When not wearing, store jewellery properly:
                  </p>
                  <ul className="text-body text-sm space-y-2">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-rosegold rounded-full"></span>
                      Keep in the provided packaging
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-rosegold rounded-full"></span>
                      Store pieces separately to avoid scratching
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-rosegold rounded-full"></span>
                      Keep away from direct sunlight
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-rosegold rounded-full"></span>
                      Store in a cool, dry place
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-8 shadow-sm border border-[var(--border-silk)]">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-rosegold/5 text-rosegold rounded-2xl flex items-center justify-center flex-shrink-0">
                  <HelpCircle size={24} strokeWidth={1.5} />
                </div>
                <div>
                  <h2 className="font-serif text-heading text-xl mb-2">During Your Event</h2>
                  <ul className="text-body text-sm space-y-2">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-rosegold rounded-full"></span>
                      Put jewellery on last, after makeup and hair
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-rosegold rounded-full"></span>
                      Remove first when changing clothes
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-rosegold rounded-full"></span>
                      Avoid vigorous activities that could dislodge pieces
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-rosegold rounded-full"></span>
                      Check clasps and settings periodically
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-rosegold/5 rounded-3xl p-8 text-center">
            <h2 className="font-serif text-heading text-xl mb-3">Need Care Advice?</h2>
            <p className="text-body text-sm mb-6 max-w-md mx-auto">
              Have questions about caring for your rented pieces? Contact us on WhatsApp.
            </p>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block"
            >
              <Button className="shimmer-btn px-8 py-4 rounded-full text-xs uppercase tracking-widest font-bold">
                Ask on WhatsApp
              </Button>
            </a>
          </div>
        </div>
      </section>

      <Footer store={store} />
    </main>
  );
}
