import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  MessageCircle,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Truck,
  Download,
  ExternalLink,
  Save,
  Send,
  User,
  Package,
  CreditCard,
  ShieldCheck,
  ChevronRight,
  Copy,
  Check,
  Palette,
  Eye,
  Scissors,
  Layers,
  X,
} from 'lucide-react';
import { Order, ProductionStatus, ShippingStatus, PaymentStatus, ProductionLog } from '../../../types';
import { getStoredOrders, updateOrderDetails, updateOrderPrice } from '../../../utils/storage';
import { AdminTableSkeleton } from '../../Skeleton';
import { useAdminToast } from '../AdminToast';
import { formatDate, formatIDR, formatProductionStatusLabel } from '../../../utils/formatters';
import { createWhatsAppUrl } from '../../../utils/whatsapp';
import { useRouter } from '../../../context/RouterContext';
import { useAuth } from '../../../context/AuthContext';
import { PaymentHistoryPanel } from './PaymentHistoryPanel';

interface OrderDetailViewProps {
  orderId: string;
}

export const OrderDetailView: React.FC<OrderDetailViewProps> = ({ orderId }) => {
  const { navigate } = useRouter();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getStoredOrders().then((data) => {
      setOrders(data);
      setIsLoading(false);
    });
  }, []);

  const order = orders.find((o) => o.orderId === orderId);

  // Status transition form state
  const [selectedProductionStatus, setSelectedProductionStatus] = useState<ProductionStatus>(
    order?.productionStatus || 'WAITING_VALIDATION'
  );
  const [selectedShippingStatus, setSelectedShippingStatus] = useState<ShippingStatus>(
    order?.shippingStatus || 'NOT_SHIPPED'
  );
  const [trackingNoInput, setTrackingNoInput] = useState(order?.trackingNumber || '');
  const [courierInput, setCourierInput] = useState(order?.courier || 'JNE Reguler');
  const [statusNote, setStatusNote] = useState('');
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'info' } | null>(null);
  const { showToast } = useAdminToast();

  useEffect(() => {
    if (!feedback) return;
    showToast(feedback.message, feedback.type);
    setFeedback(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedback]);
  const [copiedId, setCopiedId] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [priceInput, setPriceInput] = useState('');
  const [isSavingPrice, setIsSavingPrice] = useState(false);

  // The order loads asynchronously after mount, so the form fields above
  // are seeded with fallback defaults on first render (before `order`
  // exists). Re-sync them once the real order data arrives.
  useEffect(() => {
    if (!order) return;
    setSelectedProductionStatus(order.productionStatus);
    setSelectedShippingStatus(order.shippingStatus);
    setTrackingNoInput(order.trackingNumber || '');
    setCourierInput(order.courier || 'JNE Reguler');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.orderId]);

  if (isLoading) {
    return (
      <div className="p-8 space-y-4 bg-white border border-[#E8E5DF] rounded-2xl my-6">
        <AdminTableSkeleton rows={5} />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-8 text-center space-y-4 bg-white border border-[#E8E5DF] rounded-2xl my-6">
        <h2 className="text-base font-bold text-[#1C1B1A]">Pesanan Tidak Ditemukan</h2>
        <p className="text-xs text-[#75726B]">
          Pesanan <span className="font-mono">{orderId}</span> tidak ditemukan dalam catatan studio.
        </p>
        <button
          onClick={() => navigate('/admin/orders')}
          className="px-4 py-2 bg-[#1C1B1A] text-white rounded-lg text-xs font-semibold cursor-pointer"
        >
          Kembali ke Daftar Pesanan
        </button>
      </div>
    );
  }

  const showFeedback = (message: string, type: 'success' | 'info' = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 3500);
  };

  const canSetPrice = user && (user.role === 'OWNER' || user.role === 'FINANCE');
  const handleSavePrice = async () => {
    const parsed = Number(priceInput.replace(/[^0-9]/g, ''));
    if (!parsed || parsed <= 0) {
      showFeedback('Masukkan nominal harga yang valid (lebih besar dari 0).', 'info');
      return;
    }
    setIsSavingPrice(true);
    const result = await updateOrderPrice(orderId, parsed);
    setIsSavingPrice(false);
    if (!result.success) {
      showFeedback(`Gagal menyimpan harga: ${result.error || 'kesalahan tidak diketahui'}`, 'info');
      return;
    }
    setIsEditingPrice(false);
    getStoredOrders().then(setOrders);
    showFeedback('Harga pesanan berhasil disimpan.', 'success');
  };

  const handleCopyOrderId = () => {
    navigator.clipboard.writeText(order.orderId);
    setCopiedId(true);
    showFeedback('ID Pesanan disalin ke clipboard.', 'info');
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleSaveStatus = async (e: React.FormEvent) => {
    e.preventDefault();

    const newLog: ProductionLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      previousStatus: order.productionStatus,
      newStatus: selectedProductionStatus,
      note: statusNote.trim() || 'Pembaruan status operasional dari konsol studio.',
      authorName: user?.name || 'Admin Studio',
    };

    // Optimistic local update so the UI feels instant, then persist to
    // Supabase and reconcile with the authoritative server state.
    setOrders((prev) =>
      prev.map((o) =>
        o.orderId === orderId
          ? {
              ...o,
              productionStatus: selectedProductionStatus,
              shippingStatus: selectedShippingStatus,
              trackingNumber: trackingNoInput.trim() || undefined,
              courier: courierInput.trim() || undefined,
              timelineLogs: [newLog, ...(o.timelineLogs || [])],
            }
          : o
      )
    );

    const result = await updateOrderDetails(orderId, {
      productionStatus: selectedProductionStatus,
      shippingStatus: selectedShippingStatus,
      trackingNumber: trackingNoInput.trim(),
      courier: courierInput.trim(),
    });

    if (!result.success) {
      showFeedback(`Gagal menyimpan: ${result.error || 'kesalahan tidak diketahui'}`, 'info');
      return;
    }

    setStatusNote('');
    showFeedback('Status operasional pesanan dan catatan staf berhasil disimpan.', 'success');
  };

  const handleApproveMockup = async () => {
    setSelectedProductionStatus('DESIGN_APPROVED');
    const newLog: ProductionLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      previousStatus: order.productionStatus,
      newStatus: 'DESIGN_APPROVED',
      note: 'Mockup desain pakaian custom disetujui oleh tim studio. Lanjut ke tahap potong bahan.',
      authorName: user?.name || 'Kepala Studio',
    };

    setOrders((prev) =>
      prev.map((o) =>
        o.orderId === orderId
          ? { ...o, productionStatus: 'DESIGN_APPROVED' as ProductionStatus, timelineLogs: [newLog, ...(o.timelineLogs || [])] }
          : o
      )
    );

    const result = await updateOrderDetails(orderId, { productionStatus: 'DESIGN_APPROVED' });
    if (!result.success) {
      showFeedback(`Gagal menyimpan: ${result.error || 'kesalahan tidak diketahui'}`, 'info');
      return;
    }
    showFeedback('Mockup desain disetujui. Pesanan dipindahkan ke tahap potong bahan.', 'success');
  };

  const handleRequestRevision = async () => {
    setSelectedProductionStatus('DESIGN_REVISION');
    const newLog: ProductionLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      previousStatus: order.productionStatus,
      newStatus: 'DESIGN_REVISION',
      note: 'Revisi desain ditandai: customer atau studio meminta penyesuaian ulang desain.',
      authorName: user?.name || 'Tim Desain',
    };

    setOrders((prev) =>
      prev.map((o) =>
        o.orderId === orderId
          ? { ...o, productionStatus: 'DESIGN_REVISION' as ProductionStatus, timelineLogs: [newLog, ...(o.timelineLogs || [])] }
          : o
      )
    );

    const result = await updateOrderDetails(orderId, { productionStatus: 'DESIGN_REVISION' });
    if (!result.success) {
      showFeedback(`Gagal menyimpan: ${result.error || 'kesalahan tidak diketahui'}`, 'info');
      return;
    }
    showFeedback('Pesanan ditandai untuk Revisi Desain.', 'info');
  };

  const whatsAppMessage = `Halo ${order.customer}, kami dari SIPASTEL Studio mengenai pesanan Anda (${order.orderId}). Status saat ini: ${order.productionStatus.replace(/_/g, ' ')}. Apakah ada yang bisa kami bantu?`;
  const whatsAppUrl = createWhatsAppUrl(whatsAppMessage, order.phone);

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
      {/* Back and Breadcrumb */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/admin/orders')}
          className="inline-flex items-center gap-1.5 text-xs text-[#5E5B54] hover:text-[#1C1B1A] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali ke Semua Pesanan</span>
        </button>

        <span className="text-[11px] font-mono text-[#8C8880]">
          Dibuat: {formatDate(order.createdAt)}
        </span>
      </div>

      {/* Header Banner - Clean, Creative Apparel Workspace */}
      <div className="p-4 sm:p-6 bg-white border border-[#E8E5DF] rounded-2xl shadow-[0_4px_20px_rgba(28,27,26,0.06)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-lg sm:text-xl font-bold text-[#1C1B1A]">
              {order.orderId}
            </span>
            <button
              type="button"
              onClick={handleCopyOrderId}
              className="p-1 text-[#8C8880] hover:text-[#1C1B1A] hover:bg-[#F2EFE9] rounded transition-colors cursor-pointer"
              title="Salin ID Pesanan"
            >
              {copiedId ? (
                <Check className="w-4 h-4 text-[#4A7C59]" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>

            <span
              className={`text-[11px] font-mono uppercase px-2 py-0.5 rounded font-semibold ${
                order.isCustomOrder
                  ? 'bg-[#FAF0EC] text-[#C14E30]'
                  : 'bg-[#F2EFE9] text-[#636058]'
              }`}
            >
              {order.isCustomOrder ? 'Pakaian Custom' : 'Pesanan Katalog'}
            </span>

            {/* Compact Status Indicator */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-medium bg-[#F5F0FB] text-[#4E3672]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#7B5EA7]" />
              {formatProductionStatusLabel(order.productionStatus)}
            </span>
          </div>

          <p className="text-xs sm:text-sm text-[#5E5B54] mt-1">
            Pelanggan: <span className="font-semibold text-[#1C1B1A]">{order.customer}</span> •{' '}
            {order.phone}
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center flex-wrap gap-2">
          <a
            href={whatsAppUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 bg-[#EFF6EF] hover:bg-[#E2EFE2] text-[#2D5931] border border-[#CDE5CD] rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>WhatsApp Pelanggan</span>
          </a>

          <button
            onClick={() => navigate('/admin/invoices')}
            className="px-3 py-1.5 bg-white hover:bg-[#F2EFE9] border border-[#E8E5DF] text-xs font-medium text-[#1C1B1A] rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-[#8C8880]" />
            <span>Invoice #{order.invoiceNumber}</span>
          </button>
        </div>
      </div>

      {/* Feedback now surfaces via the modern floating toast (see AdminToast.tsx) */}

      {/* Custom Order Design Mockup Preview (Requirement 19) */}
      {order.isCustomOrder && (
        <div className="p-4 sm:p-6 bg-white border border-[#E8E5DF] rounded-2xl space-y-4 shadow-[0_4px_20px_rgba(28,27,26,0.06)]">
          <div className="flex items-center justify-between border-b border-[#F0ECE5] pb-3">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-[#C14E30]" />
              <h3 className="font-heading text-sm font-bold text-[#1C1B1A]">
                Desain &amp; Mockup Pakaian Custom
              </h3>
            </div>
            <span className="text-[11px] font-mono text-[#8C8880]">
              Tahap Desain: {order.productionStatus === 'DESIGN_APPROVED' ? 'Disetujui' : 'Perlu Ditinjau'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
            {/* Visual Mockup Box */}
            <div className="md:col-span-4 bg-[#FAF9F5] border border-[#E8E5DF] rounded-lg p-3 flex flex-col items-center justify-center text-center">
              {order.design ? (
                <div
                  className="relative group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1C1B1A] rounded"
                  onClick={() => setIsPreviewModalOpen(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setIsPreviewModalOpen(true);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label="Perbesar mockup desain"
                >
                  <img
                    src={order.design}
                    alt="Custom design mockup"
                    className="max-h-52 w-auto object-contain rounded border border-[#E8E5DF] bg-white shadow-2xs"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-[#1C1B1A]/30 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center text-white text-xs font-semibold gap-1">
                    <Eye className="w-4 h-4" />
                    <span>Klik untuk Perbesar</span>
                  </div>
                </div>
              ) : (
                <div className="h-44 w-full flex flex-col items-center justify-center text-[#8C8880] space-y-2">
                  <Palette className="w-8 h-8 text-[#DDD8CD]" />
                  <p className="text-xs">Belum ada mockup vector yang diunggah.</p>
                </div>
              )}
            </div>

            {/* Spec details & Action buttons */}
            <div className="md:col-span-8 space-y-3.5">
              <div className="space-y-1">
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#8C8880]">
                  File Terlampir
                </span>
                <p className="text-xs font-mono font-semibold text-[#1C1B1A]">
                  {order.designFileName || 'sipastel_custom_vector_mockup.pdf'}
                </p>
                <p className="text-xs text-[#5E5B54]">
                  Format: Vector CMYK / 300 DPI Siap Sublimasi • Jenis Pakaian:{' '}
                  <strong className="text-[#1C1B1A]">{order.productType || 'Jersey Custom'}</strong>
                </p>
              </div>

              {order.notes && (
                <div className="p-3 bg-[#FAF9F5] border border-[#E8E5DF] rounded-lg text-xs space-y-1">
                  <span className="font-semibold text-[#1C1B1A] block">Catatan Penempatan Pelanggan:</span>
                  <p className="text-[#5E5B54] leading-relaxed italic">"{order.notes}"</p>
                </div>
              )}

              {/* Action Buttons for Mockup */}
              <div className="flex items-center flex-wrap gap-2 pt-1">
                {order.design && (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsPreviewModalOpen(true)}
                      className="px-3 py-1.5 bg-white hover:bg-[#F2EFE9] border border-[#E8E5DF] text-xs font-medium text-[#1C1B1A] rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#8C8880]" />
                      <span>Lihat Resolusi Penuh</span>
                    </button>
                    <a
                      href={order.design}
                      download={order.designFileName || 'sipastel-mockup.png'}
                      className="px-3 py-1.5 bg-white hover:bg-[#F2EFE9] border border-[#E8E5DF] text-xs font-medium text-[#1C1B1A] rounded-lg flex items-center gap-1.5 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 text-[#8C8880]" />
                      <span>Unduh File</span>
                    </a>
                  </>
                )}

                <button
                  type="button"
                  onClick={handleApproveMockup}
                  className="px-3.5 py-1.5 bg-[#4A7C59] hover:bg-[#3E6A4B] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Setujui Mockup</span>
                </button>

                <button
                  type="button"
                  onClick={handleRequestRevision}
                  className="px-3 py-1.5 bg-[#FAF0EC] hover:bg-[#F5E5DF] text-[#C14E30] border border-[#F0D5CD] text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>Minta Revisi</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Order Information & Operation Updates */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Customer, Items & Specs, Shipping */}
        <div className="lg:col-span-7 space-y-6">
          {/* Order Items & Apparel Specs */}
          <div className="p-4 sm:p-5 bg-white border border-[#E8E5DF] rounded-2xl space-y-4 shadow-[0_4px_20px_rgba(28,27,26,0.06)]">
            <div className="flex items-center justify-between border-b border-[#F0ECE5] pb-3">
              <h3 className="font-heading text-sm font-bold text-[#1C1B1A]">
                Item &amp; Spesifikasi
              </h3>
              <span className="text-xs font-mono font-medium text-[#8C8880]">
                Total Kuantitas: {order.quantity} pcs
              </span>
            </div>

            <div className="space-y-3 divide-y divide-[#F2EFE9]">
              {(order.items || []).map((item, idx) => (
                <div key={idx} className="pt-3 first:pt-0 flex items-start justify-between gap-3 text-xs">
                  <div>
                    <p className="font-semibold text-[#1C1B1A] text-sm">{item.productName}</p>
                    <div className="text-[#5E5B54] mt-1 space-y-0.5">
                      {item.size && (
                        <p>
                          Ukuran: <span className="font-mono font-semibold text-[#1C1B1A]">{item.size}</span>
                        </p>
                      )}
                      {item.variantColor && (
                        <p>
                          Warna: <span className="text-[#1C1B1A]">{item.variantColor}</span>
                        </p>
                      )}
                      {order.material && (
                        <p>
                          Bahan: <span className="text-[#1C1B1A]">{order.material}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-mono text-xs text-[#8C8880]">Qty: {item.quantity}</span>
                    {item.price && (
                      <p className="font-mono font-bold text-[#1C1B1A] mt-0.5">
                        {formatIDR(item.price * item.quantity)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Total summary */}
            <div className="pt-3 border-t border-[#E8E5DF] flex items-center justify-between text-xs font-medium">
              <span className="text-[#5E5B54]">Total Nominal Pesanan:</span>
              {isEditingPrice ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    autoFocus
                    value={priceInput}
                    onChange={(e) => setPriceInput(e.target.value)}
                    placeholder="Contoh: 1500000"
                    className="w-32 p-1.5 bg-[#FAF9F5] border border-[#E8E5DF] rounded-lg text-xs font-mono focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={handleSavePrice}
                    disabled={isSavingPrice}
                    className="px-2.5 py-1.5 bg-[#1C1B1A] hover:bg-[#33312E] disabled:opacity-50 text-white text-[11px] font-semibold rounded-lg cursor-pointer"
                  >
                    {isSavingPrice ? 'Menyimpan...' : 'Simpan'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingPrice(false)}
                    className="px-2.5 py-1.5 border border-[#E8E5DF] text-[#5E5B54] text-[11px] font-semibold rounded-lg cursor-pointer"
                  >
                    Batal
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="font-mono text-base font-bold text-[#1C1B1A]">
                    {order.totalPrice ? formatIDR(order.totalPrice) : 'Belum diatur'}
                  </span>
                  {canSetPrice && (
                    <button
                      type="button"
                      onClick={() => {
                        setPriceInput(order.totalPrice ? String(order.totalPrice) : '');
                        setIsEditingPrice(true);
                      }}
                      className="text-[11px] font-semibold text-[#8A4E13] hover:underline cursor-pointer"
                    >
                      {order.totalPrice ? 'Ubah Harga' : 'Atur Harga'}
                    </button>
                  )}
                </div>
              )}
            </div>
            {!order.totalPrice && !isEditingPrice && (
              <p className="text-[11px] text-[#A65A56] -mt-1">
                Harga pesanan custom ini belum diatur, sehingga DP/pelunasan belum bisa dicatat. Atur harga dulu di atas.
              </p>
            )}
          </div>

          {/* Customer & Delivery Address */}
          <div className="p-4 sm:p-5 bg-white border border-[#E8E5DF] rounded-2xl space-y-3.5 shadow-[0_4px_20px_rgba(28,27,26,0.06)] text-xs">
            <h3 className="font-heading text-sm font-bold text-[#1C1B1A] border-b border-[#F0ECE5] pb-2.5">
              Pelanggan &amp; Tujuan Pengiriman
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#8C8880]">
                  Nama Penerima
                </span>
                <p className="font-semibold text-[#1C1B1A]">{order.customer}</p>
                <p className="text-[#5E5B54]">{order.phone}</p>
                {order.email && <p className="text-[#8C8880]">{order.email}</p>}
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#8C8880]">
                  Alamat Pengiriman
                </span>
                <p className="text-[#1C1B1A] leading-relaxed">{order.address}</p>
                <p className="text-[#8C8880] font-mono">
                  {order.city} {order.postalCode}
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-[#F0ECE5] flex items-center justify-between text-[11px]">
              <span className="text-[#8C8880]">Kurir: {order.courier || 'JNE Reguler'}</span>
              <span className="font-mono text-[#5E5B54]">
                Resi / Tracking:{' '}
                <strong className="text-[#1C1B1A]">{order.trackingNumber || 'Belum ada'}</strong>
              </span>
            </div>
          </div>

          {order.paymentPreference && (
            <div className="p-4 bg-[#F6F4ED] border border-[#E8E5DF] rounded-2xl text-xs">
              <span className="text-[#8C8880] block mb-1">
                Preferensi Pembayaran dari Customer (belum dikonfirmasi)
              </span>
              <p className="font-bold text-[#1C1B1A]">
                {order.paymentPreference === 'LUNAS'
                  ? 'Lunas (Bayar Penuh)'
                  : `DP ${order.paymentPreferencePercentage ?? 50}% (Uang Muka)`}
              </p>
            </div>
          )}

          <PaymentHistoryPanel
            order={order}
            onPaymentChange={() => {
              getStoredOrders().then(setOrders);
            }}
          />
        </div>

        {/* Right Column: Update Status Form & Staff Timeline Logs */}
        <div className="lg:col-span-5 space-y-6">
          {/* Operational Status Update Form */}
          <div className="p-4 sm:p-5 bg-white border border-[#E8E5DF] rounded-2xl space-y-4 shadow-[0_4px_20px_rgba(28,27,26,0.06)]">
            <h3 className="font-heading text-sm font-bold text-[#1C1B1A] border-b border-[#F0ECE5] pb-2.5">
              Perbarui Status Studio
            </h3>

            <form onSubmit={handleSaveStatus} className="space-y-3.5 text-xs">
              {/* Production Status */}
              <div>
                <label className="block text-[11px] font-mono uppercase text-[#8C8880] mb-1">
                  Tahap Produksi
                </label>
                <select
                  value={selectedProductionStatus}
                  onChange={(e) => setSelectedProductionStatus(e.target.value as ProductionStatus)}
                  className="w-full p-2 bg-[#FAF9F5] border border-[#E8E5DF] rounded-lg text-xs font-medium text-[#1C1B1A] focus:outline-hidden"
                >
                  <option value="WAITING_VALIDATION">Menunggu Validasi</option>
                  <option value="DESIGN">Tahap Desain</option>
                  <option value="DESIGN_APPROVAL">Menunggu Persetujuan Desain</option>
                  <option value="DESIGN_APPROVED">Desain Disetujui</option>
                  <option value="DESIGN_REVISION">Revisi Desain</option>
                  <option value="CUTTING">Potong Bahan</option>
                  <option value="SEWING">Menjahit</option>
                  <option value="PRINTING">Sablon / Sublimasi</option>
                  <option value="QC">Quality Control</option>
                  <option value="PACKING">Packing</option>
                  <option value="READY_TO_SHIP">Siap Kirim</option>
                </select>
              </div>

              {/* Payment Status (read-only - derived automatically from the
                  payment ledger below; cannot be set manually per business rule) */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#8C8880] mb-1">
                    Payment (Otomatis)
                  </label>
                  <div
                    className={`w-full p-2 rounded-lg text-xs font-bold text-center border ${
                      order.paymentStatus === 'LUNAS'
                        ? 'bg-[#EFF6EF] text-[#2D5931] border-[#CDE5CD]'
                        : order.paymentStatus === 'DP_DIBAYAR'
                        ? 'bg-[#FAF3EB] text-[#8A4E13] border-[#F0DFC5]'
                        : 'bg-[#FAF0F0] text-[#8C2927] border-[#F3D4CF]'
                    }`}
                  >
                    {order.paymentStatus === 'LUNAS'
                      ? 'LUNAS'
                      : order.paymentStatus === 'DP_DIBAYAR'
                      ? 'DP DIBAYAR'
                      : 'BELUM BAYAR'}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#8C8880] mb-1">
                    Pengiriman
                  </label>
                  <select
                    value={selectedShippingStatus}
                    onChange={(e) => setSelectedShippingStatus(e.target.value as ShippingStatus)}
                    className="w-full p-2 bg-[#FAF9F5] border border-[#E8E5DF] rounded-lg text-xs font-medium text-[#1C1B1A] focus:outline-hidden"
                  >
                    <option value="NOT_SHIPPED">BELUM DIKIRIM</option>
                    <option value="IN_TRANSIT">DALAM PERJALANAN</option>
                    <option value="DELIVERED">TERKIRIM</option>
                    <option value="COMPLETED">SELESAI</option>
                  </select>
                </div>
              </div>

              {/* Tracking Number */}
              <div>
                <label className="block text-[11px] font-mono uppercase text-[#8C8880] mb-1">
                  Nomor Resi / Airway Bill
                </label>
                <input
                  type="text"
                  value={trackingNoInput}
                  onChange={(e) => setTrackingNoInput(e.target.value)}
                  placeholder="contoh: JNE8921829102"
                  className="w-full p-2 bg-[#FAF9F5] border border-[#E8E5DF] rounded-lg text-xs font-mono text-[#1C1B1A] focus:outline-hidden"
                />
              </div>

              {/* Operational note */}
              <div>
                <label className="block text-[11px] font-mono uppercase text-[#8C8880] mb-1">
                  Catatan Operasional Staf
                </label>
                <textarea
                  rows={2}
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  placeholder="Tulis catatan singkat untuk arsip tim..."
                  className="w-full p-2 bg-[#FAF9F5] border border-[#E8E5DF] rounded-lg text-xs text-[#1C1B1A] focus:outline-hidden resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-[#1C1B1A] hover:bg-[#33312E] text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Perubahan Status</span>
              </button>
            </form>
          </div>

          {/* Production Timeline & Staff Logs */}
          <div className="p-4 sm:p-5 bg-white border border-[#E8E5DF] rounded-2xl space-y-3 shadow-[0_4px_20px_rgba(28,27,26,0.06)]">
            <h3 className="font-heading text-sm font-bold text-[#1C1B1A] border-b border-[#F0ECE5] pb-2.5">
              Riwayat &amp; Log Produksi
            </h3>

            <div className="space-y-3 max-h-60 overflow-y-auto divide-y divide-[#F6F3EE] text-xs">
              {(order.timelineLogs && order.timelineLogs.length > 0) ? (
                order.timelineLogs.map((log) => (
                  <div key={log.id} className="pt-2.5 first:pt-0 space-y-0.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-[#1C1B1A] font-mono">
                        {formatProductionStatusLabel(log.newStatus)}
                      </span>
                      <span className="text-[#8C8880] font-mono text-[10px]">
                        {formatDate(log.timestamp)}
                      </span>
                    </div>
                    {log.note && <p className="text-[#5E5B54] text-[11px]">{log.note}</p>}
                    <span className="text-[10px] text-[#8C8880] block font-mono">
                      Oleh: {log.authorName || 'Staf Studio'}
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-4 text-center text-[#8C8880] text-xs">
                  Belum ada riwayat perubahan status.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mockup Full Resolution Zoom Modal */}
      {isPreviewModalOpen && order.design && (
        <div
          className="fixed inset-0 z-50 bg-[#1C1B1A]/70 backdrop-blur-xs flex items-center justify-center p-4 animate-modal-backdrop"
          onClick={() => setIsPreviewModalOpen(false)}
        >
          <div
            className="bg-white p-4 sm:p-6 rounded-2xl max-w-3xl w-full border border-[#E8E5DF] shadow-2xl space-y-4 animate-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E8E5DF] pb-3">
              <div>
                <h4 className="font-heading text-sm font-bold text-[#1C1B1A]">
                  {order.designFileName || 'Mockup Vector Pakaian'}
                </h4>
                <p className="text-[11px] text-[#8C8880] font-mono">
                  Pesanan: {order.orderId} • Pelanggan: {order.customer}
                </p>
              </div>
              <button
                onClick={() => setIsPreviewModalOpen(false)}
                aria-label="Tutup pratinjau desain"
                className="p-1 text-[#8C8880] hover:text-[#1C1B1A] rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-[#FAF9F5] border border-[#E8E5DF] rounded-lg p-4 flex items-center justify-center max-h-[70vh] overflow-auto">
              <img
                src={order.design}
                alt="Pratinjau Desain"
                className="max-h-[60vh] object-contain rounded"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#E8E5DF]">
              <a
                href={order.design}
                download={order.designFileName || 'sipastel-artwork.png'}
                className="px-3.5 py-1.5 bg-[#1C1B1A] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Desain</span>
              </a>
              <button
                type="button"
                onClick={() => setIsPreviewModalOpen(false)}
                className="px-3 py-1.5 border border-[#DDD8CD] text-[#5E5B54] hover:bg-[#F2EFE9] text-xs font-medium rounded-lg cursor-pointer transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
