import { CartItem, Order, Payment, Product } from '../types';
import { supabase } from '../lib/supabaseClient';
import { formatIDR } from './formatters';
import { uploadImage } from './imageUpload';

const CART_STORAGE_KEY = 'sipastel_cart_items_v1';

// Max size we accept for a design upload (also enforced server-side by the
// Worker via MAX_UPLOAD_MB, kept in sync at 8MB) - checked client-side
// first purely to fail fast without waiting on a network round trip for
// an obviously oversized attachment.
const MAX_DESIGN_FILE_BYTES = 8 * 1024 * 1024; // 8MB

// Uploads a customer's custom-order design file and returns its public
// URL, or null if the upload failed (network issue, file too large,
// unsupported type, etc). Callers should treat a null return as
// non-fatal — the order can still be submitted, just without a viewable
// mockup image, and the customer can send the file via WhatsApp as a
// fallback.
//
// Storage backend: Cloudflare R2, via the Worker's public /api/images/upload
// endpoint (see src/utils/imageUpload.ts). Raster images are automatically
// resized and converted to WebP before being stored; PDFs are stored as-is.
// Previously this uploaded directly to a Supabase Storage bucket
// ("design-uploads") — Supabase now only stores the resulting URL
// (orders.design_url), not the file itself.
export async function uploadDesignFile(file: File, orderId: string): Promise<string | null> {
  if (file.size > MAX_DESIGN_FILE_BYTES) {
    console.error(`Design file too large: ${file.size} bytes (max ${MAX_DESIGN_FILE_BYTES}).`);
    return null;
  }
  const result = await uploadImage(file, 'designs', orderId);
  return result?.url ?? null;
}

// Cart is intentionally kept in localStorage rather than Supabase: it's
// per-device "in progress" state for an anonymous shopper before an order
// even exists, so there is no meaningful server-side record to sync yet.
export function getStoredCart(): CartItem[] {
  try {
    const data = localStorage.getItem(CART_STORAGE_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Failed to load cart from storage:', e);
    return [];
  }
}

export function saveStoredCart(cart: CartItem[]): void {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  } catch (e) {
    console.error('Failed to save cart to storage:', e);
  }
}

// ---------- Orders (Supabase-backed) ----------

// Maps a `public.orders` database row (snake_case) to the app's Order type
// (camelCase). Keeping this mapping in one place means the rest of the app
// never has to know about the database's column naming.
function rowToOrder(row: Record<string, unknown>): Order {
  const invoiceRel = row.invoices as { id: string }[] | { id: string } | null | undefined;
  const invoiceId = Array.isArray(invoiceRel) ? invoiceRel[0]?.id : invoiceRel?.id;

  return {
    id: row.id as string,
    orderId: row.order_id as string,
    invoiceId: invoiceId ?? undefined,
    customer: row.customer as string,
    phone: row.phone as string,
    email: (row.email as string) ?? undefined,
    address: (row.address as string) ?? '',
    city: (row.city as string) ?? '',
    postalCode: (row.postal_code as string) ?? '',
    items: (row.items as Order['items']) ?? [],
    quantity: row.quantity as number,
    totalPrice: row.total_price != null ? Number(row.total_price) : undefined,
    totalPaid: row.total_paid != null ? Number(row.total_paid) : 0,
    remainingBalance: row.remaining_balance != null ? Number(row.remaining_balance) : 0,
    paymentPercentage: row.payment_percentage != null ? Number(row.payment_percentage) : 0,
    design: (row.design_url as string) ?? null,
    designFileName: (row.design_file_name as string) ?? null,
    notes: (row.notes as string) ?? undefined,
    request: (row.request as string) ?? undefined,
    productType: (row.product_type as string) ?? undefined,
    material: (row.material as string) ?? undefined,
    sizeSpec: (row.size_spec as string) ?? undefined,
    colorSpec: (row.color_spec as string) ?? undefined,
    paymentStatus: row.payment_status as Order['paymentStatus'],
    paymentMethod: (row.payment_method as string) ?? undefined,
    paymentDate: (row.payment_date as string) ?? undefined,
    productionStatus: row.production_status as Order['productionStatus'],
    shippingStatus: row.shipping_status as Order['shippingStatus'],
    courier: (row.courier as string) ?? undefined,
    trackingNumber: (row.tracking_number as string) ?? undefined,
    responsibleTeam: (row.responsible_team as string) ?? undefined,
    invoiceNumber: row.invoice_number as string,
    createdAt: row.created_at as string,
    isCustomOrder: row.is_custom_order as boolean,
  };
}

