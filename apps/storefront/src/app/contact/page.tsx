"use client";

import { useState, useEffect } from "react";
import Header from "@/components/home/Header";
import Footer from "@/components/home/Footer";
import { getParisBridalsStore } from "@/lib/actions/store";
import { Button } from "@/components/ui/button";
import { Mail, Phone, MapPin, Send } from "lucide-react";
import { buildContactMessage, buildWhatsAppUrl } from "@/lib/whatsapp";

export default function ContactPage() {
  const [store, setStore] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    message: "",
  });
  const [errors, setErrors] = useState<{ name?: string; phone?: string; message?: string }>({});

  useEffect(() => {
    async function loadStore() {
      const storeData = await getParisBridalsStore();
      setStore(storeData);
    }
    loadStore();
    setMounted(true);
  }, []);

  const validateForm = () => {
    const newErrors: { name?: string; phone?: string; message?: string } = {};
    
    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }
    
    const cleanPhone = formData.phone.replace(/\D/g, "");
    if (!cleanPhone) {
      newErrors.phone = "Phone number is required";
    } else if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      newErrors.phone = "Enter a valid 10-digit Indian mobile number";
    }
    
    if (!formData.message.trim()) {
      newErrors.message = "Message is required";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    const cleanPhone = formData.phone.replace(/\D/g, "");
    const message = buildContactMessage(formData.name, cleanPhone, formData.message);
    window.open(buildWhatsAppUrl(message), "_blank");
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field as keyof typeof errors]) {
      setErrors({ ...errors, [field]: undefined });
    }
  };

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-silk">
      <Header store={store} />

      <section className="py-12 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <div className="section-eyebrow justify-center">Get in Touch</div>
            <h1 className="text-4xl sm:text-5xl font-serif text-heading mb-4">Contact Us</h1>
            <p className="text-body font-light max-w-2xl mx-auto">
              Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-[var(--border-silk)]">
              <h2 className="font-serif text-heading text-xl mb-6">Send a Message</h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-caption mb-2 block">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-[var(--border-silk)] text-sm focus:outline-none focus:ring-2 focus:ring-rosegold/20 transition-all"
                    placeholder="Your name"
                  />
                  {errors.name && (
                    <p className="text-xs text-red-500 mt-1.5">{errors.name}</p>
                  )}
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-widest text-caption mb-2 block">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
                    className="w-full px-4 py-3 rounded-2xl border border-[var(--border-silk)] text-sm focus:outline-none focus:ring-2 focus:ring-rosegold/20 transition-all"
                    placeholder="10-digit mobile number"
                  />
                  {errors.phone && (
                    <p className="text-xs text-red-500 mt-1.5">{errors.phone}</p>
                  )}
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-widest text-caption mb-2 block">
                    Message *
                  </label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => handleInputChange("message", e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 rounded-2xl border border-[var(--border-silk)] text-sm focus:outline-none focus:ring-2 focus:ring-rosegold/20 transition-all resize-none"
                    placeholder="How can we help you?"
                  />
                  {errors.message && (
                    <p className="text-xs text-red-500 mt-1.5">{errors.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full shimmer-btn py-4 rounded-full text-sm uppercase tracking-widest font-bold flex items-center justify-center gap-3"
                >
                  <Send size={18} strokeWidth={1.5} />
                  Send via WhatsApp
                </Button>
              </form>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-8 shadow-sm border border-[var(--border-silk)]">
                <h2 className="font-serif text-heading text-xl mb-6">Contact Information</h2>
                
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-rosegold/5 text-rosegold rounded-xl flex items-center justify-center flex-shrink-0">
                      <Phone size={18} strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-caption mb-1">Phone</p>
                      {store?.phone ? (
                        <a href={`tel:${store.phone}`} className="text-heading font-medium hover:text-rosegold transition-colors">
                          {store.phone}
                        </a>
                      ) : (
                        <p className="text-body text-sm">Contact via WhatsApp</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-rosegold/5 text-rosegold rounded-xl flex items-center justify-center flex-shrink-0">
                      <Mail size={18} strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-caption mb-1">Email</p>
                      {store?.email ? (
                        <a href={`mailto:${store.email}`} className="text-heading font-medium hover:text-rosegold transition-colors">
                          {store.email}
                        </a>
                      ) : (
                        <p className="text-body text-sm">hello@parisbridals.com</p>
                      )}
                    </div>
                  </div>

                  {store?.address && (
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-rosegold/5 text-rosegold rounded-xl flex items-center justify-center flex-shrink-0">
                        <MapPin size={18} strokeWidth={1.5} />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-caption mb-1">Address</p>
                        <p className="text-body text-sm leading-relaxed">{store.address}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-rosegold/5 rounded-3xl p-8 text-center">
                <h3 className="font-serif text-heading text-lg mb-3">Quick Response</h3>
                <p className="text-body text-sm mb-4">
                  For fastest response, reach out to us directly on WhatsApp.
                </p>
                <a
                  href={buildWhatsAppUrl("Hi, I have a question.")}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button className="shimmer-btn px-6 py-3 rounded-full text-xs uppercase tracking-widest font-bold">
                    Chat on WhatsApp
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer store={store} />
    </main>
  );
}
