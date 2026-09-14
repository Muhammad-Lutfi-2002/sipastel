import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  MessageCircle,
  ExternalLink,
  ShoppingBag,
  Mail,
  Phone,
  MapPin,
  X,
  ChevronRight,
} from 'lucide-react';
import { Order } from '../../../types';
import { getStoredOrders } from '../../../utils/storage';
import { AdminTableSkeleton } from '../../Skeleton';
import { formatIDR } from '../../../utils/formatters';
import { createWhatsAppUrl } from '../../../utils/whatsapp';

export const CustomersView: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    getStoredOrders().then((data) => {
      setOrders(data);
      setIsLoading(false);
    });
  }, []);

  // Group orders by customer phone or name to produce customer directory
  const customerMap = new Map<
    string,
    {
      name: string;
      phone: string;
      email?: string;
      city: string;
      ordersCount: number;
      totalSpend: number;
      lastOrderDate: string;
    }
  >();

  orders.forEach((ord) => {
    const key = ord.phone.trim();
    const existing = customerMap.get(key);
    // "Total Dibelanjakan" mencerminkan uang yang benar-benar sudah diterima
    // (termasuk DP sebagian), bukan nilai order yang belum dibayar sama
    // sekali - diambil langsung dari total_paid yang dihitung server.
    const amount = ord.totalPaid || 0;

    if (existing) {
      existing.ordersCount += 1;
      existing.totalSpend += amount;
      if (new Date(ord.createdAt) > new Date(existing.lastOrderDate)) {
        existing.lastOrderDate = ord.createdAt;
      }
    } else {
      customerMap.set(key, {
        name: ord.customer,
        phone: ord.phone,
        email: ord.email,
        city: ord.city,
        ordersCount: 1,
        totalSpend: amount,
        lastOrderDate: ord.createdAt,
      });
    }
  });

  const customersList = Array.from(customerMap.values()).filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery) ||
      c.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#EAE6DF]">
        <div>
          <h2 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-[#1F1E1D]">
            Direktori Pelanggan
          </h2>
          <p className="text-xs sm:text-sm text-[#7A766F] mt-0.5">
            Data hubungan pelanggan, volume pesanan, dan komunikasi langsung via WhatsApp.
          </p>
        </div>

        <span className="text-xs font-mono font-medium text-[#8C8880] px-2.5 py-1 bg-white border border-[#E8E4DA] rounded-lg">
          {customersList.length} Pelanggan Aktif
        </span>
      </div>

      {/* Search Filter */}
      <div className="p-3.5 bg-white border border-[#EAE6DF] rounded-2xl flex items-center justify-between gap-3 shadow-[0_4px_20px_rgba(28,27,26,0.06)]">
        <div className="relative w-full max-w-sm">
          <Search className="w-4 h-4 text-[#8C8880] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama pelanggan, WhatsApp, kota..."
            className="w-full pl-9 pr-8 py-1.5 bg-[#FAF9F5] border border-[#E8E4DA] focus:border-[#D87A61] rounded-lg text-xs text-[#1F1E1D] placeholder-[#9E9A91] focus:outline-hidden transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              aria-label="Hapus pencarian"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8C8880] hover:text-[#1F1E1D]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#EAE6DF] rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(28,27,26,0.06)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#EAE6DF] bg-[#FCFAF7] text-[#8C8880] font-mono text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4 font-medium">Nama Pelanggan</th>
                <th className="py-3 px-4 font-medium">WhatsApp</th>
                <th className="py-3 px-4 font-medium">Email</th>
                <th className="py-3 px-4 font-medium">Kota</th>
                <th className="py-3 px-4 font-medium text-center">Pesanan</th>
                <th className="py-3 px-4 font-medium">Total Dibelanjakan</th>
                <th className="py-3 px-4 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2EFE9]">
              {customersList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-[#8C8880]">
                    Tidak ada pelanggan yang cocok dengan kriteria pencarian.
                  </td>
                </tr>
              ) : (
                customersList.map((cust, idx) => (
                  <tr key={idx} className="hover:bg-[#FAF6F2] transition-colors">
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-[#1F1E1D]">{cust.name}</p>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[#5E5B54]">
                      {cust.phone}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[#8C8880]">
                      {cust.email || '—'}
                    </td>

                    <td className="py-3.5 px-4 text-[#5E5B54]">
                      {cust.city}
                    </td>

                    <td className="py-3.5 px-4 text-center font-mono font-semibold text-[#1F1E1D]">
                      {cust.ordersCount} pesanan
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-[#1F1E1D]">
                      {formatIDR(cust.totalSpend)}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <a
                        href={createWhatsAppUrl(
                          `Halo ${cust.name}, salam dari SIPASTEL Studio Bogor. Ada yang bisa kami bantu seputar pesanan apparel Anda?`,
                          cust.phone
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 bg-[#EFF6EF] hover:bg-[#E2EFE2] text-[#2D5931] border border-[#CDE5CD] rounded-md font-medium text-xs inline-flex items-center gap-1 transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-[#4A7C59]" />
                        <span>Chat</span>
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
