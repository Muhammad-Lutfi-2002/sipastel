import React, { useState, useEffect } from 'react';
import { X, Ruler, ShoppingBag, MessageCircle, Check, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Product } from '../types';
import { createWhatsAppUrl } from '../utils/whatsapp';
import { LazyImage } from './LazyImage';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (product: Product, size: string, color: string, quantity: number) => void;
  onCustomOrderClick?: () => void;
  onOpenSizeGuide?: (category: 'KAOS' | 'JERSEY') => void;
  onWhatsAppInquiry?: (message: string) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onAddToCart,
  onOpenSizeGuide,
  onWhatsAppInquiry,
}) => {
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string>(product?.sizes[0] || 'M');
  const [selectedColor, setSelectedColor] = useState<string>(product?.colors[0]?.name || '');
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const [isOpeningWA, setIsOpeningWA] = useState(false);

  // Sync state when product changes
  useEffect(() => {
    if (product) {
      setSelectedImageIdx(0);
      setSelectedSize(product.sizes[0] || 'M');
      setSelectedColor(product.colors[0]?.name || '');
      setQuantity(1);
      setIsAdding(false);
      setIsAdded(false);
      setIsOpeningWA(false);
    }
  }, [product]);

  // Support ESC key & lock body scroll
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  if (!product) return null;

  const handleAddToCartClick = () => {
    if (isAdding) return;
    setIsAdding(true);

    setTimeout(() => {
      onAddToCart(product, selectedSize, selectedColor, quantity);
      setIsAdding(false);
      setIsAdded(true);
      setTimeout(() => setIsAdded(false), 2000);
    }, 300);
  };

  const handleDirectWhatsApp = () => {
    if (isOpeningWA) return;
    setIsOpeningWA(true);

    const waMsg = `Hi SIPASTEL! Saya ingin memesan langsung:
• ${product.name}
• Warna: ${selectedColor}
• Ukuran: ${selectedSize}
• Kuantitas: ${quantity} pcs
• Total: ${product.formattedPrice}

Mohon informasi ketersediaan stok dan rekening pembayaran. Terima kasih!`;

    if (onWhatsAppInquiry) {
      onWhatsAppInquiry(waMsg);
    }

    setTimeout(() => {
      window.open(createWhatsAppUrl(waMsg), '_blank');
      setIsOpeningWA(false);
    }, 450);
  };

  const nextImage = () => {
    setSelectedImageIdx((prev) => (prev + 1) % product.images.length);
  };

  const prevImage = () => {
    setSelectedImageIdx((prev) => (prev - 1 + product.images.length) % product.images.length);
  };

  return (
    <div
      id="product-detail-modal-backdrop"
      className="fixed inset-0 z-50 bg-[#1C1B1A]/75 backdrop-blur-xs flex items-center justify-center p-0 sm:p-4 overflow-y-auto animate-modal-backdrop"
      onClick={onClose}
    >
      <div
        id="product-detail-modal-content"
        className="bg-[#FAF9F5] text-[#1C1B1A] w-full max-w-4xl rounded-[2px] shadow-2xl border-0 sm:border border-[#E8E5DF] relative my-auto max-h-[100vh] sm:max-h-[92vh] overflow-y-auto flex flex-col animate-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header with Close Button */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-5 py-4 bg-[#FAF9F5]/95 backdrop-blur-md border-b border-[#E8E5DF]">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#75726B]">
            {product.category} • SIPASTEL STUDIO BOGOR
          </span>
          <button
            id="close-product-modal-btn"
            onClick={onClose}
            className="p-2 text-[#55524B] hover:text-[#1C1B1A] rounded-[2px] transition-colors cursor-pointer"
            aria-label="Tutup detail produk (Esc)"
            title="Tutup (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Main Content: 2-Column Desktop Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 p-5 sm:p-8 flex-1">
          {/* Gallery Column */}
          <div className="md:col-span-6 space-y-3">
            {/* Main Active Image Frame */}
            <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#EFECE4] rounded-[2px] border border-[#E8E5DF] group">
              <LazyImage
                src={product.images[selectedImageIdx] || product.images[0]}
                alt={`${product.name} visual preview`}
                aspectRatio="aspect-[3/4]"
              />

              {product.isBestSeller && (
                <span className="absolute top-3 left-3 px-2.5 py-1 text-[10px] uppercase font-bold tracking-widest bg-[#1C1B1A] text-[#FAF9F5] z-10">
                  Best Seller
                </span>
              )}

              {/* Next / Prev Chevrons */}
              {product.images.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#FAF9F5]/80 hover:bg-[#FAF9F5] text-[#1C1B1A] flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer"
                    aria-label="Gambar sebelumnya"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#FAF9F5]/80 hover:bg-[#FAF9F5] text-[#1C1B1A] flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer"
                    aria-label="Gambar berikutnya"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnail Strip */}
            {(product.images || []).length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {(product.images || []).map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImageIdx(idx)}
                    className={`relative w-16 h-20 shrink-0 overflow-hidden rounded-[2px] border transition-all cursor-pointer ${
                      selectedImageIdx === idx
                        ? 'border-[#1C1B1A] ring-1 ring-[#1C1B1A]'
                        : 'border-[#DCD8D0] opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={img}
                      alt={`Thumbnail ${idx + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info & Action Column */}
          <div className="md:col-span-6 flex flex-col justify-between">
            <div className="space-y-5">
              {/* Title & Price */}
              <div>
                <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1C1B1A] leading-tight">
                  {product.name}
                </h1>
                <p className="font-heading text-xl sm:text-2xl font-bold text-[#1C1B1A] mt-2">
                  {product.formattedPrice}
                </p>
                <p className="text-xs sm:text-sm text-[#57544D] mt-3 leading-relaxed">
                  {product.shortDescription}
                </p>
              </div>

              {/* Color Selection */}
              {(product.colors || []).length > 0 && (
                <div className="space-y-2 border-t border-[#E8E5DF] pt-4">
                  <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-[#42403B]">
                    <span>Color: <strong className="text-[#1C1B1A] font-bold">{selectedColor}</strong></span>
                  </div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {(product.colors || []).map((c) => (
                      <button
                        key={c.name}
                        onClick={() => setSelectedColor(c.name)}
                        className={`group flex items-center gap-2 px-3 py-1.5 rounded-[2px] border text-xs font-medium transition-all cursor-pointer ${
                          selectedColor === c.name
                            ? 'border-[#1C1B1A] bg-[#FAF9F5] shadow-xs ring-1 ring-[#1C1B1A]'
                            : 'border-[#DCD8D0] bg-[#FAF9F5] hover:border-[#999]'
                        }`}
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0"
                          style={{ backgroundColor: c.hex }}
                        />
                        <span className="text-xs">{c.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Size Selection */}
              <div className="space-y-2 border-t border-[#E8E5DF] pt-4">
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-[#42403B]">
                  <span>Size: <strong className="text-[#1C1B1A] font-bold">{selectedSize}</strong></span>
                  {onOpenSizeGuide && (
                    <button
                      onClick={() => onOpenSizeGuide(product.category === 'JERSEY' ? 'JERSEY' : 'KAOS')}
                      className="flex items-center gap-1 text-[11px] font-semibold text-[#66645E] hover:text-[#1C1B1A] underline underline-offset-2 cursor-pointer"
                    >
                      <Ruler className="w-3.5 h-3.5" />
                      <span>Size Guide</span>
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {(product.sizes || []).map((s) => (
                    <button
                      key={s}
                      onClick={() => setSelectedSize(s)}
                      className={`min-w-[48px] min-h-[42px] px-3.5 py-2 text-xs font-bold uppercase tracking-wider rounded-[2px] border transition-all duration-150 hover:-translate-y-[1px] active:scale-[0.98] cursor-pointer ${
                        selectedSize === s
                          ? 'bg-[#1C1B1A] text-[#FAF9F5] border-[#1C1B1A]'
                          : 'bg-[#FAF9F5] text-[#1C1B1A] border-[#DCD8D0] hover:border-[#1C1B1A]'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity Stepper */}
              <div className="space-y-2 border-t border-[#E8E5DF] pt-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#42403B] block">
                  Quantity
                </span>
                <div className="flex items-center gap-3">
                  <div className="flex items-center border border-[#DCD8D0] rounded-[2px] bg-[#FAF9F5]">
                    <button
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      disabled={quantity <= 1}
                      className="w-10 min-h-[42px] flex items-center justify-center text-sm font-bold text-[#1C1B1A] hover:bg-[#F0ECE1] transition-colors disabled:opacity-40 cursor-pointer"
                      aria-label="Kurangi jumlah"
                    >
                      –
                    </button>
                    <span className="w-12 text-center text-sm font-bold font-mono text-[#1C1B1A]">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity((q) => q + 1)}
                      className="w-10 min-h-[42px] flex items-center justify-center text-sm font-bold text-[#1C1B1A] hover:bg-[#F0ECE1] transition-colors cursor-pointer"
                      aria-label="Tambah jumlah"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-xs text-[#75726B]">
                    Ready stock • Siap kirim 1–2 hari kerja
                  </span>
                </div>
              </div>

              {/* Primary Actions with Interactive States */}
              <div className="space-y-2.5 pt-2">
                <button
                  id="modal-add-to-cart-btn"
                  onClick={handleAddToCartClick}
                  disabled={isAdding}
                  className={`w-full min-h-[48px] px-6 py-3.5 text-xs font-bold uppercase tracking-widest rounded-[2px] flex items-center justify-center gap-2.5 transition-all duration-150 active:scale-[0.98] cursor-pointer ${
                    isAdded
                      ? 'bg-[#5B7C59] text-[#FAF9F5]'
                      : 'bg-[#1C1B1A] hover:bg-[#2C2B29] text-[#FAF9F5] hover:-translate-y-[1px]'
                  }`}
                >
                  {isAdding ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Adding to Bag...</span>
                    </>
                  ) : isAdded ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>✓ Ditambahkan ke Keranjang</span>
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-4 h-4" />
                      <span>Add to Bag</span>
                    </>
                  )}
                </button>

                <button
                  id="modal-whatsapp-order-btn"
                  onClick={handleDirectWhatsApp}
                  disabled={isOpeningWA}
                  className="w-full min-h-[46px] px-6 py-3 bg-transparent hover:bg-[#FAF9F5] text-[#1C1B1A] border border-[#1C1B1A] text-xs font-bold uppercase tracking-widest rounded-[2px] flex items-center justify-center gap-2 transition-all duration-150 hover:-translate-y-[1px] active:scale-[0.98] cursor-pointer"
                >
                  {isOpeningWA ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#677663]" />
                      <span>Opening WhatsApp...</span>
                    </>
                  ) : (
                    <>
                      <MessageCircle className="w-4 h-4 text-[#677663]" />
                      <span>Order Directly via WhatsApp</span>
                    </>
                  )}
                </button>
              </div>

              {/* Fabric Specs Summary */}
              <div className="pt-3 border-t border-[#E8E5DF] text-xs text-[#75726B] space-y-1">
                <p><strong>Material:</strong> {product.material}</p>
                <p><strong>Siluet:</strong> {product.fit}</p>
                <p><strong>Produksi:</strong> {product.productionTime}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
