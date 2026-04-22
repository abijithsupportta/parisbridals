import Header from "@/components/home/Header";
import Footer from "@/components/home/Footer";
import { getParisBridalsStore } from "@/lib/actions/store";

export default async function PrivacyPage() {
  const store = await getParisBridalsStore();
  if (!store) return null;

  return (
    <main className="min-h-screen bg-silk">
      <Header store={store} />
      <section className="py-20 px-4 sm:px-8 max-w-4xl mx-auto">
        <h1 className="text-4xl font-serif mb-10 text-heading">Privacy Policy</h1>
        <div className="prose prose-stone max-w-none space-y-6 text-body">
          <p>Effective Date: April 20, 2026</p>
          <h2 className="text-xl font-bold text-heading">1. Information We Collect</h2>
          <p>We collect personal information such as name, email, and ID proof for rental verification purposes.</p>
          <h2 className="text-xl font-bold text-heading">2. How We Use Your Data</h2>
          <p>Your data is used solely for processing rentals, verifying identity, and communicating about your bookings.</p>
          <h2 className="text-xl font-bold text-heading">3. Data Security</h2>
          <p>We implement strict security measures to protect your personal information and do not share it with third parties except as required by law.</p>
        </div>
      </section>
      <Footer store={store} />
    </main>
  );
}
