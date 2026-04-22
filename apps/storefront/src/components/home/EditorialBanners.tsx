import Image from "next/image";
import { editorialBanners } from "@/data/homepage";
import Link from "next/link";

export default function EditorialBanners() {
  return (
    <section className="bg-warm">
      <div className="max-w-[1440px] mx-auto">
        <div className="grid md:grid-cols-2 gap-8">
          {editorialBanners.map((banner) => (
            <Link 
              key={banner.id} 
              href={banner.link}
              className="group relative aspect-[16/9] overflow-hidden rounded-sm"
            >
              <Image
                src={banner.image}
                alt={banner.title}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex flex-col justify-end p-8 md:p-12">
                <span className="text-white/80 text-xs uppercase tracking-[0.2em] mb-3">Feature Occasion</span>
                <h3 className="text-white text-3xl md:text-4xl font-light serif mb-4">{banner.title}</h3>
                <p className="text-white/90 text-sm md:text-base font-light mb-6 opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-500">
                  {banner.subtitle}
                </p>
                <div className="w-fit border-b border-white pb-1 text-white text-xs uppercase tracking-widest font-medium">
                  Shop Occasion
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
