import React, { useState } from 'react';
import {
  Package,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  Search,
  ExternalLink,
} from 'lucide-react';
import { Product } from '../../../types';
import { productsData } from '../../../data/products';
import { formatIDR } from '../../../utils/formatters';

const STORAGE_PRODUCTS_KEY = 'sipastel_admin_products_v1';

export const ProductsView: React.FC = () => {
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_PRODUCTS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
      return productsData;
    } catch {
      return productsData;
    }
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showFeedback = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleToggleStock = (productId: string) => {
    const updated = products.map((p) => {
      if (p.id === productId) {
        return { ...p, inStock: !p.inStock };
      }
      return p;
    });
    setProducts(updated);
    try {
      localStorage.setItem(STORAGE_PRODUCTS_KEY, JSON.stringify(updated));
      showFeedback('Status stok produk berhasil diperbarui.', 'success');
    } catch {
      showFeedback('Gagal menyimpan perubahan. Penyimpanan mungkin penuh atau tidak tersedia.', 'error');
    }
  };

  const confirmDeleteProduct = () => {
    if (!productToDelete) return;

    try {
      const updated = products.filter((p) => p.id !== productToDelete.id);
      setProducts(updated);
      localStorage.setItem(STORAGE_PRODUCTS_KEY, JSON.stringify(updated));
      setProductToDelete(null);
      showFeedback('Produk berhasil dihapus dari katalog.', 'success');
    } catch {
      showFeedback('Gagal menghapus produk.', 'error');
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#EAE6DF]">
        <div>
          <h2 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-[#1F1E1D]">
            Katalog &amp; Stok
          </h2>
          <p className="text-xs sm:text-sm text-[#7A766F] mt-0.5">
            Katalog pakaian siap pakai, status stok, dan spesifikasi varian warna.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => showFeedback('Pembuatan item katalog baru dimulai di database studio.', 'success')}
            className="px-3 py-1.5 bg-[#1F1E1D] hover:bg-[#33312E] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 text-[#B8B4AA]" />
            <span>Tambah Produk</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-lg text-xs flex items-center justify-between animate-modal-content ${
            feedback.type === 'success'
              ? 'bg-[#EFF6EF] text-[#2D5931] border border-[#CDE5CD]'
              : 'bg-[#FAF0F0] text-[#8C2927] border border-[#F0D5CD]'
          }`}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} aria-label="Tutup pesan" className="cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Search Bar */}
      <div className="p-3.5 bg-white border border-[#EAE6DF] rounded-xl flex items-center justify-between gap-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="relative w-full max-w-sm">
          <Search className="w-4 h-4 text-[#8C8880] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari berdasarkan nama produk, kategori..."
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

      {/* Products Table */}
      <div className="bg-white border border-[#EAE6DF] rounded-xl overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#EAE6DF] bg-[#FCFAF7] text-[#8C8880] font-mono text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4 font-medium">Produk</th>
                <th className="py-3 px-4 font-medium">Kategori</th>
                <th className="py-3 px-4 font-medium">Harga Jual</th>
                <th className="py-3 px-4 font-medium">Varian</th>
                <th className="py-3 px-4 font-medium">Status Stok</th>
                <th className="py-3 px-4 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2EFE9]">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-[#8C8880]">
                    Tidak ada item katalog ditemukan.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((prod) => (
                  <tr key={prod.id} className="hover:bg-[#FAF6F2] transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={prod.images?.[0] || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=400&q=80'}
                          alt={prod.name}
                          className="w-10 h-10 rounded-lg object-cover border border-[#E8E4DA] bg-white"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <p className="font-semibold text-[#1F1E1D]">{prod.name}</p>
                          <span className="text-[10px] text-[#8C8880] font-mono">
                            SKU: {prod.slug}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono text-[#5E5B54]">
                      {prod.category}
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-[#1F1E1D]">
                      {formatIDR(prod.price)}
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {(prod.colors || []).map((c, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#FAF9F5] border border-[#E8E4DA] text-[10px] text-[#5E5B54]"
                          >
                            <span
                              className="w-2 h-2 rounded-full border border-black/10 shrink-0"
                              style={{ backgroundColor: c.hex }}
                            />
                            {c.name}
                          </span>
                        ))}
                        {(prod.sizes || []).length > 0 && (
                          <span className="text-[10px] font-mono text-[#8C8880]">
                            ({prod.sizes.join(', ')})
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleStock(prod.id)}
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                          prod.inStock
                            ? 'bg-[#EFF6EF] text-[#2D5931] hover:bg-[#E2EFE2]'
                            : 'bg-[#FAF0F0] text-[#8C2927] hover:bg-[#F7E5E5]'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            prod.inStock ? 'bg-[#4A7C59]' : 'bg-[#B84A48]'
                          }`}
                        />
                        <span>{prod.inStock ? 'Tersedia' : 'Stok Habis'}</span>
                      </button>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setProductToDelete(prod)}
                        className="p-1.5 text-[#8C8880] hover:text-[#B84A48] hover:bg-[#FAF0F0] rounded-md transition-colors cursor-pointer"
                        title="Hapus produk"
                        aria-label={`Hapus ${prod.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 bg-[#1C1B1A]/40 backdrop-blur-xs flex items-center justify-center p-4 animate-modal-backdrop">
          <div className="bg-white p-6 rounded-xl max-w-sm w-full border border-[#EAE6DF] shadow-xl space-y-4 animate-modal-content">
            <h4 className="font-heading font-bold text-[#1F1E1D]">Hapus Produk</h4>
            <p className="text-xs text-[#5E5B54] leading-relaxed">
              Anda yakin ingin menghapus <strong className="text-[#1F1E1D]">{productToDelete.name}</strong> dari katalog studio?
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#EAE6DF]">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="px-3 py-1.5 border border-[#DDD8CD] text-[#5E5B54] hover:bg-[#F2EFE9] text-xs font-medium rounded-lg cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDeleteProduct}
                className="px-3.5 py-1.5 bg-[#B84A48] hover:bg-[#A33B39] text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
