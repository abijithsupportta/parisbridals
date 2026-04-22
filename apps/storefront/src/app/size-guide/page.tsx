import Header from "@/components/home/Header";
import Footer from "@/components/home/Footer";
import { getParisBridalsStore } from "@/lib/actions/store";
import { Button } from "@/components/ui/button";
import { Ruler, Circle, HelpCircle } from "lucide-react";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

export default async function SizeGuidePage() {
  const store = await getParisBridalsStore();
  if (!store) return null;

  const whatsappMessage = "Hi, I need help with sizing for my jewellery.";
  const whatsappUrl = buildWhatsAppUrl(whatsappMessage);

  return (
    <main className="min-h-screen bg-silk">
      <Header store={store} />

      <section className="py-12 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <div className="section-eyebrow justify-center">Fit Guide</div>
            <h1 className="text-4xl sm:text-5xl font-serif text-heading mb-4">Size Guide</h1>
            <p className="text-body font-light max-w-2xl mx-auto">
              Find your perfect fit with our easy-to-follow sizing guide.
            </p>
          </div>

          <div className="space-y-8 mb-16">
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-[var(--border-silk)]">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 bg-rosegold/5 text-rosegold rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Circle size={24} strokeWidth={1.5} />
                </div>
                <div>
                  <h2 className="font-serif text-heading text-xl mb-4">Ring Size Chart</h2>
                  <p className="text-body text-sm leading-relaxed mb-6">
                    Measure your ring size at home using these simple steps.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto mb-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border-silk)]">
                      <th className="text-left py-3 px-4 font-serif text-heading">Indian Size</th>
                      <th className="text-left py-3 px-4 font-serif text-heading">Diameter (mm)</th>
                      <th className="text-left py-3 px-4 font-serif text-heading">Circumference (mm)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { size: 10, diameter: 16.1, circumference: 50.6 },
                      { size: 11, diameter: 16.5, circumference: 51.9 },
                      { size: 12, diameter: 16.9, circumference: 53.1 },
                      { size: 13, diameter: 17.3, circumference: 54.4 },
                      { size: 14, diameter: 17.7, circumference: 55.7 },
                      { size: 15, diameter: 18.1, circumference: 56.9 },
                      { size: 16, diameter: 18.5, circumference: 58.2 },
                      { size: 17, diameter: 18.9, circumference: 59.4 },
                      { size: 18, diameter: 19.4, circumference: 60.9 },
                      { size: 19, diameter: 19.8, circumference: 62.2 },
                      { size: 20, diameter: 20.2, circumference: 63.5 },
                      { size: 21, diameter: 20.6, circumference: 64.7 },
                      { size: 22, diameter: 21.0, circumference: 66.0 },
                      { size: 23, diameter: 21.4, circumference: 67.3 },
                    ].map((row) => (
                      <tr key={row.size} className="border-b border-[var(--border-silk)] last:border-0">
                        <td className="py-3 px-4 text-heading font-medium">{row.size}</td>
                        <td className="py-3 px-4 text-body">{row.diameter}</td>
                        <td className="py-3 px-4 text-body">{row.circumference}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-rosegold/5 rounded-2xl p-6">
                <h3 className="font-medium text-heading mb-3">How to Measure</h3>
                <ol className="text-body text-sm space-y-2 list-decimal list-inside">
                  <li>Wrap a string or paper strip around your finger</li>
                  <li>Mark where it overlaps</li>
                  <li>Measure the length in mm</li>
                  <li>Match circumference to chart above</li>
                </ol>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-8 shadow-sm border border-[var(--border-silk)]">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 bg-rosegold/5 text-rosegold rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Ruler size={24} strokeWidth={1.5} />
                </div>
                <div>
                  <h2 className="font-serif text-heading text-xl mb-4">Bangle Size Guide</h2>
                  <p className="text-body text-sm leading-relaxed mb-6">
                    Bangles are measured by diameter. Measure an existing bangle that fits you well.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto mb-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border-silk)]">
                      <th className="text-left py-3 px-4 font-serif text-heading">Bangle Size</th>
                      <th className="text-left py-3 px-4 font-serif text-heading">Diameter (inches)</th>
                      <th className="text-left py-3 px-4 font-serif text-heading">Diameter (mm)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { size: "2-2", inches: "2.125", mm: 54.0 },
                      { size: "2-4", inches: "2.25", mm: 57.2 },
                      { size: "2-6", inches: "2.375", mm: 60.3 },
                      { size: "2-8", inches: "2.5", mm: 63.5 },
                      { size: "2-10", inches: "2.625", mm: 66.7 },
                      { size: "2-12", inches: "2.75", mm: 69.9 },
                      { size: "2-14", inches: "2.875", mm: 73.0 },
                    ].map((row) => (
                      <tr key={row.size} className="border-b border-[var(--border-silk)] last:border-0">
                        <td className="py-3 px-4 text-heading font-medium">{row.size}</td>
                        <td className="py-3 px-4 text-body">{row.inches}</td>
                        <td className="py-3 px-4 text-body">{row.mm}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-rosegold/5 rounded-2xl p-6">
                <h3 className="font-medium text-heading mb-3">How to Measure</h3>
                <ol className="text-body text-sm space-y-2 list-decimal list-inside">
                  <li>Place a bangle that fits on a ruler</li>
                  <li>Measure the inner diameter</li>
                  <li>Match to chart above</li>
                  <li>Or measure your hand's widest circumference</li>
                </ol>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-8 shadow-sm border border-[var(--border-silk)]">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-rosegold/5 text-rosegold rounded-2xl flex items-center justify-center flex-shrink-0">
                  <HelpCircle size={24} strokeWidth={1.5} />
                </div>
                <div>
                  <h2 className="font-serif text-heading text-xl mb-2">Tips for Accurate Sizing</h2>
                  <ul className="text-body text-sm space-y-2">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-rosegold rounded-full"></span>
                      Measure at room temperature (fingers swell in heat)
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-rosegold rounded-full"></span>
                      Measure at the end of the day (fingers are largest)
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-rosegold rounded-full"></span>
                      Don't measure when fingers are cold
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-rosegold rounded-full"></span>
                      For rings: measure the finger you'll wear it on
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-rosegold rounded-full"></span>
                      When in doubt, size up slightly
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-rosegold/5 rounded-3xl p-8 text-center">
            <h2 className="font-serif text-heading text-xl mb-3">Still Unsure?</h2>
            <p className="text-body text-sm mb-6 max-w-md mx-auto">
              Need help determining your size? Contact us on WhatsApp for personalized assistance.
            </p>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block"
            >
              <Button className="shimmer-btn px-8 py-4 rounded-full text-xs uppercase tracking-widest font-bold">
                Get Help on WhatsApp
              </Button>
            </a>
          </div>
        </div>
      </section>

      <Footer store={store} />
    </main>
  );
}
