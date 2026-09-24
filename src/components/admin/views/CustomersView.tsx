import React, { useState, useMemo, useEffect } from 'react';
import { Users, Search, MessageCircle, X } from 'lucide-react';
import { AdminTableSkeleton } from '../../Skeleton';
import { formatDate, formatIDR } from '../../../utils/formatters';
import { createWhatsAppUrl } from '../../../utils/whatsapp';
import { normalizeIdPhone } from '../../../utils/phone';
import { useOrders } from '../../../hooks/useOrders';
import { LoadErrorBanner } from '../LoadErrorBanner';
import { Pagination } from '../Pagination';

const PAGE_SIZE = 25;

interface Customer {
  key: string;
  name: string;
  phone: string;
  email?: string;
  city: string;
  ordersCount: number;
  totalPaid: number;
  lastOrderDate: string;
}

export const CustomersView: React.FC = () => {
  const { orders, isLoading, isRefreshing, error, refresh } = useOrders();
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  // The directory is derived from orders. Customers are identified by their
  // NORMALISED phone number, so "0812-3456-7890", "+62 812 3456 7890" and
  // "6281234567890" are one person, not three. Contact details shown are
  // taken from the customer's most recent order.
  const customers = useMemo<Customer[]>(() => {
    const map = new Map<string, Customer>();
    for (const ord of orders) {
      const key = normalizeIdPhone(ord.phone) || `name:${ord.customer.trim().toLowerCase()}`;
      const paid = ord.totalPaid || 0; // money actually received (incl. partial DP)
      const existing = map.get(key);

      if (!existing) {
        map.set(key, {
          key,
          name: ord.customer,
          phone: ord.phone,
          email: ord.email,
          city: ord.city,
          ordersCount: 1,
          totalPaid: paid,
          lastOrderDate: ord.createdAt,
        });
        continue;
      }

      existing.ordersCount += 1;
      existing.totalPaid += paid;
      if (new Date(ord.createdAt) > new Date(existing.lastOrderDate)) {
        existing.lastOrderDate = ord.createdAt;
        existing.name = ord.customer;
        existing.phone = ord.phone;
        existing.email = ord.email || existing.email;
        existing.city = ord.city;
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.lastOrderDate).getTime() - new Date(a.lastOrderDate).getTime()
    );
  }, [orders]);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return customers;
    const qDigits = q.replace(/\D/g, '');
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        (qDigits.length >= 3 && c.phone.replace(/\D/g, '').includes(qDigits)) ||
        c.city.toLowerCase().includes(q)
    );
  }, [customers, searchQuery]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const rows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <AdminTableSkeleton rows={6} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line">
        <div>
          <h2 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-ink">Direktori Pelanggan</h2>
          <p className="text-sm text-muted mt-0.5">
            Data hubungan pelanggan, volume pesanan, dan komunikasi langsung via WhatsApp.
          </p>
        </div>

        <span className="text-xs font-mono font-medium text-muted px-2.5 py-1 bg-surface border border-line rounded-lg">
          {customers.length} pelanggan
        </span>
      </div>

      {error && <LoadErrorBanner message={error} onRetry={() => void refresh()} isRetrying={isRefreshing} hasStaleData={orders.length > 0} />}

      {/* Search Filter */}
      <div className="p-3.5 bg-surface border border-line rounded-2xl flex items-center justify-between gap-3 shadow-[0_4px_20px_rgba(0,0,0,0.35)]">
        <div className="relative w-full max-w-sm">
          <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
          <input
            type="search"
            aria-label="Cari pelanggan"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama pelanggan, WhatsApp, kota..."
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
      </div>

      {/* Table */}
      <div className="bg-surface border border-line rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.35)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-line bg-surface-hover text-muted font-mono text-xs uppercase tracking-wider">
                <th scope="col" className="py-3 px-4 font-medium">Nama Pelanggan</th>
                <th scope="col" className="py-3 px-4 font-medium">WhatsApp</th>
                <th scope="col" className="py-3 px-4 font-medium">Email</th>
                <th scope="col" className="py-3 px-4 font-medium">Kota</th>
                <th scope="col" className="py-3 px-4 font-medium text-center">Pesanan</th>
                <th scope="col" className="py-3 px-4 font-medium">Total Dibayar</th>
                <th scope="col" className="py-3 px-4 font-medium">Pesanan Terakhir</th>
                <th scope="col" className="py-3 px-4 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center">
                    <div className="w-10 h-10 rounded-full bg-surface-hover flex items-center justify-center mx-auto mb-3">
                      <Users className="w-4 h-4 text-muted" aria-hidden="true" />
                    </div>
                    <p className="text-sm font-semibold text-ink">
                      {customers.length === 0 && !error ? 'Belum ada pelanggan.' : 'Tidak ada pelanggan ditemukan.'}
                    </p>
                    <p className="text-xs text-muted mt-0.5">
                      {customers.length === 0 && !error
                        ? 'Pelanggan muncul otomatis setelah ada pesanan masuk.'
                        : 'Tidak ada pelanggan yang cocok dengan kriteria pencarian.'}
                    </p>
                  </td>
                </tr>
              ) : (
                rows.map((cust) => (
                  <tr key={cust.key} className="hover:bg-surface-hover transition-colors">
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-ink">{cust.name}</p>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-body">{cust.phone}</td>
                    <td className="py-3.5 px-4 font-mono text-muted">{cust.email || '—'}</td>
                    <td className="py-3.5 px-4 text-body">{cust.city}</td>
                    <td className="py-3.5 px-4 text-center font-mono font-semibold text-ink">{cust.ordersCount}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-ink">{formatIDR(cust.totalPaid)}</td>
                    <td className="py-3.5 px-4 font-mono text-muted">{formatDate(cust.lastOrderDate)}</td>
                    <td className="py-3.5 px-4 text-right">
                      <a
                        href={createWhatsAppUrl(
                          `Halo ${cust.name}, salam dari SIPASTEL Studio. Ada yang bisa kami bantu seputar pesanan apparel Anda?`,
                          cust.phone
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Chat WhatsApp ${cust.name}`}
                        className="px-2.5 py-1 bg-sage/10 hover:bg-sage/20 text-sage border border-sage/30 rounded-md font-medium text-xs inline-flex items-center gap-1 transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Chat</span>
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="p-3.5 bg-surface-hover border-t border-line">
          <Pagination page={currentPage} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
        </div>
      </div>
    </div>
  );
};
