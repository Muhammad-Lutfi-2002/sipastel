export function formatIDR(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function generateOrderId(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  // A 3-digit random suffix alone collides too easily once more than a
  // handful of orders land on the same day (birthday-paradox risk), and
  // Order ID is used as the primary lookup/unique key everywhere (tracking,
  // invoices, admin search). Mixing in the current time-of-day (ms) with the
  // random component makes accidental collisions astronomically unlikely
  // while keeping the ID short and human-readable.
  const timeComponent = now.getTime().toString(36).slice(-4).toUpperCase();
  const randomComponent = Math.floor(100 + Math.random() * 900);
  return `SPS-${year}${month}${day}-${randomComponent}${timeComponent}`;
}

export function generateInvoiceNumber(orderId: string): string {
  return `INV/${orderId.replace('SPS-', '')}`;
}

export function formatDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  } catch {
    return isoString;
  }
}

export function formatDateTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date) + ' WIB';
  } catch {
    return isoString;
  }
}

export function formatRoleLabel(role?: string): string {
  switch (role) {
    case 'OWNER':
      return 'Owner';
    case 'FINANCE':
      return 'Finance';
    case 'PRODUCTION_HEAD':
      return 'Kepala Produksi';
    default:
      return 'Staf';
  }
}

const PRODUCTION_STATUS_LABELS: Record<string, string> = {
  WAITING_VALIDATION: 'Menunggu Validasi',
  PRODUCTION_QUEUE: 'Antrean Produksi',
  DESIGN: 'Desain',
  DESIGN_APPROVAL: 'Menunggu Persetujuan Desain',
  DESIGN_REVISION: 'Revisi Desain',
  DESIGN_APPROVED: 'Desain Disetujui',
  CUTTING: 'Potong Bahan',
  SEWING: 'Menjahit',
  PRINTING: 'Sablon/Bordir',
  QC: 'Quality Control',
  REWORK: 'Perbaikan',
  PACKING: 'Packing',
  READY_TO_SHIP: 'Siap Kirim',
};

export function formatProductionStatusLabel(status?: string): string {
  if (!status) return '-';
  return PRODUCTION_STATUS_LABELS[status] || status.replace(/_/g, ' ');
}

const SHIPPING_STATUS_LABELS: Record<string, string> = {
  NOT_SHIPPED: 'Belum Dikirim',
  SHIPPED: 'Dikirim',
  IN_TRANSIT: 'Dalam Perjalanan',
  DELIVERED: 'Terkirim',
  COMPLETED: 'Selesai',
};

export function formatShippingStatusLabel(status?: string): string {
  if (!status) return '-';
  return SHIPPING_STATUS_LABELS[status] || status.replace(/_/g, ' ');
}

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  BELUM_BAYAR: 'Belum Bayar',
  DP_DIBAYAR: 'DP Dibayar',
  LUNAS: 'Lunas',
};

export function formatPaymentStatusLabel(status?: string): string {
  if (!status) return '-';
  return PAYMENT_STATUS_LABELS[status] || status.replace(/_/g, ' ');
}
