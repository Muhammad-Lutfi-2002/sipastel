import React, { useState, useEffect, Suspense, lazy } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { CategorySection } from './components/CategorySection';
import { ProductGrid } from './components/ProductGrid';
import { CustomOrderHighlight } from './components/CustomOrderHighlight';
import { HowItWorks } from './components/HowItWorks';
import { SocialProofGallery } from './components/SocialProofGallery';
import { InstagramCTA } from './components/InstagramCTA';
import { Footer } from './components/Footer';
import { ProductDetailModal } from './components/ProductDetailModal';
import { CustomOrderForm } from './components/CustomOrderForm';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { OrderStatusModal } from './components/OrderStatusModal';
import { SearchModal } from './components/SearchModal';
import { SizeGuideModal } from './components/SizeGuideModal';
import { WhatsAppFloatingButton } from './components/WhatsAppFloatingButton';
import { ToastContainer, ToastMessage } from './components/Toast';
import { AboutSection } from './components/AboutSection';
import { ContactSection } from './components/ContactSection';
import { PageLoader } from './components/PageLoader';

// The entire admin console (dashboard, orders, production board, charts,
// notification center, etc.) is only needed by studio staff, not by
// storefront customers. Lazy-loading it keeps the public-facing bundle
// smaller and avoids shipping admin-only code to every visitor.
const AdminRoutes = lazy(() =>
  import('./components/admin/AdminRoutes').then((m) => ({ default: m.AdminRoutes }))
);

import { Product, CartItem, Order, CategoryType } from './types';
import { getStoredCart, saveStoredCart, getStoredProducts } from './utils/storage';
import { createWhatsAppUrl } from './utils/whatsapp';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RouterProvider, useRouter } from './context/RouterContext';

