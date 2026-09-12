import React, { useEffect } from 'react';
import { X, Minus, Plus, Trash2, ArrowRight, ShoppingBag } from 'lucide-react';
import { CartItem } from '../types';
import { formatIDR } from '../utils/formatters';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemoveItem: (id: string) => void;
  onCheckout: () => void;
  onExploreCollection: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
  onExploreCollection,
}) => {
  // ESC key listener & body scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div
      id="cart-drawer-backdrop"
      className="fixed inset-0 z-50 bg-[#1C1B1A]/70 backdrop-blur-xs flex justify-end animate-modal-backdrop"
      onClick={onClose}
    >
      <div
        id="cart-drawer-content"
        className="w-full max-w-md bg-[#FAF9F5] text-[#1C1B1A] h-full shadow-2xl flex flex-col justify-between border-l border-[#E8E5DF] animate-slide-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-[#E8E5DF] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#1C1B1A]" />
            <h2 className="font-heading text-lg font-bold tracking-tight">Shopping Bag</h2>
            <span className="text-xs text-[#75726B] font-semibold">({cart.length})</span>
          </div>
          <button
            id="close-cart-btn"
            onClick={onClose}
            className="p-1.5 text-[#55524B] hover:text-[#1C1B1A] transition-colors cursor-pointer"
            aria-label="Tutup keranjang (Esc)"
            title="Tutup (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Items or Empty State */}
        <div className="flex-1 overflow-y-auto p-5">
          {cart.length === 0 ? (
            <div id="empty-cart-state" className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3 animate-fade-in">
              <div className="w-14 h-14 rounded-full bg-[#EFECE4] flex items-center justify-center text-[#75726B]">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <p className="font-heading text-lg font-bold text-[#1C1B1A]">
                Your bag is empty.
              </p>
              <p className="text-xs text-[#66645E] max-w-xs leading-relaxed">
                Belum ada produk yang Anda tambahkan. Jelajahi katalog katun combed dan aero jersey kami.
              </p>
              <button
                id="empty-cart-explore-btn"
                onClick={() => {
                  onClose();
                  onExploreCollection();
                }}
                className="mt-2 min-h-[44px] px-6 bg-[#1C1B1A] hover:bg-[#2C2B29] text-[#FAF9F5] text-xs font-bold uppercase tracking-wider rounded-[2px] transition-all duration-150 hover:-translate-y-[1px] active:scale-[0.98] cursor-pointer"
              >
                Explore Collection
              </button>
            </div>
          ) : (
            <div className="space-y-4 divide-y divide-[#EAE7E1]">
              {cart.map((item) => (
                <div key={item.id} className="pt-4 first:pt-0 flex gap-3.5 items-start animate-fade-in">
                  <img
                    src={item.image}
                    alt={item.productName}
                    className="w-20 h-24 object-cover rounded-[2px] border border-[#E2DFD8] bg-[#F0ECE1] shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="text-xs font-bold text-[#1C1B1A] line-clamp-1">
                        {item.productName}
                      </h4>
                      <button
                        onClick={() => onRemoveItem(item.id)}
                        className="text-[#757269] hover:text-[#B25D52] transition-colors p-1 cursor-pointer"
                        aria-label={`Hapus ${item.productName}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="text-[11px] text-[#66645E] mt-0.5">
                      {item.color} / Size {item.size}
                    </p>

                    <div className="flex items-center justify-between mt-3.5">
                      <div className="flex items-center border border-[#DCD8D0] bg-[#FAF9F5] rounded-[2px]">
                        <button
                          onClick={() => onUpdateQuantity(item.id, -1)}
                          disabled={item.quantity <= 1}
                          className="w-8 h-8 flex items-center justify-center text-xs font-bold text-[#1C1B1A] hover:bg-[#F0ECE1] transition-colors disabled:opacity-40 cursor-pointer"
                          aria-label="Kurangi"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center text-xs font-mono font-bold text-[#1C1B1A]">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => onUpdateQuantity(item.id, 1)}
                          className="w-8 h-8 flex items-center justify-center text-xs font-bold text-[#1C1B1A] hover:bg-[#F0ECE1] transition-colors cursor-pointer"
                          aria-label="Tambah"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <span className="text-xs font-bold text-[#1C1B1A]">
                        {formatIDR(item.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Subtotal & Actions */}
        {cart.length > 0 && (
          <div className="p-5 border-t border-[#E8E5DF] bg-[#F6F4ED] space-y-3">
            <div className="flex items-center justify-between text-xs text-[#66645E]">
              <span>Subtotal</span>
              <span className="text-base font-bold text-[#1C1B1A]">
                {formatIDR(subtotal)}
              </span>
            </div>
            <p className="text-[11px] text-[#75726B] leading-relaxed">
              Ongkos kirim dihitung pada konfirmasi pesanan (JNE / SiCepat / J&T dari Bogor).
            </p>

            <div className="flex flex-col gap-2 pt-1">
              <button
                id="cart-checkout-btn"
                onClick={() => {
                  onClose();
                  onCheckout();
                }}
                className="w-full min-h-[48px] px-4 bg-[#1C1B1A] hover:bg-[#2C2B29] text-[#FAF9F5] text-xs font-bold uppercase tracking-widest rounded-[2px] flex items-center justify-center gap-2 transition-all duration-150 hover:-translate-y-[1px] active:scale-[0.98] cursor-pointer"
              >
                <span>Checkout Pesanan</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                id="cart-continue-shopping-btn"
                onClick={onClose}
                className="w-full py-2.5 px-4 text-[#55524B] hover:text-[#1C1B1A] text-xs font-semibold uppercase tracking-wider transition-colors text-center cursor-pointer"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
