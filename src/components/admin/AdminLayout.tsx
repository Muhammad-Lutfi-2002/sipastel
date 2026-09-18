import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  ShoppingBag,
  Scissors,
  Package,
  Users,
  FileText,
  Settings,
  LogOut,
  ExternalLink,
  Menu,
  X,
  Search,
  ChevronRight,
  Inbox,
  PenTool,
  Palette,
  CheckCircle2,
  Truck,
  User as UserIcon,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from '../../context/RouterContext';
import { AdminNotificationCenter } from './AdminNotificationCenter';
import { AdminQuickSearchModal } from './AdminQuickSearchModal';
import { AdminToastProvider } from './AdminToast';
import { ThemeToggle } from '../ThemeToggle';
import { formatRoleLabel } from '../../utils/formatters';
import { getStoredStudioProfile } from '../../utils/storage';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const { pathname, navigate } = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  // Same admin-managed logo as the customer Navbar - null falls back to wordmark.
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    getStoredStudioProfile().then((profile) => setLogoUrl(profile.logoUrl));
  }, []);

  // Global keyboard shortcut: Cmd+K / Ctrl+K to open Quick Search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchModalOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Time-aware greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Selamat pagi';
    if (hour < 17) return 'Selamat siang';
    return 'Selamat malam';
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  const handleConfirmLogout = () => {
    logout();
    setIsLogoutModalOpen(false);
    navigate('/admin/login', { replace: true });
  };

  const cleanPath = pathname.split('?')[0];

  const isCurrentActive = (itemPath: string) => {
    const targetClean = itemPath.split('?')[0];
    if (itemPath.includes('?')) {
      return pathname === itemPath;
    }
    if (targetClean === '/admin/orders') {
      return cleanPath === '/admin/orders' && !pathname.includes('?');
    }
    if (targetClean === '/admin/production') {
      return cleanPath === '/admin/production' && !pathname.includes('?');
    }
    return cleanPath === targetClean;
  };

  // Structured sidebar groups per spec
  const navigationGroups = [
    {
      heading: 'Ringkasan',
      items: [
        { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
      ],
    },
    {
      heading: 'Pesanan',
      items: [
        { label: 'Semua Pesanan', path: '/admin/orders', icon: ShoppingBag },
        { label: 'Pesanan Baru', path: '/admin/orders?status=new', icon: Inbox },
        { label: 'Produksi', path: '/admin/production', icon: Scissors },
        { label: 'Custom Studio', path: '/custom-order', icon: PenTool },
      ],
    },
    {
      heading: 'Bisnis',
      items: [
        { label: 'Pelanggan', path: '/admin/customers', icon: Users },
        { label: 'Invoice', path: '/admin/invoices', icon: FileText },
      ],
    },
    {
      heading: 'Area Kerja',
      items: [
        { label: 'Desain', path: '/admin/production?stage=design', icon: Palette },
        { label: 'QC', path: '/admin/production?stage=qc', icon: CheckCircle2 },
        { label: 'Pengiriman', path: '/admin/orders?status=ready_to_ship', icon: Truck },
      ],
    },
    {
      heading: 'Sistem',
      items: [
        { label: 'Pengaturan', path: '/admin/settings', icon: Settings },
      ],
    },
  ];

  return (
    <AdminToastProvider>
    <div className="min-h-screen bg-paper text-ink flex flex-col font-sans">
      {/* Quick Search Modal */}
      <AdminQuickSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
      />

      {/* Top Bar - Lightweight, Fresh, Human */}
      <header className="sticky top-0 z-30 bg-paper/90 backdrop-blur-md border-b border-line px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex items-center justify-between transition-colors">
        {/* Left: Mobile hamburger & Greeting / Page Context */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 text-body hover:text-ink hover:bg-surface-hover rounded-lg transition-colors cursor-pointer"
            aria-label="Buka/tutup menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Mobile brand logo */}
          <div
            onClick={() => navigate('/admin/dashboard')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navigate('/admin/dashboard');
              }
            }}
            role="button"
            tabIndex={0}
            aria-label="Ke halaman dashboard"
            className="flex lg:hidden items-center gap-1.5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm"
          >
            {logoUrl ? (
              <img src={logoUrl} alt="SIPASTEL" className="h-7 w-auto max-w-[110px] object-contain" />
            ) : (
              <>
                <span className="font-heading font-extrabold text-base tracking-tight text-ink">
                  SIPASTEL
                </span>
                <span className="text-[10px] text-muted uppercase tracking-wider font-mono">
                  Studio
                </span>
              </>
            )}
          </div>

          {/* Desktop human header */}
          <div className="hidden lg:block">
            <h1 className="text-sm font-semibold text-ink flex items-center gap-1.5 leading-none">
              <span>{getGreeting()}, {user?.name?.split(' ')[0] || 'Admin'}</span>
              <span className="text-sm">👋</span>
            </h1>
            <p className="text-[11px] text-muted mt-1 leading-none">
              Berikut yang terjadi di SIPASTEL hari ini.
            </p>
          </div>
        </div>

        {/* Right: Quick Search, Notifications, Storefront & User Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Search Trigger */}
          <button
            type="button"
            onClick={() => setIsSearchModalOpen(true)}
            className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 text-xs text-muted hover:text-ink bg-surface hover:bg-surface-hover border border-line hover:border-accent-soft/50 rounded-lg transition-all shadow-[0_4px_20px_rgba(0,0,0,0.35)] cursor-pointer"
          >
            <Search className="w-3.5 h-3.5 text-muted" />
            <span className="hidden sm:inline text-xs">Cari pesanan, produk...</span>
            <span className="sm:hidden text-xs">Cari</span>
            <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.2 text-[10px] font-mono text-muted bg-surface-hover border border-line-strong rounded">
              ⌘K
            </kbd>
          </button>

          {/* Notification Center */}
          <AdminNotificationCenter />

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Custom Studio Button (Replaces Storefront) */}
          <button
            onClick={() => navigate('/custom-order')}
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-ink hover:text-accent bg-surface hover:bg-accent-wash border border-line hover:border-accent-soft/50 rounded-lg transition-all cursor-pointer shadow-2xs"
            title="Buka SIPASTEL Custom Studio"
          >
            <PenTool className="w-3.5 h-3.5 text-accent" />
            <span>Custom Studio</span>
          </button>

          {/* User Profile avatar */}
          <div className="flex items-center gap-2 pl-2 border-l border-line">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-accent-wash border border-accent/30 flex items-center justify-center text-accent font-heading font-bold text-xs">
              {user?.name?.charAt(0) || 'A'}
            </div>
            <div className="hidden xl:block text-left">
              <p className="text-xs font-semibold text-ink leading-none truncate max-w-[110px]">
                {user?.name || 'Administrator'}
              </p>
              <span className="text-[10px] text-muted font-mono uppercase tracking-wider">
                {formatRoleLabel(user?.role)}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 flex">
        {/* Desktop Sidebar - Clean, Casual, Fashion Brand Studio */}
        <aside className="hidden lg:flex flex-col w-56 xl:w-60 bg-paper border-r border-line px-3.5 py-5 justify-between shrink-0 select-none">
          <div className="space-y-6">
            {/* Brand Header */}
            <div
              onClick={() => navigate('/admin/dashboard')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate('/admin/dashboard');
                }
              }}
              role="button"
              tabIndex={0}
              aria-label="Ke halaman dashboard"
              className="px-2.5 cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm"
            >
              {logoUrl ? (
                <img src={logoUrl} alt="SIPASTEL" className="h-9 w-auto max-w-[150px] object-contain" />
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <span className="font-heading font-extrabold text-lg tracking-tight text-ink group-hover:text-accent transition-colors">
                      SIPASTEL
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono tracking-wider uppercase font-semibold bg-accent-wash text-accent">
                      Studio
                    </span>
                  </div>
                  <p className="text-[10px] text-muted mt-0.5 tracking-wide">
                    Pakaian Custom &amp; Produksi
                  </p>
                </>
              )}
            </div>

            {/* Navigation Groups */}
            <nav className="space-y-4">
              {navigationGroups.map((group) => (
                <div key={group.heading} className="space-y-1">
                  <span className="text-[10px] font-mono tracking-wider uppercase text-muted px-2.5 block font-semibold">
                    {group.heading}
                  </span>
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const active = isCurrentActive(item.path);

                      return (
                        <button
                          key={item.path}
                          onClick={() => handleNavigate(item.path)}
                          className={`relative w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all cursor-pointer ${
                            active
                              ? 'bg-accent-wash text-ink font-semibold'
                              : 'text-body hover:bg-surface-hover hover:text-ink'
                          }`}
                        >
                          {active && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[3px] rounded-full bg-accent" />
                          )}
                          <div className="flex items-center gap-2.5">
                            <Icon
                              className={`w-3.5 h-3.5 ${
                                active ? 'text-accent' : 'text-muted'
                              }`}
                            />
                            <span>{item.label}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </div>

          {/* Bottom Sidebar: Studio session & Logout */}
          <div className="pt-4 border-t border-line space-y-2.5">
            <div className="px-2.5 flex items-center justify-between">
              <ThemeToggle variant="switch" />
            </div>

            <div className="px-2.5 py-2.5 rounded-xl bg-surface border border-line text-xs shadow-[0_4px_20px_rgba(0,0,0,0.35)]">
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-muted">Status Studio</span>
                <span className="text-sage font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-sage" />
                  Online
                </span>
              </div>
              <p className="font-semibold text-ink mt-1 text-xs truncate">
                {user?.name || 'Admin'}
              </p>
              <p className="text-[10px] text-muted truncate font-mono">{user?.email}</p>
            </div>

            <button
              onClick={() => setIsLogoutModalOpen(true)}
              className="w-full py-2 px-2.5 text-xs text-muted hover:text-danger hover:bg-danger/10 rounded-xl flex items-center justify-between transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <LogOut className="w-3.5 h-3.5" />
                <span>Keluar</span>
              </div>
              <span className="text-[10px] text-muted">ESC</span>
            </button>
          </div>
        </aside>

        {/* Mobile Drawer */}
        {isMobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex animate-fade-in">
            <div className="w-72 bg-paper h-full p-4 flex flex-col justify-between border-r border-line shadow-2xl animate-slide-right overflow-y-auto">
              <div className="space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-line">
                  <div>
                    {logoUrl ? (
                      <img src={logoUrl} alt="SIPASTEL" className="h-8 w-auto max-w-[140px] object-contain" />
                    ) : (
                      <>
                        <span className="font-heading font-extrabold text-lg text-ink">
                          SIPASTEL
                        </span>
                        <span className="text-[10px] font-mono text-muted block">
                          Operasional Studio Produksi
                        </span>
                      </>
                    )}
                  </div>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    aria-label="Tutup menu"
                    className="p-1.5 text-muted hover:text-ink rounded-lg cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <nav className="space-y-4">
                  {navigationGroups.map((group) => (
                    <div key={group.heading} className="space-y-1">
                      <span className="text-[10px] font-mono tracking-wider uppercase text-muted px-2.5 block font-semibold">
                        {group.heading}
                      </span>
                      <div className="space-y-0.5">
                        {group.items.map((item) => {
                          const Icon = item.icon;
                          const active = isCurrentActive(item.path);

                          return (
                            <button
                              key={item.path}
                              onClick={() => handleNavigate(item.path)}
                              className={`relative w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-colors cursor-pointer ${
                                active
                                  ? 'bg-accent-wash text-ink font-semibold'
                                  : 'text-body hover:bg-surface-hover hover:text-ink'
                              }`}
                            >
                              {active && (
                                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[3px] rounded-full bg-accent" />
                              )}
                              <div className="flex items-center gap-2.5">
                                <Icon
                                  className={`w-4 h-4 ${
                                    active ? 'text-accent' : 'text-muted'
                                  }`}
                                />
                                <span>{item.label}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </nav>

                <div className="pt-3 border-t border-line">
                  <button
                    onClick={() => {
                      navigate('/custom-order');
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium text-ink hover:bg-accent-wash hover:text-accent rounded-lg transition-colors cursor-pointer"
                  >
                    <PenTool className="w-4 h-4 text-accent" />
                    <span>Custom Studio</span>
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-line flex items-center justify-between">
                <ThemeToggle variant="switch" />
              </div>

              <div className="pt-4 border-t border-line">
                <button
                  onClick={() => setIsLogoutModalOpen(true)}
                  className="w-full py-2 px-3 bg-danger/10 text-danger hover:bg-danger/20 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Keluar</span>
                </button>
              </div>
            </div>

            <div className="flex-1" onClick={() => setIsMobileMenuOpen(false)} />
          </div>
        )}

        {/* Content Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full transition-all">
          {children}
        </main>
      </div>

      {/* Logout Confirmation Modal */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface w-full max-w-sm p-6 rounded-2xl border border-line shadow-xl space-y-4 animate-modal-content">
            <h3 className="font-heading text-base font-bold text-ink">Konfirmasi Keluar</h3>
            <p className="text-xs text-body leading-relaxed">
              Anda yakin ingin keluar dari Studio Console SIPASTEL? Anda perlu login kembali untuk mengakses data pesanan dan produksi.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-line">
              <button
                type="button"
                onClick={() => setIsLogoutModalOpen(false)}
                className="px-3.5 py-2 border border-line-strong bg-surface hover:bg-surface-hover text-body rounded-lg text-xs font-medium cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                className="px-4 py-2 bg-danger hover:bg-danger/85 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-xs"
              >
                Keluar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </AdminToastProvider>
  );
};
