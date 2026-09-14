import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface RouterContextValue {
  pathname: string;
  navigate: (path: string, options?: { replace?: boolean }) => void;
  isAdminRoute: boolean;
}

const RouterContext = createContext<RouterContextValue | undefined>(undefined);

export const RouterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pathname, setPathname] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const current = window.location.pathname || '/';
      // Temporarily hide catalog shop and retail homepage, default to Production Board
      if (current === '/' || current === '/shop' || current === '') {
        return '/admin/production';
      }
      return current;
    }
    return '/admin/production';
  });

  useEffect(() => {
    const handlePopState = () => {
      const current = window.location.pathname || '/';
      if (current === '/' || current === '/shop' || current === '') {
        setPathname('/admin/production');
      } else {
        setPathname(current);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = useCallback((to: string, options?: { replace?: boolean }) => {
    if (typeof window === 'undefined') return;

    const target = to === '/' || to === '/shop' ? '/admin/production' : to;

    if (options?.replace) {
      window.history.replaceState({}, '', target);
    } else {
      window.history.pushState({}, '', target);
    }
    setPathname(target);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const isAdminRoute = pathname.startsWith('/admin');

  return (
    <RouterContext.Provider value={{ pathname, navigate, isAdminRoute }}>
      {children}
    </RouterContext.Provider>
  );
};

export function useRouter() {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('useRouter must be used within a RouterProvider');
  }
  return context;
}
