import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Shield,
  Save,
  CheckCircle2,
  Lock,
  UserCheck,
  Building,
  X,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { getStoredStudioProfile, saveStoredStudioProfile } from '../../../utils/storage';
import { formatRoleLabel } from '../../../utils/formatters';

export const SettingsView: React.FC = () => {
  const { user, session } = useAuth();

  const [studioName, setStudioName] = useState('');
  const [studioAddress, setStudioAddress] = useState('');
  const [studioPhone, setStudioPhone] = useState('');
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<'success' | 'error'>('success');

  useEffect(() => {
    getStoredStudioProfile().then((profile) => {
      setStudioName(profile.name);
      setStudioAddress(profile.address);
      setStudioPhone(profile.phone);
      setIsLoadingProfile(false);
    });
  }, []);

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
      badge: 'bg-[#1F1E1D] text-white',
    },
    {
      role: 'FINANCE',
      description: 'Tim Finance & Penagihan (2 akun)',
      permissions: 'Visibilitas pesanan, verifikasi pembayaran, pengelolaan invoice, data pelanggan.',
      badge: 'bg-[#FAF0EC] text-[#C14E30] border border-[#F0D5CD]',
    },
    {
      role: 'PRODUCTION_HEAD',
      description: 'Kepala Produksi — Pemimpin Workshop',
      permissions: 'Papan alur produksi, status potong/jahit/QC, packing, pengiriman.',
      badge: 'bg-[#F5F0FB] text-[#4E3672]',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      {/* Header */}
      <div className="pb-3 border-b border-[#EAE6DF]">
        <h2 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-[#1F1E1D]">
          Pengaturan &amp; Keamanan Studio
        </h2>
        <p className="text-xs sm:text-sm text-[#7A766F] mt-0.5">
          Profil area kerja atelier dan kontrol akses berbasis peran.
        </p>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-lg text-xs flex items-center justify-between animate-modal-content border ${
            feedbackType === 'error'
              ? 'bg-[#FDF0EE] text-[#B3261E] border-[#F3D4CF]'
              : 'bg-[#EFF6EF] text-[#2D5931] border-[#CDE5CD]'
          }`}
        >
          <span>{feedback}</span>
          <button onClick={() => setFeedback(null)} aria-label="Tutup pesan" className="cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Grid: Studio Profile & Current Session */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Studio Info Card */}
        <div className="p-5 bg-white border border-[#EAE6DF] rounded-xl space-y-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-2 border-b border-[#F0ECE5] pb-3">
            <Building className="w-4 h-4 text-[#C14E30]" />
            <h3 className="font-heading text-sm font-bold text-[#1F1E1D]">
              Informasi Studio
            </h3>
          </div>

          <form onSubmit={handleSave} className="space-y-3 text-xs">
            <div>
              <label className="block text-[11px] font-mono uppercase text-[#8C8880] mb-1">
                Nama Brand / Atelier
              </label>
              <input
                type="text"
                value={studioName}
                onChange={(e) => setStudioName(e.target.value)}
                className="w-full p-2 bg-[#FAF9F5] border border-[#E8E4DA] rounded-lg text-[#1F1E1D] focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase text-[#8C8880] mb-1">
                Alamat Workshop
              </label>
              <input
                type="text"
                value={studioAddress}
                onChange={(e) => setStudioAddress(e.target.value)}
                className="w-full p-2 bg-[#FAF9F5] border border-[#E8E4DA] rounded-lg text-[#1F1E1D] focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase text-[#8C8880] mb-1">
                WhatsApp Resmi Studio
              </label>
              <input
                type="text"
                value={studioPhone}
                onChange={(e) => setStudioPhone(e.target.value)}
                className="w-full p-2 bg-[#FAF9F5] border border-[#E8E4DA] rounded-lg text-[#1F1E1D] focus:outline-hidden font-mono"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="px-4 py-2 bg-[#1F1E1D] hover:bg-[#33312E] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Profil</span>
              </button>
            </div>
          </form>
        </div>

        {/* Current Active Session & RBAC */}
        <div className="p-5 bg-white border border-[#EAE6DF] rounded-xl space-y-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-2 border-b border-[#F0ECE5] pb-3">
            <Lock className="w-4 h-4 text-[#4A7C59]" />
            <h3 className="font-heading text-sm font-bold text-[#1F1E1D]">
              Detail Sesi Aktif
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 bg-[#FAF9F5] border border-[#E8E4DA] rounded-lg">
              <div>
                <p className="font-semibold text-[#1F1E1D]">{user?.name || 'Administrator'}</p>
                <span className="text-[11px] text-[#8C8880] font-mono">{user?.email}</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FAF0EC] text-[#C14E30]">
                {formatRoleLabel(user?.role)}
              </span>
            </div>

            <div className="space-y-1.5 text-[#5E5B54]">
              <p className="flex items-center justify-between">
                <span>Status Sesi:</span>
                <span className="font-mono text-[#4A7C59] font-semibold">{session ? 'Aktif' : '-'}</span>
              </p>
              <p className="flex items-center justify-between">
                <span>Email Login:</span>
                <span className="font-mono text-[#1F1E1D]">{user?.email || '-'}</span>
              </p>
              <p className="flex items-center justify-between">
                <span>Database Tersinkron:</span>
                <span className="font-mono text-[#4A7C59] font-semibold">Supabase</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Role-Based Permissions Matrix */}
      <div className="p-5 bg-white border border-[#EAE6DF] rounded-xl space-y-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-2 border-b border-[#F0ECE5] pb-3">
          <Shield className="w-4 h-4 text-[#7B5EA7]" />
          <h3 className="font-heading text-sm font-bold text-[#1F1E1D]">
            Kontrol Akses Berbasis Peran (RBAC) Studio
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {rbacRoles.map((r) => (
            <div
              key={r.role}
              className="p-3.5 bg-[#FAF9F5] border border-[#E8E4DA] rounded-lg space-y-1.5 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${r.badge}`}>
                  {r.role}
                </span>
                <span className="text-[11px] font-medium text-[#1F1E1D]">{r.description}</span>
              </div>
              <p className="text-[11px] text-[#5E5B54] leading-relaxed pt-1">
                {r.permissions}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
