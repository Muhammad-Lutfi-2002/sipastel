import React, { useState, useEffect } from 'react';
import {
  FileText,
  Printer,
  Download,
  Eye,
  CheckCircle2,
  X,
  Search,
} from 'lucide-react';
import { Order } from '../../../types';
import { getStoredOrders } from '../../../utils/storage';
import { AdminTableSkeleton } from '../../Skeleton';
import { formatDate, formatIDR, formatPaymentStatusLabel } from '../../../utils/formatters';

export const InvoicesView: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<Order | null>(null);

  useEffect(() => {
    getStoredOrders().then((data) => {
      setOrders(data);
      setIsLoading(false);
    });
  }, []);
  const [searchQuery, setSearchQuery] = useState('');

  const invoices = orders.map((o) => ({
    invoiceNumber: o.invoiceNumber,
    orderId: o.orderId,
    customer: o.customer,
    phone: o.phone,
    createdAt: o.createdAt,
    totalPrice: o.totalPrice || 0,
    paymentStatus: o.paymentStatus,
    paymentMethod: o.paymentMethod || 'Bank Transfer',
    order: o,
  }));

  const filteredInvoices = invoices.filter(
    (inv) =>
      inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.orderId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handlePrint = () => {
    window.print();
  };

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
          <h2 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-ink">
            Tagihan & Invoice
          </h2>
          <p className="text-xs sm:text-sm text-muted mt-0.5">
            Buku besar tagihan resmi, bukti pembayaran, dan cetakan invoice pelanggan.
          </p>
        </div>

        <span className="text-xs font-mono font-medium text-muted px-2.5 py-1 bg-surface border border-line rounded-lg">
          {invoices.length} Invoice Diterbitkan
        </span>
      </div>

      {/* Search */}
      <div className="p-3.5 bg-surface border border-line rounded-2xl flex items-center justify-between gap-3 shadow-[0_4px_20px_rgba(0,0,0,0.35)]">
        <div className="relative w-full max-w-sm">
          <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari berdasarkan nomor invoice, pelanggan, ID pesanan..."
            className="w-full pl-9 pr-8 py-1.5 bg-paper border border-line focus:border-accent-soft rounded-lg text-xs text-ink placeholder-muted focus:outline-hidden transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              aria-label="Hapus pencarian"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-surface border border-line rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.35)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-line bg-surface-hover text-muted font-mono text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4 font-medium">Invoice #</th>
                <th className="py-3 px-4 font-medium">Ref Pesanan</th>
                <th className="py-3 px-4 font-medium">Pelanggan</th>
                <th className="py-3 px-4 font-medium">Tanggal Terbit</th>
                <th className="py-3 px-4 font-medium">Metode</th>
                <th className="py-3 px-4 font-medium">Nominal</th>
                <th className="py-3 px-4 font-medium">Status</th>
                <th className="py-3 px-4 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center">
                    <div className="w-10 h-10 rounded-full bg-surface-hover flex items-center justify-center mx-auto mb-3">
                      <FileText className="w-4 h-4 text-muted" />
                    </div>
                    <p className="text-xs font-semibold text-ink">Tidak ada invoice ditemukan.</p>
                    <p className="text-[11px] text-muted mt-0.5">
                      Tidak ada invoice yang cocok dengan pencarian Anda.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv, idx) => (
                  <tr key={idx} className="hover:bg-surface-hover transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-ink">
                      #{inv.invoiceNumber}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-body">
                      {inv.orderId}
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-ink">{inv.customer}</p>
                      <span className="text-[11px] text-muted font-mono">{inv.phone}</span>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-muted">
                      {formatDate(inv.createdAt)}
                    </td>

                    <td className="py-3.5 px-4 text-body">
                      {inv.paymentMethod}
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-ink">
                      {formatIDR(inv.totalPrice)}
                    </td>

                    <td className="py-3.5 px-4">
                      {inv.paymentStatus === 'LUNAS' ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-sage/10 text-sage">
                          <span className="w-1.5 h-1.5 rounded-full bg-sage" />
                          Lunas
                        </span>
                      ) : inv.paymentStatus === 'DP_DIBAYAR' ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-warning/10 text-warning">
                          <span className="w-1.5 h-1.5 rounded-full bg-warning" />
                          DP Dibayar
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-danger/10 text-danger">
                          <span className="w-1.5 h-1.5 rounded-full bg-danger" />
                          Belum Bayar
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedInvoiceOrder(inv.order)}
                        className="px-2.5 py-1 bg-surface hover:bg-accent-wash border border-line hover:border-accent-soft text-ink hover:text-accent rounded-md font-medium text-xs inline-flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Lihat</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Viewer Modal */}
      {selectedInvoiceOrder && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-modal-backdrop"
          onClick={() => setSelectedInvoiceOrder(null)}
        >
          <div
            id="printable-invoice-card"
            className="bg-surface p-6 sm:p-8 rounded-2xl max-w-2xl w-full border border-line shadow-2xl space-y-6 animate-modal-content max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-line">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-accent" />
                <div>
                  <h3 className="font-heading font-extrabold text-base text-ink">
                    INVOICE SIPASTEL STUDIO
                  </h3>
                  <span className="text-xs font-mono text-muted">
                    #{selectedInvoiceOrder.invoiceNumber}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 print:hidden">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-3 py-1.5 bg-paper hover:bg-surface-hover border border-line rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-body" />
                  <span>Cetak</span>
                </button>
                <button
                  onClick={() => setSelectedInvoiceOrder(null)}
                  aria-label="Tutup pratinjau invoice"
                  className="p-1.5 text-muted hover:text-ink rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Bill To & Metadata */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted">
                  Ditagihkan Kepada
                </span>
                <p className="font-semibold text-ink">{selectedInvoiceOrder.customer}</p>
                <p className="text-body">{selectedInvoiceOrder.phone}</p>
                <p className="text-body">{selectedInvoiceOrder.address}</p>
                <p className="text-muted">
                  {selectedInvoiceOrder.city} {selectedInvoiceOrder.postalCode}
                </p>
              </div>

              <div className="space-y-1 text-right">
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted">
                  Metadata Invoice
                </span>
                <p className="font-mono text-ink">
                  Tanggal: {formatDate(selectedInvoiceOrder.createdAt)}
                </p>
                <p className="font-mono text-body">ID Pesanan: {selectedInvoiceOrder.orderId}</p>
                <p className="font-mono font-bold text-sage">
                  Status: {formatPaymentStatusLabel(selectedInvoiceOrder.paymentStatus)}
                </p>
              </div>
            </div>

            {/* Items Table */}
            <div className="border border-line rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-paper border-b border-line text-muted font-mono text-[10px] uppercase">
                  <tr>
                    <th className="p-3">Deskripsi Item</th>
                    <th className="p-3 text-center">Qty</th>
                    <th className="p-3 text-right">Harga Satuan</th>
                    <th className="p-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {(selectedInvoiceOrder.items || []).map((item, i) => (
                    <tr key={i}>
                      <td className="p-3 font-semibold text-ink">
                        {item.productName}
                        {item.size && (
                          <span className="font-mono text-muted ml-1 font-normal">
                            ({item.size})
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center font-mono">{item.quantity}</td>
                      <td className="p-3 text-right font-mono">
                        {item.price ? formatIDR(item.price) : '-'}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-ink">
                        {item.price ? formatIDR(item.price * item.quantity) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total */}
            <div className="flex justify-end pt-2">
              <div className="w-56 space-y-1.5 text-xs">
                <div className="flex justify-between text-body">
                  <span>Subtotal:</span>
                  <span className="font-mono">
                    {formatIDR(selectedInvoiceOrder.totalPrice || 0)}
                  </span>
                </div>
                <div className="flex justify-between text-body">
                  <span>Pajak &amp; Kemasan:</span>
                  <span className="font-mono">Rp 0 (Termasuk)</span>
                </div>
                <div className="flex justify-between font-bold text-ink pt-2 border-t border-line text-sm">
                  <span>Total Keseluruhan:</span>
                  <span className="font-mono text-accent">
                    {formatIDR(selectedInvoiceOrder.totalPrice || 0)}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-paper border border-line rounded-lg text-center text-[11px] text-muted">
              Invoice resmi diterbitkan oleh Sistem Produksi Studio SIPASTEL • Bogor, Indonesia
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
