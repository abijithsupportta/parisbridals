import Header from "@/components/home/Header";
import Footer from "@/components/home/Footer";
import { getParisBridalsStore } from "@/lib/actions/store";
import { Button } from "@/components/ui/button";
import { RefreshCw, ShieldCheck, Clock, AlertCircle } from "lucide-react";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

export default async function ReturnsPage() {
  const store = await getParisBridalsStore();
  if (!store) return null;

  const whatsappMessage = "Hi, I have a question about returns or damage policy.";
  const whatsappUrl = buildWhatsAppUrl(whatsappMessage);

  return (
    <main className="min-h-screen bg-silk">
      <Header store={store} />

      <section className="py-12 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <div className="section-eyebrow justify-center">Policies</div>
            <h1 className="text-4xl sm:text-5xl font-serif text-heading mb-4">Returns & Damages</h1>
            <p className="text-body font-light max-w-2xl mx-auto">
              Clear policies to ensure a smooth experience for both you and our precious pieces.
            </p>
          </div>

          <div className="space-y-8 mb-16">
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-[var(--border-silk)]">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-rosegold/5 text-rosegold rounded-2xl flex items-center justify-center flex-shrink-0">
                  <RefreshCw size={24} strokeWidth={1.5} />
                </div>
                <div>
                  <h2 className="font-serif text-heading text-xl mb-2">Return Process</h2>
                  <p className="text-body text-sm leading-relaxed mb-3">
                    Returns must be made within 1-2 days after your event as agreed during booking. 
                    We'll arrange pickup from your location or you can drop off at our store.
                  </p>
                  <ul className="text-body text-sm space-y-2">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-rosegold rounded-full"></span>
                      Inspect pieces upon return together
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-rosegold rounded-full"></span>
                      Return in original packaging
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-rosegold rounded-full"></span>
                      All items must be accounted for
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-8 shadow-sm border border-[var(--border-silk)]">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-rosegold/5 text-rosegold rounded-2xl flex items-center justify-center flex-shrink-0">
                  <ShieldCheck size={24} strokeWidth={1.5} />
                </div>
                <div>
                  <h2 className="font-serif text-heading text-xl mb-2">Normal Wear & Tear</h2>
                  <p className="text-body text-sm leading-relaxed">
                    Minor wear from normal use is expected and accepted. This includes slight tarnishing, 
                    minor scratches from handling, and loose stones that can be tightened. No charges apply 
                    for normal wear.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-8 shadow-sm border border-[var(--border-silk)]">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-rosegold/5 text-rosegold rounded-2xl flex items-center justify-center flex-shrink-0">
                  <AlertCircle size={24} strokeWidth={1.5} />
                </div>
                <div>
                  <h2 className="font-serif text-heading text-xl mb-2">Damage Charges</h2>
                  <p className="text-body text-sm leading-relaxed mb-3">
                    Significant damage beyond normal wear will be assessed and charged from your security 
                    deposit. This includes:
                  </p>
                  <ul className="text-body text-sm space-y-2">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-rosegold rounded-full"></span>
                      Broken or missing stones (charged per stone)
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-rosegold rounded-full"></span>
                    Bent or broken metal components
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-rosegold rounded-full"></span>
                    Lost items (charged at retail value)
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-rosegold rounded-full"></span>
                    Chemical damage from perfumes/hairsprays
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-8 shadow-sm border border-[var(--border-silk)]">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-rosegold/5 text-rosegold rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Clock size={24} strokeWidth={1.5} />
                </div>
                <div>
                  <h2 className="font-serif text-heading text-xl mb-2">Security Deposit Refund</h2>
                  <p className="text-body text-sm leading-relaxed mb-3">
                    Your security deposit is refunded within 3-5 business days after return inspection.
                  </p>
                  <ul className="text-body text-sm space-y-2">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-rosegold rounded-full"></span>
                      Full refund if no damage
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-rosegold rounded-full"></span>
                      Partial refund if damage charges apply
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-rosegold rounded-full"></span>
                      Refund to original payment method
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-rosegold/5 rounded-3xl p-8 text-center">
            <h2 className="font-serif text-heading text-xl mb-3">Have Questions?</h2>
            <p className="text-body text-sm mb-6 max-w-md mx-auto">
              Need clarification on our policies? Contact us on WhatsApp for quick assistance.
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
