import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  Search,
  ExternalLink,
  Pencil,
} from 'lucide-react';
import { Product } from '../../../types';
import {
  getStoredProducts,
  toggleProductStock,
  deleteStoredProduct,
  createStoredProduct,
  updateStoredProduct,
  ProductInput,
} from '../../../utils/storage';
import { formatIDR } from '../../../utils/formatters';
import { AdminTableSkeleton } from '../../Skeleton';
import { useAdminToast } from '../AdminToast';

const EMPTY_FORM: ProductInput = {
  name: '',
  category: 'KAOS',
  price: 0,
  shortDescription: '',
  material: '',
  imageUrl: '',
  inStock: true,
};

export const ProductsView: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadProducts = () => {
    setIsLoading(true);
    getStoredProducts().then((data) => {
      setProducts(data);
      setIsLoading(false);
    });
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const { showToast } = useAdminToast();

  // Add / Edit product modal. `editingProduct` null + modal open = create
  // mode; non-null = editing that product's fields (including price).
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formValues, setFormValues] = useState<ProductInput>(EMPTY_FORM);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  const openCreateModal = () => {
    setEditingProduct(null);
    setFormValues(EMPTY_FORM);
    setFormErrors({});
    setIsFormOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormValues({
      name: product.name,
      category: product.category,
      price: product.price,
      shortDescription: product.shortDescription,
      material: product.material,
      imageUrl: product.images?.[0] ?? '',
      inStock: product.inStock,
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleSaveProduct = async () => {
    const nextErrors: { [key: string]: string } = {};
    if (!formValues.name.trim()) nextErrors.name = 'Nama produk wajib diisi.';
    if (!formValues.price || formValues.price <= 0) nextErrors.price = 'Harga harus lebih dari Rp0.';
    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSavingProduct(true);
    if (editingProduct) {
      const result = await updateStoredProduct(editingProduct.id, formValues);
      setIsSavingProduct(false);
      if (!result.success) {
        showFeedback(`Gagal menyimpan perubahan: ${result.error || 'kesalahan tidak diketahui'}`, 'error');
        return;
      }
      showFeedback(`Produk "${formValues.name}" berhasil diperbarui. Harga baru langsung tampil di form customer.`, 'success');
    } else {
      const result = await createStoredProduct(formValues);
      setIsSavingProduct(false);
      if (!result.success) {
        showFeedback(`Gagal menambah produk: ${result.error || 'kesalahan tidak diketahui'}`, 'error');
        return;
      }
      showFeedback(`Produk "${formValues.name}" berhasil ditambahkan ke katalog.`, 'success');
    }
    setIsFormOpen(false);
    loadProducts();
  };

  useEffect(() => {
    if (!feedback) return;
    showToast(feedback.message, feedback.type);
    setFeedback(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedback]);

  const showFeedback = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleToggleStock = async (productId: string, currentInStock: boolean) => {
    // Optimistic update, reconciled with Supabase afterwards.
    setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, inStock: !currentInStock } : p)));
    const result = await toggleProductStock(productId, !currentInStock);
    if (!result.success) {
      setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, inStock: currentInStock } : p)));
      showFeedback(`Gagal memperbarui stok: ${result.error || 'kesalahan tidak diketahui'}`, 'error');
      return;
    }
    showFeedback('Status stok produk berhasil diperbarui.', 'success');
  };

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;
    const result = await deleteStoredProduct(productToDelete.id);
    if (!result.success) {
      showFeedback(`Gagal menghapus produk: ${result.error || 'kesalahan tidak diketahui'}`, 'error');
      setProductToDelete(null);
      return;
    }
    setProducts((prev) => prev.filter((p) => p.id !== productToDelete.id));
    setProductToDelete(null);
    showFeedback('Produk berhasil dihapus dari katalog.', 'success');
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="pb-3 border-b border-line">
          <h2 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-ink">
            Katalog &amp; Stok
          </h2>
        </div>
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
            Katalog &amp; Stok
          </h2>
          <p className="text-xs sm:text-sm text-muted mt-0.5">
            Katalog pakaian siap pakai, status stok, dan spesifikasi varian warna.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={openCreateModal}
            className="px-3 py-1.5 bg-accent hover:bg-accent-soft text-on-accent rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 text-muted" />
            <span>Tambah Produk</span>
          </button>
        </div>
      </div>

      {/* Feedback now surfaces via the modern floating toast (see AdminToast.tsx) */}

      {/* Search Bar */}
      <div className="p-3.5 bg-surface border border-line rounded-2xl flex items-center justify-between gap-3 shadow-[0_4px_20px_rgba(0,0,0,0.35)]">
        <div className="relative w-full max-w-sm">
          <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari berdasarkan nama produk, kategori..."
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

      {/* Products Table */}
      <div className="bg-surface border border-line rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.35)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-line bg-surface-hover text-muted font-mono text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4 font-medium">Produk</th>
                <th className="py-3 px-4 font-medium">Kategori</th>
                <th className="py-3 px-4 font-medium">Harga Jual</th>
                <th className="py-3 px-4 font-medium">Varian</th>
                <th className="py-3 px-4 font-medium">Status Stok</th>
                <th className="py-3 px-4 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-muted">
                    Tidak ada item katalog ditemukan.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((prod) => (
                  <tr key={prod.id} className="hover:bg-surface-hover transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={prod.images?.[0] || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=400&q=80'}
                          alt={prod.name}
                          className="w-10 h-10 rounded-lg object-cover border border-line bg-surface"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <p className="font-semibold text-ink">{prod.name}</p>
                          <span className="text-[10px] text-muted font-mono">
                            SKU: {prod.slug}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono text-body">
                      {prod.category}
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-ink">
                      {formatIDR(prod.price)}
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {(prod.colors || []).map((c, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-paper border border-line text-[10px] text-body"
                          >
                            <span
                              className="w-2 h-2 rounded-full border border-black/10 shrink-0"
                              style={{ backgroundColor: c.hex }}
                            />
                            {c.name}
                          </span>
                        ))}
                        {(prod.sizes || []).length > 0 && (
                          <span className="text-[10px] font-mono text-muted">
                            ({prod.sizes.join(', ')})
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleStock(prod.id, prod.inStock)}
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                          prod.inStock
                            ? 'bg-sage/10 text-sage hover:bg-sage/20'
                            : 'bg-danger/10 text-danger hover:bg-danger/20'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            prod.inStock ? 'bg-sage' : 'bg-danger'
                          }`}
                        />
                        <span>{prod.inStock ? 'Tersedia' : 'Stok Habis'}</span>
                      </button>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditModal(prod)}
                          className="p-1.5 text-muted hover:text-ink hover:bg-surface-hover rounded-md transition-colors cursor-pointer"
                          title="Edit produk & harga"
                          aria-label={`Edit ${prod.name}`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setProductToDelete(prod)}
                          className="p-1.5 text-muted hover:text-danger hover:bg-danger/10 rounded-md transition-colors cursor-pointer"
                          title="Hapus produk"
                          aria-label={`Hapus ${prod.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-modal-backdrop">
          <div className="bg-surface rounded-2xl max-w-lg w-full border border-line shadow-xl animate-modal-content max-h-[90vh] overflow-y-auto">
            <div className="p-5 sm:p-6 border-b border-line flex items-center justify-between">
              <h4 className="font-heading text-base font-bold text-ink">
                {editingProduct ? `Edit Produk: ${editingProduct.name}` : 'Tambah Produk Baru'}
              </h4>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1 text-muted hover:text-ink cursor-pointer"
                aria-label="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-heading mb-1.5">
                  Nama Produk <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={formValues.name}
                  onChange={(e) => setFormValues({ ...formValues, name: e.target.value })}
                  placeholder="Contoh: Kaos DTF 24s Logo Only"
                  className="w-full px-3 py-2 bg-paper border border-line focus:border-accent-soft rounded-lg text-sm text-ink focus:outline-hidden transition-colors"
                />
                {formErrors.name && <p className="text-xs text-danger mt-1">{formErrors.name}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-heading mb-1.5">Kategori</label>
                  <select
                    value={formValues.category}
                    onChange={(e) =>
                      setFormValues({ ...formValues, category: e.target.value as Product['category'] })
                    }
                    className="w-full px-3 py-2 bg-paper border border-line focus:border-accent-soft rounded-lg text-sm text-ink focus:outline-hidden transition-colors"
                  >
                    <option value="KAOS">KAOS</option>
                    <option value="JERSEY">JERSEY</option>
                    <option value="CUSTOM">CUSTOM</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-heading mb-1.5">
                    Harga / pcs (Rp) <span className="text-danger">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formValues.price || ''}
                    onChange={(e) =>
                      setFormValues({ ...formValues, price: Math.max(0, parseInt(e.target.value) || 0) })
                    }
                    placeholder="55000"
                    className="w-full px-3 py-2 bg-paper border border-line focus:border-accent-soft rounded-lg text-sm text-ink focus:outline-hidden transition-colors"
                  />
                  {formErrors.price && <p className="text-xs text-danger mt-1">{formErrors.price}</p>}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-heading mb-1.5">Deskripsi Singkat</label>
                <input
                  type="text"
                  value={formValues.shortDescription}
                  onChange={(e) => setFormValues({ ...formValues, shortDescription: e.target.value })}
                  placeholder="Contoh: Sablon DTF, 1 titik logo, tanpa nama/nomor punggung"
                  className="w-full px-3 py-2 bg-paper border border-line focus:border-accent-soft rounded-lg text-sm text-ink focus:outline-hidden transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-heading mb-1.5">Material</label>
                  <input
                    type="text"
                    value={formValues.material}
                    onChange={(e) => setFormValues({ ...formValues, material: e.target.value })}
                    placeholder="Combed 24s"
                    className="w-full px-3 py-2 bg-paper border border-line focus:border-accent-soft rounded-lg text-sm text-ink focus:outline-hidden transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-heading mb-1.5">URL Gambar</label>
                  <input
                    type="text"
                    value={formValues.imageUrl}
                    onChange={(e) => setFormValues({ ...formValues, imageUrl: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-3 py-2 bg-paper border border-line focus:border-accent-soft rounded-lg text-sm text-ink focus:outline-hidden transition-colors"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs text-heading cursor-pointer">
                <input
                  type="checkbox"
                  checked={formValues.inStock}
                  onChange={(e) => setFormValues({ ...formValues, inStock: e.target.checked })}
                  className="w-4 h-4 accent-accent"
                />
                Aktif &amp; tersedia di form pemesanan customer
              </label>
            </div>

            <div className="p-5 sm:p-6 pt-0 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-3 py-1.5 border border-line-strong text-body hover:bg-surface-hover text-xs font-medium rounded-lg cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveProduct}
                disabled={isSavingProduct}
                className="px-3.5 py-1.5 bg-accent hover:bg-accent-soft disabled:opacity-60 text-on-accent text-xs font-semibold rounded-lg cursor-pointer"
              >
                {isSavingProduct ? 'Menyimpan...' : editingProduct ? 'Simpan Perubahan' : 'Tambah Produk'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-modal-backdrop">
          <div className="bg-surface p-6 rounded-2xl max-w-sm w-full border border-line shadow-xl space-y-4 animate-modal-content">
            <h4 className="font-heading font-bold text-ink">Hapus Produk</h4>
            <p className="text-xs text-body leading-relaxed">
              Anda yakin ingin menghapus <strong className="text-ink">{productToDelete.name}</strong> dari katalog studio?
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-line">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="px-3 py-1.5 border border-line-strong text-body hover:bg-surface-hover text-xs font-medium rounded-lg cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDeleteProduct}
                className="px-3.5 py-1.5 bg-danger hover:bg-danger/80 text-ink-soft text-xs font-semibold rounded-lg cursor-pointer"
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