function StorefrontApp() {
  const { pathname, navigate } = useRouter();

  // Navigation View State mapped from URL pathname
  const [currentView, setCurrentView] = useState<
    'home' | 'shop' | 'custom-order' | 'about' | 'how-to-order' | 'contact'
  >('home');

  // Products - loaded from Supabase so admin catalog edits (stock, price,
  // future additions) are reflected here rather than a frozen static file.
  const [products, setProducts] = useState<Product[]>([]);
  useEffect(() => {
    getStoredProducts().then(setProducts);
  }, []);

  // Cart State (hydrated from localStorage)
  const [cart, setCart] = useState<CartItem[]>(() => getStoredCart());

  // Modals & Active Route States
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCustomOrderOpen, setIsCustomOrderOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isOrderStatusOpen, setIsOrderStatusOpen] = useState(false);
  const [trackingOrderId, setTrackingOrderId] = useState<string | undefined>(undefined);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [sizeGuideType, setSizeGuideType] = useState<'KAOS' | 'JERSEY' | null>(null);

  // Whether an admin/staff account is currently logged in. Used below to
  // block that same session from entering the public Custom Studio
  // (/custom-order) — this is a customer-facing order form, and letting an
  // already-authenticated staff session submit through it as if they were
  // a customer causes confusing, mixed-identity orders.
  const { authStatus } = useAuth();

  // Toast Notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (
    title: string,
    description?: string,
    type: 'success' | 'info' | 'error' | 'warning' = 'success'
  ) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const newToast: ToastMessage = { id, title, description, type };
    setToasts((prev) => [...prev, newToast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Synchronize route pathname with view/modal state for public URLs
  useEffect(() => {
    if (pathname === '/' || pathname === '/shop') {
      navigate('/admin/production', { replace: true });
    } else if (pathname === '/custom-order') {
      // Guard: block any already-logged-in admin/staff session from
      // entering Custom Studio, no matter how they got here (nav link,
      // the "Custom Studio" shortcut button inside the Admin Panel, the
      // one on the Login page, or a direct URL). They must log out first.
      if (authStatus === 'authenticated') {
        showToast(
          'Custom Studio Terkunci',
          'Anda sedang login sebagai admin/staff. Logout terlebih dahulu untuk mengakses Custom Studio sebagai customer.',
          'warning'
        );
        navigate('/admin/dashboard', { replace: true });
        return;
      }
      setCurrentView('custom-order');
    } else if (pathname === '/cart') {
      setIsCartOpen(true);
    } else if (pathname === '/checkout') {
      setIsCheckoutOpen(true);
    } else if (pathname.startsWith('/order/')) {
      const orderId = pathname.replace('/order/', '');
      setTrackingOrderId(orderId);
      setIsOrderStatusOpen(true);
    }
  }, [pathname, navigate, authStatus]);

  // Sync cart to localStorage whenever it updates
  useEffect(() => {
    saveStoredCart(cart);
  }, [cart]);

  // Close the custom order modal on Escape, consistent with the app's other modals
  useEffect(() => {
    if (!isCustomOrderOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsCustomOrderOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCustomOrderOpen]);

  // Cart operations
  const handleAddToCart = (item: CartItem) => {
    setCart((prev) => {
      const existingIdx = prev.findIndex(
        (i) => i.productId === item.productId && i.color === item.color && i.size === item.size
      );
      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx].quantity += item.quantity;
        return updated;
      }
      return [...prev, item];
    });
    showToast(`"${item.productName}" ditambahkan`, `${item.color} / Size ${item.size}`);
  };

  const handleQuickAddToCart = (product: Product) => {
    if (product.category === 'CUSTOM') {
      setIsCustomOrderOpen(true);
      return;
    }
    const defaultColor = product.colors[0]?.name || 'Default';
    const defaultSize = product.sizes[0] || 'L';
    const newItem: CartItem = {
      id: `${product.id}-${defaultColor}-${defaultSize}-${Date.now()}`,
      productId: product.id,
      productName: product.name,
      category: product.category,
      price: product.price,
      color: defaultColor,
      size: defaultSize,
      quantity: 1,
      image: product.images[0],
    };
    handleAddToCart(newItem);
  };

  const handleUpdateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleRemoveCartItem = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
    showToast('Item dihapus dari keranjang');
  };

  const handleClearCart = () => {
    setCart([]);
  };

  // Category navigation from CategorySection
  const [shopCategoryFilter, setShopCategoryFilter] = useState<CategoryType>('ALL');
  const handleSelectCategory = (category: CategoryType) => {
    if (category === 'CUSTOM') {
      navigateTo('custom-order');
    } else {
      setShopCategoryFilter(category);
      navigateTo('shop');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Order created success handler
  const handleOrderSuccess = (order: Order) => {
    showToast(`Pesanan ${order.orderId} berhasil dibuat!`);
    setTrackingOrderId(order.orderId);
  };

  const navigateTo = (view: 'home' | 'shop' | 'custom-order' | 'about' | 'how-to-order' | 'contact') => {
    setCurrentView(view);
    const targetPath =
      view === 'home'
        ? '/'
        : view === 'shop'
        ? '/shop'
        : view === 'custom-order'
        ? '/custom-order'
        : `/${view}`;
    navigate(targetPath);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-[#1C1B1A] flex flex-col font-sans selection:bg-[#EAE5D9] selection:text-[#1C1B1A]">
      {/* Toast Notification */}
      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />

      {/* Main Navbar */}
      <Navbar
        cartCount={cart.reduce((sum, it) => sum + it.quantity, 0)}
        onOpenCart={() => {
          setIsCartOpen(true);
          navigate('/cart');
        }}
        onNavigate={navigateTo}
        currentView={currentView}
        onOpenTrackOrder={() => {
          setTrackingOrderId(undefined);
          setIsOrderStatusOpen(true);
        }}
        onOpenAdmin={() => navigate('/admin/dashboard')}
        onOpenSearch={() => setIsSearchOpen(true)}
      />

      {/* Main Content Pages */}
      <main className="flex-1">
        {/* VIEW: HOME & SHOP (Hidden - redirects to Studio Production Board) */}
        {(currentView === 'home' || currentView === 'shop') && (
          <div className="max-w-xl mx-auto px-4 py-20 text-center animate-fade-in">
            <div className="p-8 bg-white border border-[#E8E5DF] rounded-xl shadow-xs space-y-4">
              <div className="w-10 h-10 rounded-full bg-[#FAF0EC] text-[#C14E30] flex items-center justify-center mx-auto">
                <span className="font-heading font-bold text-sm">SP</span>
              </div>
              <div>
                <h2 className="font-heading text-lg font-bold text-[#1C1B1A]">SIPASTEL Studio Production</h2>
                <p className="text-xs text-[#75726B] mt-1">
                  Katalog toko ritel disembunyikan. Dialihkan ke Tracking Workshop Pipeline...
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/admin/production')}
                className="px-4 py-2 bg-[#1C1B1A] text-white text-xs font-semibold rounded-lg cursor-pointer hover:bg-black transition-colors"
              >
                Buka Production Board →
              </button>
            </div>
          </div>
        )}

        {/* VIEW: CUSTOM ORDER */}
        {currentView === 'custom-order' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8 sm:py-12">
            {/* Quick Return to Production Board */}
            <div className="mb-6">
              <button
                type="button"
                onClick={() => navigate('/admin/production')}
                className="inline-flex items-center gap-2 text-xs font-semibold text-[#5E5B54] hover:text-[#1C1B1A] bg-white hover:bg-[#FAF9F5] border border-[#E8E5DF] px-3.5 py-1.5 rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-[#8C8880]" />
                <span>Kembali ke Production Board</span>
              </button>
            </div>

            <div className="max-w-3xl mb-8">
              <span className="text-xs uppercase tracking-widest text-[#75726B] font-semibold block mb-1">
                SIPASTEL Custom Studio
              </span>
              <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-[#1C1B1A]">
                START YOUR CUSTOM ORDER.
              </h1>
              <p className="text-sm sm:text-base text-[#57544D] mt-2 leading-relaxed">
                Kirimkan brief pakaian custom Anda. Tim desainer SIPASTEL akan memvalidasi resolusi grafis, menyiapkan digital mockup, dan menghitung estimasi biaya presisi untuk Anda.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-8">
                <CustomOrderForm
                  onClose={() => navigate('/admin/production')}
                  onOpenSizeGuide={(cat) => setSizeGuideType(cat)}
                  onOrderSubmitted={(order) => {
                    handleOrderSuccess(order);
                    setIsOrderStatusOpen(true);
                  }}
                />
              </div>

              {/* Sidebar Info & Size Guide button */}
              <div className="lg:col-span-4 space-y-5">
                <div className="p-6 bg-[#F5F2EA] border border-[#E5E0D5] rounded-xs space-y-4">
                  <h3 className="font-heading text-base font-bold text-[#1C1B1A]">
                    Panduan & Layanan Custom
                  </h3>
                  <ul className="text-xs text-[#57544D] space-y-2.5 leading-relaxed">
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-[#677663]">•</span>
                      <span><strong>Format File Disarankan:</strong> PNG transparan, PDF vektor, atau Adobe Illustrator (AI). Resolusi minimal 300 DPI.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-[#677663]">•</span>
                      <span><strong>Minimal Order (MOQ):</strong> Melayani pembuatan sample 1 pcs hingga ratusan pcs untuk komunitas & korporat.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-[#677663]">•</span>
                      <span><strong>Free Digital Mockup:</strong> Dapatkan preview 2D sebelum konfirmasi produksi massal.</span>
                    </li>
                  </ul>

                  <div className="pt-2 border-t border-[#E5E0D5] flex flex-col gap-2">
                    <button
                      onClick={() => setSizeGuideType('KAOS')}
                      className="w-full py-2 px-3 text-xs font-semibold bg-[#FAF9F5] border border-[#DCD8D0] text-[#1C1B1A] rounded-xs hover:border-[#1C1B1A] transition-colors text-left flex justify-between items-center cursor-pointer"
                    >
                      <span>Lihat Size Chart Kaos</span>
                      <span className="text-[#677663]">→</span>
                    </button>
                    <button
                      onClick={() => setSizeGuideType('JERSEY')}
                      className="w-full py-2 px-3 text-xs font-semibold bg-[#FAF9F5] border border-[#DCD8D0] text-[#1C1B1A] rounded-xs hover:border-[#1C1B1A] transition-colors text-left flex justify-between items-center cursor-pointer"
                    >
                      <span>Lihat Size Chart Jersey</span>
                      <span className="text-[#677663]">→</span>
                    </button>
                  </div>
                </div>

                <div className="p-6 bg-[#FAF9F5] border border-[#E8E5DF] rounded-xs text-xs text-[#66645E]">
                  <p className="font-bold text-[#1C1B1A] mb-1">Butuh Bantuan Mendesak?</p>
                  <p className="mb-3">Diskusikan langsung timeline dan deadline event Anda bersama desainer kami.</p>
                  <a
                    href={createWhatsAppUrl('Hi SIPASTEL, saya ingin konsultasi custom order dengan deadline khusus.')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block font-semibold text-[#1C1B1A] underline underline-offset-4 hover:text-[#677663]"
                  >
                    Konsultasi via WhatsApp →
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW: ABOUT */}
        {currentView === 'about' && (
          <>
            <AboutSection />
            <InstagramCTA />
          </>
        )}

        {/* VIEW: HOW TO ORDER */}
        {currentView === 'how-to-order' && (
          <div className="py-4">
            <HowItWorks />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pb-16">
              <div className="p-8 bg-[#F4F1EA] border border-[#E5E1D7] rounded-xs flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                  <h3 className="font-heading text-xl sm:text-2xl font-bold text-[#1C1B1A]">
                    Sudah Punya File Desain atau Konsep?
                  </h3>
                  <p className="text-xs sm:text-sm text-[#57544D] mt-1">
                    Kirimkan sekarang dan terima estimasi pengerjaan serta mockup dalam 1x24 jam kerja.
                  </p>
                </div>
                <button
                  onClick={() => navigateTo('custom-order')}
                  className="py-3.5 px-6 bg-[#1C1B1A] hover:bg-[#2C2B29] text-[#FAF9F5] text-xs font-semibold uppercase tracking-wider rounded-xs whitespace-nowrap transition-colors cursor-pointer"
                >
                  Mulai Custom Order
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VIEW: CONTACT */}
        {currentView === 'contact' && (
          <>
            <ContactSection />
          </>
        )}
      </main>

      {/* Footer */}
      <Footer
        onNavigate={navigateTo}
        onOpenTrackOrder={() => {
          setTrackingOrderId(undefined);
          setIsOrderStatusOpen(true);
        }}
        onOpenAdmin={() => navigate('/admin/dashboard')}
      />

      {/* Floating WhatsApp Quick Action Button */}
      <WhatsAppFloatingButton />

      {/* Modals & Overlays */}
      <ProductDetailModal
        product={selectedProduct}
        onClose={() => {
          setSelectedProduct(null);
          if (pathname.startsWith('/product/')) navigate('/shop');
        }}
        onAddToCart={handleAddToCart}
        onCustomOrderClick={() => {
          setSelectedProduct(null);
          navigateTo('custom-order');
        }}
        onOpenSizeGuide={(cat) => setSizeGuideType(cat)}
      />

      {isCustomOrderOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#1C1B1A]/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
          onClick={() => setIsCustomOrderOpen(false)}
        >
          <div className="w-full max-w-4xl my-auto" onClick={(e) => e.stopPropagation()}>
            <CustomOrderForm
              onClose={() => setIsCustomOrderOpen(false)}
              onOpenSizeGuide={(cat) => setSizeGuideType(cat)}
              onOrderSubmitted={(order) => {
                setIsCustomOrderOpen(false);
                handleOrderSuccess(order);
                setIsOrderStatusOpen(true);
              }}
            />
          </div>
        </div>
      )}

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => {
          setIsCartOpen(false);
          if (pathname === '/cart') navigate('/');
        }}
        cart={cart}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveCartItem}
        onCheckout={() => {
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
          navigate('/checkout');
        }}
        onExploreCollection={() => navigateTo('shop')}
      />

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => {
          setIsCheckoutOpen(false);
          if (pathname === '/checkout') navigate('/');
        }}
        cart={cart}
        onClearCart={handleClearCart}
        onOrderSuccess={(order) => {
          handleOrderSuccess(order);
          navigate(`/order/${order.orderId}`);
        }}
      />

      <OrderStatusModal
        isOpen={isOrderStatusOpen}
        onClose={() => {
          setIsOrderStatusOpen(false);
          setTrackingOrderId(undefined);
          if (pathname.startsWith('/order/')) navigate('/');
        }}
        defaultOrderId={trackingOrderId}
      />

      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        products={products}
        onSelectProduct={(prod) => {
          setIsSearchOpen(false);
          setSelectedProduct(prod);
          navigate(`/product/${prod.slug}`);
        }}
      />

      <SizeGuideModal
        isOpen={sizeGuideType !== null}
        category={sizeGuideType || 'KAOS'}
        onClose={() => setSizeGuideType(null)}
      />
    </div>
  );
}

function AppContent() {
  const { isAdminRoute } = useRouter();

  if (isAdminRoute) {
    return (
      <Suspense fallback={<PageLoader minDuration={200} />}>
        <AdminRoutes />
      </Suspense>
    );
  }

  return <StorefrontApp />;
}

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider>
        <AppContent />
      </RouterProvider>
    </AuthProvider>
  );
}
