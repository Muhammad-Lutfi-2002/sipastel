import React, { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type AdminToastType = 'success' | 'error' | 'warning' | 'info';

interface AdminToastItem {
  id: string;
  type: AdminToastType;
  message: string;
}

interface AdminToastContextValue {
  showToast: (message: string, type?: AdminToastType) => void;
}

const AdminToastContext = createContext<AdminToastContextValue | undefined>(undefined);

const TOAST_STYLES: Record<
  AdminToastType,
  { icon: React.ElementType; bar: string; iconBg: string; iconColor: string }
> = {
  success: { icon: CheckCircle2, bar: 'bg-[#4A7C59]', iconBg: 'bg-[#EFF6EF]', iconColor: 'text-[#4A7C59]' },
  error: { icon: AlertCircle, bar: 'bg-[#B84A48]', iconBg: 'bg-[#FAF0F0]', iconColor: 'text-[#B84A48]' },
  warning: { icon: AlertTriangle, bar: 'bg-[#C27828]', iconBg: 'bg-[#FBF1E3]', iconColor: 'text-[#C27828]' },
  info: { icon: Info, bar: 'bg-[#7B5EA7]', iconBg: 'bg-[#F1ECF8]', iconColor: 'text-[#7B5EA7]' },
};

const AUTO_DISMISS_MS = 4200;

/**
 * Modern floating toast notifications for the whole admin panel, mounted
 * once in AdminLayout so any view can call useAdminToast().showToast(...)
 * instead of rendering its own inline colored banner. Purely a
 * presentation upgrade - it doesn't change what any view communicates,
 * only how it's shown (floating card instead of a static box pushing
 * content down).
 */
export const AdminToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<AdminToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: AdminToastType = 'success') => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setToasts((prev) => [...prev, { id, type, message }]);
      window.setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    },
    [dismiss]
  );

  return (
    <AdminToastContext.Provider value={{ showToast }}>
      {children}

      <div
        aria-label="Notifikasi Admin"
        className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:bottom-6 sm:right-6 z-[100] flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full pointer-events-none"
      >
        {toasts.map((toast) => {
          const style = TOAST_STYLES[toast.type];
          const Icon = style.icon;
          return (
            <div
              key={toast.id}
              role="alert"
              className="pointer-events-auto relative overflow-hidden bg-white border border-[#EAE6DF] rounded-2xl shadow-[0_8px_30px_rgba(28,27,26,0.12)] flex items-start gap-3 p-3.5 pl-4 animate-toast-in"
            >
              <span className={`absolute left-0 top-0 bottom-0 w-[3px] ${style.bar}`} />
              <div className={`w-7 h-7 rounded-lg ${style.iconBg} flex items-center justify-center shrink-0 mt-0.5`}>
                <Icon className={`w-4 h-4 ${style.iconColor}`} />
              </div>
              <p className="flex-1 text-xs sm:text-[13px] font-medium text-[#1F1E1D] leading-snug pt-1.5">
                {toast.message}
              </p>
              <button
                onClick={() => dismiss(toast.id)}
                className="text-[#B8B4AA] hover:text-[#1F1E1D] p-1 -m-0.5 mt-1 transition-colors shrink-0 cursor-pointer"
                aria-label="Tutup notifikasi"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </AdminToastContext.Provider>
  );
};

export function useAdminToast(): AdminToastContextValue {
  const ctx = useContext(AdminToastContext);
  if (!ctx) {
    throw new Error('useAdminToast must be used within an AdminToastProvider');
  }
  return ctx;
}
