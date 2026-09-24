import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { useRouter } from '../../context/RouterContext';
import { useAuth } from '../../context/AuthContext';
import { homeRouteForRole } from '../../utils/permissions';
import { formatRoleLabel } from '../../utils/formatters';

export const AccessDenied: React.FC = () => {
  const { navigate } = useRouter();
  const { user } = useAuth();

  return (
    <div role="alert" className="max-w-md mx-auto mt-16 p-8 text-center space-y-4 bg-surface border border-line rounded-2xl">
      <div className="w-11 h-11 rounded-full bg-danger/10 text-danger flex items-center justify-center mx-auto">
        <ShieldAlert className="w-5 h-5" aria-hidden="true" />
      </div>
      <div>
        <h2 className="font-heading text-base font-bold text-ink">Akses Ditolak</h2>
        <p className="text-sm text-body mt-1.5 leading-relaxed">
          Peran <strong className="text-ink">{formatRoleLabel(user?.role)}</strong> tidak memiliki izin untuk membuka
          halaman ini. Hubungi Owner jika Anda memerlukan akses.
        </p>
      </div>
      <button
        type="button"
        onClick={() => navigate(homeRouteForRole(user?.role), { replace: true })}
        className="px-4 py-2 bg-accent hover:bg-accent-soft text-on-accent rounded-lg text-sm font-semibold cursor-pointer transition-colors"
      >
        Kembali ke Beranda
      </button>
    </div>
  );
};
