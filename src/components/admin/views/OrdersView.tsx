import React, { useState, useMemo, useEffect } from 'react';
import { Search, RefreshCw, Download, Link2, X } from 'lucide-react';
import { Order } from '../../../types';
import { formatDate, formatIDR, formatProductionStatusLabel } from '../../../utils/formatters';
import { PRODUCTION_STATUSES, isNewOrder } from '../../../utils/workflow';
import { exportRowsToXlsx, copyTextToClipboard } from '../../../utils/exportXlsx';
import { useRouter } from '../../../context/RouterContext';
import { useOrders } from '../../../hooks/useOrders';
import { AdminTableSkeleton } from '../../Skeleton';
import { useAdminToast } from '../AdminToast';
import { PaymentBadge, ProductionBadge } from '../StatusBadges';
import { LoadErrorBanner } from '../LoadErrorBanner';
import { Pagination } from '../Pagination';

const PAGE_SIZE = 25;

type TabId = 'ALL' | 'NEW' | 'CUSTOM' | 'CATALOG' | 'PENDING' | 'PRODUCTION' | 'READY_TO_SHIP';

// The active tab lives in the URL (?status=...) so filters survive a page
// refresh, work with the browser's back button and can be bookmarked/shared.
const STATUS_PARAM_TO_TAB: Record<string, TabId> = {
  new: 'NEW',
  custom: 'CUSTOM',
  catalog: 'CATALOG',
  pending: 'PENDING',
  production: 'PRODUCTION',
  ready_to_ship: 'READY_TO_SHIP',
};
const TAB_TO_STATUS_PARAM: Record<TabId, string | null> = {
  ALL: null,
  NEW: 'new',
  CUSTOM: 'custom',
  CATALOG: 'catalog',
  PENDING: 'pending',
  PRODUCTION: 'production',
  READY_TO_SHIP: 'ready_to_ship',
};

function matchesTab(o: Order, tab: TabId): boolean {
  switch (tab) {
    case 'NEW':
      return isNewOrder(o);
    case 'CUSTOM':
      return o.isCustomOrder;
    case 'CATALOG':
      return !o.isCustomOrder;
    case 'PENDING':
      return o.paymentStatus !== 'LUNAS';
    case 'PRODUCTION':
      return !isNewOrder(o) && o.productionStatus !== 'READY_TO_SHIP' && o.shippingStatus !== 'COMPLETED';
    case 'READY_TO_SHIP':
      return o.productionStatus === 'READY_TO_SHIP';
    default:
      return true;
  }
}

