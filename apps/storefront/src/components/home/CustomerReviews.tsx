import { reviews } from "@/data/homepage";
import { Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function CustomerReviews() {
  return (
    <section className="bg-silk py-6 sm:py-8 md:py-12 relative overflow-hidden">
      {/* Decorative rose petals/silk background elements */}
      <div className="absolute -top-12 -left-12 w-48 h-48 bg-rosegold/5 rounded-full blur-3xl" />
      <div className="absolute -bottom-12 -right-12 w-64 h-64 bg-rosegold/5 rounded-full blur-3xl" />

      <div className="max-w-[1600px] mx-auto relative z-10">
        <div className="text-center mb-4 sm:mb-6 md:mb-8 animate-fadeInUp px-6 md:px-12">
          <span className="section-eyebrow justify-center after:content-[''] after:w-8 after:h-px after:bg-rosegold-light">Testimonials</span>
          <h2 className="section-title">What Our <em>Brides Say</em></h2>
          <p className="text-caption text-xs tracking-widest uppercase mt-3">Real stories from real celebrations</p>
        </div>

        {/* Mobile: horizontal snap carousel */}
        <div className="md:hidden px-6 overflow-x-auto snap-x snap-mandatory hide-scrollbar">
          <div className="flex gap-4 pb-4 w-max">
            {reviews.map((review) => (
              <div key={review.id} className="snap-center shrink-0 w-[78vw] max-w-[320px]">
                <Card className="relative bg-white/80 backdrop-blur-md border-[var(--border-silk)] shadow-silk p-5 sm:p-7 flex flex-col items-center text-center rounded-[2rem] h-full">
                  <CardContent className="p-0 flex flex-col items-center h-full w-full">
                    <div className="flex gap-1.5 mb-4 sm:mb-5">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={13}
                          className={i < review.rating ? "fill-amber-400 text-amber-400" : "text-border-silk"}
                        />
                      ))}
                    </div>
                    <p className="text-sm sm:text-base font-serif italic leading-relaxed text-heading mb-4 sm:mb-6">
                      "{review.text}"
                    </p>
                    <div className="mt-auto pt-4 sm:pt-5 border-t border-silk-dark w-full">
                      <h4 className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.2em] text-heading mb-1">
                        {review.name}
                      </h4>
                      <p className="text-[10px] text-rosegold font-bold uppercase tracking-[0.25em]">
                        {review.occasion}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>

        {/* Desktop: 3-col grid */}
        <div className="hidden md:grid md:grid-cols-3 gap-10 px-6 md:px-12 stagger-children">
          {reviews.map((review) => (
            <Card key={review.id} className="relative bg-white/80 backdrop-blur-md border-[var(--border-silk)] shadow-silk p-10 flex flex-col items-center text-center group hover:-translate-y-2 transition-all duration-700 hover:shadow-2xl hover:shadow-rosegold/10 rounded-[2rem]">
              <CardContent className="p-0 flex flex-col items-center h-full">
                <div className="flex gap-1.5 mb-8">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={14}
                      className={i < review.rating ? "fill-amber-400 text-amber-400" : "text-border-silk"}
                    />
                  ))}
                </div>
                <p className="text-[17px] font-serif italic leading-relaxed text-heading mb-10 group-hover:text-rosegold transition-colors duration-500">
                  "{review.text}"
                </p>
                <div className="mt-auto pt-8 border-t border-silk w-full">
                  <h4 className="text-sm font-bold uppercase tracking-[0.2em] text-heading mb-2">
                    {review.name}
                  </h4>
                  <p className="text-[10px] text-rosegold font-bold uppercase tracking-[0.3em]">
                    {review.occasion}
                  </p>
                </div>
              </CardContent>
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none rounded-[2rem]" />
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
