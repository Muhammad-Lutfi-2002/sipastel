import React, { useState, useEffect } from 'react';
import { X, Search, CheckCircle2, Truck, MessageCircle, Clock } from 'lucide-react';
import { Order, ProductionStatus } from '../types';
import { trackOrder } from '../utils/storage';
import { formatDate } from '../utils/formatters';
import { createWhatsAppUrl } from '../utils/whatsapp';

interface OrderStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultOrderId?: string;
  onWhatsAppInquiry?: (message: string) => void;
}

export const OrderStatusModal: React.FC<OrderStatusModalProps> = ({
  isOpen,
  onClose,
  defaultOrderId,
  onWhatsAppInquiry,
}) => {
  const [orderIdQuery, setOrderIdQuery] = useState(defaultOrderId || '');
  const [phoneQuery, setPhoneQuery] = useState('');
  const [searchedOrder, setSearchedOrder] = useState<Order | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Support ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderIdQuery.trim() || !phoneQuery.trim()) {
      setSearchError('Order ID dan nomor HP wajib diisi untuk keamanan data Anda.');
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    const result = await trackOrder(orderIdQuery.trim(), phoneQuery.trim());
    setSearchedOrder(result);
    setHasSearched(true);
    setIsSearching(false);
  };

  // Full 9 Pipeline Stages mandated by specification
  const pipelineStages = [
    {
      id: 'ORDER_RECEIVED',
      label: 'Order Received',
      labelId: 'Pesanan Diterima',
      desc: 'Your order has been recorded into our workshop queue.',
    },
    {
      id: 'PAYMENT',
      label: 'Payment Confirmed',
      labelId: 'Pembayaran Terverifikasi',
      desc: 'Down payment or invoice payment verified by finance.',
    },
    {
      id: 'DESIGN',
      label: 'Design & Mockup',
      labelId: 'Validasi Grafis & Mockup',
      desc: 'Vector resolution, scale, and color separations checked.',
    },
    {
      id: 'APPROVAL',
      label: 'Design Approval',
      labelId: 'Persetujuan Mockup Klien',
      desc: 'Digital proof approved by client for manufacturing.',
    },
    {
      id: 'PRODUCTION',
      label: 'In Production',
      labelId: 'Lini Cutting & Produksi',
      desc: 'Fabric cutting, screen-printing, embroidery, or sublimation.',
    },
    {
      id: 'QC',
      label: 'Quality Control',
      labelId: 'Pemeriksaan Jahitan & QC',
      desc: 'Checking thread precision, print alignment, and sizing tolerance.',
    },
    {
      id: 'PACKING',
      label: 'Steam & Packing',
      labelId: 'Finishing & Packaging',
      desc: 'Garment steam ironing and boxed with SIPASTEL identity packaging.',
    },
    {
      id: 'SHIPPING',
      label: 'Dispatched / In Transit',
      labelId: 'Pengiriman Kurir',
      desc: 'Handed over to courier service from Bogor.',
    },
    {
      id: 'DELIVERED',
      label: 'Delivered',
      labelId: 'Pesanan Diterima',
      desc: 'Order safely received by the customer.',
    },
  ];

  // Map internal order status to 0..8 stage index
  const getStageIndex = (order: Order): number => {
    if (order.shippingStatus === 'DELIVERED' || order.shippingStatus === 'COMPLETED') return 8;
    if (order.shippingStatus === 'SHIPPED' || order.shippingStatus === 'IN_TRANSIT') return 7;

    switch (order.productionStatus) {
      case 'PACKING':
      case 'READY_TO_SHIP':
        return 6;
      case 'QC':
      case 'REWORK':
        return 5;
      case 'PRINTING':
      case 'SEWING':
      case 'CUTTING':
        return 4;
      case 'DESIGN_APPROVED':
        return 3;
      case 'DESIGN':
      case 'DESIGN_APPROVAL':
      case 'DESIGN_REVISION':
        return 2;
      case 'PRODUCTION_QUEUE':
      case 'WAITING_VALIDATION':
        return order.paymentStatus !== 'BELUM_BAYAR' ? 2 : 1;
      default:
        return 0;
    }
  };

  const currentStageIndex = searchedOrder ? getStageIndex(searchedOrder) : 0;

  return (
    <div
      id="order-status-modal-backdrop"
      className="fixed inset-0 z-50 bg-[#1C1B1A]/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-modal-backdrop"
      onClick={onClose}
    >
      <div
        id="order-status-modal-content"
        className="bg-[#FAF9F5] text-[#1C1B1A] w-full max-w-2xl rounded-[2px] shadow-2xl border border-[#E8E5DF] relative my-auto p-5 sm:p-8 max-h-[90vh] overflow-y-auto animate-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E8E5DF] mb-5">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-[#677663]" />
            <h2 className="font-heading text-xl font-bold tracking-tight">
              Lacak Status Pesanan
            </h2>
          </div>
          <button
            id="close-order-status-btn"
            onClick={onClose}
            className="p-1.5 text-[#66645E] hover:text-[#1C1B1A] cursor-pointer"
            aria-label="Tutup pelacakan pesanan"
            title="Tutup (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input Bar */}
        <form onSubmit={handleSearch} className="mb-4 space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="relative">
              <input
                id="order-tracking-input"
                type="text"
                value={orderIdQuery}
                onChange={(e) => setOrderIdQuery(e.target.value)}
                placeholder="Order ID (contoh: SPS-20260905-182)"
                className="w-full min-h-[44px] pl-9 pr-3 py-2.5 bg-[#FAF9F5] border border-[#DCD8D0] rounded-[2px] text-xs sm:text-sm text-[#1C1B1A] placeholder-[#9E9B93] focus:outline-none focus:border-[#1C1B1A]"
              />
              <Search className="w-4 h-4 text-[#757269] absolute left-3 top-3.5" />
            </div>
            <input
              id="order-tracking-phone-input"
              type="tel"
              value={phoneQuery}
              onChange={(e) => setPhoneQuery(e.target.value)}
              placeholder="Nomor HP saat pesan (untuk verifikasi)"
              className="w-full min-h-[44px] px-3 py-2.5 bg-[#FAF9F5] border border-[#DCD8D0] rounded-[2px] text-xs sm:text-sm text-[#1C1B1A] placeholder-[#9E9B93] focus:outline-none focus:border-[#1C1B1A]"
            />
          </div>
          {searchError && <p className="text-[11px] text-[#B84A48]">{searchError}</p>}
          <button
            id="track-order-submit-btn"
            type="submit"
            disabled={isSearching}
            className="w-full min-h-[44px] px-5 bg-[#1C1B1A] hover:bg-[#2C2B29] text-[#FAF9F5] text-xs font-bold uppercase tracking-wider rounded-[2px] transition-all hover:-translate-y-[1px] active:scale-[0.98] shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSearching ? 'Mencari...' : 'Lacak Pesanan'}
          </button>
        </form>

        {/* Empty Search Result */}
        {hasSearched && !searchedOrder && (
          <div className="p-8 text-center bg-[#F4F1EA] rounded-[2px] border border-[#E5E1D7] text-xs text-[#66645E] space-y-2 animate-fade-in">
            <p className="font-heading text-base font-bold text-[#1C1B1A]">Pesanan Tidak Ditemukan</p>
            <p>Pastikan nomor Order ID Anda sudah sesuai (contoh: SPS-20260905-182).</p>
            <p>Baru saja memesan? Sistem memerlukan 5–10 menit untuk sinkronisasi antrean workshop.</p>
          </div>
        )}

        {searchedOrder && (
          <div className="space-y-6 animate-fade-in">
            {/* Order Overview Header */}
            <div className="p-4 bg-[#F5F2EA] rounded-[2px] border border-[#E8E5DF] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#75726B] block">
                  ORDER ID
                </span>
                <span className="font-mono text-base font-bold text-[#1C1B1A]">
                  {searchedOrder.orderId}
                </span>
                <p className="text-xs text-[#66645E] mt-0.5">
                  Pemesan: <strong>{searchedOrder.customer}</strong> • {formatDate(searchedOrder.createdAt)}
                </p>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#75726B] block">
                  STATUS PRODUKSI
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-[#5B7C59]">
                  {pipelineStages[currentStageIndex]?.labelId}
                </span>
                <p className="text-xs text-[#75726B] mt-0.5">
                  {searchedOrder.quantity} pcs total
                </p>
              </div>
            </div>

            {/* Complete 9 Stage Progression Pipeline */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#1C1B1A]">
                  Status Progression Pipeline
                </h3>
                <span className="text-[11px] text-[#75726B] font-mono">
                  Step {currentStageIndex + 1} of {pipelineStages.length}
                </span>
              </div>

              <div className="space-y-2 border-l-2 border-[#E5E1D7] ml-2.5 pl-4 sm:pl-5 py-1">
                {pipelineStages.map((stage, idx) => {
                  const isDone = idx < currentStageIndex;
                  const isCurrent = idx === currentStageIndex;

                  return (
                    <div
                      key={stage.id}
                      className={`relative p-3 rounded-[2px] border transition-all ${
                        isCurrent
                          ? 'bg-[#FAF9F5] border-[#1C1B1A] ring-1 ring-[#1C1B1A] shadow-xs'
                          : isDone
                          ? 'bg-[#F6F4ED] border-[#E2DFD8] text-[#55524B]'
                          : 'bg-[#FAF9F5] border-[#EAE7E1] opacity-60 text-[#88857E]'
                      }`}
                    >
                      {/* Circle Dot Marker on the vertical pipeline line */}
                      <div className="absolute -left-[23px] sm:-left-[27px] top-3.5 bg-[#FAF9F5] p-0.5 rounded-full">
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4 text-[#5B7C59]" />
                        ) : isCurrent ? (
                          <div className="w-4 h-4 rounded-full border-2 border-[#1C1B1A] flex items-center justify-center bg-[#FAF9F5]">
                            <div className="w-2 h-2 rounded-full bg-[#5B7C59] animate-pulse" />
                          </div>
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-[#CCC8BF] bg-[#FAF9F5]" />
                        )}
                      </div>

                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold ${isCurrent ? 'text-[#1C1B1A]' : ''}`}>
                              {isDone ? '✓ ' : isCurrent ? '● ' : '○ '}
                              {stage.label}
                            </span>
                            {isCurrent && (
                              <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest bg-[#1C1B1A] text-[#FAF9F5] rounded-[1px]">
                                Active
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#75726B] mt-0.5">
                            {stage.desc}
                          </p>
                        </div>

                        {isDone && (
                          <span className="text-[10px] text-[#5B7C59] font-medium shrink-0">
                            Selesai
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Direct WhatsApp Support */}
            <div className="pt-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs text-[#75726B] border-t border-[#E8E5DF]">
              <span>Ingin revisi detail atau informasi jadwal kurir?</span>
              <button
                onClick={() => {
                  const msg = `Hi SIPASTEL, saya ingin konfirmasi progres pesanan ID: ${searchedOrder.orderId}`;
                  if (onWhatsAppInquiry) onWhatsAppInquiry(msg);
                  window.open(createWhatsAppUrl(msg), '_blank');
                }}
                className="font-bold text-[#1C1B1A] hover:underline flex items-center gap-1.5 cursor-pointer"
              >
                <MessageCircle className="w-3.5 h-3.5 text-[#677663]" />
                <span>Chat Customer Support →</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
