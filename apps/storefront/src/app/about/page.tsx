import Header from "@/components/home/Header";
import Footer from "@/components/home/Footer";
import { getParisBridalsStore } from "@/lib/actions/store";

export default async function AboutPage() {
  const store = await getParisBridalsStore();
  if (!store) return null;

  return (
    <main className="min-h-screen bg-silk">
      <Header store={store} />
      
      {/* Hero Section */}
      <section className="relative h-[50vh] flex items-center justify-center bg-white border-b border-[var(--border-silk)]">
        <div className="relative text-center px-4 max-w-4xl flex flex-col items-center">
          <img 
            src="/logo_paris.svg" 
            alt="Paris Bridals" 
            className="h-20 sm:h-24 md:h-28 mb-10 animate-fadeIn"
          />
          <div className="section-eyebrow mb-4">Our Story</div>
          <h1 className="text-4xl sm:text-6xl font-serif text-heading mb-6 tracking-tight">The Paris Way</h1>
          <p className="text-base sm:text-lg font-light text-body tracking-wide max-w-2xl mx-auto">
            Defining luxury bridal jewellery rental in Kerala since 2010.
          </p>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-20 sm:py-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-16">
          <div className="flex flex-col md:flex-row gap-12 items-center">
            <div className="space-y-6 flex-1">
              <h2 className="text-3xl font-serif text-heading">A Tradition of <em className="text-rosegold italic">Excellence</em></h2>
              <p className="text-body leading-relaxed">
                Paris Bridals was born out of a simple vision: to make every bride feel like royalty without the burden of ownership. We curated a collection that speaks to the heritage of Kerala while embracing modern sophistication.
              </p>
              <p className="text-body leading-relaxed">
                From Temple jewellery that honors ancestors to Kundan sets that dazzle under the stage lights, our pieces are more than just ornaments—they are masterpieces of craftsmanship.
              </p>
            </div>
            <div className="flex-1 border-l border-[var(--border-silk)] pl-12 hidden md:block">
               <p className="text-2xl font-serif text-rosegold italic leading-relaxed">
                 "Every piece in our collection is handpicked to ensure it carries the soul of tradition and the sparkle of high-end luxury."
               </p>
            </div>
          </div>

          <div className="bg-white rounded-[4rem] p-8 sm:p-16 shadow-silk border border-[var(--border-silk)] text-center space-y-8">
             <div className="section-eyebrow">Our Philosophy</div>
             <h2 className="text-4xl font-serif text-heading">Elegance meets <em className="text-rosegold italic">Sustainability</em></h2>
             <p className="text-body max-w-2xl mx-auto leading-relaxed">
               We believe luxury shouldn't be wasteful. By choosing to rent, you are participating in a circular fashion movement that preserves artisanal skills and reduces the environmental impact of precious metal mining.
             </p>
             <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 pt-8">
                {[
                  { label: "Founded", val: "2010" },
                  { label: "Pieces", val: "2.5k+" },
                  { label: "Happy Brides", val: "10k+" },
                  { label: "Cities", val: "12" },
                ].map(stat => (
                  <div key={stat.label}>
                    <div className="text-3xl font-serif text-rosegold mb-1">{stat.val}</div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{stat.label}</div>
                  </div>
                ))}
             </div>
          </div>
        </div>
      </section>

      <Footer store={store} />
    </main>
  );
}
