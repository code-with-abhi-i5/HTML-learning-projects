import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2, Mail, Lock, Shield, Users, IndianRupee, BarChart3 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setMounted(true);
  }, []);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const handleLogin = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      await login(data.email, data.password);
      toast.success('Welcome back!', { description: 'Logged in successfully' });
      navigate('/');
    } catch (error: unknown) {
      const firebaseError = error as { code?: string };
      if (firebaseError.code === 'auth/user-not-found' || firebaseError.code === 'auth/wrong-password' || firebaseError.code === 'auth/invalid-credential') {
        toast.error('Invalid credentials', { description: 'Please check your email and password' });
      } else if (firebaseError.code === 'auth/too-many-requests') {
        toast.error('Too many attempts', { description: 'Please try again later' });
      } else {
        toast.error('Login failed', { description: 'An unexpected error occurred' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    { icon: Users, label: 'Student Management', desc: 'Track all hostel residents' },
    { icon: IndianRupee, label: 'Fee Collection', desc: 'Automated payment tracking' },
    { icon: BarChart3, label: 'Smart Analytics', desc: 'Real-time insights & reports' },
    { icon: Shield, label: 'Secure Access', desc: 'Admin-only protected dashboard' },
  ];

  return (
    <div className="login-page" style={{ minHeight: '100vh', display: 'flex', overflow: 'hidden', position: 'relative' }}>
      {/* ── Global Styles ── */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-20px) rotate(2deg); }
          66% { transform: translateY(10px) rotate(-1deg); }
        }
        @keyframes float2 {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          25% { transform: translateY(-15px) translateX(10px); }
          50% { transform: translateY(5px) translateX(-5px); }
          75% { transform: translateY(-10px) translateX(15px); }
        }
        @keyframes gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes glow-pulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slide-right {
          from { opacity: 0; transform: translateX(-30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes shimmer-line {
          from { left: -150%; }
          to { left: 150%; }
        }
        @keyframes border-glow {
          0%, 100% { border-color: rgba(99, 102, 241, 0.3); }
          50% { border-color: rgba(139, 92, 246, 0.6); }
        }
        .login-left-panel {
          background: linear-gradient(135deg, #0f0c29 0%, #1a1a3e 25%, #24243e 50%, #302b63 75%, #0f0c29 100%);
          background-size: 400% 400%;
          animation: gradient-shift 15s ease infinite;
        }
        .login-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
        }
        .login-orb-1 {
          width: 400px; height: 400px;
          background: radial-gradient(circle, rgba(99,102,241,0.35) 0%, transparent 70%);
          top: -100px; left: -100px;
          animation: float 8s ease-in-out infinite;
        }
        .login-orb-2 {
          width: 350px; height: 350px;
          background: radial-gradient(circle, rgba(139,92,246,0.3) 0%, transparent 70%);
          bottom: -80px; right: -80px;
          animation: float2 10s ease-in-out infinite;
        }
        .login-orb-3 {
          width: 200px; height: 200px;
          background: radial-gradient(circle, rgba(59,130,246,0.25) 0%, transparent 70%);
          top: 40%; left: 30%;
          animation: glow-pulse 6s ease-in-out infinite;
        }
        .login-orb-4 {
          width: 150px; height: 150px;
          background: radial-gradient(circle, rgba(236,72,153,0.2) 0%, transparent 70%);
          top: 20%; right: 15%;
          animation: float 12s ease-in-out infinite reverse;
        }
        .glass-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-radius: 16px;
          padding: 20px;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .glass-card:hover {
          background: rgba(255,255,255,0.07);
          border-color: rgba(255,255,255,0.15);
          transform: translateY(-4px);
          box-shadow: 0 20px 40px rgba(0,0,0,0.3);
        }
        .feature-icon-wrap {
          width: 44px; height: 44px;
          border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.3s ease;
        }
        .glass-card:hover .feature-icon-wrap {
          transform: scale(1.1) rotate(-5deg);
        }
        .login-form-card {
          position: relative;
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 24px;
          padding: 40px;
          box-shadow: 0 25px 60px rgba(0,0,0,0.08);
          overflow: hidden;
          transition: box-shadow 0.3s ease;
        }
        .login-form-card:hover {
          box-shadow: 0 30px 70px rgba(0,0,0,0.12);
        }
        .dark .login-form-card {
          box-shadow: 0 25px 60px rgba(0,0,0,0.4);
          border-color: rgba(255,255,255,0.06);
        }
        .dark .login-form-card:hover {
          box-shadow: 0 30px 70px rgba(0,0,0,0.5);
        }
        .login-form-card::before {
          content: '';
          position: absolute;
          top: 0; left: -150%; right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(99,102,241,0.6), rgba(139,92,246,0.6), transparent);
          animation: shimmer-line 4s ease-in-out infinite;
        }
        .login-input {
          height: 48px;
          border-radius: 12px !important;
          transition: all 0.3s ease !important;
          font-size: 15px !important;
        }
        .login-input:focus {
          border-color: rgba(99,102,241,0.5) !important;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.1), 0 4px 12px rgba(99,102,241,0.08) !important;
        }
        .login-btn {
          height: 48px;
          border-radius: 12px !important;
          font-weight: 600 !important;
          font-size: 15px !important;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%) !important;
          background-size: 200% 200% !important;
          border: none !important;
          color: white !important;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
          position: relative;
          overflow: hidden;
        }
        .login-btn:hover:not(:disabled) {
          background-position: 100% 0 !important;
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(99,102,241,0.4) !important;
        }
        .login-btn:active:not(:disabled) {
          transform: translateY(0);
        }
        .login-btn:disabled {
          opacity: 0.7 !important;
        }
        .login-logo {
          width: 56px; height: 56px;
          border-radius: 16px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 8px 24px rgba(99,102,241,0.3);
          transition: all 0.3s ease;
        }
        .login-logo:hover {
          transform: rotate(-5deg) scale(1.05);
          box-shadow: 0 12px 30px rgba(99,102,241,0.4);
        }
        .grid-pattern {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 60px 60px;
          pointer-events: none;
        }
        .stat-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 999px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          font-size: 13px;
          color: rgba(255,255,255,0.7);
          backdrop-filter: blur(8px);
          transition: all 0.3s ease;
        }
        .stat-pill:hover {
          background: rgba(255,255,255,0.1);
          border-color: rgba(255,255,255,0.2);
        }
        .right-panel-bg {
          background: var(--background);
          position: relative;
        }
        .right-panel-bg::before {
          content: '';
          position: absolute;
          top: -50%; right: -30%;
          width: 600px; height: 600px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%);
          pointer-events: none;
        }
        .dark .right-panel-bg::before {
          background: radial-gradient(circle, rgba(99,102,241,0.04) 0%, transparent 70%);
        }
        @media (max-width: 1023px) {
          .login-mobile-bg {
            background: linear-gradient(135deg, #0f0c29 0%, #1a1a3e 50%, #302b63 100%);
            padding: 40px 24px 30px;
          }
        }
      `}</style>

      {/* ── Left Panel — Branding (Desktop) ── */}
      <div className="hidden lg:flex lg:w-[55%] login-left-panel relative flex-col justify-between p-12 xl:p-16">
        {/* Grid Pattern */}
        <div className="grid-pattern" />
        {/* Floating Orbs */}
        <div className="login-orb login-orb-1" />
        <div className="login-orb login-orb-2" />
        <div className="login-orb login-orb-3" />
        <div className="login-orb login-orb-4" />

        {/* Top — Logo */}
        <div className="relative z-10" style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.7s cubic-bezier(0.4, 0, 0.2, 1) 0.2s',
        }}>
          <div className="flex items-center gap-4">
            <div className="login-logo">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 21h18" /><path d="M5 21V7l8-4v18" /><path d="M19 21V11l-6-4" /><path d="M9 9v.01" /><path d="M9 12v.01" /><path d="M9 15v.01" /><path d="M9 18v.01" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">OM Hostel</h1>
              <p className="text-sm text-white/50 font-medium">Administration Portal</p>
            </div>
          </div>
        </div>

        {/* Middle — Hero Text */}
        <div className="relative z-10 space-y-8" style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateX(0)' : 'translateX(-30px)',
          transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1) 0.4s',
        }}>
          <div>
            <h2 className="text-5xl xl:text-6xl font-bold text-white leading-[1.1] tracking-tight">
              Your Hostel,
              <br />
              <span style={{
                background: 'linear-gradient(135deg, #a78bfa, #818cf8, #60a5fa)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                Simplified.
              </span>
            </h2>
            <p className="text-lg text-white/50 mt-5 max-w-lg leading-relaxed">
              Everything you need to manage students, track payments, and grow your hostel — in one beautiful dashboard.
            </p>
          </div>

          {/* Stats Pills */}
          <div className="flex flex-wrap gap-3">
            <div className="stat-pill">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              Real-time Tracking
            </div>
            <div className="stat-pill">
              <div className="w-2 h-2 rounded-full bg-violet-400" />
              Smart Reports
            </div>
            <div className="stat-pill">
              <div className="w-2 h-2 rounded-full bg-blue-400" />
              Secure & Fast
            </div>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-2 gap-4">
            {features.map((f, i) => (
              <div
                key={f.label}
                className="glass-card"
                style={{
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? 'translateY(0)' : 'translateY(20px)',
                  transition: `all 0.6s cubic-bezier(0.4, 0, 0.2, 1) ${0.6 + i * 0.1}s`,
                }}
              >
                <div className="feature-icon-wrap" style={{
                  background: [
                    'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))',
                    'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(59,130,246,0.2))',
                    'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(99,102,241,0.2))',
                    'linear-gradient(135deg, rgba(236,72,153,0.2), rgba(139,92,246,0.2))',
                  ][i],
                }}>
                  <f.icon className="h-5 w-5" style={{
                    color: ['#818cf8', '#34d399', '#60a5fa', '#f472b6'][i],
                  }} />
                </div>
                <p className="text-white font-semibold text-sm mt-3">{f.label}</p>
                <p className="text-white/40 text-xs mt-1">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom — Copyright */}
        <div className="relative z-10 text-white/30 text-sm" style={{
          opacity: mounted ? 1 : 0,
          transition: 'opacity 0.6s ease 1s',
        }}>
          © {new Date().getFullYear()} OM Hostel. Crafted with care.
        </div>
      </div>

      {/* ── Right Panel — Login Form ── */}
      <div className="w-full lg:w-[45%] flex flex-col right-panel-bg">
        {/* Mobile Header */}
        <div className="lg:hidden login-mobile-bg">
          <div className="flex items-center gap-3">
            <div className="login-logo" style={{ width: 44, height: 44, borderRadius: 12 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 21h18" /><path d="M5 21V7l8-4v18" /><path d="M19 21V11l-6-4" /><path d="M9 9v.01" /><path d="M9 12v.01" /><path d="M9 15v.01" /><path d="M9 18v.01" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">OM Hostel</h1>
              <p className="text-xs text-white/50">Administration Portal</p>
            </div>
          </div>
        </div>

        {/* Form Area */}
        <div className="flex-1 flex items-center justify-center p-6 sm:p-8 lg:p-12">
          <div className="w-full max-w-[420px]" style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(24px)',
            transition: 'all 0.7s cubic-bezier(0.4, 0, 0.2, 1) 0.3s',
          }}>
            {/* Greeting */}
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-4"
                style={{
                  background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.1))',
                  color: '#8b5cf6',
                  border: '1px solid rgba(139,92,246,0.15)',
                }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Admin Portal
              </div>
              <h2 className="text-3xl font-bold text-[var(--foreground)] tracking-tight">
                Welcome back
              </h2>
              <p className="text-[var(--muted-foreground)] mt-2 text-[15px]">
                Sign in to manage your hostel operations
              </p>
            </div>

            {/* Login Card */}
            <div className="login-form-card">
              <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-5">
                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-[var(--muted-foreground)]" style={{ opacity: 0.6 }} />
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@omhostel.com"
                      className="pl-11 login-input"
                      {...loginForm.register('email')}
                    />
                  </div>
                  {loginForm.formState.errors.email && (
                    <p className="text-sm text-[var(--destructive)] flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-[var(--destructive)]" />
                      {loginForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-[var(--muted-foreground)]" style={{ opacity: 0.6 }} />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      className="pl-11 pr-11 login-input"
                      {...loginForm.register('password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] cursor-pointer transition-colors duration-200"
                    >
                      {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                    </button>
                  </div>
                  {loginForm.formState.errors.password && (
                    <p className="text-sm text-[var(--destructive)] flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-[var(--destructive)]" />
                      {loginForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                {/* Submit */}
                <Button type="submit" className="w-full login-btn" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign In
                      <svg className="ml-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
                      </svg>
                    </>
                  )}
                </Button>
              </form>
            </div>

            {/* Security Badge */}
            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-[var(--muted-foreground)]">
              <Shield className="h-3.5 w-3.5" style={{ opacity: 0.5 }} />
              <span>Secured with Firebase Authentication</span>
            </div>
          </div>
        </div>

        {/* Mobile Footer */}
        <div className="lg:hidden text-center pb-6 text-xs text-[var(--muted-foreground)]">
          © {new Date().getFullYear()} OM Hostel. Crafted with care.
        </div>
      </div>
    </div>
  );
}