export const OrdersView: React.FC = () => {
  const { orders, isLoading, isRefreshing, error, truncated, refresh } = useOrders();
  const { searchParams, navigate } = useRouter();
  const { showToast } = useAdminToast();

  const activeTab: TabId = STATUS_PARAM_TO_TAB[searchParams.get('status') ?? ''] ?? 'ALL';

  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<string>('ALL');
  const [productionFilter, setProductionFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);

  // Any change to the filters starts again from the first page.
  useEffect(() => {
    setPage(1);
  }, [searchQuery, activeTab, paymentFilter, productionFilter]);

  const selectTab = (tab: TabId) => {
    const param = TAB_TO_STATUS_PARAM[tab];
    navigate(param ? `/admin/orders?status=${param}` : '/admin/orders', { replace: true, scroll: false });
  };

  const handleRefresh = async () => {
    const ok = await refresh();
    if (ok) showToast('Daftar pesanan diperbarui.', 'info');
    else showToast('Gagal memperbarui pesanan. Data lama tetap ditampilkan.', 'error');
  };

  const handleCopyOrderLink = async () => {
    const ok = await copyTextToClipboard(`${window.location.origin}/custom-order`);
    showToast(
      ok ? 'Link form pesanan custom disalin. Bagikan ke pelanggan.' : 'Gagal menyalin link. Salin manual dari: /custom-order',
      ok ? 'success' : 'error'
    );
  };

  const filteredOrders = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const qDigits = q.replace(/\D/g, '');
    return orders.filter((o) => {
      const matchesSearch =
        !q ||
        o.orderId.toLowerCase().includes(q) ||
        o.customer.toLowerCase().includes(q) ||
        o.phone.toLowerCase().includes(q) ||
        // Digits-only comparison so "0812 3456" finds "0812-3456".
        (qDigits.length >= 3 && o.phone.replace(/\D/g, '').includes(qDigits)) ||
        (!!o.email && o.email.toLowerCase().includes(q)) ||
        (!!o.productType && o.productType.toLowerCase().includes(q));

      const matchesPayment = paymentFilter === 'ALL' || o.paymentStatus === paymentFilter;
      const matchesProduction = productionFilter === 'ALL' || o.productionStatus === productionFilter;

      return matchesSearch && matchesTab(o, activeTab) && matchesPayment && matchesProduction;
    });
  }, [orders, searchQuery, activeTab, paymentFilter, productionFilter]);

  const tabCounts = useMemo(() => {
    const count = (tab: TabId) => orders.filter((o) => matchesTab(o, tab)).length;
    return {
      ALL: orders.length,
      NEW: count('NEW'),
      CUSTOM: count('CUSTOM'),
      CATALOG: count('CATALOG'),
      PENDING: count('PENDING'),
      PRODUCTION: count('PRODUCTION'),
      READY_TO_SHIP: count('READY_TO_SHIP'),
    };
  }, [orders]);

  const pageCount = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filteredOrders.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleExportExcel = async () => {
    try {
      await exportRowsToXlsx(
        filteredOrders.map((o) => ({
          'Order ID': o.orderId,
          Customer: o.customer,
          Phone: o.phone,
          Type: o.isCustomOrder ? 'Custom' : 'Catalog',
          Total: o.totalPrice || 0,
          Payment: o.paymentStatus,
          Production: o.productionStatus,
          Date: o.createdAt,
          Qty: o.quantity,
          Dibayar: o.totalPaid ?? 0,
          'Sisa Tagihan': o.remainingBalance ?? 0,
          Pengiriman: o.shippingStatus,
        })),
        {
          sheetName: 'Orders',
          fileName: `sipastel-orders-${new Date().toISOString().slice(0, 10)}.xlsx`,
          columnWidths: [22, 20, 16, 10, 14, 14, 18, 22, 8, 14, 14, 16],
        }
      );
      showToast(`${filteredOrders.length} pesanan berhasil diekspor ke Excel.`, 'success');
    } catch (e) {
      console.error('Excel export failed:', e);
      showToast('Gagal mengekspor ke Excel. Coba lagi.', 'error');
    }
  };

  const goToOrder = (orderId: string) => navigate(`/admin/orders/${encodeURIComponent(orderId)}`);

  const tabs: { id: TabId; label: string }[] = [
    { id: 'ALL', label: 'Semua Pesanan' },
    { id: 'NEW', label: 'Baru / Antrean' },
    { id: 'CUSTOM', label: 'Pesanan Custom' },
    { id: 'CATALOG', label: 'Katalog' },
    { id: 'PENDING', label: 'Menunggu Pembayaran' },
    { id: 'PRODUCTION', label: 'Sedang Produksi' },
    { id: 'READY_TO_SHIP', label: 'Siap Kirim' },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="pb-3 border-b border-line">
          <h2 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-ink">Semua Pesanan</h2>
        </div>
        <AdminTableSkeleton rows={8} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line">
        <div>
          <h2 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-ink">Semua Pesanan</h2>
          <p className="text-sm text-muted mt-0.5">Pantau pesanan pelanggan, alur produksi, dan pengiriman.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3 py-1.5 text-xs font-medium text-body hover:text-ink bg-surface hover:bg-surface-hover border border-line rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-muted" aria-hidden="true" />
            <span>Ekspor Excel</span>
          </button>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-3 py-1.5 text-xs font-medium text-body hover:text-ink bg-surface hover:bg-surface-hover border border-line rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-muted ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>Perbarui</span>
          </button>

          {/* Staff cannot open the public Custom Studio while signed in, so
              instead of a dead-end "create order" button we offer the link
              that customers use to place their own order. */}
          <button
            type="button"
            onClick={handleCopyOrderLink}
            className="px-3 py-1.5 text-xs font-semibold text-on-accent bg-accent hover:bg-accent-soft rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Link2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Salin Link Form Pesanan</span>
          </button>
        </div>
      </div>

      {error && <LoadErrorBanner message={error} onRetry={handleRefresh} isRetrying={isRefreshing} hasStaleData={orders.length > 0} />}

      {truncated && (
        <div role="status" className="p-3 bg-warning/10 border border-warning/30 rounded-xl text-xs text-warning">
          Menampilkan pesanan terbaru saja (batas 2.000). Pesanan yang lebih lama tidak ikut dihitung di tab dan ekspor.
        </div>
      )}

      {/* Tab Filter Bar */}
      <div role="tablist" aria-label="Filter pesanan" className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs border-b border-line scrollbar-none">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => selectTab(tab.id)}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === tab.id ? 'bg-accent text-on-accent shadow-2xs' : 'text-body hover:bg-surface-hover hover:text-ink'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`px-1.5 rounded-full text-[11px] font-mono ${
                activeTab === tab.id ? 'bg-accent-muted text-on-accent' : 'bg-line text-body'
              }`}
            >
              {tabCounts[tab.id]}
            </span>
          </button>
        ))}
      </div>

      {/* Search and Secondary Filter Controls */}
      <div className="p-3.5 bg-surface border border-line rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-[0_4px_20px_rgba(0,0,0,0.35)]">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Cari pesanan"
            placeholder="Cari ID pesanan, customer, HP..."
            className="w-full pl-9 pr-8 py-1.5 bg-paper border border-line focus:border-accent-soft rounded-lg text-xs text-ink placeholder-muted focus:outline-hidden transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Hapus pencarian"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

<div className="grid grid-cols-2 gap-2 w-full sm:flex sm:w-auto justify-end">
  <select
    value={paymentFilter}
    onChange={(e) => setPaymentFilter(e.target.value)}
    aria-label="Filter status pembayaran"
    className="w-full sm:w-auto px-2.5 py-1.5 bg-paper border border-line rounded-lg text-xs text-body focus:outline-hidden cursor-pointer"
  >
            <option value="ALL">Pembayaran: Semua</option>
            <option value="LUNAS">Lunas</option>
            <option value="DP_DIBAYAR">DP Dibayar</option>
            <option value="BELUM_BAYAR">Belum Bayar</option>
          </select>

          <select
            value={productionFilter}
            onChange={(e) => setProductionFilter(e.target.value)}
            aria-label="Filter tahap produksi"
               className="w-full sm:w-auto px-2.5 py-1.5 bg-paper border border-line rounded-lg text-xs text-body focus:outline-hidden cursor-pointer"
          >
            <option value="ALL">Produksi: Semua</option>
            {PRODUCTION_STATUSES.map((status) => (
              <option key={status} value={status}>
                {formatProductionStatusLabel(status)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-surface border border-line rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.35)]">
        <div className="overflow-x-auto">
         <table className="w-full text-left text-sm border-collapse whitespace-nowrap">
            <thead>
              <tr className="border-b border-line bg-surface-hover text-muted font-mono text-xs uppercase tracking-wider">
                <th scope="col" className="py-3 px-4 font-medium">ID Pesanan</th>
                <th scope="col" className="py-3 px-4 font-medium">Customer</th>
                <th scope="col" className="py-3 px-4 font-medium">Spesifikasi</th>
                <th scope="col" className="py-3 px-4 font-medium">Qty</th>
                <th scope="col" className="py-3 px-4 font-medium">Total Harga</th>
                <th scope="col" className="py-3 px-4 font-medium">Pembayaran</th>
                <th scope="col" className="py-3 px-4 font-medium">Tahap Produksi</th>
                <th scope="col" className="py-3 px-4 font-medium">Dibuat</th>
                <th scope="col" className="py-3 px-4 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-14 text-center">
                    <div className="w-10 h-10 rounded-full bg-surface-hover flex items-center justify-center mx-auto mb-3">
                      <Search className="w-4 h-4 text-muted" aria-hidden="true" />
                    </div>
                    <p className="text-sm font-semibold text-ink">
                      {orders.length === 0 && !error ? 'Belum ada pesanan masuk.' : 'Tidak ada pesanan ditemukan.'}
                    </p>
                    <p className="text-xs text-muted mt-0.5">
                      {orders.length === 0 && !error
                        ? 'Pesanan dari pelanggan akan muncul di sini.'
                        : 'Coba ubah kata kunci pencarian atau filter yang digunakan.'}
                    </p>
                  </td>
                </tr>
              ) : (
                pageRows.map((order) => (
                  <tr
                    key={order.orderId}
                    onClick={() => goToOrder(order.orderId)}
                    className="group hover:bg-surface-hover transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-ink">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          goToOrder(order.orderId);
                        }}
                        className="font-mono font-bold text-ink hover:text-accent cursor-pointer text-left"
                      >
                        {order.orderId}
                      </button>
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-ink">{order.customer}</p>
                      <span className="text-xs text-muted font-mono block mt-0.5">{order.phone}</span>
                    </td>

                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[11px] font-mono font-semibold px-1.5 rounded uppercase ${
                            order.isCustomOrder ? 'bg-accent-wash text-accent' : 'bg-surface-hover text-body'
                          }`}
                        >
                          {order.isCustomOrder ? 'Custom' : 'Katalog'}
                        </span>
                        <span className="text-ink font-medium truncate">
                          {order.items[0]?.productName || order.productType || 'Apparel'}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-medium text-ink">{order.quantity} pcs</td>

                    <td className="py-3.5 px-4 font-mono font-bold text-ink">
                      {order.totalPrice ? formatIDR(order.totalPrice) : <span className="text-muted font-normal">Belum dihargai</span>}
                    </td>

                    <td className="py-3.5 px-4">
                      <PaymentBadge status={order.paymentStatus} />
                    </td>

                    <td className="py-3.5 px-4">
                      <ProductionBadge status={order.productionStatus} />
                    </td>

                    <td className="py-3.5 px-4 font-mono text-xs text-muted">{formatDate(order.createdAt)}</td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          goToOrder(order.orderId);
                        }}
                        className="px-2.5 py-1 bg-surface hover:bg-accent-wash border border-line hover:border-accent-soft text-ink hover:text-accent rounded-md font-medium text-xs transition-colors cursor-pointer shadow-2xs"
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

        <div className="p-3.5 bg-surface-hover border-t border-line space-y-2.5">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>
              Menampilkan <strong className="text-ink">{filteredOrders.length}</strong> dari{' '}
              <strong className="text-ink">{orders.length}</strong> pesanan
            </span>
          </div>
          <Pagination page={currentPage} pageSize={PAGE_SIZE} total={filteredOrders.length} onPageChange={setPage} />
        </div>
      </div>
    </div>
  );
};
