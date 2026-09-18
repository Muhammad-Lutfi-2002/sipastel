import React, { useState, useEffect, useRef } from 'react';
import {
  Settings as SettingsIcon,
  Shield,
  Save,
  CheckCircle2,
  Lock,
  UserCheck,
  Building,
  X,
  ImageIcon,
  Upload,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import {
  getStoredStudioProfile,
  saveStoredStudioProfile,
  uploadStudioLogo,
  removeStudioLogo,
} from '../../../utils/storage';
import { formatRoleLabel } from '../../../utils/formatters';
import { useAdminToast } from '../AdminToast';

export const SettingsView: React.FC = () => {
  const { user, session } = useAuth();
  const { showToast } = useAdminToast();

  const [studioName, setStudioName] = useState('');
  const [studioAddress, setStudioAddress] = useState('');
  const [studioPhone, setStudioPhone] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankAccountHolder, setBankAccountHolder] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<'success' | 'error'>('success');

  // Logo upload
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);
  const [isSavingLogo, setIsSavingLogo] = useState(false);

  useEffect(() => {
    if (!feedback) return;
    showToast(feedback, feedbackType);
    setFeedback(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedback]);

  useEffect(() => {
    getStoredStudioProfile().then((profile) => {
      setStudioName(profile.name);
      setStudioAddress(profile.address);
      setStudioPhone(profile.phone);
      setBankName(profile.bankName);
      setBankAccountNumber(profile.bankAccountNumber);
      setBankAccountHolder(profile.bankAccountHolder);
      setLogoUrl(profile.logoUrl);
      setIsLoadingProfile(false);
    });
  }, []);

  const handleLogoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
    if (!allowed.includes(file.type)) {
      setFeedbackType('error');
      setFeedback('Format logo harus PNG, JPG, WEBP, atau SVG.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setFeedbackType('error');
      setFeedback('Ukuran logo maksimal 2MB.');
      return;
    }

    setPendingLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const cancelLogoPreview = () => {
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoPreview(null);
    setPendingLogoFile(null);
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  const handleUploadLogo = async () => {
    if (!pendingLogoFile) return;
    setIsSavingLogo(true);
    const result = await uploadStudioLogo(pendingLogoFile);
    setIsSavingLogo(false);

    if (!result.success) {
      setFeedbackType('error');
      setFeedback(result.error || 'Gagal mengupload logo.');
      return;
    }

    setLogoUrl(result.url ?? null);
    cancelLogoPreview();
    setFeedbackType('success');
    setFeedback('Logo studio berhasil diperbarui. Langsung tampil di header seluruh aplikasi.');
  };

  const handleRemoveLogo = async () => {
    setIsSavingLogo(true);
    const result = await removeStudioLogo(logoUrl);
    setIsSavingLogo(false);

    if (!result.success) {
      setFeedbackType('error');
      setFeedback(result.error || 'Gagal menghapus logo.');
      return;
    }
    setLogoUrl(null);
    setFeedbackType('success');
    setFeedback('Logo dihapus. Header kembali menggunakan wordmark default SIPASTEL.');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = studioName.trim();
    const trimmedAddress = studioAddress.trim();
    const trimmedPhone = studioPhone.trim();

    if (!trimmedName || !trimmedAddress || !trimmedPhone) {
      setFeedbackType('error');
      setFeedback('Nama studio, alamat, dan nomor telepon tidak boleh kosong.');
      setTimeout(() => setFeedback(null), 3000);
      return;
    }

    const saved = await saveStoredStudioProfile({
      name: trimmedName,
      address: trimmedAddress,
      phone: trimmedPhone,
      bankName: bankName.trim(),
      bankAccountNumber: bankAccountNumber.trim(),
      bankAccountHolder: bankAccountHolder.trim(),
      logoUrl,
    });

    setFeedbackType(saved ? 'success' : 'error');
    setFeedback(
      saved
        ? 'Pengaturan profil studio berhasil diperbarui.'
        : 'Gagal menyimpan pengaturan. Hanya akun Owner yang dapat mengubah profil studio.'
    );
    setTimeout(() => setFeedback(null), 3000);
  };

  const rbacRoles = [
    {
      role: 'OWNER',
      description: 'Pendiri Studio & Direktur Eksekutif',
      permissions: 'Akses penuh: keuangan, akun staf, invoice, pesanan, dan pengaturan studio.',
      badge: 'bg-accent text-on-accent',
    },
    {
      role: 'FINANCE',
      description: 'Tim Finance & Penagihan (2 akun)',
      permissions: 'Visibilitas pesanan, verifikasi pembayaran, pengelolaan invoice, data pelanggan.',
      badge: 'bg-accent-wash text-accent border border-danger/30',
    },
    {
      role: 'PRODUCTION_HEAD',
      description: 'Kepala Produksi — Pemimpin Workshop',
      permissions: 'Papan alur produksi, status potong/jahit/QC, packing, pengiriman.',
      badge: 'bg-info/10 text-info',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      {/* Header */}
      <div className="pb-3 border-b border-line">
        <h2 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-ink">
          Pengaturan &amp; Keamanan Studio
        </h2>
        <p className="text-xs sm:text-sm text-muted mt-0.5">
          Profil area kerja studio dan kontrol akses berbasis peran.
        </p>
      </div>

      {/* Feedback now surfaces via the modern floating toast (see AdminToast.tsx) */}

      {/* Logo Studio (Branding) Card */}
      <div className="p-5 bg-surface border border-line rounded-2xl space-y-4 shadow-[0_4px_20px_rgba(0,0,0,0.35)]">
        <div className="flex items-center gap-2 border-b border-line pb-3">
          <ImageIcon className="w-4 h-4 text-accent" />
          <h3 className="font-heading text-sm font-bold text-ink">Logo Studio</h3>
        </div>
        <p className="text-xs text-muted -mt-1">
          Logo aktif otomatis tampil di header seluruh halaman (customer & admin) tanpa perlu ubah kode.
        </p>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Current / preview */}
          <div className="w-28 h-28 shrink-0 rounded-xl border border-line bg-paper flex items-center justify-center overflow-hidden p-3">
            {logoPreview ? (
              <img src={logoPreview} alt="Preview logo baru" className="max-w-full max-h-full object-contain" />
            ) : logoUrl ? (
              <img src={logoUrl} alt="Logo studio aktif" className="max-w-full max-h-full object-contain" />
            ) : (
              <div className="text-center">
                <ImageIcon className="w-5 h-5 text-muted mx-auto mb-1" />
                <span className="text-[9px] text-muted font-mono uppercase">Belum ada logo</span>
              </div>
            )}
          </div>

          <div className="flex-1 space-y-2.5 w-full">
            <div>
              <span className="text-[11px] font-mono uppercase text-muted block mb-1">
                {logoPreview ? 'Preview Logo Baru' : logoUrl ? 'Logo Sedang Aktif' : 'Fallback: Wordmark "SIPASTEL"'}
              </span>
              <p className="text-[11px] text-muted">
                PNG, JPG, WEBP, atau SVG. Maksimal 2MB. Rasio disarankan mendekati persegi/landscape agar tidak
                terdistorsi (otomatis <code className="text-[10px]">object-fit: contain</code>).
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={handleLogoFileSelect}
                className="hidden"
                id="logo-upload-input"
              />

              {!logoPreview ? (
                <label
                  htmlFor="logo-upload-input"
                  className="px-3 py-1.5 bg-surface border border-line-strong hover:bg-surface-hover text-heading rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{logoUrl ? 'Ganti Logo' : 'Upload Logo'}</span>
                </label>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleUploadLogo}
                    disabled={isSavingLogo}
                    className="px-3 py-1.5 bg-accent hover:bg-accent-soft disabled:opacity-60 text-on-accent rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{isSavingLogo ? 'Menyimpan...' : 'Simpan Logo Ini'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={cancelLogoPreview}
                    className="px-3 py-1.5 border border-line-strong text-body hover:bg-surface-hover text-xs font-medium rounded-lg cursor-pointer"
                  >
                    Batal
                  </button>
                </>
              )}

              {logoUrl && !logoPreview && (
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  disabled={isSavingLogo}
                  className="px-3 py-1.5 text-danger hover:bg-danger/10 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Logo</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Studio Profile & Current Session */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Studio Info Card */}
        <div className="p-5 bg-surface border border-line rounded-2xl space-y-4 shadow-[0_4px_20px_rgba(0,0,0,0.35)]">
          <div className="flex items-center gap-2 border-b border-line pb-3">
            <Building className="w-4 h-4 text-accent" />
            <h3 className="font-heading text-sm font-bold text-ink">
              Informasi Studio
            </h3>
          </div>

          <form onSubmit={handleSave} className="space-y-3 text-xs">
            <div>
              <label className="block text-[11px] font-mono uppercase text-muted mb-1">
                Nama Brand / Studio
              </label>
              <input
                type="text"
                value={studioName}
                onChange={(e) => setStudioName(e.target.value)}
                className="w-full p-2 bg-paper border border-line rounded-lg text-ink focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase text-muted mb-1">
                Alamat Workshop
              </label>
              <input
                type="text"
                value={studioAddress}
                onChange={(e) => setStudioAddress(e.target.value)}
                className="w-full p-2 bg-paper border border-line rounded-lg text-ink focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase text-muted mb-1">
                WhatsApp Resmi Studio
              </label>
              <input
                type="text"
                value={studioPhone}
                onChange={(e) => setStudioPhone(e.target.value)}
                className="w-full p-2 bg-paper border border-line rounded-lg text-ink focus:outline-hidden font-mono"
              />
            </div>

            <div className="pt-1 border-t border-line">
              <p className="text-[11px] font-mono uppercase text-muted mt-2 mb-2">
                Rekening Transfer (ditampilkan ke customer)
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-mono uppercase text-muted mb-1">Nama Bank</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="Contoh: BCA"
                  className="w-full p-2 bg-paper border border-line rounded-lg text-ink focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono uppercase text-muted mb-1">Nomor Rekening</label>
                <input
                  type="text"
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                  placeholder="Contoh: 1234567890"
                  className="w-full p-2 bg-paper border border-line rounded-lg text-ink focus:outline-hidden font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase text-muted mb-1">
                Atas Nama Pemilik Rekening
              </label>
              <input
                type="text"
                value={bankAccountHolder}
                onChange={(e) => setBankAccountHolder(e.target.value)}
                placeholder="Contoh: Nama Owner Studio"
                className="w-full p-2 bg-paper border border-line rounded-lg text-ink focus:outline-hidden"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="px-4 py-2 bg-accent hover:bg-accent-soft text-on-accent rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Profil</span>
              </button>
            </div>
          </form>
        </div>

        {/* Current Active Session & RBAC */}
        <div className="p-5 bg-surface border border-line rounded-2xl space-y-4 shadow-[0_4px_20px_rgba(0,0,0,0.35)]">
          <div className="flex items-center gap-2 border-b border-line pb-3">
            <Lock className="w-4 h-4 text-sage" />
            <h3 className="font-heading text-sm font-bold text-ink">
              Detail Sesi Aktif
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 bg-paper border border-line rounded-lg">
              <div>
                <p className="font-semibold text-ink">{user?.name || 'Administrator'}</p>
                <span className="text-[11px] text-muted font-mono">{user?.email}</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-accent-wash text-accent">
                {formatRoleLabel(user?.role)}
              </span>
            </div>

            <div className="space-y-1.5 text-body">
              <p className="flex items-center justify-between">
                <span>Status Sesi:</span>
                <span className="font-mono text-sage font-semibold">{session ? 'Aktif' : '-'}</span>
              </p>
              <p className="flex items-center justify-between">
                <span>Email Login:</span>
                <span className="font-mono text-ink">{user?.email || '-'}</span>
              </p>
              <p className="flex items-center justify-between">
                <span>Database Tersinkron:</span>
                <span className="font-mono text-sage font-semibold">Supabase</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Role-Based Permissions Matrix */}
      <div className="p-5 bg-surface border border-line rounded-2xl space-y-4 shadow-[0_4px_20px_rgba(0,0,0,0.35)]">
        <div className="flex items-center gap-2 border-b border-line pb-3">
          <Shield className="w-4 h-4 text-info" />
          <h3 className="font-heading text-sm font-bold text-ink">
            Kontrol Akses Berbasis Peran (RBAC) Studio
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {rbacRoles.map((r) => (
            <div
              key={r.role}
              className="p-3.5 bg-paper border border-line rounded-lg space-y-1.5 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${r.badge}`}>
                  {r.role}
                </span>
                <span className="text-[11px] font-medium text-ink">{r.description}</span>
              </div>
              <p className="text-[11px] text-body leading-relaxed pt-1">
                {r.permissions}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
