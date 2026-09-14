import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Filter,
  RefreshCw,
  Eye,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  Download,
  Plus,
  ArrowUpRight,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { Order, ProductionStatus, PaymentStatus, ShippingStatus } from '../../../types';
import { getStoredOrders } from '../../../utils/storage';
import { formatDate, formatIDR, formatProductionStatusLabel } from '../../../utils/formatters';
import { useRouter } from '../../../context/RouterContext';
import { AdminTableSkeleton } from '../../Skeleton';
import { useAdminToast } from '../AdminToast';
import * as XLSX from 'xlsx';

export const OrdersView: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { pathname, navigate } = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [paymentFilter, setPaymentFilter] = useState<string>('ALL');
  const [productionFilter, setProductionFilter] = useState<string>('ALL');
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const { showToast } = useAdminToast();

  useEffect(() => {
    if (!feedback) return;
    showToast(feedback.message, feedback.type);
    setFeedback(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedback]);

  // Load orders from Supabase on mount
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    getStoredOrders().then((data) => {
      if (!cancelled) {
        setOrders(data);
        setIsLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Parse query string from pathname if present (e.g. ?status=new or ?status=ready_to_ship)
  useEffect(() => {
    if (pathname.includes('status=new')) {
      setActiveTab('NEW');
    } else if (pathname.includes('status=ready_to_ship')) {
      setActiveTab('READY_TO_SHIP');
    }
  }, [pathname]);

  const showFeedback = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleRefresh = () => {
    setIsLoading(true);
    getStoredOrders().then((data) => {
      setOrders(data);
      setIsLoading(false);
      showFeedback('Daftar pesanan berhasil diperbarui dari database.', 'info');
    });
  };

  // Status badge components: Belum Bayar -> DP Dibayar -> Lunas
  const renderPaymentStatus = (status: Order['paymentStatus']) => {
    switch (status) {
      case 'LUNAS':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-[#EFF6EF] text-[#2D5931]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4A7C59]" />
            Lunas
          </span>
        );
      case 'DP_DIBAYAR':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-[#FAF3EB] text-[#8A4E13]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C27828]" />
            DP Dibayar
          </span>
        );
      case 'BELUM_BAYAR':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-[#FAF0F0] text-[#8C2927]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#B84A48]" />
            Belum Bayar
          </span>
        );
    }
  };

  const renderProductionStatus = (status: Order['productionStatus']) => {
    if (status === 'READY_TO_SHIP') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-[#EFF6EF] text-[#2D5931]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#4A7C59]" />
          Siap Kirim
        </span>
      );
    }
    if (status === 'WAITING_VALIDATION' || status === 'PRODUCTION_QUEUE') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-[#FAF3EB] text-[#8A4E13]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#C27828]" />
          Antrean / Baru
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-[#F5F0FB] text-[#4E3672]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#7B5EA7]" />
        {formatProductionStatusLabel(status)}
      </span>
    );
  };

  // Filtered orders calculation
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        o.orderId.toLowerCase().includes(q) ||
        o.customer.toLowerCase().includes(q) ||
        o.phone.includes(q) ||
        (o.email && o.email.toLowerCase().includes(q)) ||
        (o.productType && o.productType.toLowerCase().includes(q));

      // Tab filter
      let matchesTab = true;
      if (activeTab === 'NEW') {
        matchesTab = o.productionStatus === 'WAITING_VALIDATION' || o.productionStatus === 'PRODUCTION_QUEUE';
      } else if (activeTab === 'CUSTOM') {
        matchesTab = o.isCustomOrder;
      } else if (activeTab === 'CATALOG') {
        matchesTab = !o.isCustomOrder;
      } else if (activeTab === 'PENDING') {
        matchesTab = o.paymentStatus !== 'LUNAS';
      } else if (activeTab === 'PRODUCTION') {
        matchesTab =
          o.productionStatus !== 'WAITING_VALIDATION' &&
          o.productionStatus !== 'READY_TO_SHIP' &&
          o.shippingStatus !== 'COMPLETED';
      } else if (activeTab === 'READY_TO_SHIP') {
        matchesTab = o.productionStatus === 'READY_TO_SHIP';
      }

      const matchesPayment = paymentFilter === 'ALL' || o.paymentStatus === paymentFilter;
      const matchesProduction = productionFilter === 'ALL' || o.productionStatus === productionFilter;

      return matchesSearch && matchesTab && matchesPayment && matchesProduction;
    });
  }, [orders, searchQuery, activeTab, paymentFilter, productionFilter]);

  // Tab counts
  const tabCounts = useMemo(() => {
    return {
      ALL: orders.length,
      NEW: orders.filter((o) => o.productionStatus === 'WAITING_VALIDATION' || o.productionStatus === 'PRODUCTION_QUEUE').length,
      CUSTOM: orders.filter((o) => o.isCustomOrder).length,
      CATALOG: orders.filter((o) => !o.isCustomOrder).length,
      PENDING: orders.filter((o) => o.paymentStatus !== 'LUNAS').length,
      PRODUCTION: orders.filter(
        (o) =>
          o.productionStatus !== 'WAITING_VALIDATION' &&
          o.productionStatus !== 'READY_TO_SHIP' &&
          o.shippingStatus !== 'COMPLETED'
      ).length,
      READY_TO_SHIP: orders.filter((o) => o.productionStatus === 'READY_TO_SHIP').length,
    };
  }, [orders]);

  const handleExportExcel = () => {
    const rows = filteredOrders.map((o) => ({
      'Order ID': o.orderId,
      Customer: o.customer,
      Phone: o.phone,
      Type: o.isCustomOrder ? 'Custom' : 'Catalog',
      Total: o.totalPrice || 0,
      Payment: o.paymentStatus,
      Production: o.productionStatus,
      Date: o.createdAt,
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = [
      { wch: 22 }, // Order ID
      { wch: 20 }, // Customer
      { wch: 16 }, // Phone
      { wch: 10 }, // Type
      { wch: 14 }, // Total
      { wch: 14 }, // Payment
      { wch: 18 }, // Production
      { wch: 22 }, // Date
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders');
    XLSX.writeFile(workbook, `sipastel-orders-${new Date().toISOString().slice(0, 10)}.xlsx`);
    showFeedback('Pesanan berhasil diekspor ke file Excel.', 'success');
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="pb-3 border-b border-[#E8E5DF]">
          <h2 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-[#1C1B1A]">
            All Orders
          </h2>
        </div>
        <AdminTableSkeleton rows={8} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E8E5DF]">
        <div>
          <h2 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-[#1C1B1A]">
            All Orders
          </h2>
          <p className="text-xs sm:text-sm text-[#7A766F] mt-0.5">
            Monitor client orders, production pipeline, and fulfillment.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3 py-1.5 text-xs font-medium text-[#5E5B54] hover:text-[#1C1B1A] bg-white hover:bg-[#F2EFE9] border border-[#E8E5DF] rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#8C8880]" />
            <span>Ekspor Excel</span>
          </button>

          <button
            type="button"
            onClick={handleRefresh}
            className="px-3 py-1.5 text-xs font-medium text-[#5E5B54] hover:text-[#1C1B1A] bg-white hover:bg-[#F2EFE9] border border-[#E8E5DF] rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#8C8880]" />
            <span>Perbarui</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/custom-order')}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-[#1C1B1A] hover:bg-[#33312E] rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 text-[#B8B4AA]" />
            <span>Pesanan Baru</span>
          </button>
        </div>
      </div>

      {/* Feedback now surfaces via the modern floating toast (see AdminToast.tsx) */}

      {/* Tab Filter Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs border-b border-[#E8E5DF] scrollbar-none">
        {[
          { id: 'ALL', label: 'Semua Pesanan', count: tabCounts.ALL },
          { id: 'NEW', label: 'Baru / Antrean', count: tabCounts.NEW },
          { id: 'CUSTOM', label: 'Pesanan Custom', count: tabCounts.CUSTOM },
          { id: 'CATALOG', label: 'Katalog', count: tabCounts.CATALOG },
          { id: 'PENDING', label: 'Menunggu Pembayaran', count: tabCounts.PENDING },
          { id: 'PRODUCTION', label: 'Sedang Produksi', count: tabCounts.PRODUCTION },
          { id: 'READY_TO_SHIP', label: 'Siap Kirim', count: tabCounts.READY_TO_SHIP },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === tab.id
                ? 'bg-[#1C1B1A] text-white shadow-2xs'
                : 'text-[#636058] hover:bg-[#F2EFE9] hover:text-[#1C1B1A]'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeTab === tab.id ? 'bg-[#33312E] text-white' : 'bg-[#E8E5DF] text-[#636058]'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search and Secondary Filter Controls */}
      <div className="p-3.5 bg-white border border-[#E8E5DF] rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-[0_4px_20px_rgba(28,27,26,0.06)]">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#8C8880] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari berdasarkan ID pesanan, customer, HP..."
            className="w-full pl-9 pr-8 py-1.5 bg-[#FAF9F5] border border-[#E8E5DF] focus:border-[#D87A61] rounded-lg text-xs text-[#1C1B1A] placeholder-[#9E9A91] focus:outline-hidden transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              aria-label="Hapus pencarian"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8C8880] hover:text-[#1C1B1A]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status Dropdown Selectors */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-[#FAF9F5] border border-[#E8E5DF] rounded-lg text-xs text-[#5E5B54] focus:outline-hidden cursor-pointer"
          >
            <option value="ALL">Payment: All</option>
            <option value="LUNAS">Lunas</option>
            <option value="DP_DIBAYAR">DP Dibayar</option>
            <option value="BELUM_BAYAR">Belum Bayar</option>
          </select>

          <select
            value={productionFilter}
            onChange={(e) => setProductionFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-[#FAF9F5] border border-[#E8E5DF] rounded-lg text-xs text-[#5E5B54] focus:outline-hidden cursor-pointer"
          >
            <option value="ALL">Production: All</option>
            <option value="WAITING_VALIDATION">Menunggu Validasi</option>
            <option value="DESIGN">Tahap Desain</option>
            <option value="CUTTING">Potong Bahan</option>
            <option value="SEWING">Menjahit</option>
            <option value="PRINTING">Sablon/Bordir</option>
            <option value="QC">Quality Control</option>
            <option value="PACKING">Packing</option>
            <option value="READY_TO_SHIP">Siap Kirim</option>
          </select>
        </div>
      </div>

      {/* Orders Table Container */}
      <div className="bg-white border border-[#E8E5DF] rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(28,27,26,0.06)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E8E5DF] bg-[#FCFAF7] text-[#8C8880] font-mono text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4 font-medium">ID Pesanan</th>
                <th className="py-3 px-4 font-medium">Customer</th>
                <th className="py-3 px-4 font-medium">Spesifikasi</th>
                <th className="py-3 px-4 font-medium">Qty</th>
                <th className="py-3 px-4 font-medium">Total Harga</th>
                <th className="py-3 px-4 font-medium">Pembayaran</th>
                <th className="py-3 px-4 font-medium">Tahap Produksi</th>
                <th className="py-3 px-4 font-medium">Dibuat</th>
                <th className="py-3 px-4 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2EFE9]">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-14 text-center">
                    <div className="w-10 h-10 rounded-full bg-[#F2EFE9] flex items-center justify-center mx-auto mb-3">
                      <Search className="w-4 h-4 text-[#8C8880]" />
                    </div>
                    <p className="text-xs font-semibold text-[#1C1B1A]">Tidak ada pesanan ditemukan.</p>
                    <p className="text-[11px] text-[#8C8880] mt-0.5">
                      Coba ubah kata kunci pencarian atau filter yang digunakan.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr
                    key={order.orderId}
                    onClick={() => navigate(`/admin/orders/${order.orderId}`)}
                    className="group hover:bg-[#FAF6F2] transition-colors cursor-pointer"
                  >
                    {/* Order ID */}
                    <td className="py-3.5 px-4 font-mono font-bold text-[#1C1B1A]">
                      {order.orderId}
                    </td>

                    {/* Customer */}
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-[#1C1B1A]">{order.customer}</p>
                      <span className="text-[11px] text-[#8C8880] font-mono block mt-0.5">
                        {order.phone}
                      </span>
                    </td>

                    {/* Apparel Spec */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded uppercase ${
                            order.isCustomOrder
                              ? 'bg-[#FAF0EC] text-[#C14E30]'
                              : 'bg-[#F2EFE9] text-[#636058]'
                          }`}
                        >
                          {order.isCustomOrder ? 'Custom' : 'Catalog'}
                        </span>
                        <span className="text-[#1C1B1A] font-medium truncate">
                          {order.items[0]?.productName || order.productType || 'Apparel'}
                        </span>
                      </div>
                    </td>

                    {/* Qty */}
                    <td className="py-3.5 px-4 font-mono font-medium text-[#1C1B1A]">
                      {order.quantity} pcs
                    </td>

                    {/* Total Price */}
                    <td className="py-3.5 px-4 font-mono font-bold text-[#1C1B1A]">
                      {order.totalPrice ? formatIDR(order.totalPrice) : '-'}
                    </td>

                    {/* Payment */}
                    <td className="py-3.5 px-4">
                      {renderPaymentStatus(order.paymentStatus)}
                    </td>

                    {/* Production */}
                    <td className="py-3.5 px-4">
                      {renderProductionStatus(order.productionStatus)}
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-4 font-mono text-[11px] text-[#8C8880]">
                      {formatDate(order.createdAt)}
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/admin/orders/${order.orderId}`);
                        }}
                        className="px-2.5 py-1 bg-white hover:bg-[#FAF0EC] border border-[#E8E5DF] hover:border-[#D87A61] text-[#1C1B1A] hover:text-[#C14E30] rounded-md font-medium text-xs transition-colors cursor-pointer shadow-2xs"
                      >
                        Detail
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table footer info */}
        <div className="p-3.5 bg-[#FCFAF7] border-t border-[#E8E5DF] flex items-center justify-between text-xs text-[#8C8880]">
          <span>
            Showing <strong className="text-[#1C1B1A]">{filteredOrders.length}</strong> of{' '}
            <strong className="text-[#1C1B1A]">{orders.length}</strong> orders
          </span>
          <span className="font-mono text-[11px]">Operasional Studio SIPASTEL</span>
        </div>
      </div>
    </div>
  );
};
