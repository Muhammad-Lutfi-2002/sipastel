import React, { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from '../../context/RouterContext';
import { AdminLoginPage } from './AdminLoginPage';
import { AdminLayout } from './AdminLayout';
import { DashboardView } from './views/DashboardView';
import { OrdersView } from './views/OrdersView';
import { OrderDetailView } from './views/OrderDetailView';
import { ProductionView } from './views/ProductionView';
import { ProductsView } from './views/ProductsView';
import { CustomersView } from './views/CustomersView';
import { InvoicesView } from './views/InvoicesView';
import { SettingsView } from './views/SettingsView';

export const AdminRoutes: React.FC = () => {
  const { authStatus, session } = useAuth();
  const { pathname, navigate } = useRouter();

  const isLoginPage = pathname === '/admin/login';

  // Strict route protection
  useEffect(() => {
    if (authStatus === 'loading') return;

    if (authStatus !== 'authenticated') {
      if (!isLoginPage) {
        navigate('/admin/login', { replace: true });
      }
    } else {
      if (isLoginPage) {
        navigate('/admin/dashboard', { replace: true });
      }
    }
  }, [authStatus, isLoginPage, navigate]);

  // Loading state
  if (authStatus === 'loading') {
    return (
      <div className="min-h-screen bg-[#FAF9F5] flex flex-col items-center justify-center p-6 text-center text-[#1C1B1A]">
        <div className="w-8 h-8 border-2 border-[#1C1B1A] border-t-transparent rounded-full animate-spin"></div>
        <p className="font-heading font-bold text-sm tracking-wider uppercase mt-4">
          SIPASTEL STUDIO
        </p>
        <p className="text-xs text-[#75726B] font-mono mt-1">Memverifikasi sesi login studio...</p>
      </div>
    );
  }

  // If not authenticated, always show Login Page
  if (authStatus !== 'authenticated') {
    return <AdminLoginPage />;
  }

  const cleanPath = pathname.split('?')[0];

  // Parse dynamic order ID: /admin/orders/[orderId]
  const orderDetailMatch = cleanPath.match(/^\/admin\/orders\/([^\/]+)$/);
  if (orderDetailMatch) {
    const orderId = orderDetailMatch[1];
    return (
      <AdminLayout>
        <OrderDetailView orderId={orderId} />
      </AdminLayout>
    );
  }

  // Admin Protected Views
  switch (cleanPath) {
    case '/admin':
    case '/admin/dashboard':
      return (
        <AdminLayout>
          <DashboardView />
        </AdminLayout>
      );

    case '/admin/orders':
      return (
        <AdminLayout>
          <OrdersView />
        </AdminLayout>
      );

    case '/admin/production':
      return (
        <AdminLayout>
          <ProductionView />
        </AdminLayout>
      );

    case '/admin/products':
      return (
        <AdminLayout>
          <ProductsView />
        </AdminLayout>
      );

    case '/admin/customers':
      return (
        <AdminLayout>
          <CustomersView />
        </AdminLayout>
      );

    case '/admin/invoices':
      return (
        <AdminLayout>
          <InvoicesView />
        </AdminLayout>
      );

    case '/admin/settings':
      return (
        <AdminLayout>
          <SettingsView />
        </AdminLayout>
      );

    default:
      // Unknown /admin/* route redirects to /admin/dashboard
      return (
        <AdminLayout>
          <DashboardView />
        </AdminLayout>
      );
  }
};
