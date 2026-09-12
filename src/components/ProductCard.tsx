import React, { useState } from 'react';
import { Eye, ShoppingBag, Check, Loader2 } from 'lucide-react';
import { Product } from '../types';
import { LazyImage } from './LazyImage';

interface ProductCardProps {
  product: Product;
  onQuickView: (product: Product) => void;
  onAddToCartDirect: (product: Product, onFinished?: () => void) => void;
  onSelectProduct: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onQuickView,
  onAddToCartDirect,
  onSelectProduct,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [activeColorIdx, setActiveColorIdx] = useState(0);
  const [isAdding, setIsAdding] = useState(false);
  const [isAdded, setIsAdded] = useState(false);

  const productImages = product.images || [];
  const displayImage =
    isHovered && productImages.length > 1
      ? productImages[1]
      : productImages[0] || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80';

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAdding) return;

    setIsAdding(true);
    // Simulate interactive micro-feedback
    setTimeout(() => {
      onAddToCartDirect(product, () => {
        setIsAdding(false);
        setIsAdded(true);
        setTimeout(() => setIsAdded(false), 1400);
      });
    }, 280);
  };

  return (
    <article
      id={`product-card-${product.id}`}
      className="group flex flex-col justify-between bg-transparent text-[#1C1B1A]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Product Image Frame with Max 1.02 Scale on Hover */}
      <div
        onClick={() => onSelectProduct(product)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelectProduct(product);
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={`Lihat detail ${product.name}`}
        className="relative aspect-[3/4] w-full overflow-hidden bg-[#EFECE4] rounded-[2px] cursor-pointer border border-[#E8E5DF] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1C1B1A] focus-visible:ring-offset-2"
      >
        <div className="w-full h-full transition-transform duration-500 ease-out group-hover:scale-[1.02]">
          <LazyImage
            src={displayImage}
            alt={product.name}
            aspectRatio="aspect-[3/4]"
          />
        </div>

        {/* Minimal Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 z-10 pointer-events-none">
          {product.isBestSeller && (
            <span className="px-2 py-0.5 text-[9px] sm:text-[10px] uppercase font-bold tracking-widest bg-[#1C1B1A] text-[#FAF9F5] rounded-[1px] shadow-xs">
              Signature
            </span>
          )}
          {product.isNew && (
            <span className="px-2 py-0.5 text-[9px] sm:text-[10px] uppercase font-bold tracking-widest bg-[#8F9E8B] text-[#FAF9F5] rounded-[1px] shadow-xs">
              New Drop
            </span>
          )}
        </div>

        {/* Quick View & Quick Add Bar on Desktop Hover */}
        <div className="absolute inset-x-2 bottom-2 hidden sm:flex items-center gap-1.5 opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 z-10">
          <button
            id={`quick-view-btn-${product.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onQuickView(product);
            }}
            className="flex-1 min-h-[38px] py-2 px-3 bg-[#FAF9F5]/95 hover:bg-[#FFFFFF] text-[#1C1B1A] text-xs font-semibold tracking-wider uppercase backdrop-blur-xs border border-[#DCD8D0] flex items-center justify-center gap-1.5 transition-all duration-150 hover:-translate-y-[1px] active:scale-[0.98] cursor-pointer"
            aria-label={`Lihat detail cepat ${product.name}`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Quick View</span>
          </button>

          <button
            id={`add-cart-btn-${product.id}`}
            onClick={handleQuickAdd}
            disabled={isAdding}
            className={`min-h-[38px] px-3 text-[#FAF9F5] flex items-center justify-center gap-1 transition-all duration-150 active:scale-[0.98] cursor-pointer ${
              isAdded
                ? 'bg-[#5B7C59]'
                : 'bg-[#1C1B1A] hover:bg-[#2C2B29] hover:-translate-y-[1px]'
            }`}
            title="Tambah ke Keranjang"
            aria-label={`Tambah ${product.name} ke keranjang`}
          >
            {isAdding ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : isAdded ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <ShoppingBag className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Product Information (Always stable) */}
      <div className="pt-3 pb-1 flex flex-col gap-1">
        {/* Category & Color dots */}
        <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-[#75726B]">
          <span>{product.category}</span>
          {(product.colors || []).length > 0 && (
            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
              {(product.colors || []).map((c, idx) => (
                <button
                  key={c.name}
                  onClick={() => setActiveColorIdx(idx)}
                  className={`w-3 h-3 rounded-full border transition-all cursor-pointer ${
                    activeColorIdx === idx
                      ? 'border-[#1C1B1A] ring-1 ring-[#1C1B1A] scale-110'
                      : 'border-[#CCC8BF]'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                  aria-label={`Pilih warna ${c.name}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Product Title */}
        <h3
          onClick={() => onSelectProduct(product)}
          className="text-xs sm:text-sm font-semibold tracking-tight text-[#1C1B1A] hover:underline cursor-pointer line-clamp-1"
        >
          {product.name}
        </h3>

        {/* Price and Mobile Tap Action */}
        <div className="flex items-center justify-between pt-0.5">
          <p className="text-xs sm:text-sm font-semibold text-[#1C1B1A]">
            {product.formattedPrice}
          </p>

          <button
            onClick={() => onSelectProduct(product)}
            className="sm:hidden text-[11px] font-semibold text-[#66645E] hover:text-[#1C1B1A] underline underline-offset-2 py-1 min-h-[44px] flex items-center cursor-pointer"
          >
            Lihat Detail
          </button>
        </div>
      </div>
    </article>
  );
};
