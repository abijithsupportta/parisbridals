import Image from "next/image";
import { occasions } from "@/data/homepage";
import Link from "next/link";

export default function ShopByOccasion() {
  return (
    <section>
      <div className="max-w-[1440px] mx-auto text-center mb-16">
        <span className="section-eyebrow justify-center">Tailored Choices</span>
        <h2 className="section-title">Shop by <em>Occasion</em></h2>
      </div>

      <div className="max-w-[1440px] mx-auto grid grid-cols-2 md:grid-cols-5 gap-6">
        {occasions.map((occasion) => (
          <Link 
            key={occasion.id} 
            href={`/collections?occasion=${occasion.name.toLowerCase()}`}
            className="group flex flex-col items-center"
          >
            <div className="relative w-full aspect-square rounded-full overflow-hidden mb-6 border-subtle group-hover:border-[#C4956A] transition-colors p-2">
              <div className="relative w-full h-full rounded-full overflow-hidden">
                <Image
                  src={occasion.image}
                  alt={occasion.name}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                />
              </div>
              <div className="absolute top-4 right-4 bg-[#C4956A] text-white text-[10px] w-12 h-12 flex items-center justify-center rounded-full border-2 border-white font-medium">
                {occasion.count}
              </div>
            </div>
            <h3 className="text-lg font-light serif group-hover:text-[#C4956A] transition-colors">
              {occasion.name}
            </h3>
            <span className="text-[10px] uppercase tracking-widest text-[#A0A0A0] mt-2 group-hover:underline">
              Browse Pieces
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
