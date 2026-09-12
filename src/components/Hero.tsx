import React from 'react';
import { ArrowRight } from 'lucide-react';

interface HeroProps {
  onShopClick: () => void;
  onCustomClick: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onShopClick, onCustomClick }) => {
  return (
    <section
      id="hero-section"
      className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pt-2 pb-14 sm:pb-20 md:pb-24"
    >
      {/* Editorial Hero Container */}
      <div className="relative w-full overflow-hidden rounded-[2px] bg-[#1C1B1A]">
        {/* Cinematic Background Image Container */}
        <div className="relative aspect-[4/3] sm:aspect-[16/9] lg:aspect-[21/9] w-full min-h-[460px] sm:min-h-[520px] lg:min-h-[560px]">
          <img
            src="https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=2200&q=88"
            alt="SIPASTEL Fashion Editorial Campaign"
            className="w-full h-full object-cover object-center filter brightness-[0.88] contrast-[1.04]"
            loading="eager"
          />

          {/* Natural photographic gradient overlay (no purple or neon) */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#141312] via-[#141312]/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#141312]/60 via-transparent to-transparent hidden md:block" />

          {/* Top Atelier Stamp */}
          <div className="absolute top-6 left-6 sm:top-8 sm:left-8 flex items-center gap-3">
            <span className="text-[10px] uppercase font-bold tracking-[0.25em] text-[#FAF9F5]/80 px-2.5 py-1 border border-[#FAF9F5]/25 backdrop-blur-xs">
              BANDUNG • INDONESIA
            </span>
            <span className="text-[10px] uppercase font-semibold tracking-[0.2em] text-[#D8D4CB] hidden sm:inline">
              AUTUMN / DAILY SERIES
            </span>
          </div>

          {/* Editorial Content Layout */}
          <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-10 md:p-14 lg:p-16 text-[#FAF9F5]">
            <div className="max-w-2xl">
              <span className="text-xs uppercase tracking-[0.25em] text-[#D8D4CB] font-semibold block mb-3">
                CUSTOM APPAREL & DAILY ESSENTIALS
              </span>

              <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-[#FAF9F5] leading-[1.04] mb-4">
                WEAR YOUR IDEA.
              </h1>

              <p className="text-sm sm:text-base md:text-lg text-[#E6E3DB] font-normal leading-relaxed max-w-lg mb-8">
                Pakaian yang dirancang untuk terasa personal. Dari potongan katun heavyweight 16s bertekstur tenang hingga technical aero jersey untuk komunitas Anda.
              </p>

              {/* CTAs with crisp editorial button styles (no generic rounded pills) */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <button
                  id="hero-shop-collection-cta"
                  onClick={onShopClick}
                  className="min-h-[48px] px-8 bg-[#FAF9F5] hover:bg-[#FFFFFF] text-[#1C1B1A] text-xs font-bold uppercase tracking-widest transition-all active:scale-[0.99] rounded-[2px] flex items-center justify-center gap-2 group cursor-pointer"
                >
                  <span>SHOP COLLECTION</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </button>

                <button
                  id="hero-custom-order-cta"
                  onClick={onCustomClick}
                  className="min-h-[48px] px-8 bg-transparent hover:bg-[#FAF9F5]/10 text-[#FAF9F5] border border-[#FAF9F5]/50 hover:border-[#FAF9F5] text-xs font-bold uppercase tracking-widest transition-all rounded-[2px] flex items-center justify-center backdrop-blur-xs cursor-pointer"
                >
                  <span>START CUSTOM STUDIO</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
