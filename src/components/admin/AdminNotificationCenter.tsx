import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  CheckCheck,
  Clock,
  ShoppingBag,
  CreditCard,
  Palette,
  Scissors,
  CheckCircle2,
  Truck,
  ChevronRight,
  X,
} from 'lucide-react';
import { AdminNotification } from '../../types';
import {
  getStoredNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../../services/notificationService';
import { useRouter } from '../../context/RouterContext';

export const AdminNotificationCenter: React.FC = () => {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { navigate } = useRouter();

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const refresh = async () => {
    const list = await getStoredNotifications();
    setNotifications(list);
  };

  useEffect(() => {
    refresh();
    // Refresh periodically so new notifications (created server-side by
    // triggers when other staff act on an order) show up without a full
    // page reload.
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleMarkAllRead = async () => {
    const updated = await markAllNotificationsAsRead();
    setNotifications(updated);
  };

  const handleClickItem = async (notif: AdminNotification) => {
    setIsOpen(false);
    if (notif.orderId) {
      navigate(`/admin/orders/${notif.orderId}`);
    }
    if (!notif.isRead) {
      const updated = await markNotificationAsRead(notif.id);
      setNotifications(updated);
    }
  };

  const getCategoryConfig = (category: AdminNotification['category']) => {
    switch (category) {
      case 'ORDER':
        return {
          icon: <ShoppingBag className="w-3.5 h-3.5 text-[#C14E30]" />,
          bg: 'bg-[#FAF0EC]',
          label: 'Pesanan Baru',
        };
      case 'PAYMENT':
        return {
          icon: <CreditCard className="w-3.5 h-3.5 text-[#4A7C59]" />,
          bg: 'bg-[#EFF6EF]',
          label: 'Pembayaran',
        };
      case 'DESIGN':
        return {
          icon: <Palette className="w-3.5 h-3.5 text-[#9162C0]" />,
          bg: 'bg-[#F6F0FC]',
          label: 'Desain',
        };
      case 'PRODUCTION':
        return {
          icon: <Scissors className="w-3.5 h-3.5 text-[#C27828]" />,
          bg: 'bg-[#FAF3EB]',
          label: 'Produksi',
        };
      case 'QC':
        return {
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-[#3E6B89]" />,
          bg: 'bg-[#EDF3F7]',
          label: 'Quality Control',
        };
      case 'SHIPPING':
        return {
          icon: <Truck className="w-3.5 h-3.5 text-[#5C7D64]" />,
          bg: 'bg-[#F0F5F1]',
          label: 'Pengiriman',
        };
      default:
        return {
          icon: <Bell className="w-3.5 h-3.5 text-[#636058]" />,
          bg: 'bg-[#F4F1EA]',
          label: 'Sistem',
        };
    }
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      if (diffMins < 1) return 'Baru saja';
      if (diffMins < 60) return `${diffMins} menit lalu`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours} jam lalu`;
      return `${Math.floor(diffHours / 24)} hari lalu`;
    } catch {
      return '';
    }
  };

  const displayedList = notifications.filter((n) => {
    if (filter === 'UNREAD') return !n.isRead;
    return true;
  });

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button with tiny, non-intrusive indicator */}
      <button
        id="admin-notification-bell-btn"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-[#5E5B54] hover:text-[#1C1B1A] hover:bg-[#F2EFE9] rounded-lg transition-colors cursor-pointer"
        aria-label="Notifikasi"
        title="Pusat Notifikasi Operasional"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#D87A61] ring-2 ring-[#FAF9F5]" />
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-[#E8E4DA] shadow-xl rounded-xl z-50 overflow-hidden animate-modal-content">
          {/* Header */}
          <div className="p-3.5 border-b border-[#EFECE5] flex items-center justify-between bg-[#FCFAF7]">
            <div className="flex items-center gap-2">
              <span className="font-heading font-bold text-xs text-[#1C1B1A] tracking-tight">
                Notifikasi
              </span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-[#FAF0EC] text-[#C14E30] text-[10px] font-semibold">
                  {unreadCount} baru
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-[11px] font-medium text-[#C14E30] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <CheckCheck className="w-3 h-3" />
                  <span>Tandai semua dibaca</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Tutup notifikasi"
                className="p-1 text-[#8C8880] hover:text-[#1C1B1A] rounded-md transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Filter Tab */}
          <div className="flex border-b border-[#EFECE5] bg-white text-xs px-2 pt-1">
            <button
              onClick={() => setFilter('ALL')}
              className={`flex-1 py-1.5 text-center font-medium text-[11px] transition-colors cursor-pointer ${
                filter === 'ALL'
                  ? 'border-b-2 border-[#1C1B1A] text-[#1C1B1A] font-bold'
                  : 'text-[#8C8880] hover:text-[#1C1B1A]'
              }`}
            >
              Semua ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('UNREAD')}
              className={`flex-1 py-1.5 text-center font-medium text-[11px] transition-colors cursor-pointer ${
                filter === 'UNREAD'
                  ? 'border-b-2 border-[#1C1B1A] text-[#1C1B1A] font-bold'
                  : 'text-[#8C8880] hover:text-[#1C1B1A]'
              }`}
            >
              Belum Dibaca ({unreadCount})
            </button>
          </div>

          {/* List */}
          <div className="max-h-84 overflow-y-auto divide-y divide-[#F5F2EC]">
            {displayedList.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#8C8880]">
                Tidak ada notifikasi{filter === 'UNREAD' ? ' yang belum dibaca' : ''}.
              </div>
            ) : (
              displayedList.map((notif) => {
                const conf = getCategoryConfig(notif.category);
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleClickItem(notif)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleClickItem(notif);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={notif.message || 'Buka notifikasi'}
                    className={`w-full p-3.5 text-left transition-colors cursor-pointer flex items-start gap-3 hover:bg-[#FAF6F2] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1F1E1D] ${
                      !notif.isRead ? 'bg-[#FCFAF7]' : ''
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg ${conf.bg} flex items-center justify-center shrink-0 mt-0.5`}
                    >
                      {conf.icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[11px] font-semibold text-[#1C1B1A] truncate">
                          {conf.label}
                        </span>
                        <span className="text-[10px] text-[#8C8880] shrink-0 font-mono">
                          {formatRelativeTime(notif.createdAt)}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#5E5B54] mt-0.5 line-clamp-2 leading-relaxed">
                        {notif.message}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-[#8C8880] mt-1.5">
                        <span className="px-1.5 py-0.2 rounded bg-[#F2EFE9] text-[#636058] font-mono">
                          {conf.label}
                        </span>
                        {notif.orderId && (
                          <span className="font-mono text-[#C14E30] font-medium">
                            {notif.orderId}
                          </span>
                        )}
                        {!notif.isRead && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#D87A61] ml-auto shrink-0" />
                        )}
                      </div>
                    </div>

                    <ChevronRight className="w-3.5 h-3.5 text-[#B8B4AA] shrink-0 mt-1" />
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
