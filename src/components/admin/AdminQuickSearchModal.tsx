import React, { useState, useEffect, useRef } from 'react';
import { Search, X, ShoppingBag, User, Package, ArrowRight, Clock } from 'lucide-react';
import { Order, Product } from '../../types';
import { getStoredOrders, getStoredProducts } from '../../utils/storage';
import { formatIDR, formatProductionStatusLabel } from '../../utils/formatters';
import { useRouter } from '../../context/RouterContext';

interface AdminQuickSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminQuickSearchModal: React.FC<AdminQuickSearchModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const { navigate } = useRouter();

  useEffect(() => {
    if (isOpen) {
      getStoredOrders().then(setOrders);
      getStoredProducts().then(setProducts);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  // Keyboard shortcut ESC to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const trimmed = query.trim().toLowerCase();

  const matchedOrders = trimmed
    ? orders.filter(
        (o) =>
          o.orderId.toLowerCase().includes(trimmed) ||
          o.customer.toLowerCase().includes(trimmed) ||
          o.phone.includes(trimmed) ||
          (o.email && o.email.toLowerCase().includes(trimmed)) ||
          (o.productType && o.productType.toLowerCase().includes(trimmed)) ||
          o.items.some((it) => it.productName.toLowerCase().includes(trimmed))
      ).slice(0, 5)
    : [];

  const matchedProducts = trimmed
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(trimmed) ||
          p.category.toLowerCase().includes(trimmed) ||
          p.slug.toLowerCase().includes(trimmed)
      ).slice(0, 4)
    : [];

  const handleSelectOrder = (orderId: string) => {
    onClose();
    navigate(`/admin/orders/${orderId}`);
  };

  const handleSelectProduct = (slug: string) => {
    onClose();
    navigate(`/admin/products`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#1C1B1A]/40 backdrop-blur-xs flex items-start justify-center pt-16 sm:pt-24 px-4">
      <div
        className="w-full max-w-2xl bg-[#FAF9F5] border border-[#E2DDD3] rounded-2xl shadow-2xl overflow-hidden animate-modal-content flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="p-3.5 sm:p-4 border-b border-[#E8E5DF] bg-white flex items-center gap-3">
          <Search className="w-5 h-5 text-[#8C8880] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari pesanan berdasarkan ID, nama customer, HP, atau produk..."
            className="flex-1 bg-transparent text-sm sm:text-base text-[#1C1B1A] placeholder-[#9E9A91] focus:outline-hidden"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Hapus pencarian"
              className="p-1 text-[#8C8880] hover:text-[#1C1B1A] rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[11px] font-mono text-[#8C8880] bg-[#F2EFE9] border border-[#DDD8CD] rounded">
              ESC
            </kbd>
          )}
        </div>

        {/* Results / Suggestions Viewport */}
        <div className="p-4 overflow-y-auto space-y-5 text-xs">
          {!trimmed ? (
            <div className="space-y-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8C8880] mb-2 font-mono">
                  Navigasi Cepat
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      navigate('/admin/orders');
                    }}
                    className="p-2.5 bg-white border border-[#E8E5DF] hover:border-[#D87A61] rounded-lg text-left transition-colors flex items-center justify-between"
                  >
                    <span className="font-medium text-[#1C1B1A]">Semua Pesanan</span>
                    <ArrowRight className="w-3 h-3 text-[#8C8880]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      navigate('/admin/production');
                    }}
                    className="p-2.5 bg-white border border-[#E8E5DF] hover:border-[#D87A61] rounded-lg text-left transition-colors flex items-center justify-between"
                  >
                    <span className="font-medium text-[#1C1B1A]">Papan Produksi</span>
                    <ArrowRight className="w-3 h-3 text-[#8C8880]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      navigate('/admin/products');
                    }}
                    className="p-2.5 bg-white border border-[#E8E5DF] hover:border-[#D87A61] rounded-lg text-left transition-colors flex items-center justify-between"
                  >
                    <span className="font-medium text-[#1C1B1A]">Katalog & Stok</span>
                    <ArrowRight className="w-3 h-3 text-[#8C8880]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      navigate('/admin/invoices');
                    }}
                    className="p-2.5 bg-white border border-[#E8E5DF] hover:border-[#D87A61] rounded-lg text-left transition-colors flex items-center justify-between"
                  >
                    <span className="font-medium text-[#1C1B1A]">Invoice</span>
                    <ArrowRight className="w-3 h-3 text-[#8C8880]" />
                  </button>
                </div>
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8C8880] mb-2 font-mono">
                  Pesanan Terbaru
                </p>
                <div className="divide-y divide-[#EFECE5] bg-white border border-[#E8E5DF] rounded-lg overflow-hidden">
                  {orders.slice(0, 4).map((o) => (
                    <div
                      key={o.orderId}
                      onClick={() => handleSelectOrder(o.orderId)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleSelectOrder(o.orderId);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      aria-label={`Buka pesanan ${o.orderId}`}
                      className="p-3 hover:bg-[#FAF6F2] transition-colors flex items-center justify-between cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1C1B1A]"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-md bg-[#FAF0EC] text-[#C14E30] flex items-center justify-center font-mono font-bold text-[11px]">
                          #
                        </span>
                        <div>
                          <p className="font-semibold text-[#1C1B1A]">{o.customer}</p>
                          <p className="text-[11px] text-[#75726B] font-mono">
                            {o.orderId} • {o.items[0]?.productName || o.productType || 'Pesanan Custom'}
                          </p>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono text-[#8C8880]">{formatProductionStatusLabel(o.productionStatus)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Matched Orders */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8C8880] mb-2 font-mono">
                  Pesanan ({matchedOrders.length})
                </p>
                {matchedOrders.length === 0 ? (
                  <p className="text-xs text-[#8C8880] py-2">Tidak ada pesanan yang cocok.</p>
                ) : (
                  <div className="divide-y divide-[#EFECE5] bg-white border border-[#E8E5DF] rounded-lg overflow-hidden">
                    {matchedOrders.map((o) => (
                      <div
                        key={o.orderId}
                        onClick={() => handleSelectOrder(o.orderId)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleSelectOrder(o.orderId);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        aria-label={`Buka pesanan ${o.orderId}`}
                        className="p-3 hover:bg-[#FAF6F2] transition-colors flex items-center justify-between cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1C1B1A]"
                      >
                        <div className="flex items-center gap-3">
                          <ShoppingBag className="w-4 h-4 text-[#C14E30]" />
                          <div>
                            <p className="font-semibold text-[#1C1B1A]">
                              {o.customer}{' '}
                              <span className="font-mono text-[11px] text-[#8C8880] ml-1">({o.orderId})</span>
                            </p>
                            <p className="text-[11px] text-[#75726B]">
                              {o.phone} • {o.items[0]?.productName || o.productType}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-[#1C1B1A] block">
                            {o.totalPrice ? formatIDR(o.totalPrice) : '-'}
                          </span>
                          <span className="text-[10px] text-[#5B7C59] font-medium uppercase font-mono">
                            {formatProductionStatusLabel(o.productionStatus)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Matched Products */}
              {matchedProducts.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8C8880] mb-2 font-mono">
                    Produk ({matchedProducts.length})
                  </p>
                  <div className="divide-y divide-[#EFECE5] bg-white border border-[#E8E5DF] rounded-lg overflow-hidden">
                    {matchedProducts.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => handleSelectProduct(p.slug)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleSelectProduct(p.slug);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        aria-label={`Buka produk ${p.name}`}
                        className="p-3 hover:bg-[#FAF6F2] transition-colors flex items-center justify-between cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1C1B1A]"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={p.images[0]}
                            alt={p.name}
                            className="w-8 h-8 rounded object-cover border border-[#E8E5DF]"
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <p className="font-semibold text-[#1C1B1A]">{p.name}</p>
                            <span className="text-[11px] text-[#75726B] font-mono">{p.category}</span>
                          </div>
                        </div>
                        <span className="font-mono font-bold text-[#1C1B1A]">{formatIDR(p.price)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2.5 bg-[#F4F1EA] border-t border-[#E8E5DF] flex items-center justify-between text-[11px] text-[#8C8880]">
          <span>Tips: Anda bisa langsung mencari dengan nomor WhatsApp atau ID pesanan</span>
          <button
            type="button"
            onClick={onClose}
            className="hover:text-[#1C1B1A] font-medium cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
