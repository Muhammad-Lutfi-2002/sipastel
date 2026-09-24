import React, { useState, useRef } from 'react';
import {
  Scissors,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  Clock,
  Palette,
  Printer,
  Package,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { Order, ProductionStatus } from '../../../types';
import { updateStoredOrderStatus } from '../../../utils/storage';
import { formatProductionStatusLabel } from '../../../utils/formatters';
import { getNextProductionStep, isOnProductionBoard } from '../../../utils/workflow';
import { useRouter } from '../../../context/RouterContext';
import { useAuth } from '../../../context/AuthContext';
import { useOrders } from '../../../hooks/useOrders';
import { AdminTableSkeleton } from '../../Skeleton';
import { useAdminToast } from '../AdminToast';
import { LoadErrorBanner } from '../LoadErrorBanner';

// The board re-fetches by itself so several people watching it stay in sync.
const BOARD_REFRESH_MS = 60_000;

export const ProductionView: React.FC = () => {
  const { orders, isLoading, isRefreshing, error, refresh, patchOrder } = useOrders({ pollMs: BOARD_REFRESH_MS });
  const { searchParams, navigate } = useRouter();
  const { hasPermission } = useAuth();
  const { showToast } = useAdminToast();
  const canAdvance = hasPermission('production:write');

  const [advancingId, setAdvancingId] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Stage filter lives in the URL (?stage=design) so it survives refresh/back.
  const stageParam = searchParams.get('stage');
  const activeStageFilter: string = stageParam === 'design' || stageParam === 'qc' ? stageParam : 'ALL';

  const setStageFilter = (stage: 'ALL' | 'design' | 'qc') => {
    navigate(stage === 'ALL' ? '/admin/production' : `/admin/production?stage=${stage}`, {
      replace: true,
      scroll: false,
    });
  };

  const handleRefresh = async () => {
    const ok = await refresh();
    if (!ok) showToast('Gagal memperbarui papan produksi. Data lama tetap ditampilkan.', 'error');
  };

  // Move one order one step forward. The screen updates immediately, and is
  // put back if the database refuses (permissions, network, ...) - it must
  // never keep showing a stage that was not actually saved.
  const advanceStage = async (order: Order, nextStatus: ProductionStatus) => {
    if (!canAdvance) {
      showToast('Peran Anda tidak memiliki izin memindahkan tahap produksi.', 'error');
      return;
    }
    if (advancingId) return;

    const previousStatus = order.productionStatus;
    setAdvancingId(order.orderId);
    patchOrder(order.orderId, { productionStatus: nextStatus });

    const result = await updateStoredOrderStatus(order.orderId, nextStatus);
    setAdvancingId(null);

    if (result.success) {
      showToast(`Pesanan ${order.orderId} dipindahkan ke ${formatProductionStatusLabel(nextStatus)}.`, 'success');
    } else {
      patchOrder(order.orderId, { productionStatus: previousStatus });
      showToast(result.error ?? 'Gagal memindahkan pesanan.', 'error');
    }
  };

  // Workshop stages pipeline in sequential tracking order
  const stages: {
    id: string;
    stepNumber: string;
    title: string;
    icon: React.ElementType;
    description: string;
    accentColor: string;
    matcher: (o: Order) => boolean;
  }[] = [
    {
      id: 'validation',
      stepNumber: '01',
      title: 'Antrean & Peninjauan',
      icon: Clock,
      description: 'Verifikasi ukuran pola & brief',
      accentColor: 'var(--color-muted)',
      matcher: (o) => o.productionStatus === 'WAITING_VALIDATION' || o.productionStatus === 'PRODUCTION_QUEUE',
    },
    {
      id: 'design',
      stepNumber: '02',
      title: 'Desain & Mockup',
      icon: Palette,
      description: 'Vektorisasi desain & persetujuan',
      accentColor: 'var(--color-accent-soft)',
      matcher: (o) =>
        o.productionStatus === 'DESIGN' ||
        o.productionStatus === 'DESIGN_APPROVAL' ||
        o.productionStatus === 'DESIGN_REVISION' ||
        o.productionStatus === 'DESIGN_APPROVED',
    },
    {
      id: 'cutting_sewing',
      stepNumber: '03',
      title: 'Potong Bahan & Jahit',
      icon: Scissors,
      description: 'Pemotongan kain & perakitan jahitan',
      accentColor: 'var(--color-warning)',
      matcher: (o) => o.productionStatus === 'CUTTING' || o.productionStatus === 'SEWING',
    },
    {
      id: 'printing',
      stepNumber: '04',
      title: 'Sablon Sublimasi',
      icon: Printer,
      description: 'Heat-press & heat transfer printing',
      accentColor: 'var(--color-info)',
      matcher: (o) => o.productionStatus === 'PRINTING',
    },
    {
      id: 'qc',
      stepNumber: '05',
      title: 'Quality Control',
      icon: CheckCircle2,
      description: 'Pemeriksaan dimensi & pembersihan benang',
      accentColor: 'var(--color-sage)',
      matcher: (o) => o.productionStatus === 'QC' || o.productionStatus === 'REWORK',
    },
    {
      id: 'packing',
      stepNumber: '06',
      title: 'Packing & Siap Kirim',
      icon: Package,
      description: 'Setrika, pemberian tag & pengemasan',
      accentColor: 'var(--color-info)',
      matcher: (o) => o.productionStatus === 'PACKING' || o.productionStatus === 'READY_TO_SHIP',
    },
  ];

  const displayedStages = activeStageFilter === 'ALL'
    ? stages
    : stages.filter((st) => st.id === activeStageFilter);

  // Horizontal scroll helpers
  const scrollHorizontal = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollOffset = 360;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollOffset : scrollOffset,
        behavior: 'smooth',
      });
    }
  };

  const scrollToStage = (stageId: string) => {
    setStageFilter('ALL');
    setTimeout(() => {
      const stageElem = document.getElementById(`lane-${stageId}`);
      if (stageElem && scrollContainerRef.current) {
        const containerLeft = scrollContainerRef.current.getBoundingClientRect().left;
        const elemLeft = stageElem.getBoundingClientRect().left;
        scrollContainerRef.current.scrollBy({
          left: elemLeft - containerLeft - 16,
          behavior: 'smooth',
        });
      }
    }, 50);
  };

  // Orders that already left the workshop (shipping started) no longer
  // belong on the board.
  const boardOrders = orders.filter(isOnProductionBoard);

  // Pipeline summary: everything on the board that is not yet ready to ship.
  const activeOrders = boardOrders.filter((o) => o.productionStatus !== 'READY_TO_SHIP');
  const totalOrdersInProduction = activeOrders.length;
  const totalGarments = activeOrders.reduce((sum, o) => sum + (o.quantity || 0), 0);

  if (isLoading) {
    return (
      <div className="space-y-5 animate-fade-in">
        <AdminTableSkeleton rows={6} />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-ink">
              Alur Pelacakan Produksi
            </h2>
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-accent-wash text-accent">
              <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
              Diperbarui otomatis tiap 1 menit
            </span>
          </div>
          <p className="text-sm text-muted mt-0.5">
            Alur pelacakan berkelanjutan dari tinjauan ukuran awal hingga pengemasan akhir.
          </p>
        </div>

        {/* Action Buttons & Stage Quick Nav */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Stage filter tabs */}
          <div className="flex items-center p-0.5 bg-surface-hover rounded-lg text-xs">
            <button
              type="button"
              onClick={() => setStageFilter('ALL')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                activeStageFilter === 'ALL'
                  ? 'bg-surface text-ink font-semibold shadow-2xs'
                  : 'text-muted hover:text-ink'
              }`}
            >
              Semua Lini
            </button>
            <button
              type="button"
              onClick={() => setStageFilter('design')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                activeStageFilter === 'design'
                  ? 'bg-surface text-ink font-semibold shadow-2xs'
                  : 'text-muted hover:text-ink'
              }`}
            >
              Desain
            </button>
            <button
              type="button"
              onClick={() => setStageFilter('qc')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                activeStageFilter === 'qc'
                  ? 'bg-surface text-ink font-semibold shadow-2xs'
                  : 'text-muted hover:text-ink'
              }`}
            >
              QC
            </button>
          </div>

          {/* Horizontal scroll navigation triggers */}
          {activeStageFilter === 'ALL' && (
            <div className="flex items-center gap-1 bg-surface border border-line rounded-lg p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => scrollHorizontal('left')}
                className="p-1 text-body hover:text-ink hover:bg-surface-hover rounded-md transition-colors cursor-pointer"
                title="Geser ke kiri"
                aria-label="Geser ke kiri"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-mono text-muted px-1 select-none">JALUR</span>
              <button
                type="button"
                onClick={() => scrollHorizontal('right')}
                className="p-1 text-body hover:text-ink hover:bg-surface-hover rounded-md transition-colors cursor-pointer"
                title="Geser ke kanan"
                aria-label="Geser ke kanan"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-2.5 py-1.5 text-xs font-medium text-body hover:text-ink bg-surface hover:bg-surface-hover border border-line rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-muted ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span className="hidden md:inline">Perbarui</span>
          </button>
        </div>
      </div>

      {error && <LoadErrorBanner message={error} onRetry={handleRefresh} isRetrying={isRefreshing} hasStaleData={orders.length > 0} />}

      {/* Interactive Horizontal Tracking Line Summary (Span Kepinggir) */}
      <div className="bg-surface border border-line rounded-2xl p-3.5 sm:p-4 shadow-[0_4px_20px_rgba(0,0,0,0.35)] overflow-hidden">
        <div className="flex items-center justify-between pb-3 border-b border-line text-xs">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-accent-soft" />
            <span className="font-mono font-bold uppercase tracking-wider text-[11px] text-ink">
              Urutan Alur Kerja
            </span>
            <span className="text-muted text-[11px]">
              • Klik tahap mana pun untuk lompat ke sana
            </span>
          </div>

          <div className="flex items-center gap-3 font-mono text-[11px] text-body">
            <span>
              Dalam Alur: <strong className="text-ink">{totalOrdersInProduction}</strong> pesanan
            </span>
            <span>•</span>
            <span>
              Total Volume: <strong className="text-ink">{totalGarments}</strong> pcs
            </span>
          </div>
        </div>

        {/* Horizontal Pipeline Steps Track */}
        <div className="overflow-x-auto pt-3 pb-1">
          <div className="flex items-center min-w-[760px] gap-2">
            {stages.map((st, idx) => {
              const StageIcon = st.icon;
              const count = boardOrders.filter(st.matcher).length;
              const pieces = orders
                .filter(st.matcher)
                .reduce((sum, o) => sum + (o.quantity || 0), 0);
              const isLast = idx === stages.length - 1;

              return (
                <React.Fragment key={st.id}>
                  {/* Step Node */}
                  <button
                    type="button"
                    onClick={() => scrollToStage(st.id)}
                    className="flex-1 min-w-[110px] p-2 rounded-lg border border-line bg-paper hover:bg-surface hover:border-accent-soft/60 hover:shadow-xs transition-all text-left group cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-mono font-bold text-muted group-hover:text-accent">
                        TAHAP {st.stepNumber}
                      </span>
                      <span className="w-4 h-4 rounded-full bg-surface border border-line-strong flex items-center justify-center font-mono font-bold text-[11px] text-ink">
                        {count}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <StageIcon className="w-3.5 h-3.5 text-body group-hover:text-accent shrink-0" />
                      <p className="text-xs font-semibold text-ink truncate">
                        {st.title}
                      </p>
                    </div>

                    <p className="text-[11px] font-mono text-muted mt-1 truncate">
                      {pieces} pcs aktif
                    </p>
                  </button>

                  {/* Connecting Arrow */}
                  {!isLast && (
                    <div className="shrink-0 flex items-center justify-center px-0.5 text-muted">
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Horizontal Tracking Board (Panjang Kepinggir) */}
      <div className="relative">
        {/* Continuous Horizontal Scroll Board Container */}
        <div
          ref={scrollContainerRef}
          className="flex items-start gap-4 overflow-x-auto pb-6 pt-1 px-0.5 scroll-smooth select-text"
          style={{ scrollbarWidth: 'thin' }}
        >
          {displayedStages.map((stage, idx) => {
            const StageIcon = stage.icon;
            const stageOrders = boardOrders.filter(stage.matcher);
            const totalStagePcs = stageOrders.reduce((sum, o) => sum + (o.quantity || 0), 0);

            return (
              <div
                key={stage.id}
                id={`lane-${stage.id}`}
                className="w-[330px] sm:w-[350px] min-w-[330px] sm:min-w-[350px] shrink-0 bg-paper border border-line rounded-2xl flex flex-col shadow-[0_4px_20px_rgba(0,0,0,0.35)] min-h-[520px] max-h-[720px]"
              >
                {/* Lane Sticky Header */}
                <div className="p-3.5 border-b border-line bg-surface-hover rounded-t-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 bg-surface border border-line-strong rounded font-mono font-bold text-[11px] text-body">
                        TAHAP {stage.stepNumber}
                      </span>
                      {stages[idx + 1] && (
                        <span className="text-[11px] text-muted font-mono flex items-center gap-0.5">
                          <span>→</span>
                          <span>{stages[idx + 1].title.split(' ')[0]}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-mono text-muted">
                        {totalStagePcs} pcs
                      </span>
                      <span className="w-5 h-5 rounded-full bg-surface border border-line-strong flex items-center justify-center font-mono font-bold text-[11px] text-ink">
                        {stageOrders.length}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-surface border border-line flex items-center justify-center text-body shadow-2xs">
                      <StageIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-heading text-sm font-bold text-ink leading-tight">
                        {stage.title}
                      </h3>
                      <p className="text-[11px] text-muted leading-none mt-0.5">
                        {stage.description}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Lane Scrollable Cards Container */}
                <div className="flex-1 p-3 space-y-2.5 overflow-y-auto">
                  {stageOrders.length === 0 ? (
                    <div className="py-16 text-center text-xs text-muted border border-dashed border-line-strong rounded-lg bg-surface/60 flex flex-col items-center justify-center gap-1 px-4">
                      <StageIcon className="w-5 h-5 text-muted mb-1" />
                      <p className="font-medium text-body">Tidak Ada Antrean</p>
                      <p className="text-[11px] text-muted">Tidak ada pesanan yang menunggu di tahap ini.</p>
                    </div>
                  ) : (
                    stageOrders.map((order) => (
                      <div
                        key={order.orderId}
                        className="p-3 bg-surface border border-line hover:border-accent-soft/60 rounded-lg shadow-2xs transition-all space-y-2.5 cursor-pointer group "
                        onClick={() => navigate(`/admin/orders/${encodeURIComponent(order.orderId)}`)}
                      >
                        {/* Top info row: Order ID, Type badge, and date */}
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/admin/orders/${encodeURIComponent(order.orderId)}`);
                            }}
                            className="font-mono font-bold text-xs text-ink group-hover:text-accent transition-colors cursor-pointer"
                          >
                            {order.orderId}
                          </button>
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-[11px] font-mono px-1.5 py-0.5 rounded font-semibold uppercase ${
                                order.isCustomOrder
                                  ? 'bg-accent-wash text-accent border border-accent/20'
                                  : 'bg-surface-hover text-body'
                              }`}
                            >
                              {order.isCustomOrder ? 'Mockup Custom' : 'Katalog'}
                            </span>
                          </div>
                        </div>

                        {/* Customer and quantity */}
                        <div>
                          <p className="text-xs font-semibold text-ink flex items-center justify-between">
                            <span>{order.customer}</span>
                            <span className="font-mono font-bold text-xs text-ink">
                              {order.quantity} pcs
                            </span>
                          </p>
                          <p className="text-[11px] text-body mt-0.5 truncate">
                            {order.items?.[0]?.productName || order.productType || 'Pesanan Pakaian'}
                          </p>
                        </div>

                        {/* Specs & Fabric / Sizing */}
                        {(order.sizeSpec || order.material) && (
                          <div className="text-[11px] text-muted font-mono bg-paper p-2 rounded border border-line flex items-center justify-between">
                            <span className="truncate">
                              {order.material || 'Katun Standar'}
                            </span>
                            {order.sizeSpec && (
                              <span className="text-muted ml-2 shrink-0">
                                ({order.sizeSpec})
                              </span>
                            )}
                          </div>
                        )}

                        {/* Card Action Bar */}
                        <div className="pt-2 border-t border-line flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/admin/orders/${encodeURIComponent(order.orderId)}`);
                            }}
                            className="text-[11px] font-medium text-body hover:text-ink flex items-center gap-1 cursor-pointer"
                          >
                            <span>Periksa</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>

                          {(() => {
                            const step = getNextProductionStep(order.productionStatus);
                            if (!step) {
                              return (
                                <span className="text-[11px] font-mono font-medium text-sage flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                                  Siap Dikirim
                                </span>
                              );
                            }
                            if (!canAdvance) {
                              return (
                                <span className="text-[11px] font-mono text-muted">
                                  {formatProductionStatusLabel(order.productionStatus)}
                                </span>
                              );
                            }
                            return (
                              <button
                                type="button"
                                disabled={advancingId === order.orderId}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void advanceStage(order, step.next);
                                }}
                                className="px-2.5 py-1 bg-accent-wash hover:bg-accent/15 text-accent border border-accent/20 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs disabled:opacity-60 disabled:cursor-wait"
                              >
                                <span>{step.label}</span>
                                <ArrowRight className="w-3 h-3" aria-hidden="true" />
                              </button>
                            );
                          })()}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Lane Footer */}
                <div className="p-2 border-t border-line bg-paper rounded-b-xl text-center">
                  <span className="text-[11px] font-mono text-muted">
                    Tahap {stage.stepNumber} dari 06 • {stage.title}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
