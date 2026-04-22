import Header from "@/components/home/Header";
import Footer from "@/components/home/Footer";
import { getParisBridalsStore } from "@/lib/actions/store";

export default async function TermsPage() {
  const store = await getParisBridalsStore();
  if (!store) return null;

  return (
    <main className="min-h-screen bg-silk">
      <Header store={store} />
      <section className="py-20 px-4 sm:px-8 max-w-4xl mx-auto">
        <h1 className="text-4xl font-serif mb-10 text-heading">Terms of Service</h1>
        <div className="prose prose-stone max-w-none space-y-6 text-body">
          <p>Effective Date: April 20, 2026</p>
          <h2 className="text-xl font-bold text-heading">1. Rental Agreement</h2>
          <p>By renting from Paris Bridals, you agree to return the items in the same condition as received. Rental periods are strictly enforced.</p>
          <h2 className="text-xl font-bold text-heading">2. Security Deposit</h2>
          <p>A security deposit is required for all rentals. This will be refunded within 3-5 business days after the item is returned and inspected.</p>
          <h2 className="text-xl font-bold text-heading">3. Damage and Loss</h2>
          <p>The customer is responsible for any damage beyond normal wear and tear. In case of loss or theft, the full retail value of the piece will be charged.</p>
        </div>
      </section>
      <Footer store={store} />
    </main>
  );
}