// Maps an app Order back to database column names for insert/update.
function orderToRow(order: Order): Record<string, unknown> {
  return {
    order_id: order.orderId,
    invoice_number: order.invoiceNumber,
    customer: order.customer,
    phone: order.phone,
    email: order.email ?? null,
    address: order.address ?? null,
    city: order.city ?? null,
    postal_code: order.postalCode ?? null,
    is_custom_order: order.isCustomOrder,
    product_type: order.productType ?? null,
    items: order.items ?? [],
    quantity: order.quantity,
    design_url: order.design ?? null,
    design_file_name: order.designFileName ?? null,
    notes: order.notes ?? null,
    request: order.request ?? null,
    material: order.material ?? null,
    size_spec: order.sizeSpec ?? null,
    color_spec: order.colorSpec ?? null,
    total_price: order.totalPrice ?? 0,
    // payment_status / total_paid / remaining_balance / payment_percentage are
    // intentionally NOT sent here - they are computed and locked server-side
    // (see the orders_force_default_payment_state and payments_after_change
    // triggers). The payment ledger (`payments` table) is the only way to
    // change an order's paid amount.
    production_status: order.productionStatus,
    shipping_status: order.shippingStatus,
    courier: order.courier ?? null,
    tracking_number: order.trackingNumber ?? null,
    responsible_team: order.responsibleTeam ?? null,
  };
}

export async function getStoredOrders(): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, invoices(id)')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Failed to load orders from Supabase:', error.message);
    return [];
  }
  return (data ?? []).map(rowToOrder);
}

// Public, self-service order lookup for customers. Deliberately requires
// BOTH the order_id and the phone number used at checkout (calls the
// `track_order` database function, which enforces this match server-side)
// so a customer can only ever look up their own order, never browse others.
export async function trackOrder(orderId: string, phone: string): Promise<Order | null> {
  const { data, error } = await supabase.rpc('track_order', {
    p_order_id: orderId.trim(),
    p_phone: phone.trim(),
  });
  if (error || !data || data.length === 0) return null;
  return rowToOrder(data[0]);
}

export async function addStoredOrder(order: Order): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.from('orders').insert(orderToRow(order));
  if (error) {
    console.error('Failed to insert order into Supabase:', error.message);
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function updateStoredOrderStatus(
  orderId: string,
  productionStatus?: Order['productionStatus'],
  shippingStatus?: Order['shippingStatus']
): Promise<Order[]> {
  const patch: Record<string, unknown> = {};
  if (productionStatus) patch.production_status = productionStatus;
  if (shippingStatus) patch.shipping_status = shippingStatus;
  // Note: payment_status is intentionally never settable here - it is
  // entirely derived from the payments ledger (see recordPayment/voidPayment
  // below) and the database rejects direct writes to this column.

  if (Object.keys(patch).length > 0) {
    const { error } = await supabase.from('orders').update(patch).eq('order_id', orderId);
    if (error) {
      console.error('Failed to update order status in Supabase:', error.message);
    }
  }

  return getStoredOrders();
}

// Broader update used by the Order Detail screen, which can adjust status
// fields together with shipping/courier details in one save action. Status
// transitions are still captured automatically in order_status_history by
// the database trigger; courier/tracking fields are plain column updates.
// Sets/updates the admin-quoted price for a custom order. Custom orders are
// created with total_price = 0 (the customer hasn't been quoted yet); this
// is the only place that column is ever written from the app, and only
// OWNER/FINANCE should call it (enforced in the UI, mirroring payment
// recording permissions). The `trg_recalc_on_price_change` database trigger
// automatically recomputes total_paid/remaining_balance/payment_percentage/
// payment_status afterwards, so those never need to be touched here.
// ---------- Products / Catalog (Supabase-backed) ----------

function rowToProduct(row: Record<string, unknown>): Product {
  return {
    id: row.id as string,
    slug: row.slug as string,
    name: row.name as string,
    category: row.category as Product['category'],
    isBestSeller: Boolean(row.is_best_seller),
    isNew: Boolean(row.is_new),
    price: Number(row.price),
    formattedPrice: formatIDR(Number(row.price)),
    shortDescription: (row.short_description as string) ?? '',
    description: (row.description as string) ?? '',
    material: (row.material as string) ?? '',
    fit: (row.fit as string) ?? '',
    productionTime: (row.production_time as string) ?? '',
    careInstructions: (row.care_instructions as string[]) ?? [],
    sizes: (row.sizes as string[]) ?? [],
    colors: (row.colors as Product['colors']) ?? [],
    images: (row.images as string[]) ?? [],
    inStock: Boolean(row.in_stock),
  };
}

export async function getStoredProducts(): Promise<Product[]> {
  const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: true });
  if (error) {
    console.error('Failed to load products from Supabase:', error.message);
    return [];
  }
  return (data ?? []).map(rowToProduct);
}

