import React, { useState, useEffect } from 'react';
import { Lock, Mail, Eye, EyeOff, ArrowRight, ArrowUpRight, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from '../../context/RouterContext';

export const AdminLoginPage: React.FC = () => {
  const { login, authStatus } = useAuth();
  const { navigate } = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [submitState, setSubmitState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);

  useEffect(() => {
    if (authStatus === 'authenticated') {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [authStatus, navigate]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!email.trim() || !password.trim()) {
      setSubmitState('error');
      setErrorMessage('Mohon masukkan email dan password akun studio Anda');
      return;
    }

    setSubmitState('loading');
    setErrorMessage('');

    try {
      const res = await login(email, password);
      if (res.success) {
        setSubmitState('success');
        setTimeout(() => {
          navigate('/admin/dashboard', { replace: true });
        }, 600);
      } else {
        setSubmitState('error');
        setErrorMessage(res.error || 'Email atau password salah');
      }
    } catch {
      setSubmitState('error');
      setErrorMessage('Email atau password salah');
    }
  };

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col justify-between">
      {/* Top Banner Studio Status */}
      <div className="w-full border-b border-line bg-paper py-3 px-4 sm:px-8 flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="font-heading font-extrabold text-sm text-ink">SIPASTEL</span>
            <span className="text-[10px] font-mono text-muted uppercase tracking-wider">Area Kerja Studio</span>
          </div>

          <button
            onClick={() => navigate('/custom-order')}
            className="flex items-center gap-1.5 text-xs text-body hover:text-accent font-medium transition-colors cursor-pointer border-l border-line pl-4"
            title="Buka Custom Studio"
          >
            <ArrowUpRight className="w-3.5 h-3.5 text-accent" />
            <span>Custom Studio</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-muted">
          <span className="w-1.5 h-1.5 rounded-full bg-sage"></span>
          <span className="font-mono text-[11px] tracking-wider uppercase">Operasional Internal</span>
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Visual Brand Editorial Side (Desktop) - elevated dark surface for depth against the page */}
        <div className="hidden lg:flex lg:w-1/2 bg-surface text-ink p-12 lg:p-16 flex-col justify-between relative overflow-hidden border-r border-line">
          <div className="absolute inset-0 opacity-[0.04] pointer-events-none">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--color-ink)" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-[2px] bg-accent-wash border border-accent/30 text-accent text-[11px] tracking-widest uppercase font-mono mb-8">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Akses Terbatas</span>
            </div>

            <h1 className="font-heading text-4xl xl:text-5xl font-extrabold tracking-tight leading-[1.1] text-ink">
              SIPASTEL <br />
              KONSOL OPERASIONAL.
            </h1>
            <p className="mt-4 text-sm text-body max-w-md leading-relaxed">
              Pusat kendali operasional pakaian ready-to-wear dan pipeline produksi custom jersey Studio SIPASTEL Bogor.
            </p>
          </div>

          <div className="relative z-10 space-y-6 pt-12 border-t border-line">
            <div className="grid grid-cols-2 gap-6 text-xs">
              <div>
                <p className="text-muted font-mono uppercase text-[10px] tracking-wider">Lokasi Studio</p>
                <p className="font-medium text-ink mt-0.5">Bogor, Jawa Barat</p>
              </div>
              <div>
                <p className="text-muted font-mono uppercase text-[10px] tracking-wider">Protokol Keamanan</p>
                <p className="font-medium text-sage mt-0.5">Sesi Terisolasi Berbasis Peran</p>
              </div>
            </div>

            <p className="text-[11px] text-muted leading-relaxed">
              Hak akses terbatas hanya untuk staf produksi, desainer grafis, dan manajemen operasional SIPASTEL.
            </p>
          </div>
        </div>

        {/* Authentication Form Side */}
        <div className="flex-1 flex items-center justify-center p-6 sm:p-12 lg:p-16">
          <div className="w-full max-w-md space-y-7">
            {/* Header */}
            <div>
              <div className="flex items-center gap-2 mb-2 lg:hidden">
                <span className="font-heading font-extrabold text-xl tracking-tight text-ink">SIPASTEL</span>
                <span className="text-[10px] px-1.5 py-0.5 bg-accent-wash text-accent font-mono uppercase rounded-[2px]">Admin</span>
              </div>

              <h2 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-ink">
                Masuk ke Admin
              </h2>
              <p className="text-xs sm:text-sm text-body mt-1.5">
                Masukkan kredensial akun staf untuk mengakses konsol order dan pipeline.
              </p>
            </div>

            {/* Expired Session Notice */}
            {authStatus === 'expired' && (
              <div className="p-3.5 bg-warning/10 border border-warning/30 rounded-[2px] flex items-start gap-2.5 text-xs text-warning">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Sesi Berakhir</p>
                  <p className="text-[11px] text-warning/90 mt-0.5">
                    Sesi Anda telah berakhir. Silakan masuk kembali.
                  </p>
                </div>
              </div>
            )}

            {/* Error Banner */}
            {submitState === 'error' && (
              <div className="p-3.5 bg-danger/10 border border-danger/30 rounded-[2px] flex items-start gap-2.5 text-xs text-danger">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Autentikasi Gagal</p>
                  <p className="text-[11px] text-danger/90 mt-0.5">
                    {errorMessage || 'Email atau password salah'}
                  </p>
                </div>
              </div>
            )}

            {/* Success Banner */}
            {submitState === 'success' && (
              <div className="p-3.5 bg-sage/10 border border-sage/30 rounded-[2px] flex items-start gap-2.5 text-xs text-sage">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Selamat datang kembali</p>
                  <p className="text-[11px] text-sage/90 mt-0.5">
                    Mengalihkan ke dashboard operasional SIPASTEL...
                  </p>
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email / Username Field */}
              <div className="space-y-1.5">
                <label
                  htmlFor="admin-email-input"
                  className="block text-xs font-semibold uppercase tracking-wider text-heading"
                >
                  Email / Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="admin-email-input"
                    type="text"
                    autoComplete="username"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (submitState === 'error') setSubmitState('idle');
                    }}
                    placeholder="nama@sipastel.com atau admin"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-surface border border-line-strong focus:border-accent focus:outline-hidden rounded-[2px] text-xs sm:text-sm text-ink placeholder-muted transition-colors"
                  />
                </div>
              </div>

              {/* Password Field with Show/Hide */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="admin-password-input"
                    className="block text-xs font-semibold uppercase tracking-wider text-heading"
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsForgotPasswordOpen(true)}
                    className="text-[11px] text-muted hover:text-accent transition-colors cursor-pointer"
                  >
                    Lupa Password?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="admin-password-input"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (submitState === 'error') setSubmitState('idle');
                    }}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-10 py-2.5 bg-surface border border-line-strong focus:border-accent focus:outline-hidden rounded-[2px] text-xs sm:text-sm text-ink placeholder-muted transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted hover:text-ink transition-colors cursor-pointer"
                    aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    id="admin-remember-me-checkbox"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded-[2px] border-line-strong focus:ring-0 cursor-pointer accent-accent"
                  />
                  <span className="text-xs text-body">Ingat Saya (30 Hari)</span>
                </label>
              </div>

              {/* Submit Button - the primary action, orange with intent */}
              <button
                id="admin-signin-submit-btn"
                type="submit"
                disabled={submitState === 'loading' || submitState === 'success'}
                className="w-full mt-2 py-3 px-4 bg-accent hover:bg-accent-soft text-on-accent font-semibold text-xs sm:text-sm tracking-wider uppercase rounded-[2px] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 shadow-xs"
              >
                {submitState === 'loading' ? (
                  <>
                    <span className="w-4 h-4 border-2 border-ink-soft border-t-transparent rounded-full animate-spin"></span>
                    <span>Sedang masuk...</span>
                  </>
                ) : submitState === 'success' ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Selamat datang kembali</span>
                  </>
                ) : (
                  <>
                    <span>Masuk</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Access Help Notice */}
            <div className="p-3.5 bg-surface border border-line rounded-[2px] text-xs text-body space-y-1.5">
              <span className="font-semibold text-ink flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-sage" />
                Belum Punya Akses?
              </span>
              <p className="text-[11px] text-muted leading-relaxed">
                Akun konsol staf dibuat dan dikelola oleh Administrator Studio. Hubungi Admin di +62 896-7734-3212 atau Owner untuk mendapatkan kredensial akses.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {isForgotPasswordOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface w-full max-w-sm p-6 rounded-[2px] border border-line shadow-2xl space-y-4">
            <h3 className="font-heading text-lg font-bold text-ink">Reset Password Staf</h3>
            <p className="text-xs text-body leading-relaxed">
              Untuk keamanan operasional SIPASTEL, reset kata sandi akun konsol staf dilakukan secara terpusat oleh Studio Administrator atau Lead Engineer.
            </p>
            <div className="p-3 bg-paper border border-line rounded-[2px] text-xs text-heading">
              Hubungi Admin via WhatsApp Studio: <br />
              <strong className="font-mono text-ink">+62 896-7734-3212</strong>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsForgotPasswordOpen(false)}
                className="px-4 py-2 bg-accent hover:bg-accent-soft text-on-accent text-xs font-semibold rounded-[2px] cursor-pointer transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="w-full border-t border-line py-3.5 px-4 text-center text-[11px] text-muted">
        SIPASTEL Apparel Studio — Konsol Operasional Internal © {new Date().getFullYear()}
      </div>
    </div>
  );
};
