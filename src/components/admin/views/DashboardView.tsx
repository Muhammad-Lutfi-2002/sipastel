import React, { useState, useMemo, useEffect } from 'react';
import {
  ShoppingBag,
  Clock,
  Scissors,
  Truck,
  ArrowUpRight,
  RefreshCw,
  Inbox,
  TrendingUp,
  TrendingDown,
  FileText,
  Package,
  ChevronRight,
} from 'lucide-react';
import { Order, ProductionStatus } from '../../../types';
import { updateStoredOrderStatus, fetchValidPaymentsSince } from '../../../utils/storage';
import { formatDate, formatIDR, formatShippingStatusLabel, getGreeting, formatProductionStatusLabel } from '../../../utils/formatters';
import { getNextProductionStep, isInProduction, isOnProductionBoard } from '../../../utils/workflow';
import { useRouter } from '../../../context/RouterContext';
import { useAuth } from '../../../context/AuthContext';
import { useOrders } from '../../../hooks/useOrders';
import { AdminTableSkeleton } from '../../Skeleton';
import { useAdminToast } from '../AdminToast';
import { PaymentBadge, ProductionBadge } from '../StatusBadges';
import { LoadErrorBanner } from '../LoadErrorBanner';

const DAY_LABELS_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

function sameLocalDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export const DashboardView: React.FC = () => {
  const { orders, isLoading, isRefreshing, error, refresh, patchOrder } = useOrders();
  const { user, hasPermission } = useAuth();
  const { navigate } = useRouter();
  const { showToast } = useAdminToast();

  const canSeeFinance = hasPermission('finance:read');
  const canAdvance = hasPermission('production:write');

  const [selectedTimeframe, setSelectedTimeframe] = useState<'7d' | '30d'>('7d');
  const [activeMetricTab, setActiveMetricTab] = useState<'orders' | 'revenue' | 'production'>('orders');
  const [activeHoverPoint, setActiveHoverPoint] = useState<number | null>(null);
  const [payments, setPayments] = useState<{ paidAt: string; amount: number }[]>([]);
  const [paymentsError, setPaymentsError] = useState<string | null>(null);
  const [isAdvancing, setIsAdvancing] = useState(false);

  // Reset the hovered chart point whenever the timeframe changes so a stale
  // index from a longer series (e.g. 30d) can't point past the end of a
  // shorter one (7d) and crash the tooltip lookup.
  useEffect(() => {
    setActiveHoverPoint(null);
  }, [selectedTimeframe, activeMetricTab]);

  // Roles without finance access never see the revenue tab; make sure a
  // stale selection can't leave them on it.
  useEffect(() => {
    if (!canSeeFinance && activeMetricTab === 'revenue') setActiveMetricTab('orders');
  }, [canSeeFinance, activeMetricTab]);

  // Revenue is attributed to the day the money arrived (payments ledger),
  // not to the day the order was created.
  useEffect(() => {
    if (!canSeeFinance) return;
    let cancelled = false;
    const numDays = selectedTimeframe === '7d' ? 7 : 30;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (numDays - 1));
    fetchValidPaymentsSince(start.toISOString()).then((res) => {
      if (cancelled) return;
      setPayments(res.data);
      setPaymentsError(res.error);
    });
    return () => {
      cancelled = true;
    };
  }, [canSeeFinance, selectedTimeframe]);

  // Highlighted order for the Production Tracking timeline
  const [selectedTimelineOrderId, setSelectedTimelineOrderId] = useState<string>('');

  const timelineCandidates = useMemo(() => orders.filter(isOnProductionBoard).slice(0, 30), [orders]);

  useEffect(() => {
    setSelectedTimelineOrderId((prev) => {
      if (prev && orders.some((o) => o.orderId === prev)) return prev;
      return (
        timelineCandidates.find((o) => o.isCustomOrder)?.orderId || timelineCandidates[0]?.orderId || orders[0]?.orderId || ''
      );
    });
  }, [orders, timelineCandidates]);

  const activeTimelineOrder = useMemo(
    () => orders.find((o) => o.orderId === selectedTimelineOrderId),
    [orders, selectedTimelineOrderId]
  );

  const handleRefresh = async () => {
    const ok = await refresh();
    if (!ok) showToast('Gagal memperbarui dashboard. Data lama tetap ditampilkan.', 'error');
  };

  // KPI metrics, all derived from the orders actually loaded.
  const totalOrders = orders.length;
  const pendingPayment = orders.filter((o) => o.paymentStatus !== 'LUNAS' && (o.totalPrice ?? 0) > 0).length;
  const inProduction = orders.filter(isInProduction).length;
  const readyToShip = orders.filter((o) => o.productionStatus === 'READY_TO_SHIP' && o.shippingStatus === 'NOT_SHIPPED').length;

  // Real month-over-month trend for the "Total Pesanan" card (replaces the
  // hard-coded "+12%" that used to be shown here).
  const monthTrend = useMemo(() => {
    const now = new Date();
    const thisMonth = orders.filter((o) => {
      const d = new Date(o.createdAt);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }).length;
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonth = orders.filter((o) => {
      const d = new Date(o.createdAt);
      return d.getFullYear() === prev.getFullYear() && d.getMonth() === prev.getMonth();
    }).length;
    const pct = lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : null;
    return { thisMonth, lastMonth, pct };
  }, [orders]);

  // Production Tracking stages definition
  const productionStages = [
    { key: 'DESIGN', label: 'Desain' },
    { key: 'APPROVAL', label: 'Persetujuan' },
    { key: 'CUTTING', label: 'Potong Bahan' },
    { key: 'SEWING', label: 'Jahit' },
    { key: 'PRINTING', label: 'Sablon/Bordir' },
    { key: 'QC', label: 'QC' },
    { key: 'PACKING', label: 'Packing' },
  ];

  // Derive stage index for the active order
  const getStageState = (stageKey: string, currentStatus: ProductionStatus) => {
    const stageOrder = ['DESIGN', 'APPROVAL', 'CUTTING', 'SEWING', 'PRINTING', 'QC', 'PACKING', 'READY_TO_SHIP'];

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

  // Moves the highlighted order one step along the SAME pipeline the
  // production board uses (workflow.ts), for users allowed to do so. The
  // screen is rolled back if the database refuses the change.
  const nextStep = activeTimelineOrder && isOnProductionBoard(activeTimelineOrder)
    ? getNextProductionStep(activeTimelineOrder.productionStatus)
    : null;

  const handleAdvanceActiveOrder = async () => {
    if (!activeTimelineOrder || !nextStep || isAdvancing) return;
    const previous = activeTimelineOrder.productionStatus;
    setIsAdvancing(true);
    patchOrder(activeTimelineOrder.orderId, { productionStatus: nextStep.next });
    const result = await updateStoredOrderStatus(activeTimelineOrder.orderId, nextStep.next);
    setIsAdvancing(false);
    if (result.success) {
      showToast(`${activeTimelineOrder.orderId} dipindahkan ke ${formatProductionStatusLabel(nextStep.next)}.`, 'success');
    } else {
      patchOrder(activeTimelineOrder.orderId, { productionStatus: previous });
      showToast(result.error ?? 'Gagal memindahkan pesanan.', 'error');
    }
  };

  // Analytics chart data, bucketed by calendar day over the selected
  // timeframe (last 7 or last 30 days from today).
  const chartData = useMemo(() => {
    const numDays = selectedTimeframe === '7d' ? 7 : 30;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const buckets: { day: string; orders: number; revenue: number; volume: number }[] = [];
    for (let i = numDays - 1; i >= 0; i--) {
      const bucketDate = new Date(today);
      bucketDate.setDate(today.getDate() - i);
      const label =
        numDays === 7 ? DAY_LABELS_ID[bucketDate.getDay()] : `${bucketDate.getDate()}/${bucketDate.getMonth() + 1}`;

      const ordersOnDay = orders.filter((o) => sameLocalDay(new Date(o.createdAt), bucketDate));
      const paidOnDay = payments.filter((p) => sameLocalDay(new Date(p.paidAt), bucketDate));

      buckets.push({
        day: label,
        orders: ordersOnDay.length,
        revenue: paidOnDay.reduce((sum, p) => sum + p.amount, 0),
        // Pieces of orders received that day that are currently in production.
        volume: ordersOnDay.filter(isInProduction).reduce((sum, o) => sum + (o.quantity || 0), 0),
      });
    }
    return buckets;
  }, [orders, payments, selectedTimeframe]);

  // Scales to the actual peak value in the current dataset (with a sensible
  // floor) so the line stays readable whether the studio has 2 orders or 200.
  const maxValue = useMemo(() => {
    const key = activeMetricTab === 'revenue' ? 'revenue' : activeMetricTab === 'production' ? 'volume' : 'orders';
    const peak = Math.max(...chartData.map((d) => d[key]), 0);
    if (peak === 0) return activeMetricTab === 'revenue' ? 1000000 : 5;
    return Math.ceil(peak * 1.2);
  }, [chartData, activeMetricTab]);

  const points = chartData.map((d, i) => {
    const val = activeMetricTab === 'revenue' ? d.revenue : activeMetricTab === 'production' ? d.volume : d.orders;
    // Plot area spans x=20..555, safely inside the 0-580 viewBox.
    const chartLeft = 20;
    const chartRight = 555;
    const x = chartData.length > 1 ? chartLeft + i * ((chartRight - chartLeft) / (chartData.length - 1)) : chartLeft;
    const y = 140 - (val / maxValue) * 110;
    return { x, y, ...d, val };
  });

  const svgPath = points.length > 0 ? `M ${points.map((p) => `${p.x},${p.y}`).join(' L ')}` : '';
  const areaPath =
    points.length > 0 ? `${svgPath} L ${points[points.length - 1].x},150 L ${points[0].x},150 Z` : '';

  // Recent activity feed derived from real orders (most recently created first).
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
        text: `${o.customer} membuat pesanan${o.isCustomOrder ? ' custom' : ''} baru${
          o.items?.[0]?.productName ? ` untuk ${o.items[0].productName}` : ''
        }.`,
        time: formatRelativeTime(o.createdAt),
        orderId: o.orderId,
      }));
  }, [orders]);

  const goToOrder = (orderId: string) => navigate(`/admin/orders/${encodeURIComponent(orderId)}`);
  const firstName = user?.name?.split(' ')[0] || 'Tim Studio';

  if (isLoading) {
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
            <span>
              {getGreeting()}, {firstName}
            </span>
            <span className="text-xl" aria-hidden="true">👋</span>
          </h2>
          <p className="text-sm text-muted mt-0.5">
            Ringkasan cepat pesanan dan produksi hari ini.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-3 py-1.5 text-xs font-medium text-body hover:text-ink bg-surface hover:bg-surface-hover border border-line rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-accent' : ''}`} aria-hidden="true" />
            <span>{isRefreshing ? 'Memperbarui...' : 'Perbarui'}</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/admin/orders')}
            className="px-3 py-1.5 text-xs font-semibold text-on-accent bg-accent hover:bg-accent-soft rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <span>Semua Pesanan</span>
            <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
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
            type="button"
            onClick={() => navigate('/admin/orders?status=new')}
            className="px-3 py-1.5 bg-surface hover:bg-accent-wash border border-line hover:border-accent-soft/60 text-xs font-medium text-ink rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Inbox className="w-3.5 h-3.5 text-accent" aria-hidden="true" />
            <span>Pesanan Masuk</span>
          </button>
          {hasPermission('products:write') && (
            <button
              type="button"
              onClick={() => navigate('/admin/products')}
              className="px-3 py-1.5 bg-surface hover:bg-surface-hover border border-line text-xs font-medium text-ink rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Package className="w-3.5 h-3.5 text-muted" aria-hidden="true" />
              <span>Kelola Produk</span>
            </button>
          )}
          {hasPermission('production:read') && (
            <button
              type="button"
              onClick={() => navigate('/admin/production')}
              className="px-3 py-1.5 bg-surface hover:bg-surface-hover border border-line text-xs font-medium text-ink rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Scissors className="w-3.5 h-3.5 text-muted" aria-hidden="true" />
              <span>Lihat Produksi</span>
            </button>
          )}
          {hasPermission('invoices:read') && (
            <button
              type="button"
              onClick={() => navigate('/admin/invoices')}
              className="px-3 py-1.5 bg-surface hover:bg-surface-hover border border-line text-xs font-medium text-ink rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-muted" aria-hidden="true" />
              <span>Lihat Invoice</span>
            </button>
          )}
        </div>
      </div>

      {error && <LoadErrorBanner message={error} onRetry={handleRefresh} isRetrying={isRefreshing} hasStaleData={orders.length > 0} />}

      {/* KPI Section (Requirement 8) - Lighter, editorial, compact info blocks */}
      {(
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
            <div
              className={`flex items-center gap-1.5 text-xs ${
                monthTrend.pct === null ? 'text-muted' : monthTrend.pct >= 0 ? 'text-sage' : 'text-danger'
              }`}
            >
              {monthTrend.pct !== null && monthTrend.pct < 0 ? (
                <TrendingDown className="w-3 h-3" aria-hidden="true" />
              ) : (
                <TrendingUp className="w-3 h-3" aria-hidden="true" />
              )}
              <span className="font-medium">
                {monthTrend.thisMonth} bulan ini
                {monthTrend.pct !== null && ` (${monthTrend.pct >= 0 ? '+' : ''}${monthTrend.pct}% vs bulan lalu)`}
              </span>
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
              <span>Menunggu pengiriman</span>
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
            <p className="text-sm text-body mt-0.5">
              {activeTimelineOrder ? (
                <>
                  Customer: <span className="font-semibold text-ink">{activeTimelineOrder.customer}</span> •{' '}
                  {activeTimelineOrder.items[0]?.productName || activeTimelineOrder.productType || 'Item Custom'} ({activeTimelineOrder.quantity} pcs)
                </>
              ) : (
                'Belum ada pesanan untuk dilacak.'
              )}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {timelineCandidates.length > 1 && (
              <select
                value={selectedTimelineOrderId}
                onChange={(e) => setSelectedTimelineOrderId(e.target.value)}
                aria-label="Pilih pesanan untuk dilacak"
                className="px-2 py-1 bg-paper border border-line rounded-lg text-xs text-body focus:outline-hidden cursor-pointer max-w-44"
              >
                {timelineCandidates.map((o) => (
                  <option key={o.orderId} value={o.orderId}>
                    {o.orderId} · {o.customer}
                  </option>
                ))}
              </select>
            )}
            <button
              type="button"
              onClick={() => activeTimelineOrder && goToOrder(activeTimelineOrder.orderId)}
              disabled={!activeTimelineOrder}
              className="text-xs font-medium text-body hover:text-ink flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>Detail Pesanan</span>
              <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            {canAdvance && nextStep && (
              <button
                type="button"
                onClick={handleAdvanceActiveOrder}
                disabled={isAdvancing}
                className="px-2.5 py-1 text-xs font-medium bg-accent-wash hover:bg-accent/15 text-accent rounded-lg transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-wait"
              >
                {nextStep.label} →
              </button>
            )}
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
                  className={`text-[11px] font-mono mt-0.5 block ${
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
                    <span className="text-[11px] font-bold">✓</span>
                  ) : state === 'current' ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-surface animate-pulse" />
                  ) : (
                    <span className="text-[11px] font-mono">{idx + 1}</span>
                  )}
                </div>
                <div className="flex-1 flex items-center justify-between text-xs">
                  <span className="font-semibold text-ink">{st.label}</span>
                  <span
                    className={`text-[11px] font-mono ${
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
                {selectedTimeframe === '7d' ? 'Performa 7 Hari Terakhir' : 'Performa 30 Hari Terakhir'}
              </h3>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center p-0.5 bg-surface-hover rounded-lg text-xs" role="group" aria-label="Rentang waktu">
              {(['7d', '30d'] as const).map((tf) => (
                <button
                  key={tf}
                  type="button"
                  aria-pressed={selectedTimeframe === tf}
                  onClick={() => setSelectedTimeframe(tf)}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    selectedTimeframe === tf ? 'bg-surface text-ink font-semibold shadow-2xs' : 'text-muted hover:text-ink'
                  }`}
                >
                  {tf === '7d' ? '7 Hari' : '30 Hari'}
                </button>
              ))}
            </div>

            {/* Metric Selector Tabs */}
            <div className="flex items-center p-0.5 bg-surface-hover rounded-lg text-xs" role="group" aria-label="Metrik grafik">
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
              {canSeeFinance && (
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
              )}
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
          </div>

          {paymentsError && activeMetricTab === 'revenue' && (
            <p role="alert" className="text-xs text-danger">Data pendapatan gagal dimuat: {paymentsError}</p>
          )}

          {/* Minimal SVG Line Chart */}
          <div className="relative pt-2 overflow-hidden rounded-lg">
            <svg
              viewBox="0 0 580 160"
              className="w-full h-44 overflow-hidden"
              preserveAspectRatio="none"
              role="img"
              aria-label={`Grafik ${activeMetricTab === 'revenue' ? 'pendapatan' : activeMetricTab === 'production' ? 'produksi' : 'pesanan'} ${selectedTimeframe === '7d' ? '7' : '30'} hari terakhir`}
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
                    onClick={() => setActiveHoverPoint((cur) => (cur === idx ? null : idx))}
                  />
                  {/* Day Label (every 5th on the 30-day view to avoid overlap) */}
                  {(chartData.length <= 7 || idx % 5 === 0) && (
                  <text
                    x={pt.x}
                    y="155"
                    textAnchor="middle"
                    className="text-[11px] fill-muted font-mono"
                  >
                    {pt.day}
                  </text>
                  )}
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
                Terbaru
              </span>
              <h3 className="font-heading text-sm font-bold text-ink">
                Aktivitas Pelanggan
              </h3>
            </div>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-56 divide-y divide-line">
            {activityFeed.length === 0 && <p className="text-xs text-muted pt-1">Belum ada aktivitas.</p>}
            {activityFeed.map((act) => (
              <button
                key={act.id}
                type="button"
                onClick={() => goToOrder(act.orderId)}
                className="block w-full text-left pt-2.5 first:pt-0 hover:bg-surface-hover p-1.5 rounded-lg transition-colors cursor-pointer text-xs"
              >
                <p className="text-ink leading-snug font-medium">{act.text}</p>
                <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 justify-between mt-1 text-[11px] text-muted font-mono">
                  <span>{act.time}</span>
                  <span className="text-accent font-semibold truncate max-w-full">{act.orderId} →</span>
                </div>
              </button>
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
            type="button"
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
              {orders.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-xs text-muted">Belum ada pesanan masuk.</td>
                </tr>
              )}
              {orders.slice(0, 6).map((order) => (
                <tr
                  key={order.orderId}
                  onClick={() => goToOrder(order.orderId)}
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
                        className={`text-[11px] font-mono font-semibold px-1.5 py-0.2 rounded uppercase ${
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
                    <PaymentBadge status={order.paymentStatus} />
                  </td>

                  {/* Production */}
                  <td className="py-3 px-3">
                    <ProductionBadge status={order.productionStatus} />
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
                        goToOrder(order.orderId);
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
