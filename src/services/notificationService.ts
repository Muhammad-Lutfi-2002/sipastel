import { AdminNotification } from '../types';

const NOTIFICATIONS_STORAGE_KEY = 'sipastel_admin_notifications_v1';

const INITIAL_NOTIFICATIONS: AdminNotification[] = [
  {
    id: 'notif-001',
    title: 'Pesanan Custom Baru',
    message: 'Pesanan custom baru SPS-20260906-891 telah diterima (24 pcs jersey lari).',
    category: 'ORDER',
    orderId: 'SPS-20260906-891',
    createdAt: '2026-09-06T14:15:00Z',
    isRead: false,
  },
  {
    id: 'notif-002',
    title: 'Pembayaran Terkonfirmasi',
    message: 'Pembayaran untuk SPS-20260905-182 telah dikonfirmasi via BCA Virtual Account.',
    category: 'PAYMENT',
    orderId: 'SPS-20260905-182',
    createdAt: '2026-09-05T09:45:00Z',
    isRead: false,
  },
  {
    id: 'notif-003',
    title: 'Persetujuan Desain',
    message: 'Customer meminta revisi desain untuk mockup SPS-20260906-891.',
    category: 'DESIGN',
    orderId: 'SPS-20260906-891',
    createdAt: '2026-09-06T16:20:00Z',
    isRead: false,
  },
  {
    id: 'notif-004',
    title: 'Siap QC',
    message: 'Pesanan SPS-20260905-182 selesai dijahit dan siap untuk pemeriksaan QC.',
    category: 'PRODUCTION',
    orderId: 'SPS-20260905-182',
    createdAt: '2026-09-07T08:30:00Z',
    isRead: true,
  },
];

export function getStoredNotifications(): AdminNotification[] {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(INITIAL_NOTIFICATIONS));
      return INITIAL_NOTIFICATIONS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse notifications:', e);
    return INITIAL_NOTIFICATIONS;
  }
}

export function saveStoredNotifications(notifs: AdminNotification[]): void {
  try {
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifs));
  } catch (e) {
    console.error('Failed to save notifications:', e);
  }
}

export function markNotificationAsRead(id: string): AdminNotification[] {
  const current = getStoredNotifications();
  const updated = current.map((n) => (n.id === id ? { ...n, isRead: true } : n));
  saveStoredNotifications(updated);
  return updated;
}

export function markAllNotificationsAsRead(): AdminNotification[] {
  const current = getStoredNotifications();
  const updated = current.map((n) => ({ ...n, isRead: true }));
  saveStoredNotifications(updated);
  return updated;
}

export function addAdminNotification(
  title: string,
  message: string,
  category: AdminNotification['category'],
  orderId?: string
): AdminNotification[] {
  const current = getStoredNotifications();
  const newNotif: AdminNotification = {
    id: `notif-${Date.now()}`,
    title,
    message,
    category,
    orderId,
    createdAt: new Date().toISOString(),
    isRead: false,
  };
  const updated = [newNotif, ...current];
  saveStoredNotifications(updated);
  return updated;
}
