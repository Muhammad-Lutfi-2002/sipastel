import React from 'react';
import { ArrowRight } from 'lucide-react';

interface CustomOrderHighlightProps {
  onStartCustomOrder: () => void;
}

export const CustomOrderHighlight: React.FC<CustomOrderHighlightProps> = ({
  onStartCustomOrder,
}) => {
  return (
    <section
      id="custom-order-highlight-section"
      className="w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-12 sm:py-20 md:py-24"
    >
      <div className="bg-[#1C1B1A] text-[#FAF9F5] rounded-[2px] overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch">
        {/* Left Column: Atelier Copy & Service Specs */}
        <div className="lg:col-span-6 p-8 sm:p-12 md:p-16 flex flex-col justify-center">
          <span className="text-xs font-bold uppercase tracking-[0.25em] text-[#A69E8F] block mb-3">
            BESPOKE & BATCH PRODUCTION
          </span>

          <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-[#FAF9F5] leading-[1.08] mb-4">
            YOUR DESIGN. YOUR PIECE.
          </h2>

          <p className="text-sm sm:text-base text-[#D8D4CB] leading-relaxed mb-8 max-w-lg">
            Wujudkan identitas tim, komunitas, atau brand Anda bersama studio konveksi kami. Dari katun combed 16s/24s berpotongan boxy, aero jersey lari & sepeda mikro-pori, hingga bordir presisi tinggi.
          </p>

          <div className="space-y-3 mb-10 text-xs sm:text-sm text-[#D8D4CB] border-y border-[#383633] py-6">
            <div className="flex items-start gap-3">
              <span className="text-[#677663] font-bold">—</span>
              <span><strong>Pilihan Kain Premium:</strong> Katun combed 16s (235 gsm), 24s combed, & Dry-Fit Milano 170 gsm.</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-[#677663] font-bold">—</span>
              <span><strong>Teknik Aplikasi:</strong> Sablon DTF High-Density, Plastisol manual, atau Bordir Komputer presisi.</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-[#677663] font-bold">—</span>
              <span><strong>Free Digital Mockup:</strong> Preview 2D dikerjakan desainer sebelum konfirmasi produksi massal.</span>
            </div>
          </div>

          <div>
            <button
              id="start-custom-order-cta-btn"
              onClick={onStartCustomOrder}
              className="min-h-[48px] px-8 bg-[#FAF9F5] hover:bg-[#FFFFFF] text-[#1C1B1A] text-xs font-bold uppercase tracking-widest rounded-[2px] transition-all active:scale-[0.99] flex items-center gap-3 cursor-pointer group"
            >
              <span>START CUSTOM STUDIO</span>
              <ArrowRight className="w-4 h-4 text-[#1C1B1A] transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>

        {/* Right Column: Clean Editorial Studio Visual */}
        <div className="lg:col-span-6 relative min-h-[380px] lg:min-h-full bg-[#2B2A28]">
          <img
            src="https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=1200&q=88"
            alt="SIPASTEL Custom Studio Craftsmanship"
            className="w-full h-full object-cover object-center filter brightness-[0.92] contrast-[1.05]"
          />
          {/* Natural atmospheric overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#1C1B1A]/80 via-transparent to-transparent lg:hidden" />

          {/* Editorial Watermark */}
          <div className="absolute bottom-6 left-6 right-6 p-4 bg-[#1C1B1A]/90 backdrop-blur-md rounded-[2px] border border-[#383633] flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-[#FAF9F5]">Tailored for Communities & Brands</p>
              <p className="text-[11px] text-[#A69E8F]">High-Density DTF & Premium Milano Mesh</p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 bg-[#FAF9F5] text-[#1C1B1A] rounded-[1px]">
              Studio
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
