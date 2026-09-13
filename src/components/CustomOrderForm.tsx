import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  FileCheck,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  MessageCircle,
  Clock,
  Sparkles,
  Layers,
  HelpCircle,
  FileText,
  Loader2,
  X,
  Landmark,
} from 'lucide-react';
import { CustomOrderFormData, Order } from '../types';
import { generateOrderId, generateInvoiceNumber } from '../utils/formatters';
import { createWhatsAppUrl, getCustomOrderWhatsAppMessage } from '../utils/whatsapp';
import { addStoredOrder, uploadDesignFile, getStoredStudioProfile, StudioProfile } from '../utils/storage';

interface CustomOrderFormProps {
  onSuccessOrder?: (order: Order) => void;
  onOrderSubmitted?: (order: Order) => void;
  onClose?: () => void;
  onOpenSizeGuide?: (category: 'KAOS' | 'JERSEY') => void;
  onBrowseShop?: () => void;
}

const DP_PERCENTAGE_OPTIONS = [30, 50, 70];

export const CustomOrderForm: React.FC<CustomOrderFormProps> = ({
  onSuccessOrder,
  onOrderSubmitted,
  onClose,
  onOpenSizeGuide,
  onBrowseShop,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const totalSteps = 7;

  // Bank info shown at the Review step so the customer knows where to
  // transfer. Fetched from Supabase (public read, see studio_profile RLS)
  // rather than hardcoded, so it always reflects whatever the admin has
  // set in Settings.
  const [studioProfile, setStudioProfile] = useState<StudioProfile | null>(null);

  useEffect(() => {
    getStoredStudioProfile().then(setStudioProfile);
  }, []);

  // Form state
  const [formData, setFormData] = useState<CustomOrderFormData>({
    customerName: '',
    whatsappNumber: '',
    email: '',
    productType: 'Kaos',
    quantity: 12,
    size: 'Campur (S, M, L, XL)',
    color: 'Dusty Sage & Warm Oatmeal',
    materialVariant: 'Combed Cotton 16s Heavyweight',
    designFile: null,
    designPreviewUrl: null,
    designDescription: '',
    additionalNotes: '',
    referenceUrl: '',
    shippingAddress: '',
    city: '',
    postalCode: '',
    paymentPreference: 'DP',
    paymentPreferencePercentage: 50,
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [submittedOrder, setSubmittedOrder] = useState<Order | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  previewUrlRef.current = formData.designPreviewUrl;

  // Release the object URL for the uploaded design preview if the user
  // navigates away without removing the file, preventing a memory leak.
  // Uses a ref so the cleanup always sees the latest preview URL rather than
  // the one captured when the effect was first created.
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  const stepsList = [
    { num: 1, label: 'Customer Info' },
    { num: 2, label: 'Product' },
    { num: 3, label: 'Specification' },
    { num: 4, label: 'Design' },
    { num: 5, label: 'Request' },
    { num: 6, label: 'Delivery' },
    { num: 7, label: 'Review' },
  ];

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    const validExtensions = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
    if (!validExtensions.includes(file.type) && !file.name.endsWith('.pdf')) {
      setErrors((prev) => ({
        ...prev,
        designFile: 'Format file tidak didukung. Harap upload PNG, JPG, atau PDF.',
      }));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({
        ...prev,
        designFile: 'Ukuran file maksimal 5MB.',
      }));
      return;
    }

    setErrors((prev) => {
      const copy = { ...prev };
      delete copy.designFile;
      return copy;
    });

    const isImage = file.type.startsWith('image/');
    const previewUrl = isImage ? URL.createObjectURL(file) : null;

    // Revoke the previous object URL (if any) before creating a new one, so
    // replacing a file doesn't leak the old blob URL for the page's lifetime.
    setFormData((prev) => {
      if (prev.designPreviewUrl) {
        URL.revokeObjectURL(prev.designPreviewUrl);
      }
      return {
        ...prev,
        designFile: file,
        designPreviewUrl: previewUrl,
      };
    });

    // Animate upload progress 0% -> 100%
    setUploadProgress(25);
    setTimeout(() => setUploadProgress(70), 120);
    setTimeout(() => setUploadProgress(100), 280);
  };

  const validateStep = (step: number): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (step === 1) {
      if (!formData.customerName.trim()) {
        newErrors.customerName = 'Nama wajib diisi.';
      }
      if (!formData.whatsappNumber.trim()) {
        newErrors.whatsappNumber = 'Nomor WhatsApp aktif wajib diisi.';
      } else if (formData.whatsappNumber.replace(/[^0-9]/g, '').length < 9) {
        newErrors.whatsappNumber = 'Nomor WhatsApp minimal 9 digit angka.';
      }
    } else if (step === 2) {
      if (!formData.quantity || formData.quantity < 1) {
        newErrors.quantity = 'Kuantitas minimal 1 pcs.';
      }
    } else if (step === 3) {
      if (!formData.size.trim()) {
        newErrors.size = 'Spesifikasi ukuran wajib diisi.';
      }
      if (!formData.color.trim()) {
        newErrors.color = 'Pilihan warna wajib diisi.';
      }
    } else if (step === 5) {
      if (!formData.designDescription.trim()) {
        newErrors.designDescription = 'Jelaskan ringkasan konsep desain yang Anda inginkan.';
      }
    } else if (step === 6) {
      if (!formData.shippingAddress.trim()) {
        newErrors.shippingAddress = 'Alamat lengkap pengiriman wajib diisi.';
      }
      if (!formData.city.trim()) {
        newErrors.city = 'Kota tujuan wajib diisi.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(totalSteps, prev + 1));
      window.scrollTo({ top: 200, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(currentStep)) return;

    setIsSubmitting(true);
    setSubmitError(null);

    const newOrderId = generateOrderId();
    const invoiceNum = generateInvoiceNumber(newOrderId);

    // Upload the design file to Supabase Storage (if one was attached) so
    // the admin panel has a real, permanent image URL to render — a local
    // blob: preview URL only exists in this browser tab and is useless once
    // the order is viewed later from the admin dashboard.
    let uploadedDesignUrl: string | null = null;
    if (formData.designFile) {
      uploadedDesignUrl = await uploadDesignFile(formData.designFile, newOrderId);
      if (!uploadedDesignUrl) {
        setIsSubmitting(false);
        setSubmitError(
          'Gagal mengunggah file desain Anda. Mohon periksa koneksi internet dan coba lagi, atau kirimkan file desain langsung via WhatsApp setelah submit.'
        );
        return;
      }
    }

    const newOrder: Order = {
      id: '', // generated server-side by the database default; unused on insert
      orderId: newOrderId,
      customer: formData.customerName,
      phone: formData.whatsappNumber,
      email: formData.email,
      address: formData.shippingAddress,
      city: formData.city,
      postalCode: formData.postalCode,
      items: [
        {
          productName: `Custom ${formData.productType} — ${formData.color}`,
          category: 'CUSTOM',
          variantColor: formData.color,
          size: formData.size,
          quantity: Number(formData.quantity),
        },
      ],
      quantity: Number(formData.quantity),
      totalPaid: 0, // server-computed; unused on insert
      remainingBalance: 0, // server-computed; unused on insert (total_price is set later by admin quote)
      paymentPercentage: 0, // server-computed; unused on insert
      design: uploadedDesignUrl,
      designFileName: formData.designFile ? formData.designFile.name : null,
      notes: formData.additionalNotes,
      request: `${formData.designDescription}. Bahan: ${formData.materialVariant}. Ukuran: ${formData.size}`,
      productType: formData.productType,
      material: formData.materialVariant,
      sizeSpec: formData.size,
      colorSpec: formData.color,
      paymentStatus: 'BELUM_BAYAR',
      paymentPreference: formData.paymentPreference,
      paymentPreferencePercentage:
        formData.paymentPreference === 'DP' ? formData.paymentPreferencePercentage : 100,
      productionStatus: 'WAITING_VALIDATION',
      shippingStatus: 'NOT_SHIPPED',
      invoiceNumber: invoiceNum,
      createdAt: new Date().toISOString(),
      isCustomOrder: true,
    };

    const result = await addStoredOrder(newOrder);

    if (!result.success) {
      setIsSubmitting(false);
      setSubmitError(
        'Gagal mengirim pesanan custom Anda. Mohon periksa koneksi internet dan coba lagi, atau hubungi kami langsung via WhatsApp.'
      );
      return;
    }

    setSubmittedOrder(newOrder);
    setIsSubmitting(false);

    if (onSuccessOrder) {
      onSuccessOrder(newOrder);
    }
    if (onOrderSubmitted) {
      onOrderSubmitted(newOrder);
    }
  };

  // SUCCESS CONFIRMATION SCREEN
  if (submittedOrder) {
    const waMessage = getCustomOrderWhatsAppMessage({
      orderId: submittedOrder.orderId,
      name: submittedOrder.customer,
      product: `Custom ${submittedOrder.productType || 'Apparel'}`,
      quantity: `${submittedOrder.quantity} pcs`,
      request: submittedOrder.request || formData.designDescription,
      paymentPreference: submittedOrder.paymentPreference ?? 'DP',
      paymentPreferencePercentage: submittedOrder.paymentPreferencePercentage ?? 50,
      bankName: studioProfile?.bankName,
      bankAccountNumber: studioProfile?.bankAccountNumber,
      bankAccountHolder: studioProfile?.bankAccountHolder,
    });
    const waUrl = createWhatsAppUrl(waMessage);

    return (
      <div id="custom-order-confirmation" className="w-full max-w-3xl mx-auto py-12 px-4 sm:px-6">
        <div className="bg-[#FAF9F5] border border-[#E8E5DF] p-6 sm:p-10 rounded-xs shadow-sm">
          {/* Header Badge */}
          <div className="flex items-center gap-2.5 text-[#5B7C59] mb-4">
            <CheckCircle2 className="w-6 h-6" />
            <span className="text-xs font-bold uppercase tracking-widest">Custom Order Diterima</span>
          </div>

          <h2 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-[#1C1B1A]">
            Your request has been received.
          </h2>

          <p className="text-sm sm:text-base text-[#55524B] mt-2 leading-relaxed">
            Terima kasih telah mempercayakan produksi pakaian custom Anda kepada SIPASTEL. Tim kami telah menerima spesifikasi dan file desain Anda.
          </p>

          {/* Details Card */}
          <div className="mt-8 p-5 bg-[#F4F1EA] rounded-xs border border-[#E5E1D7] space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#E5E1D7] gap-1">
              <span className="text-xs uppercase tracking-wider text-[#75726B]">Order ID</span>
              <span className="font-mono text-base font-bold text-[#1C1B1A]">{submittedOrder.orderId}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
              <div>
                <span className="text-[#75726B] block text-xs">Customer</span>
                <span className="font-semibold text-[#1C1B1A]">{submittedOrder.customer}</span>
              </div>
              <div>
                <span className="text-[#75726B] block text-xs">Produk & Qty</span>
                <span className="font-semibold text-[#1C1B1A]">
                  Custom {submittedOrder.productType} ({submittedOrder.quantity} pcs)
                </span>
              </div>
              <div>
                <span className="text-[#75726B] block text-xs">Status Produksi</span>
                <span className="inline-block px-2 py-0.5 mt-0.5 bg-[#E2EBE4] text-[#345137] font-semibold text-[11px] rounded-xs">
                  WAITING_VALIDATION
                </span>
              </div>
              <div>
                <span className="text-[#75726B] block text-xs">Estimasi Respon</span>
                <span className="font-semibold text-[#1C1B1A] flex items-center gap-1 mt-0.5">
                  <Clock className="w-3.5 h-3.5 text-[#677663]" />
                  1–2 Jam Kerja
                </span>
              </div>
            </div>
          </div>

          {/* Action WhatsApp Callout */}
          <div className="mt-8 space-y-3">
            <a
              id="confirm-custom-order-wa-btn"
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-4 px-6 bg-[#1C1B1A] hover:bg-[#2C2B29] text-[#FAF9F5] text-sm font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-2.5 rounded-xs shadow-xs"
            >
              <MessageCircle className="w-4 h-4 text-[#677663]" />
              <span>Contact Us on WhatsApp</span>
            </a>

            <p className="text-center text-xs text-[#75726B]">
              Klik tombol di atas untuk langsung mengirim detail pesanan ke WhatsApp admin SIPASTEL beserta format konfirmasi otomatis.
            </p>
          </div>

          {/* Additional Actions */}
          <div className="mt-8 pt-6 border-t border-[#EAE7E1] flex flex-wrap items-center justify-between gap-3 text-xs">
            <button
              onClick={() => {
                if (formData.designPreviewUrl) {
                  URL.revokeObjectURL(formData.designPreviewUrl);
                }
                setSubmittedOrder(null);
                setCurrentStep(1);
                setFormData({
                  customerName: '',
                  whatsappNumber: '',
                  email: '',
                  productType: 'Kaos',
                  quantity: 12,
                  size: 'Campur (S, M, L, XL)',
                  color: 'Dusty Sage & Warm Oatmeal',
                  materialVariant: 'Combed Cotton 16s Heavyweight',
                  designFile: null,
                  designPreviewUrl: null,
                  designDescription: '',
                  additionalNotes: '',
                  referenceUrl: '',
                  shippingAddress: '',
                  city: '',
                  postalCode: '',
                  paymentPreference: 'DP',
                  paymentPreferencePercentage: 50,
                });
              }}
              className="text-[#42403B] hover:text-[#1C1B1A] font-semibold underline"
            >
              Buat Custom Order Lainnya
            </button>

            {onBrowseShop && (
              <button
                onClick={onBrowseShop}
                className="text-[#42403B] hover:text-[#1C1B1A] font-semibold underline"
              >
                Lihat Katalog Produk Siap Pakai
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // WIZARD FORM
  return (
    <div id="custom-order-page-section" className="w-full">
      {onClose && (
        <div className="flex justify-end mb-3">
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup form custom order"
            className="p-2 -mr-2 text-[#66645E] hover:text-[#1C1B1A] cursor-pointer rounded-[2px] hover:bg-[#EFEBE2] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
      {/* Modern Stepper Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between overflow-x-auto pb-2 scrollbar-none">
          {stepsList.map((step) => {
            const isPassed = currentStep > step.num;
            const isCurrent = currentStep === step.num;
            return (
              <button
                key={step.num}
                type="button"
                onClick={() => {
                  if (step.num < currentStep) {
                    setCurrentStep(step.num);
                  }
                }}
                className={`flex items-center gap-2 shrink-0 px-2 py-1 text-xs font-semibold uppercase tracking-wider transition-colors ${
                  isCurrent
                    ? 'text-[#1C1B1A] border-b-2 border-[#1C1B1A]'
                    : isPassed
                    ? 'text-[#66645E] cursor-pointer'
                    : 'text-[#BBB8B0] cursor-not-allowed'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] transition-all duration-200 ${
                    isCurrent
                      ? 'bg-[#1C1B1A] text-[#FAF9F5] scale-105'
                      : isPassed
                      ? 'bg-[#8F9E8B] text-[#FAF9F5]'
                      : 'bg-[#EAE7E1] text-[#75726B]'
                  }`}
                >
                  {isPassed ? '✓' : `0${step.num}`}
                </span>
                <span className="hidden sm:inline">{step.label}</span>
              </button>
            );
          })}
        </div>
        {/* Animated continuous progress track */}
        <div className="w-full h-[2px] bg-[#E8E5DF] mt-2 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#1C1B1A] transition-all duration-300 ease-out"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Main Form Container */}
      <div className="bg-[#FAF9F5] border border-[#E8E5DF] p-6 sm:p-8 md:p-10 rounded-xs shadow-xs">
        <form onSubmit={handleSubmit}>
          {/* STEP 01: Customer Information */}
          {currentStep === 1 && (
            <div className="space-y-5 animate-fade-in">
              <div className="border-b border-[#EAE7E1] pb-3 mb-5">
                <span className="text-[11px] font-bold text-[#677663] uppercase tracking-widest">
                  STEP 01 OF 07
                </span>
                <h2 className="font-heading text-xl sm:text-2xl font-bold text-[#1C1B1A] mt-1">
                  Customer Information
                </h2>
                <p className="text-xs text-[#75726B] mt-0.5">
                  Informasi kontak untuk update mockup desain dan proses produksi.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#42403B] mb-1.5">
                  Nama Lengkap <span className="text-[#B25D52]">*</span>
                </label>
                <input
                  id="custom-order-name-input"
                  type="text"
                  value={formData.customerName}
                  onChange={(e) =>
                    setFormData({ ...formData, customerName: e.target.value })
                  }
                  placeholder="Contoh: Dimas Aditya"
                  className="w-full px-4 py-3 bg-[#FAF9F5] border border-[#DCD8D0] rounded-xs text-sm text-[#1C1B1A] placeholder-[#9E9B93] focus:outline-none focus:border-[#1C1B1A]"
                />
                {errors.customerName && (
                  <p className="text-xs text-[#B25D52] mt-1">{errors.customerName}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#42403B] mb-1.5">
                  Nomor WhatsApp Aktif <span className="text-[#B25D52]">*</span>
                </label>
                <input
                  id="custom-order-whatsapp-input"
                  type="tel"
                  value={formData.whatsappNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, whatsappNumber: e.target.value })
                  }
                  placeholder="Contoh: 081234567890"
                  className="w-full px-4 py-3 bg-[#FAF9F5] border border-[#DCD8D0] rounded-xs text-sm text-[#1C1B1A] placeholder-[#9E9B93] focus:outline-none focus:border-[#1C1B1A]"
                />
                <p className="text-[11px] text-[#75726B] mt-1">
                  Kami akan mengirimkan preview preview digital mockup via WhatsApp.
                </p>
                {errors.whatsappNumber && (
                  <p className="text-xs text-[#B25D52] mt-1">{errors.whatsappNumber}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#42403B] mb-1.5">
                  Email (Opsional)
                </label>
                <input
                  id="custom-order-email-input"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="Contoh: dimas@gmail.com"
                  className="w-full px-4 py-3 bg-[#FAF9F5] border border-[#DCD8D0] rounded-xs text-sm text-[#1C1B1A] placeholder-[#9E9B93] focus:outline-none focus:border-[#1C1B1A]"
                />
              </div>
            </div>
          )}

          {/* STEP 02: Product & Quantity */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div className="border-b border-[#EAE7E1] pb-3 mb-5">
                <span className="text-[11px] font-bold text-[#677663] uppercase tracking-widest">
                  STEP 02 OF 07
                </span>
                <h2 className="font-heading text-xl sm:text-2xl font-bold text-[#1C1B1A] mt-1">
                  Product Type & Quantity
                </h2>
                <p className="text-xs text-[#75726B] mt-0.5">
                  Pilih jenis apparel dan jumlah pesanan yang Anda butuhkan.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#42403B] mb-2.5">
                  Jenis Produk Apparel <span className="text-[#B25D52]">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(['Kaos', 'Jersey', 'Custom Apparel Lainnya'] as const).map(
                    (type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() =>
                          setFormData({ ...formData, productType: type })
                        }
                        className={`p-4 rounded-xs border text-left transition-all ${
                          formData.productType === type
                            ? 'border-[#1C1B1A] bg-[#F5F2EA] ring-1 ring-[#1C1B1A]'
                            : 'border-[#E2DFD8] bg-[#FAF9F5] hover:border-[#BBB8B0]'
                        }`}
                      >
                        <p className="font-heading font-bold text-sm text-[#1C1B1A] mb-1">
                          {type}
                        </p>
                        <p className="text-xs text-[#66645E]">
                          {type === 'Kaos' && 'Heavyweight 16s/24s, Boxy cut, Oversized'}
                          {type === 'Jersey' && 'Dry-Fit Milano, Aero Sublimasi, Running'}
                          {type === 'Custom Apparel Lainnya' && 'Crewneck, Hoodie, Poloshirt'}
                        </p>
                      </button>
                    )
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#42403B] mb-1.5">
                  Estimasi Jumlah / Quantity (Pcs) <span className="text-[#B25D52]">*</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    id="custom-order-quantity-input"
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        quantity: Math.max(1, parseInt(e.target.value) || 1),
                      })
                    }
                    className="w-36 px-4 py-3 bg-[#FAF9F5] border border-[#DCD8D0] rounded-xs text-sm font-semibold text-[#1C1B1A] focus:outline-none focus:border-[#1C1B1A]"
                  />
                  <span className="text-xs text-[#66645E]">
                    (Minimum order mulai 1 pcs untuk sample mockup, diskon bertingkat untuk 12+ pcs)
                  </span>
                </div>
                {errors.quantity && (
                  <p className="text-xs text-[#B25D52] mt-1">{errors.quantity}</p>
                )}
              </div>
            </div>
          )}

          {/* STEP 03: Specification */}
          {currentStep === 3 && (
            <div className="space-y-5 animate-fade-in">
              <div className="border-b border-[#EAE7E1] pb-3 mb-5">
                <span className="text-[11px] font-bold text-[#677663] uppercase tracking-widest">
                  STEP 03 OF 07
                </span>
                <h2 className="font-heading text-xl sm:text-2xl font-bold text-[#1C1B1A] mt-1">
                  Product Specification
                </h2>
                <p className="text-xs text-[#75726B] mt-0.5">
                  Tentukan bahan kain, ukuran, dan palet warna dasar.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#42403B] mb-1.5">
                  Pilihan Bahan / Varian Kain <span className="text-[#B25D52]">*</span>
                </label>
                <select
                  value={formData.materialVariant}
                  onChange={(e) =>
                    setFormData({ ...formData, materialVariant: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-[#FAF9F5] border border-[#DCD8D0] rounded-xs text-sm text-[#1C1B1A] focus:outline-none focus:border-[#1C1B1A]"
                >
                  <option value="Combed Cotton 16s Heavyweight">
                    Combed Cotton 16s Heavyweight (235 gsm - Tebal & Kokoh)
                  </option>
                  <option value="Combed Cotton 24s Premium Soft">
                    Combed Cotton 24s Premium Soft (180 gsm - Lembut & Adem)
                  </option>
                  <option value="Dry-Fit Milano Micro-Mesh">
                    Dry-Fit Milano Micro-Mesh (Jersey Olahraga & Komunitas)
                  </option>
                  <option value="Dry-Fit Bilabong Anti-UV">
                    Dry-Fit Bilabong Anti-UV (Running & Cycling)
                  </option>
                  <option value="French Terry Premium 280 gsm">
                    French Terry Premium 280 gsm (Sweater / Crewneck)
                  </option>
                  <option value="Konsultasikan dengan Admin">
                    Rekomendasi Bahan dari Tim SIPASTEL
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#42403B] mb-1.5">
                  Rincian Ukuran / Size Breakdown <span className="text-[#B25D52]">*</span>
                </label>
                <input
                  type="text"
                  value={formData.size}
                  onChange={(e) =>
                    setFormData({ ...formData, size: e.target.value })
                  }
                  placeholder="Contoh: S: 4 pcs, M: 8 pcs, L: 10 pcs, XL: 2 pcs"
                  className="w-full px-4 py-3 bg-[#FAF9F5] border border-[#DCD8D0] rounded-xs text-sm text-[#1C1B1A] placeholder-[#9E9B93] focus:outline-none focus:border-[#1C1B1A]"
                />
                {errors.size && (
                  <p className="text-xs text-[#B25D52] mt-1">{errors.size}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#42403B] mb-1.5">
                  Warna Kain / Aksen Pastel <span className="text-[#B25D52]">*</span>
                </label>
                <input
                  type="text"
                  value={formData.color}
                  onChange={(e) =>
                    setFormData({ ...formData, color: e.target.value })
                  }
                  placeholder="Contoh: Sage Green, Warm Oatmeal, Charcoal, atau Mist Blue"
                  className="w-full px-4 py-3 bg-[#FAF9F5] border border-[#DCD8D0] rounded-xs text-sm text-[#1C1B1A] placeholder-[#9E9B93] focus:outline-none focus:border-[#1C1B1A]"
                />
                {errors.color && (
                  <p className="text-xs text-[#B25D52] mt-1">{errors.color}</p>
                )}
              </div>
            </div>
          )}

          {/* STEP 04: Upload Design */}
          {currentStep === 4 && (
            <div className="space-y-5 animate-fade-in">
              <div className="border-b border-[#EAE7E1] pb-3 mb-5">
                <span className="text-[11px] font-bold text-[#677663] uppercase tracking-widest">
                  STEP 04 OF 07
                </span>
                <h2 className="font-heading text-xl sm:text-2xl font-bold text-[#1C1B1A] mt-1">
                  Upload Design
                </h2>
                <p className="text-xs text-[#75726B] mt-0.5">
                  Upload file desain atau logo Anda. Format didukung: PNG, JPG, PDF (Maks. 5MB).
                </p>
              </div>

              {/* Drag & Drop Area */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label="Upload file desain atau logo, klik atau seret file ke area ini"
                className={`border-2 border-dashed rounded-xs p-8 text-center cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1C1B1A] focus-visible:ring-offset-2 ${
                  isDragging
                    ? 'border-[#1C1B1A] bg-[#F5F2EA]'
                    : 'border-[#D4D0C7] hover:border-[#1C1B1A] bg-[#FBF9F6]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".png,.jpg,.jpeg,.pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-[#EFECE4] flex items-center justify-center text-[#55524B]">
                    <Upload className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-semibold text-[#1C1B1A] mt-2">
                    Drag and drop file desain ke sini, atau klik untuk memilih file
                  </p>
                  <p className="text-xs text-[#75726B]">
                    PNG, JPG, PDF (Resolusi 300 DPI disarankan untuk hasil cetak tajam)
                  </p>
                </div>
              </div>

              {/* Preview if uploaded */}
              {formData.designFile && (
                <div className="p-4 bg-[#F5F2EA] rounded-xs border border-[#E5DEC9] space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {formData.designPreviewUrl ? (
                        <img
                          src={formData.designPreviewUrl}
                          alt="Preview Desain"
                          className="w-12 h-12 object-cover rounded-xs border border-[#D8D4CA]"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-[#E5DEC9] flex items-center justify-center rounded-xs text-[#55524B]">
                          <FileText className="w-6 h-6" />
                        </div>
                      )}
                      <div className="truncate">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-[#1C1B1A] truncate max-w-[200px] sm:max-w-xs">
                            {formData.designFile.name}
                          </p>
                          <span className="px-1.5 py-0.5 text-[9px] uppercase font-bold tracking-widest bg-[#E8E5DF] text-[#42403B] rounded-[2px]">
                            {formData.designFile.name.split('.').pop()?.toUpperCase() || 'FILE'}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#75726B] mt-0.5">
                          {(formData.designFile.size / (1024 * 1024)).toFixed(2)} MB • {uploadProgress === 100 ? 'Siap diverifikasi' : 'Mengunggah...'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFormData((prev) => {
                          if (prev.designPreviewUrl) {
                            URL.revokeObjectURL(prev.designPreviewUrl);
                          }
                          return {
                            ...prev,
                            designFile: null,
                            designPreviewUrl: null,
                          };
                        });
                        setUploadProgress(0);
                      }}
                      className="text-xs text-[#B25D52] hover:text-[#8E3B32] font-semibold hover:underline cursor-pointer"
                    >
                      Hapus
                    </button>
                  </div>

                  {/* Animated Upload Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-mono text-[#75726B]">
                      <span>Upload Status</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#E8E5DF] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#5B7C59] transition-all duration-300 ease-out rounded-full"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {errors.designFile && (
                <p className="text-xs text-[#B25D52]">{errors.designFile}</p>
              )}

              <p className="text-xs text-[#75726B]">
                *Belum memiliki desain jadi? Jangan khawatir, Anda dapat mendeskripsikan ide Anda di langkah berikutnya atau mengirimkannya via WhatsApp nanti.
              </p>
            </div>
          )}

          {/* STEP 05: Request Details */}
          {currentStep === 5 && (
            <div className="space-y-5 animate-fade-in">
              <div className="border-b border-[#EAE7E1] pb-3 mb-5">
                <span className="text-[11px] font-bold text-[#677663] uppercase tracking-widest">
                  STEP 05 OF 07
                </span>
                <h2 className="font-heading text-xl sm:text-2xl font-bold text-[#1C1B1A] mt-1">
                  Design Request & Notes
                </h2>
                <p className="text-xs text-[#75726B] mt-0.5">
                  Berikan arahan penempatan sablon/bordir dan instruksi khusus lainnya.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#42403B] mb-1.5">
                  Deskripsi Desain & Penempatan <span className="text-[#B25D52]">*</span>
                </label>
                <textarea
                  id="custom-order-request-input"
                  rows={4}
                  value={formData.designDescription}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      designDescription: e.target.value,
                    })
                  }
                  placeholder="Contoh: Sablon logo di dada kiri ukuran 8x8cm (DTF tekstur doff) dan grafis tipografi di punggung tengah ukuran A3. Aksen jahitan benang warna sage green."
                  className="w-full px-4 py-3 bg-[#FAF9F5] border border-[#DCD8D0] rounded-xs text-sm text-[#1C1B1A] placeholder-[#9E9B93] focus:outline-none focus:border-[#1C1B1A]"
                />
                {errors.designDescription && (
                  <p className="text-xs text-[#B25D52] mt-1">
                    {errors.designDescription}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#42403B] mb-1.5">
                  Catatan Tambahan (Packaging, Label Woven, Deadline Acara)
                </label>
                <textarea
                  rows={2}
                  value={formData.additionalNotes}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      additionalNotes: e.target.value,
                    })
                  }
                  placeholder="Contoh: Perlu selesai sebelum tanggal 25 untuk event komunitas lari. Sertakan stiker pack."
                  className="w-full px-4 py-3 bg-[#FAF9F5] border border-[#DCD8D0] rounded-xs text-sm text-[#1C1B1A] placeholder-[#9E9B93] focus:outline-none focus:border-[#1C1B1A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#42403B] mb-1.5">
                  Link Referensi / Moodboard (Opsional)
                </label>
                <input
                  type="text"
                  value={formData.referenceUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, referenceUrl: e.target.value })
                  }
                  placeholder="Contoh: https://pin.it/... atau link Google Drive"
                  className="w-full px-4 py-3 bg-[#FAF9F5] border border-[#DCD8D0] rounded-xs text-sm text-[#1C1B1A] placeholder-[#9E9B93] focus:outline-none focus:border-[#1C1B1A]"
                />
              </div>
            </div>
          )}

          {/* STEP 06: Delivery */}
          {currentStep === 6 && (
            <div className="space-y-5 animate-fade-in">
              <div className="border-b border-[#EAE7E1] pb-3 mb-5">
                <span className="text-[11px] font-bold text-[#677663] uppercase tracking-widest">
                  STEP 06 OF 07
                </span>
                <h2 className="font-heading text-xl sm:text-2xl font-bold text-[#1C1B1A] mt-1">
                  Delivery Destination
                </h2>
                <p className="text-xs text-[#75726B] mt-0.5">
                  Alamat pengiriman hasil produksi setelah melalui Quality Control (QC).
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#42403B] mb-1.5">
                  Alamat Lengkap <span className="text-[#B25D52]">*</span>
                </label>
                <textarea
                  id="custom-order-address-input"
                  rows={3}
                  value={formData.shippingAddress}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      shippingAddress: e.target.value,
                    })
                  }
                  placeholder="Nama jalan, nomor rumah, RT/RW, kelurahan, kecamatan"
                  className="w-full px-4 py-3 bg-[#FAF9F5] border border-[#DCD8D0] rounded-xs text-sm text-[#1C1B1A] placeholder-[#9E9B93] focus:outline-none focus:border-[#1C1B1A]"
                />
                {errors.shippingAddress && (
                  <p className="text-xs text-[#B25D52] mt-1">
                    {errors.shippingAddress}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#42403B] mb-1.5">
                    Kota / Kabupaten <span className="text-[#B25D52]">*</span>
                  </label>
                  <input
                    id="custom-order-city-input"
                    type="text"
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                    placeholder="Contoh: Bogor"
                    className="w-full px-4 py-3 bg-[#FAF9F5] border border-[#DCD8D0] rounded-xs text-sm text-[#1C1B1A] placeholder-[#9E9B93] focus:outline-none focus:border-[#1C1B1A]"
                  />
                  {errors.city && (
                    <p className="text-xs text-[#B25D52] mt-1">{errors.city}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#42403B] mb-1.5">
                    Kode Pos
                  </label>
                  <input
                    type="text"
                    value={formData.postalCode}
                    onChange={(e) =>
                      setFormData({ ...formData, postalCode: e.target.value })
                    }
                    placeholder="Contoh: 40115"
                    className="w-full px-4 py-3 bg-[#FAF9F5] border border-[#DCD8D0] rounded-xs text-sm text-[#1C1B1A] placeholder-[#9E9B93] focus:outline-none focus:border-[#1C1B1A]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 07: Review & Submit */}
          {currentStep === 7 && (
            <div className="space-y-6 animate-fade-in">
              <div className="border-b border-[#EAE7E1] pb-3 mb-5">
                <span className="text-[11px] font-bold text-[#677663] uppercase tracking-widest">
                  STEP 07 OF 07
                </span>
                <h2 className="font-heading text-xl sm:text-2xl font-bold text-[#1C1B1A] mt-1">
                  Review Custom Order
                </h2>
                <p className="text-xs text-[#75726B] mt-0.5">
                  Tinjau kembali ringkasan pesanan custom Anda sebelum dikirimkan ke sistem produksi SIPASTEL.
                </p>
              </div>

              <div className="bg-[#F6F4ED] p-5 rounded-xs border border-[#E8E5DF] space-y-4 text-xs sm:text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-[#E5E1D7]">
                  <div>
                    <span className="text-xs text-[#75726B] block">Pemesan</span>
                    <p className="font-bold text-[#1C1B1A]">{formData.customerName}</p>
                    <p className="text-[#55524B]">{formData.whatsappNumber}</p>
                  </div>
                  <div>
                    <span className="text-xs text-[#75726B] block">Tujuan Pengiriman</span>
                    <p className="font-medium text-[#1C1B1A]">{formData.shippingAddress}</p>
                    <p className="text-[#55524B]">
                      {formData.city} {formData.postalCode ? `, ${formData.postalCode}` : ''}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-[#E5E1D7]">
                  <div>
                    <span className="text-xs text-[#75726B] block">Produk & Jumlah</span>
                    <p className="font-bold text-[#1C1B1A]">
                      Custom {formData.productType} — {formData.quantity} pcs
                    </p>
                    <p className="text-[#55524B]">Bahan: {formData.materialVariant}</p>
                  </div>
                  <div>
                    <span className="text-xs text-[#75726B] block">Warna & Ukuran</span>
                    <p className="text-[#1C1B1A]">Warna: {formData.color}</p>
                    <p className="text-[#55524B]">Ukuran: {formData.size}</p>
                  </div>
                </div>

                <div>
                  <span className="text-xs text-[#75726B] block">Desain & Catatan</span>
                  <p className="text-[#1C1B1A] mt-1">{formData.designDescription}</p>
                  {formData.designFile && (
                    <p className="text-xs text-[#5B7C59] mt-1 flex items-center gap-1 font-medium">
                      <FileCheck className="w-3.5 h-3.5" />
                      File terlampir: {formData.designFile.name}
                    </p>
                  )}
                  {formData.additionalNotes && (
                    <p className="text-xs text-[#75726B] mt-1">
                      Catatan: {formData.additionalNotes}
                    </p>
                  )}
                </div>
              </div>

              <div className="bg-[#F6F4ED] p-5 rounded-xs border border-[#E8E5DF] space-y-4">
                <div className="flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-[#677663]" />
                  <span className="text-xs font-bold text-[#1C1B1A] uppercase tracking-wider">
                    Preferensi Pembayaran
                  </span>
                </div>
                <p className="text-xs text-[#75726B] -mt-2">
                  Harga final akan dikonfirmasi admin melalui WhatsApp setelah spesifikasi Anda ditinjau.
                  Pilihan di bawah ini membantu admin menyiapkan instruksi pembayaran yang sesuai — pembayaran
                  aktual tetap dikonfirmasi manual oleh admin setelah dana diterima.
                </p>

                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, paymentPreference: 'DP' })}
                    className={`py-2.5 px-4 rounded-xs text-xs font-semibold uppercase tracking-wider border transition-colors ${
                      formData.paymentPreference === 'DP'
                        ? 'bg-[#1C1B1A] text-[#FAF9F5] border-[#1C1B1A]'
                        : 'bg-[#FAF9F5] text-[#55524B] border-[#DCD8D0] hover:bg-[#F0ECE1]'
                    }`}
                  >
                    DP (Uang Muka)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, paymentPreference: 'LUNAS', paymentPreferencePercentage: 100 })
                    }
                    className={`py-2.5 px-4 rounded-xs text-xs font-semibold uppercase tracking-wider border transition-colors ${
                      formData.paymentPreference === 'LUNAS'
                        ? 'bg-[#1C1B1A] text-[#FAF9F5] border-[#1C1B1A]'
                        : 'bg-[#FAF9F5] text-[#55524B] border-[#DCD8D0] hover:bg-[#F0ECE1]'
                    }`}
                  >
                    Lunas (Bayar Penuh)
                  </button>
                </div>

                {formData.paymentPreference === 'DP' && (
                  <div>
                    <span className="text-[11px] font-mono uppercase text-[#8C8880] mb-1.5 block">
                      Pilih Persentase DP
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {DP_PERCENTAGE_OPTIONS.map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setFormData({ ...formData, paymentPreferencePercentage: pct })}
                          className={`py-2 px-4 rounded-xs text-xs font-semibold border transition-colors ${
                            formData.paymentPreferencePercentage === pct
                              ? 'bg-[#5B7C59] text-[#FAF9F5] border-[#5B7C59]'
                              : 'bg-[#FAF9F5] text-[#55524B] border-[#DCD8D0] hover:bg-[#F0ECE1]'
                          }`}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {studioProfile?.bankAccountNumber && (
                  <div className="pt-3 border-t border-[#E5E1D7] text-xs">
                    <span className="text-[#75726B] block mb-1">Rekening Tujuan Transfer</span>
                    <p className="font-bold text-[#1C1B1A]">
                      {studioProfile.bankName} — {studioProfile.bankAccountNumber}
                    </p>
                    <p className="text-[#55524B]">a.n. {studioProfile.bankAccountHolder}</p>
                  </div>
                )}
              </div>

              <div className="p-4 bg-[#FAF9F5] border border-[#E8E5DF] text-xs text-[#66645E] space-y-1">
                <p className="font-bold text-[#1C1B1A]">Alur Setelah Submit:</p>
                <p>1. Order ID dan invoice akan langsung dibuat otomatis oleh sistem.</p>
                <p>2. Tim desainer kami memvalidasi file dan menyusun digital approval mockup.</p>
                <p>3. Anda dapat langsung menghubungkan chat dengan WhatsApp admin untuk koordinasi cepat beserta konfirmasi pembayaran.</p>
              </div>
            </div>
          )}

          {submitError && (
            <div className="mt-5 p-3 bg-[#FDF0EE] border border-[#F3D4CF] rounded-xs text-xs text-[#B3261E]">
              {submitError}
            </div>
          )}

          {/* Navigation Controls */}
          <div className="mt-8 pt-5 border-t border-[#EAE7E1] flex items-center justify-between gap-3">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                className="py-3 px-5 border border-[#DCD8D0] bg-[#FAF9F5] hover:bg-[#F0ECE1] text-[#1C1B1A] text-xs font-semibold uppercase tracking-wider rounded-xs flex items-center gap-2 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            ) : (
              <div />
            )}

            {currentStep < totalSteps ? (
              <button
                type="button"
                onClick={handleNext}
                className="py-3 px-6 bg-[#1C1B1A] hover:bg-[#2C2B29] text-[#FAF9F5] text-xs font-semibold uppercase tracking-wider rounded-xs flex items-center gap-2 transition-transform active:scale-98 shadow-xs"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                id="submit-custom-order-btn"
                type="submit"
                disabled={isSubmitting}
                className="py-3.5 px-8 bg-[#1C1B1A] hover:bg-[#2C2B29] text-[#FAF9F5] text-xs font-semibold uppercase tracking-widest rounded-xs flex items-center gap-2 transition-transform active:scale-98 shadow-xs disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#FAF9F5]" />
                    <span>Submitting Order...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Custom Order</span>
                    <CheckCircle2 className="w-4 h-4 text-[#677663]" />
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