export async function toggleProductStock(
  productId: string,
  inStock: boolean
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.from('products').update({ in_stock: inStock }).eq('id', productId);
  if (error) {
    console.error('Failed to update product stock in Supabase:', error.message);
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function deleteStoredProduct(productId: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.from('products').delete().eq('id', productId);
  if (error) {
    console.error('Failed to delete product from Supabase:', error.message);
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function updateOrderPrice(
  orderId: string,
  totalPrice: number
): Promise<{ success: boolean; error?: string }> {
  if (!Number.isFinite(totalPrice) || totalPrice < 0) {
    return { success: false, error: 'Harga harus berupa angka dan tidak boleh negatif.' };
  }
  const { error } = await supabase.from('orders').update({ total_price: totalPrice }).eq('order_id', orderId);
  if (error) {
    console.error('Failed to update order price in Supabase:', error.message);
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function updateOrderDetails(
  orderId: string,
  patch: {
    productionStatus?: Order['productionStatus'];
    shippingStatus?: Order['shippingStatus'];
    courier?: string;
    trackingNumber?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const row: Record<string, unknown> = {};
  if (patch.productionStatus) row.production_status = patch.productionStatus;
  if (patch.shippingStatus) row.shipping_status = patch.shippingStatus;
  if (patch.courier !== undefined) row.courier = patch.courier || null;
  if (patch.trackingNumber !== undefined) row.tracking_number = patch.trackingNumber || null;

  const { error } = await supabase.from('orders').update(row).eq('order_id', orderId);
  if (error) {
    console.error('Failed to update order details in Supabase:', error.message);
    return { success: false, error: error.message };
  }
  return { success: true };
}

// ---------- Payments (Supabase-backed, append-only ledger) ----------

function rowToPayment(row: Record<string, unknown>): Payment {
  const recorder = row.recorder as { name: string } | null | undefined;
  const voider = row.voider as { name: string } | null | undefined;
  return {
    paymentId: row.payment_id as string,
    orderId: row.order_id as string,
    invoiceId: row.invoice_id as string,
    paidAt: row.paid_at as string,
    amount: Number(row.amount),
    paymentType: row.payment_type as Payment['paymentType'],
    paymentMethod: row.payment_method as string,
    note: (row.note as string) ?? undefined,
    status: row.status as Payment['status'],
    recordedBy: (row.recorded_by as string) ?? undefined,
    recordedByName: recorder?.name,
    isOverpaymentOverride: Boolean(row.is_overpayment_override),
    voidedAt: (row.voided_at as string) ?? undefined,
    voidedBy: (row.voided_by as string) ?? undefined,
    voidedByName: voider?.name,
    voidReason: (row.void_reason as string) ?? undefined,
    createdAt: row.created_at as string,
  };
}

// Full payment history for one order, newest first. Includes voided entries
// (shown, never hidden) so Admin can see the complete trail.
export async function getPaymentHistory(orderInternalId: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*, recorder:staff_profiles!payments_recorded_by_fkey(name), voider:staff_profiles!payments_voided_by_fkey(name)')
    .eq('order_id', orderInternalId)
    .order('paid_at', { ascending: false });

  if (error) {
    console.error('Failed to load payment history from Supabase:', error.message);
    return [];
  }
  return (data ?? []).map(rowToPayment);
}

export interface RecordPaymentInput {
  orderInternalId: string;
  invoiceId: string;
  amount: number;
  paymentType: Payment['paymentType'];
  paymentMethod: string;
  note?: string;
  recordedBy: string;
  isOverpaymentOverride?: boolean;
  paidAt?: string;
}

// Records a new payment transaction. This is the ONLY way total_paid /
// remaining_balance / payment_percentage / payment_status on the parent
// order can change - the database trigger recalculates them automatically
// from the full ledger the moment this insert succeeds. The business rule
// (amount cannot exceed the remaining balance, unless explicitly overridden
// by an Owner) is enforced server-side and cannot be bypassed from here.
export async function recordPayment(
  input: RecordPaymentInput
): Promise<{ success: boolean; error?: string; payment?: Payment }> {
  const { data, error } = await supabase
    .from('payments')
    .insert({
      order_id: input.orderInternalId,
      invoice_id: input.invoiceId,
      amount: input.amount,
      payment_type: input.paymentType,
      payment_method: input.paymentMethod,
      note: input.note ?? null,
      recorded_by: input.recordedBy,
      is_overpayment_override: input.isOverpaymentOverride ?? false,
      ...(input.paidAt ? { paid_at: input.paidAt } : {}),
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to record payment in Supabase:', error.message);
    return { success: false, error: error.message };
  }
  return { success: true, payment: rowToPayment(data) };
}

// Voids/reverses a payment. The original row is preserved exactly as-is;
// only the void metadata columns are filled in (see protect_payment_
// immutability trigger, which rejects any attempt to change the original
// amount/type/method). Restricted to Owner by RLS.
export async function voidPayment(
  paymentId: string,
  voidedBy: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('payments')
    .update({
      status: 'VOID',
      voided_at: new Date().toISOString(),
      voided_by: voidedBy,
      void_reason: reason,
    })
    .eq('payment_id', paymentId);

  if (error) {
    console.error('Failed to void payment in Supabase:', error.message);
    return { success: false, error: error.message };
  }
  return { success: true };
}

// ---------- Studio profile settings (Supabase-backed) ----------

export interface StudioProfile {
  name: string;
  address: string;
  phone: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountHolder: string;
}

const DEFAULT_STUDIO_PROFILE: StudioProfile = {
  name: 'SIPASTEL APPAREL STUDIO',
  address: 'Puri Matahari Persada Blok C No. 25, Laladon, Ciomas, Bogor, Jawa Barat',
  phone: '+62 812-3456-7890',
  bankName: 'BCA',
  bankAccountNumber: '',
  bankAccountHolder: '',
};

export async function getStoredStudioProfile(): Promise<StudioProfile> {
  const { data, error } = await supabase
    .from('studio_profile')
    .select('name, address, phone, bank_name, bank_account_number, bank_account_holder')
    .eq('id', true)
    .maybeSingle();

  if (error || !data) {
    console.error('Failed to load studio profile from Supabase:', error?.message);
    return DEFAULT_STUDIO_PROFILE;
  }
  return {
    name: data.name,
    address: data.address,
    phone: data.phone,
    bankName: data.bank_name ?? '',
    bankAccountNumber: data.bank_account_number ?? '',
    bankAccountHolder: data.bank_account_holder ?? '',
  };
}

export async function saveStoredStudioProfile(profile: StudioProfile): Promise<boolean> {
  const { error } = await supabase
    .from('studio_profile')
    .update({
      name: profile.name,
      address: profile.address,
      phone: profile.phone,
      bank_name: profile.bankName,
      bank_account_number: profile.bankAccountNumber,
      bank_account_holder: profile.bankAccountHolder,
    })
    .eq('id', true);

  if (error) {
    console.error('Failed to save studio profile to Supabase:', error.message);
    return false;
  }
  return true;
}
