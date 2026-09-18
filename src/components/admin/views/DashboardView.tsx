import React, { useState, useMemo, useEffect } from 'react';
import {
  ShoppingBag,
  Clock,
  CheckCircle2,
  Scissors,
  Truck,
  ArrowUpRight,
  RefreshCw,
  Eye,
  Plus,
  ArrowRight,
  TrendingUp,
  FileText,
  Package,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { Order, ProductionStatus } from '../../../types';
import { getStoredOrders, updateStoredOrderStatus } from '../../../utils/storage';
import { formatDate, formatIDR, formatShippingStatusLabel } from '../../../utils/formatters';
import { useRouter } from '../../../context/RouterContext';
import { AdminTableSkeleton } from '../../Skeleton';

export const DashboardView: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'7d' | '30d'>('7d');
  const [activeMetricTab, setActiveMetricTab] = useState<'orders' | 'revenue' | 'production'>('orders');
  const [activeHoverPoint, setActiveHoverPoint] = useState<number | null>(null);
  const { navigate } = useRouter();

  // Reset the hovered chart point whenever the timeframe changes so a stale
  // index from a longer series (e.g. 30d) can't point past the end of a
  // shorter one (7d) and crash the tooltip lookup.
  React.useEffect(() => {
    setActiveHoverPoint(null);
  }, [selectedTimeframe]);

  // Highlighted order for Production Tracking timeline
  const [selectedTimelineOrderId, setSelectedTimelineOrderId] = useState<string>('');

  const loadOrders = () => {
    setIsLoading(true);
    getStoredOrders().then((data) => {
      setOrders(data);
      setIsLoading(false);
      setSelectedTimelineOrderId((prev) => {
        if (prev && data.some((o) => o.orderId === prev)) return prev;
        return data.find((o) => o.isCustomOrder)?.orderId || data[0]?.orderId || '';
      });
    });
  };

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeTimelineOrder = useMemo(() => {
    return orders.find((o) => o.orderId === selectedTimelineOrderId) || orders[0];
  }, [orders, selectedTimelineOrderId]);

  const handleRefresh = () => {
    loadOrders();
  };

  // Real KPI metrics calculated from orders data
  const totalOrders = orders.length;
  const pendingPayment = orders.filter((o) => o.paymentStatus !== 'LUNAS').length;
  const inProduction = orders.filter(
    (o) =>
      o.productionStatus !== 'WAITING_VALIDATION' &&
      o.productionStatus !== 'READY_TO_SHIP' &&
      o.shippingStatus !== 'COMPLETED'
  ).length;
  const readyToShip = orders.filter((o) => o.productionStatus === 'READY_TO_SHIP').length;

  const totalRevenue = orders.reduce((sum, o) => sum + (o.totalPaid || 0), 0);

  // Payment status badges follow the business rule: Belum Bayar -> DP Dibayar -> Lunas
  const renderPaymentStatus = (status: Order['paymentStatus']) => {
    switch (status) {
      case 'LUNAS':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-sage/10 text-sage">
            <span className="w-1.5 h-1.5 rounded-full bg-sage" />
            Lunas
          </span>
        );
      case 'DP_DIBAYAR':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-warning/10 text-warning">
            <span className="w-1.5 h-1.5 rounded-full bg-warning" />
            DP Dibayar
          </span>
        );
      case 'BELUM_BAYAR':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-danger/10 text-danger">
            <span className="w-1.5 h-1.5 rounded-full bg-danger" />
            Belum Bayar
          </span>
        );
    }
  };

  const renderProductionStatus = (status: Order['productionStatus']) => {
    if (status === 'READY_TO_SHIP') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-sage/10 text-sage">
          <span className="w-1.5 h-1.5 rounded-full bg-sage" />
          Siap Kirim
        </span>
      );
    }
    if (status === 'WAITING_VALIDATION') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-warning/10 text-warning">
          <span className="w-1.5 h-1.5 rounded-full bg-warning" />
          Antrean / Baru
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-info/10 text-info">
        <span className="w-1.5 h-1.5 rounded-full bg-info" />
        Sedang Produksi
      </span>
    );
  };

  // Production Tracking stages definition (Requirement 11)
  const productionStages = [
    { key: 'DESIGN', label: 'Desain', code: 'DESIGN' },
    { key: 'APPROVAL', label: 'Persetujuan', code: 'DESIGN_APPROVED' },
    { key: 'CUTTING', label: 'Potong Bahan', code: 'CUTTING' },
    { key: 'SEWING', label: 'Jahit', code: 'SEWING' },
    { key: 'PRINTING', label: 'Sablon/Bordir', code: 'PRINTING' },
    { key: 'QC', label: 'QC', code: 'QC' },
    { key: 'PACKING', label: 'Packing', code: 'PACKING' },
  ];

  // Derive stage index for the active order
  const getStageState = (stageKey: string, currentStatus: ProductionStatus) => {
    const stageOrder = ['DESIGN', 'APPROVAL', 'CUTTING', 'SEWING', 'PRINTING', 'QC', 'PACKING', 'READY_TO_SHIP'];
    
    // Map status to approximate index
    let activeIdx = 0;
    if (currentStatus === 'WAITING_VALIDATION' || currentStatus === 'PRODUCTION_QUEUE') activeIdx = 0;
    else if (currentStatus === 'DESIGN' || currentStatus === 'DESIGN_REVISION') activeIdx = 0;
    else if (currentStatus === 'DESIGN_APPROVAL' || currentStatus === 'DESIGN_APPROVED') activeIdx = 1;
    else if (currentStatus === 'CUTTING') activeIdx = 2;
    else if (currentStatus === 'SEWING') activeIdx = 3;
    else if (currentStatus === 'PRINTING') activeIdx = 4;
    else if (currentStatus === 'QC' || currentStatus === 'REWORK') activeIdx = 5;
    else if (currentStatus === 'PACKING') activeIdx = 6;
    else if (currentStatus === 'READY_TO_SHIP') activeIdx = 7;

    const thisIdx = stageOrder.indexOf(stageKey);

    if (thisIdx < activeIdx) return 'completed';
    if (thisIdx === activeIdx) return 'current';
    return 'waiting';
  };

  // Move order stage forward for interactive testing
  const handleAdvanceActiveOrder = () => {
    if (!activeTimelineOrder) return;
    const nextMap: Record<string, ProductionStatus> = {
      WAITING_VALIDATION: 'DESIGN',
      DESIGN: 'DESIGN_APPROVAL',
      DESIGN_APPROVAL: 'CUTTING',
      DESIGN_APPROVED: 'CUTTING',
      CUTTING: 'SEWING',
      SEWING: 'PRINTING',
      PRINTING: 'QC',
      QC: 'PACKING',
      PACKING: 'READY_TO_SHIP',
      READY_TO_SHIP: 'READY_TO_SHIP',
    };
    const next = nextMap[activeTimelineOrder?.productionStatus ?? 'WAITING_VALIDATION'] || 'SEWING';
    if (!activeTimelineOrder) return;
    updateStoredOrderStatus(activeTimelineOrder.orderId, next).then(setOrders);
  };

  // Analytics chart data derived from real orders, bucketed by calendar day
  // over the selected timeframe (last 7 or last 30 days from today).
  const chartData = useMemo(() => {
    const numDays = selectedTimeframe === '7d' ? 7 : 30;
    const dayLabels7 = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const buckets: { day: string; orders: number; revenue: number; volume: number }[] = [];
    for (let i = numDays - 1; i >= 0; i--) {
      const bucketDate = new Date(today);
      bucketDate.setDate(today.getDate() - i);
      const label =
        numDays === 7 ? dayLabels7[bucketDate.getDay()] : `${bucketDate.getDate()}/${bucketDate.getMonth() + 1}`;

      const ordersOnDay = orders.filter((o) => {
        const created = new Date(o.createdAt);
        return (
          created.getFullYear() === bucketDate.getFullYear() &&
          created.getMonth() === bucketDate.getMonth() &&
          created.getDate() === bucketDate.getDate()
        );
      });

      buckets.push({
        day: label,
        orders: ordersOnDay.length,
        revenue: ordersOnDay.reduce((sum, o) => sum + (o.totalPaid || 0), 0),
        volume: ordersOnDay.filter(
          (o) => o.productionStatus !== 'WAITING_VALIDATION' && o.productionStatus !== 'READY_TO_SHIP'
        ).length,
      });
    }
    return buckets;
  }, [orders, selectedTimeframe]);

  // Dynamic SVG path calculations for lightweight minimal line chart.
  // Scales to the actual peak value in the current dataset (with a sensible
  // floor) instead of an arbitrary hardcoded ceiling, so the line stays
  // readable whether the studio has 2 orders or 200.
  const maxValue = useMemo(() => {
    const key = activeMetricTab === 'revenue' ? 'revenue' : activeMetricTab === 'production' ? 'volume' : 'orders';
    const peak = Math.max(...chartData.map((d) => d[key]), 0);
    if (peak === 0) return activeMetricTab === 'revenue' ? 1000000 : 5;
    // Add ~20% headroom so the highest point isn't jammed against the top edge.
    return Math.ceil(peak * 1.2);
  }, [chartData, activeMetricTab]);

  const points = chartData.map((d, i) => {
    const val = activeMetricTab === 'revenue' ? d.revenue : activeMetricTab === 'production' ? d.volume : d.orders;
    // Chart plot area spans x=20 to x=555 (matches the grid lines below and
    // stays safely inside the 0-580 viewBox with margin to spare) - NOT the
    // full 595 previously used, which pushed the last point/label past the
    // viewBox and, combined with overflow-visible, made it bleed into the
    // neighboring "Aktivitas Pelanggan" card.
    const chartLeft = 20;
    const chartRight = 555;
    const x = chartData.length > 1 ? chartLeft + i * ((chartRight - chartLeft) / (chartData.length - 1)) : chartLeft;
    const y = 140 - (val / maxValue) * 110;
    return { x, y, ...d, val };
  });

  const svgPath = points.length > 0 ? `M ${points.map((p) => `${p.x},${p.y}`).join(' L ')}` : '';
  const areaPath =
    points.length > 0 ? `${svgPath} L ${points[points.length - 1].x},150 L ${points[0].x},150 Z` : '';

  // Recent activity feed derived from real orders (most recently created
  // first), rather than fabricated names and events.
  const activityFeed = useMemo(() => {
    const formatRelativeTime = (iso: string): string => {
      const diffMs = Date.now() - new Date(iso).getTime();
      const diffMin = Math.floor(diffMs / 60000);
      if (diffMin < 1) return 'baru saja';
      if (diffMin < 60) return `${diffMin} menit lalu`;
      const diffHour = Math.floor(diffMin / 60);
      if (diffHour < 24) return `${diffHour} jam lalu`;
      const diffDay = Math.floor(diffHour / 24);
      return `${diffDay} hari lalu`;
    };

    return [...orders]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
      .map((o) => ({
        id: o.orderId,
        text: `${o.customer} membuat pesanan ${o.isCustomOrder ? 'custom' : ''} baru${
          o.items?.[0]?.productName ? ` untuk ${o.items[0].productName}` : ''
        }.`,
        time: formatRelativeTime(o.createdAt),
        orderId: o.orderId,
      }));
  }, [orders]);

  if (isLoading && orders.length === 0) {
    return (
      <div className="space-y-7 animate-fade-in">
        <AdminTableSkeleton rows={4} />
        <AdminTableSkeleton rows={6} />
      </div>
    );
  }

  return (
    <div className="space-y-7 animate-fade-in">
      {/* Dashboard Human Header (Requirement 7) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-line">
        <div>
          <h2 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-ink flex items-center gap-2">
            <span>Selamat siang, Admin</span>
            <span className="text-xl">👋</span>
          </h2>
          <p className="text-xs sm:text-sm text-muted mt-0.5">
            Ringkasan cepat pesanan dan produksi hari ini.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="px-3 py-1.5 text-xs font-medium text-body hover:text-ink bg-surface hover:bg-surface-hover border border-line rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-accent' : ''}`} />
            <span>{isLoading ? 'Memperbarui...' : 'Perbarui'}</span>
          </button>

          <button
            onClick={() => navigate('/admin/orders')}
            className="px-3 py-1.5 text-xs font-semibold text-on-accent bg-accent hover:bg-accent-soft rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <span>Semua Pesanan</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-muted" />
          </button>
        </div>
      </div>

      {/* Quick Actions (Requirement 12) - Simple, lightweight buttons */}
      <div className="flex items-center justify-between flex-wrap gap-2 pt-1 pb-1">
        <span className="text-[11px] font-mono uppercase tracking-wider text-muted font-semibold">
          Aksi Cepat
        </span>
        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={() => navigate('/custom-order')}
            className="px-3 py-1.5 bg-surface hover:bg-accent-wash border border-line hover:border-accent-soft/60 text-xs font-medium text-ink rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-accent" />
            <span>Pesanan Baru</span>
          </button>
          <button
            onClick={() => navigate('/admin/products')}
            className="px-3 py-1.5 bg-surface hover:bg-surface-hover border border-line text-xs font-medium text-ink rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Package className="w-3.5 h-3.5 text-muted" />
            <span>Tambah Produk</span>
          </button>
          <button
            onClick={() => navigate('/admin/production')}
            className="px-3 py-1.5 bg-surface hover:bg-surface-hover border border-line text-xs font-medium text-ink rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Scissors className="w-3.5 h-3.5 text-muted" />
            <span>Lihat Produksi</span>
          </button>
          <button
            onClick={() => navigate('/admin/invoices')}
            className="px-3 py-1.5 bg-surface hover:bg-surface-hover border border-line text-xs font-medium text-ink rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-muted" />
            <span>Lihat Invoice</span>
          </button>
        </div>
      </div>

      {/* KPI Section (Requirement 8) - Lighter, editorial, compact info blocks */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="p-4 sm:p-5 bg-surface border border-line rounded-2xl space-y-2">
              <div className="h-3 w-20 skeleton-shimmer rounded" />
              <div className="h-7 w-16 skeleton-shimmer rounded mt-2" />
              <div className="h-3 w-24 skeleton-shimmer rounded mt-1" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Total Orders */}
          <div className="p-4 sm:p-5 bg-surface border border-line rounded-2xl flex flex-col justify-between transition-all hover:-translate-y-0.5 hover:border-accent-soft/40 hover:-translate-y-0.5 shadow-[0_4px_20px_rgba(28,27,26,0.06)]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider text-muted">
                TOTAL PESANAN
              </span>
              <div className="w-7 h-7 rounded-lg bg-accent-wash flex items-center justify-center shrink-0">
                <ShoppingBag className="w-3.5 h-3.5 text-accent" />
              </div>
            </div>
            <div className="my-2">
              <span className="font-heading text-2xl sm:text-3xl font-bold text-ink tracking-tight">
                {totalOrders}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-sage">
              <TrendingUp className="w-3 h-3" />
              <span className="font-medium">+12% bulan ini</span>
            </div>
          </div>

          {/* Pending Payment */}
          <div className="p-4 sm:p-5 bg-surface border border-line rounded-2xl flex flex-col justify-between transition-all hover:-translate-y-0.5 hover:border-warning/40 hover:-translate-y-0.5 shadow-[0_4px_20px_rgba(28,27,26,0.06)]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider text-muted">
                MENUNGGU PEMBAYARAN
              </span>
              <div className="w-7 h-7 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
                <Clock className="w-3.5 h-3.5 text-warning" />
              </div>
            </div>
            <div className="my-2">
              <span className="font-heading text-2xl sm:text-3xl font-bold text-ink tracking-tight">
                {pendingPayment}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-warning">
              <span className="w-1.5 h-1.5 rounded-full bg-warning" />
              <span>Perlu perhatian</span>
            </div>
          </div>

          {/* In Production */}
          <div className="p-4 sm:p-5 bg-surface border border-line rounded-2xl flex flex-col justify-between transition-all hover:-translate-y-0.5 hover:border-info/40 hover:-translate-y-0.5 shadow-[0_4px_20px_rgba(28,27,26,0.06)]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider text-muted">
                SEDANG PRODUKSI
              </span>
              <div className="w-7 h-7 rounded-lg bg-info/10 flex items-center justify-center shrink-0">
                <Scissors className="w-3.5 h-3.5 text-info" />
              </div>
            </div>
            <div className="my-2">
              <span className="font-heading text-2xl sm:text-3xl font-bold text-ink tracking-tight">
                {inProduction}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-info">
              <span className="w-1.5 h-1.5 rounded-full bg-info" />
              <span>Sedang berjalan</span>
            </div>
          </div>

          {/* Ready to Ship */}
          <div className="p-4 sm:p-5 bg-surface border border-line rounded-2xl flex flex-col justify-between transition-all hover:-translate-y-0.5 hover:border-sage/40 hover:-translate-y-0.5 shadow-[0_4px_20px_rgba(28,27,26,0.06)]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider text-muted">
                SIAP KIRIM
              </span>
              <div className="w-7 h-7 rounded-lg bg-sage/10 flex items-center justify-center shrink-0">
                <Truck className="w-3.5 h-3.5 text-sage" />
              </div>
            </div>
            <div className="my-2">
              <span className="font-heading text-2xl sm:text-3xl font-bold text-ink tracking-tight">
                {readyToShip}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-sage">
              <span className="w-1.5 h-1.5 rounded-full bg-sage" />
              <span>Siap diambil</span>
            </div>
          </div>
        </div>
      )}

      {/* Production Tracking (Requirement 11) - Distinctive horizontal on desktop, vertical on mobile */}
      <div className="p-4 sm:p-6 bg-surface border border-line rounded-2xl space-y-5 shadow-[0_4px_20px_rgba(28,27,26,0.06)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-muted">
                Progres Produksi
              </span>
              <span className="text-xs font-mono font-bold text-ink px-2 py-0.5 rounded bg-surface-hover">
                {activeTimelineOrder?.orderId || 'Belum ada pesanan'}
              </span>
            </div>
            <p className="text-xs text-body mt-0.5">
              Customer: <span className="font-semibold text-ink">{activeTimelineOrder?.customer}</span> •{' '}
              {activeTimelineOrder?.items[0]?.productName || activeTimelineOrder?.productType || 'Item Custom'} (
              {activeTimelineOrder?.quantity} pcs)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => activeTimelineOrder && navigate(`/admin/orders/${activeTimelineOrder.orderId}`)}
              disabled={!activeTimelineOrder}
              className="text-xs font-medium text-body hover:text-ink flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>Detail Pesanan</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleAdvanceActiveOrder}
              className="px-2.5 py-1 text-xs font-medium bg-accent-wash hover:bg-accent-wash text-accent rounded-lg transition-colors cursor-pointer"
              title="Simulasikan tahap berikutnya"
            >
              Tahap Berikutnya →
            </button>
          </div>
        </div>

        {/* Desktop Horizontal Timeline */}
        <div className="hidden md:flex items-center justify-between relative px-2 pt-2">
          {/* Subtle background connecting line */}
          <div className="absolute left-8 right-8 top-6 h-0.5 bg-line -z-0" />

          {productionStages.map((st, idx) => {
            const state = getStageState(st.key, activeTimelineOrder?.productionStatus ?? 'WAITING_VALIDATION');

            return (
              <div key={st.key} className="flex flex-col items-center relative z-10 text-center">
                {/* Node icon */}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                    state === 'completed'
                      ? 'bg-sage text-white shadow-xs'
                      : state === 'current'
                      ? 'bg-accent-soft text-on-accent ring-4 ring-paper'
                      : 'bg-surface border border-line-strong text-muted'
                  }`}
                >
                  {state === 'completed' ? (
                    <span className="text-xs font-bold">✓</span>
                  ) : state === 'current' ? (
                    <span className="w-2 h-2 rounded-full bg-surface animate-pulse" />
                  ) : (
                    <span className="text-[11px] font-mono">{idx + 1}</span>
                  )}
                </div>

                {/* Label & Status */}
                <span className="text-xs font-semibold text-ink mt-2 block">
                  {st.label}
                </span>
                <span
                  className={`text-[10px] font-mono mt-0.5 block ${
                    state === 'completed'
                      ? 'text-sage'
                      : state === 'current'
                      ? 'text-accent font-semibold'
                      : 'text-muted'
                  }`}
                >
                  {state === 'completed'
                    ? '✓ Selesai'
                    : state === 'current'
                    ? '● Berlangsung'
                    : '○ Menunggu'}
                </span>
              </div>
            );
          })}
        </div>

        {/* Mobile Vertical Timeline */}
        <div className="md:hidden space-y-3 pl-2">
          {productionStages.map((st, idx) => {
            const state = getStageState(st.key, activeTimelineOrder?.productionStatus ?? 'WAITING_VALIDATION');

            return (
              <div key={st.key} className="flex items-center gap-3">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                    state === 'completed'
                      ? 'bg-sage text-white'
                      : state === 'current'
                      ? 'bg-accent-soft text-on-accent ring-2 ring-paper'
                      : 'bg-surface border border-line-strong text-muted'
                  }`}
                >
                  {state === 'completed' ? (
                    <span className="text-[10px] font-bold">✓</span>
                  ) : state === 'current' ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-surface animate-pulse" />
                  ) : (
                    <span className="text-[10px] font-mono">{idx + 1}</span>
                  )}
                </div>
                <div className="flex-1 flex items-center justify-between text-xs">
                  <span className="font-semibold text-ink">{st.label}</span>
                  <span
                    className={`text-[10px] font-mono ${
                      state === 'completed'
                        ? 'text-sage'
                        : state === 'current'
                        ? 'text-accent font-semibold'
                        : 'text-muted'
                    }`}
                  >
                    {state === 'completed'
                      ? 'Selesai'
                      : state === 'current'
                      ? 'Berlangsung'
                      : 'Menunggu'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Analytics & Activity Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sales / Order Analytics (Requirement 13) - Minimal, line/area, easy to scan in 2-3 seconds */}
        <div className="lg:col-span-8 min-w-0 p-4 sm:p-5 bg-surface border border-line rounded-2xl space-y-4 shadow-[0_4px_20px_rgba(28,27,26,0.06)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line pb-3">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-muted">
                Volume &amp; Tren
              </span>
              <h3 className="font-heading text-sm sm:text-base font-bold text-ink">
                Performa Mingguan
              </h3>
            </div>

            {/* Metric Selector Tabs */}
            <div className="flex items-center p-0.5 bg-surface-hover rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setActiveMetricTab('orders')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  activeMetricTab === 'orders'
                    ? 'bg-surface text-ink font-semibold shadow-2xs'
                    : 'text-muted hover:text-ink'
                }`}
              >
                Pesanan
              </button>
              <button
                type="button"
                onClick={() => setActiveMetricTab('revenue')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  activeMetricTab === 'revenue'
                    ? 'bg-surface text-ink font-semibold shadow-2xs'
                    : 'text-muted hover:text-ink'
                }`}
              >
                Pendapatan
              </button>
              <button
                type="button"
                onClick={() => setActiveMetricTab('production')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  activeMetricTab === 'production'
                    ? 'bg-surface text-ink font-semibold shadow-2xs'
                    : 'text-muted hover:text-ink'
                }`}
              >
                Produksi
              </button>
            </div>
          </div>

          {/* Minimal SVG Line Chart */}
          <div className="relative pt-2 overflow-hidden rounded-lg">
            <svg
              viewBox="0 0 580 160"
              className="w-full h-44 overflow-hidden"
              preserveAspectRatio="none"
            >
              {/* Horizontal grid lines */}
              <line x1="20" y1="30" x2="560" y2="30" stroke="var(--color-line)" strokeDasharray="3 3" />
              <line x1="20" y1="85" x2="560" y2="85" stroke="var(--color-line)" strokeDasharray="3 3" />
              <line x1="20" y1="140" x2="560" y2="140" stroke="var(--color-line)" />

              {/* Gradient Area under line */}
              <defs>
                <linearGradient id="chartAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-accent-soft)" stopOpacity="0.16" />
                  <stop offset="100%" stopColor="var(--color-accent-soft)" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d={areaPath} fill="url(#chartAreaGradient)" />

              {/* Minimal Line */}
              <path
                d={svgPath}
                fill="none"
                stroke="var(--color-accent-soft)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Points */}
              {points.map((pt, idx) => (
                <g key={pt.day} className="cursor-pointer">
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={activeHoverPoint === idx ? 5 : 3.5}
                    className="transition-all"
                    fill={activeHoverPoint === idx ? 'var(--color-ink)' : 'var(--color-accent-soft)'}
                    stroke="var(--color-surface)"
                    strokeWidth="2"
                    onMouseEnter={() => setActiveHoverPoint(idx)}
                    onMouseLeave={() => setActiveHoverPoint(null)}
                  />
                  {/* Day Label */}
                  <text
                    x={pt.x}
                    y="155"
                    textAnchor="middle"
                    className="text-[10px] fill-muted font-mono"
                  >
                    {pt.day}
                  </text>
                </g>
              ))}
            </svg>

            {/* Hover Tooltip display */}
            {activeHoverPoint !== null && chartData[activeHoverPoint] && (
              <div
                className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-ink text-paper text-xs rounded-md shadow-lg pointer-events-none flex items-center gap-2"
              >
                <span className="font-mono text-[11px] text-accent">
                  {chartData[activeHoverPoint].day}:
                </span>
                <span className="font-semibold">
                  {activeMetricTab === 'revenue'
                    ? formatIDR(chartData[activeHoverPoint].revenue)
                    : activeMetricTab === 'production'
                    ? `${chartData[activeHoverPoint].volume} pcs diproduksi`
                    : `${chartData[activeHoverPoint].orders} pesanan`}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Customer Activity Feed (Requirement 14) */}
        <div className="lg:col-span-4 min-w-0 p-4 sm:p-5 bg-surface border border-line rounded-2xl space-y-3.5 shadow-[0_4px_20px_rgba(28,27,26,0.06)]">
          <div className="flex items-center justify-between border-b border-line pb-2.5">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-muted">
                Aktivitas Studio Langsung
              </span>
              <h3 className="font-heading text-sm font-bold text-ink">
                Aktivitas Pelanggan
              </h3>
            </div>
            <span className="w-2 h-2 rounded-full bg-sage animate-pulse" />
          </div>

          <div className="space-y-3 overflow-y-auto max-h-56 divide-y divide-line">
            {activityFeed.map((act) => (
              <div
                key={act.id}
                onClick={() => navigate(`/admin/orders/${act.orderId}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate(`/admin/orders/${act.orderId}`);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={`Buka pesanan ${act.orderId}`}
                className="pt-2.5 first:pt-0 hover:bg-surface-hover p-1.5 rounded-lg transition-colors cursor-pointer text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
              >
                <p className="text-ink leading-snug font-medium">{act.text}</p>
                <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 justify-between mt-1 text-[10px] text-muted font-mono">
                  <span>{act.time}</span>
                  <span className="text-accent hover:underline font-semibold truncate max-w-full">
                    {act.orderId} →
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ORDER OVERVIEW (Requirement 9 & 18) - Recent Orders Table */}
      <div className="p-4 sm:p-6 bg-surface border border-line rounded-2xl space-y-4 shadow-[0_4px_20px_rgba(28,27,26,0.06)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line pb-3">
          <div>
            <h3 className="font-heading text-base font-bold text-ink">
              Pesanan Terbaru
            </h3>
            <p className="text-xs text-muted mt-0.5">
              Pantau permintaan terbaru dari pelanggan.
            </p>
          </div>

          <button
            onClick={() => navigate('/admin/orders')}
            className="text-xs font-semibold text-accent hover:text-accent-soft flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>Lihat semua pesanan ({orders.length})</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Lightweight Table */}
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-line text-muted font-mono text-[11px] uppercase tracking-wider">
                <th className="py-2.5 px-3 font-medium">Pesanan</th>
                <th className="py-2.5 px-3 font-medium">Pelanggan</th>
                <th className="py-2.5 px-3 font-medium">Produk</th>
                <th className="py-2.5 px-3 font-medium">Pembayaran</th>
                <th className="py-2.5 px-3 font-medium">Produksi</th>
                <th className="py-2.5 px-3 font-medium">Pengiriman</th>
                <th className="py-2.5 px-3 font-medium">Tanggal</th>
                <th className="py-2.5 px-3 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {orders.slice(0, 6).map((order) => (
                <tr
                  key={order.orderId}
                  onClick={() => navigate(`/admin/orders/${order.orderId}`)}
                  className="group hover:bg-surface-hover transition-colors cursor-pointer"
                >
                  {/* Order ID */}
                  <td className="py-3 px-3 font-mono font-semibold text-ink">
                    {order.orderId}
                  </td>

                  {/* Customer */}
                  <td className="py-3 px-3">
                    <p className="font-semibold text-ink leading-none">{order.customer}</p>
                    <span className="text-[11px] text-muted font-mono mt-1 block">
                      {order.phone}
                    </span>
                  </td>

                  {/* Product */}
                  <td className="py-3 px-3 max-w-xs">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded uppercase ${
                          order.isCustomOrder
                            ? 'bg-accent-wash text-accent'
                            : 'bg-surface-hover text-body'
                        }`}
                      >
                        {order.isCustomOrder ? 'Custom' : 'Katalog'}
                      </span>
                      <span className="text-ink truncate font-medium">
                        {order.items[0]?.productName || order.productType || 'Pakaian'}
                      </span>
                    </div>
                  </td>

                  {/* Payment */}
                  <td className="py-3 px-3">
                    {renderPaymentStatus(order.paymentStatus)}
                  </td>

                  {/* Production */}
                  <td className="py-3 px-3">
                    {renderProductionStatus(order.productionStatus)}
                  </td>

                  {/* Shipping */}
                  <td className="py-3 px-3 text-[11px] font-mono text-body">
                    {formatShippingStatusLabel(order.shippingStatus)}
                  </td>

                  {/* Date */}
                  <td className="py-3 px-3 font-mono text-[11px] text-muted">
                    {formatDate(order.createdAt)}
                  </td>

                  {/* Action */}
                  <td className="py-3 px-3 text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/admin/orders/${order.orderId}`);
                      }}
                      className="opacity-70 group-hover:opacity-100 px-2.5 py-1 bg-surface hover:bg-accent-wash border border-line hover:border-accent-soft text-ink hover:text-accent rounded-md font-medium text-xs transition-all cursor-pointer shadow-2xs"
                    >
                      Detail
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
