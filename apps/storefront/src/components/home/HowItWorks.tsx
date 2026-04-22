import { howItWorksSteps } from "@/data/homepage";

export default function HowItWorks() {
  return (
    <section className="bg-white py-6 sm:py-8 md:py-12 px-6 md:px-12 relative overflow-hidden">
      {/* Decorative silk waves in background */}
      <div className="absolute top-0 left-0 w-full h-full opacity-[0.03] pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] border-[40px] border-white rounded-full animate-[silkWave_20s_linear_infinite]" />
      </div>

      <div className="max-w-[1600px] mx-auto relative z-10">
        <div className="text-center mb-6 sm:mb-8 md:mb-10 animate-fadeInUp">
          <span className="section-eyebrow justify-center after:content-[''] after:w-8 after:h-px after:bg-rosegold-light">Our Process</span>
          <h2 className="section-title">How it <em>Works</em></h2>
          <p className="text-caption text-sm font-light tracking-widest uppercase mt-3">Simple steps to elegance</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 px-4 relative stagger-children">
          {/* Connecting line for desktop */}
          <div className="hidden md:block absolute top-[36px] md:top-[44px] left-[15%] right-[15%] h-px bg-border-silk" />

          {howItWorksSteps.map((step, index) => (
            <div key={index} className="flex flex-col items-center text-center relative z-10 group">
              <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full border border-border-silk flex items-center justify-center mb-6 sm:mb-8 md:mb-10 bg-white group-hover:border-rosegold transition-all duration-700 shadow-2xl">
                <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full border border-rosegold/10 bg-rosegold/5 flex items-center justify-center font-serif text-xl sm:text-2xl text-rosegold group-hover:scale-110 group-hover:bg-rosegold group-hover:text-white transition-all duration-500 shadow-inner">
                  0{index + 1}
                </div>
              </div>
              <h3 className="text-sm sm:text-base md:text-xl font-serif text-heading mb-3 sm:mb-4 tracking-wide group-hover:text-rosegold transition-colors duration-500">{step.title}</h3>
              <p className="text-[11px] sm:text-[12px] md:text-[13px] text-body font-light leading-relaxed max-w-[200px] group-hover:text-heading transition-colors duration-500">
                {step.desc}
              </p>
              
              {/* Shine effect on indicator */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-rosegold/5 rounded-full blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
