export function getWhatsAppNumber(): string {
  const envNumber = import.meta.env?.VITE_WHATSAPP_NUMBER;
  if (envNumber && typeof envNumber === 'string' && envNumber.trim().length > 0) {
    return envNumber.replace(/[^0-9]/g, '');
  }
  // Default official contact number placeholder
  return '6281234567890';
}

export function createWhatsAppUrl(message: string, customPhone?: string): string {
  const number = customPhone ? customPhone.replace(/[^0-9]/g, '') : getWhatsAppNumber();
  const encodedText = encodeURIComponent(message);
  return `https://wa.me/${number}?text=${encodedText}`;
}

export function getCustomOrderWhatsAppMessage(params: {
  orderId: string;
  name: string;
  product: string;
  quantity: number | string;
  request: string;
}): string {
  return `Hi SIPASTEL, saya ingin mengonfirmasi custom order saya.

Order ID:
${params.orderId}

Nama:
${params.name}

Produk:
${params.product}

Quantity:
${params.quantity}

Request:
${params.request}`;
}

export function getProductOrderWhatsAppMessage(params: {
  orderId: string;
  name: string;
  itemsList: string;
  totalFormatted: string;
  shippingAddress: string;
}): string {
  return `Hi SIPASTEL, saya ingin mengonfirmasi pesanan saya.

Order ID:
${params.orderId}

Nama:
${params.name}

Pesanan:
${params.itemsList}

Total:
${params.totalFormatted}

Alamat Pengiriman:
${params.shippingAddress}

Mohon instruksi pembayaran dan estimasi pengerjaan. Terima kasih!`;
}

export function getProductInquiryWhatsAppMessage(productName: string, selectedVariant?: string): string {
  return `Hi SIPASTEL, saya tertarik dengan produk ${productName}${selectedVariant ? ` (${selectedVariant})` : ''}. Apakah masih tersedia dan bisa konsultasi ukuran? Terima kasih.`;
}
