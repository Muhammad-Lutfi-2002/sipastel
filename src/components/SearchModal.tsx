import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, X, ArrowRight } from 'lucide-react';
import { Product } from '../types';
import { formatIDR } from '../utils/formatters';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onSelectProduct: (product: Product) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  products,
  onSelectProduct,
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      document.body.style.overflow = 'hidden';
    } else {
      setQuery('');
      document.body.style.overflow = '';
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.shortDescription.toLowerCase().includes(q)
    );
  }, [query, products]);

  if (!isOpen) return null;

  return (
    <div
      id="search-modal-backdrop"
      className="fixed inset-0 z-50 bg-[#1C1B1A]/70 backdrop-blur-xs flex items-start justify-center pt-16 sm:pt-24 p-4 animate-modal-backdrop"
      onClick={onClose}
    >
      <div
        id="search-modal-content"
        className="bg-[#FAF9F5] text-[#1C1B1A] w-full max-w-2xl rounded-[2px] shadow-2xl border border-[#E8E5DF] overflow-hidden animate-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 p-4 border-b border-[#E8E5DF]">
          <Search className="w-5 h-5 text-[#75726B] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari kaos, jersey, custom apparel..."
            className="w-full bg-transparent text-sm sm:text-base text-[#1C1B1A] placeholder-[#9E9B93] focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="p-1 text-[#75726B] hover:text-[#1C1B1A]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 text-[#75726B] hover:text-[#1C1B1A] text-xs font-semibold uppercase tracking-wider"
          >
            Esc
          </button>
        </div>

        {/* Results / Suggestions */}
        <div className="max-h-[60vh] overflow-y-auto p-4">
          {!query.trim() ? (
            <div className="py-6 text-center text-xs text-[#75726B]">
              <p className="font-semibold text-[#1C1B1A] mb-2">Pencarian Populer:</p>
              <div className="flex flex-wrap justify-center gap-2">
                {['Boxy Tee', 'Jersey Milano', 'Custom Komunitas', 'Sage Green', 'Heavyweight'].map((term) => (
                  <button
                    key={term}
                    onClick={() => setQuery(term)}
                    className="px-2.5 py-1 bg-[#F2EFE8] hover:bg-[#EAE5DA] text-[#42403B] rounded-xs transition-colors"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          ) : results.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#75726B]">
              <p className="font-bold text-sm text-[#1C1B1A]">Tidak ditemukan hasil</p>
              <p className="mt-1">Coba kata kunci lain atau buka halaman katalog lengkap.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#75726B] mb-2">
                Ditemukan {results.length} produk
              </p>
              {results.map((product) => (
                <div
                  key={product.id}
                  onClick={() => {
                    onClose();
                    onSelectProduct(product);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onClose();
                      onSelectProduct(product);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`Lihat detail ${product.name}`}
                  className="flex items-center justify-between p-2.5 hover:bg-[#F4F1EA] rounded-xs transition-colors cursor-pointer border border-transparent hover:border-[#E8E5DF] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1C1B1A]"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-12 h-14 object-cover rounded-xs border border-[#E2DFD8] bg-[#F0ECE1]"
                    />
                    <div>
                      <h4 className="text-xs font-bold text-[#1C1B1A]">{product.name}</h4>
                      <p className="text-[11px] text-[#75726B]">{product.category} • {product.formattedPrice}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#75726B]" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
