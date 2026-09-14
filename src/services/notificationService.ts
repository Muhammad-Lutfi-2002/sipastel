import { AdminNotification } from '../types';
import { supabase } from '../lib/supabaseClient';

// Real notifications backed by the `notifications` table in Supabase.
// Rows are created automatically by database triggers whenever a new order
// comes in, a payment is recorded, or an order's production/shipping status
// changes (see the trg_notify_* triggers) - this service only ever reads
// and marks rows as read, it never fabricates notification content.

function rowToNotification(row: Record<string, unknown>): AdminNotification {
  return {
    id: row.id as string,
    message: row.message as string,
    category: row.category as AdminNotification['category'],
    orderId: (row.order_id as string) ?? undefined,
    createdAt: row.created_at as string,
    isRead: Boolean(row.is_read),
  };
}

export async function getStoredNotifications(): Promise<AdminNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Failed to load notifications from Supabase:', error.message);
    return [];
  }
  return (data ?? []).map(rowToNotification);
}

export async function markNotificationAsRead(id: string): Promise<AdminNotification[]> {
  const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  if (error) {
    console.error('Failed to mark notification as read in Supabase:', error.message);
  }
  return getStoredNotifications();
}

export async function markAllNotificationsAsRead(): Promise<AdminNotification[]> {
  const { error } = await supabase.from('notifications').update({ is_read: true }).eq('is_read', false);
  if (error) {
    console.error('Failed to mark all notifications as read in Supabase:', error.message);
  }
  return getStoredNotifications();
}
