import Header from "@/components/home/Header";
import Footer from "@/components/home/Footer";
import { getParisBridalsStore } from "@/lib/actions/store";
import { Button } from "@/components/ui/button";
import { Truck, Package, MapPin, Clock } from "lucide-react";
import { WHATSAPP_NUMBER, buildWhatsAppUrl } from "@/lib/whatsapp";

export default async function ShippingPage() {
  const store = await getParisBridalsStore();
  if (!store) return null;

  const whatsappMessage = "Hi, I have a question about delivery to my location.";
  const whatsappUrl = buildWhatsAppUrl(whatsappMessage);

  return (
    <main className="min-h-screen bg-silk">
      <Header store={store} />

      <section className="py-12 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <div className="section-eyebrow justify-center">Logistics</div>
            <h1 className="text-4xl sm:text-5xl font-serif text-heading mb-4">Shipping & Delivery</h1>
            <p className="text-body font-light max-w-2xl mx-auto">
              We ensure your precious pieces arrive safely and on time for your special occasion.
            </p>
          </div>

          <div className="space-y-8 mb-16">
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-[var(--border-silk)]">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-rosegold/5 text-rosegold rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Truck size={24} strokeWidth={1.5} />
                </div>
                <div>
                  <h2 className="font-serif text-heading text-xl mb-2">Delivery Zones</h2>
                  <p className="text-body text-sm leading-relaxed">
                    We deliver across Kerala with doorstep service. Major cities include Kochi, Thrissur, 
                    Kozhikode, Trivandrum, and surrounding areas. For other locations, please contact us.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-8 shadow-sm border border-[var(--border-silk)]">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-rosegold/5 text-rosegold rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Clock size={24} strokeWidth={1.5} />
                </div>
                <div>
                  <h2 className="font-serif text-heading text-xl mb-2">Delivery Timeline</h2>
                  <p className="text-body text-sm leading-relaxed mb-3">
                    We deliver 1-2 days before your event date to ensure you have time for trials and 
                    any adjustments. Pickup is arranged 1-2 days after the event.
                  </p>
                  <ul className="text-body text-sm space-y-2">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-rosegold rounded-full"></span>
                      Standard delivery: 1-2 days before event
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-rosegold rounded-full"></span>
                      Express delivery: Same-day (additional charges apply)
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-rosegold rounded-full"></span>
                      Pickup: 1-2 days after event
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-8 shadow-sm border border-[var(--border-silk)]">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-rosegold/5 text-rosegold rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Package size={24} strokeWidth={1.5} />
                </div>
                <div>
                  <h2 className="font-serif text-heading text-xl mb-2">Delivery Options</h2>
                  <div className="space-y-4">
                    <div className="border-b border-[var(--border-silk)] pb-4">
                      <h3 className="font-medium text-heading mb-1">Doorstep Delivery</h3>
                      <p className="text-body text-sm">
                        We deliver directly to your home or venue. Charges vary by distance (₹200-₹500).
                      </p>
                    </div>
                    <div>
                      <h3 className="font-medium text-heading mb-1">Store Pickup</h3>
                      <p className="text-body text-sm">
                        Free pickup from our store. Visit us to try on pieces and collect your order.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-8 shadow-sm border border-[var(--border-silk)]">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-rosegold/5 text-rosegold rounded-2xl flex items-center justify-center flex-shrink-0">
                  <MapPin size={24} strokeWidth={1.5} />
                </div>
                <div>
                  <h2 className="font-serif text-heading text-xl mb-2">Packaging & Handling</h2>
                  <p className="text-body text-sm leading-relaxed">
                    All pieces are professionally packaged in secure jewellery boxes with protective 
                    padding. Each item is individually wrapped to prevent damage during transit.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-rosegold/5 rounded-3xl p-8 text-center">
            <h2 className="font-serif text-heading text-xl mb-3">Questions About Delivery?</h2>
            <p className="text-body text-sm mb-6 max-w-md mx-auto">
              Not sure if we deliver to your location? Need express delivery? Contact us on WhatsApp.
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
