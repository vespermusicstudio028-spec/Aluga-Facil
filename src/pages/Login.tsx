import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'motion/react';
import { Building2, Lock, Eye, EyeOff, AlertCircle, User, Home, ArrowRight, CheckCircle, Shield, Smartphone } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Logo from '../components/Logo';

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const { user, signIn, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loginMode, setLoginMode] = useState<'owner' | 'tenant'>('owner');
  const [tenantCpf, setTenantCpf] = useState('');
  const [tenantPassword, setTenantPassword] = useState('');

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    const isDemo = searchParams.get('demo') === 'true';
    if (isDemo) {
      setValue('email', 'demo@alugafacil.com');
      setValue('password', 'demo123');
    }
  }, [searchParams, setValue]);

  const handleTenantLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const cleanCpf = (tenantCpf || '').replace(/\D/g, '');
      const { data, error } = await supabase.rpc('login_tenant', {
        input_cpf: cleanCpf,
        input_password: tenantPassword
      });
      if (error) throw error;
      if (data && data.id) {
        const foundTenant = {
          id: data.id,
          ownerId: data.owner_id,
          propertyId: data.property_id,
          residents: data.residents,
          paymentMethod: data.payment_method,
          pixKey: data.pix_key,
          dueDay: data.due_day,
          leaseTerm: data.lease_term,
          startDate: data.start_date,
          endDate: data.end_date,
          signature: data.signature,
          ownerSignature: data.owner_signature,
          contractAccepted: data.contract_accepted,
          contractPdf: data.contract_pdf,
          createdAt: data.created_at,
          updatedAt: data.updated_at
        };
        localStorage.setItem('tenantSession', JSON.stringify(foundTenant));
        navigate('/tenant-dashboard');
      } else {
        setError('CPF ou Senha inválidos. Verifique os dados e tente novamente.');
      }
    } catch (err) {
      console.error(err);
      setError('Erro ao fazer login. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError('');
    try {
      await signInWithGoogle();
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Falha ao autenticar com Google.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex overflow-hidden bg-white dark:bg-slate-950">

      {/* ── LEFT PANEL – decorative / branding ── */}
      <motion.div
        initial={{ x: -80, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1a3a5c 0%, #0f6b4f 60%, #1a9b6f 100%)' }}
      >
        {/* decorative circles */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }} />
        <div className="absolute top-1/2 left-1/4 w-48 h-48 rounded-full opacity-5" style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }} />

        {/* Logo */}
        <div className="relative z-10">
          <Logo className="h-14" />
        </div>

        {/* Main copy */}
        <div className="relative z-10 space-y-6">
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <h1 className="text-5xl font-black text-white leading-tight mb-4">
              Gestão de imóveis<br />
              <span className="text-emerald-300">inteligente</span> e<br />
              <span className="text-emerald-300">simplificada.</span>
            </h1>
            <p className="text-lg text-white/70 leading-relaxed max-w-sm">
              Controle contratos, inquilinos e pagamentos em um só lugar — com total segurança.
            </p>
          </motion.div>

          {/* Features list */}
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="space-y-4 pt-2"
          >
            {[
              { icon: <Shield size={18} />, text: 'Contratos digitais com validade jurídica' },
              { icon: <CheckCircle size={18} />, text: 'Cobranças automáticas todo mês' },
              { icon: <Smartphone size={18} />, text: 'Acesso mobile de qualquer lugar' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-white/90">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-emerald-300 flex-shrink-0">
                  {item.icon}
                </div>
                <span className="text-sm font-medium">{item.text}</span>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Bottom attribution */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="relative z-10 text-white/40 text-xs"
        >
          © 2025 AlugaFácil — Todos os direitos reservados
        </motion.p>
      </motion.div>

      {/* ── RIGHT PANEL – form ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 lg:px-16 bg-slate-50 dark:bg-slate-950 relative overflow-y-auto">

        {/* Mobile logo */}
        <div className="lg:hidden mb-10">
          <Logo className="h-14 mx-auto" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="w-full max-w-md"
        >
          {/* Header */}
          <div className="mb-10">
            <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-2">
              {loginMode === 'owner' ? 'Bem-vindo de volta!' : 'Área do Inquilino'}
            </h2>
            <p className="text-slate-500 dark:text-slate-400">
              {loginMode === 'owner'
                ? 'Acesse o painel de gestão dos seus imóveis.'
                : 'Digite seus dados para acessar seu painel.'}
            </p>
          </div>

          {/* Mode switcher — two big cards */}
          <div className="grid grid-cols-2 gap-3 mb-8">
            <button
              onClick={() => { setLoginMode('owner'); setError(''); }}
              className={`relative p-4 rounded-2xl border-2 text-left transition-all duration-200 ${
                loginMode === 'owner'
                  ? 'border-primary bg-primary/5 dark:bg-primary/10'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-primary/40'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
                loginMode === 'owner' ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
              }`}>
                <Building2 size={20} />
              </div>
              <p className={`font-bold text-sm ${loginMode === 'owner' ? 'text-primary' : 'text-slate-700 dark:text-slate-300'}`}>
                Proprietário
              </p>
              <p className="text-xs text-slate-400 mt-0.5">Gerencie seus imóveis</p>
              {loginMode === 'owner' && (
                <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-primary" />
              )}
            </button>

            <button
              onClick={() => { setLoginMode('tenant'); setError(''); }}
              className={`relative p-4 rounded-2xl border-2 text-left transition-all duration-200 ${
                loginMode === 'tenant'
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-400/40'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
                loginMode === 'tenant' ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
              }`}>
                <Home size={20} />
              </div>
              <p className={`font-bold text-sm ${loginMode === 'tenant' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}>
                Inquilino
              </p>
              <p className="text-xs text-slate-400 mt-0.5">Acesse seu contrato</p>
              {loginMode === 'tenant' && (
                <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-emerald-500" />
              )}
            </button>
          </div>

          {/* Error banner */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 p-4 rounded-2xl mb-6 flex items-center gap-3"
              >
                <AlertCircle size={18} className="flex-shrink-0" />
                <p className="text-sm font-medium">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form area */}
          <AnimatePresence mode="wait">
            {loginMode === 'owner' ? (
              <motion.div
                key="owner"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.25 }}
                className="space-y-4"
              >
                {user ? (
                  /* Already logged in */
                  <div className="text-center bg-primary/5 dark:bg-primary/10 p-8 rounded-2xl border-2 border-primary/20">
                    <div className="w-20 h-20 rounded-full overflow-hidden mx-auto mb-4 ring-4 ring-primary/20">
                      {user.photoURL
                        ? <img src={user.photoURL} alt={user.name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full bg-primary/20 flex items-center justify-center text-primary text-2xl font-bold">{user.name?.charAt(0)}</div>}
                    </div>
                    <h3 className="font-bold text-xl text-slate-900 dark:text-white mb-1">Você já está conectado</h3>
                    <p className="text-sm text-slate-500 mb-6">{user.email}</p>
                    <button
                      onClick={() => navigate('/dashboard')}
                      className="w-full py-4 bg-primary text-white rounded-2xl font-bold text-lg hover:bg-opacity-90 transition-all shadow-lg shadow-primary/30 flex items-center justify-center gap-2"
                    >
                      Acessar meu Painel <ArrowRight size={20} />
                    </button>
                  </div>
                ) : (
                  /* Google sign in */
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={isLoading}
                      className="w-full py-4 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-white rounded-2xl font-bold text-base flex items-center justify-center gap-3 hover:border-primary/50 hover:shadow-lg transition-all duration-200 shadow-sm"
                    >
                      {isLoading ? (
                        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      ) : (
                        <>
                          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
                          Continuar com o Google
                        </>
                      )}
                    </button>

                    <a
                      href="#"
                      className="w-full py-4 bg-gradient-to-r from-slate-800 to-slate-900 dark:from-slate-700 dark:to-slate-800 text-white rounded-2xl font-bold text-base flex items-center justify-center gap-3 hover:from-slate-700 hover:to-slate-800 hover:shadow-lg transition-all duration-200 shadow-sm border-2 border-slate-700/50"
                    >
                      <Smartphone size={22} className="text-emerald-400" />
                      Baixar nosso Aplicativo
                    </a>
                  </div>
                )}
              </motion.div>
            ) : (
              /* Tenant form */
              <motion.form
                key="tenant"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                onSubmit={handleTenantLogin}
                className="space-y-4"
              >
                {/* CPF */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">CPF</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      value={tenantCpf}
                      onChange={(e) => setTenantCpf(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10 transition-all dark:text-white text-base"
                      placeholder="000.000.000-00"
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Senha de Acesso</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={tenantPassword}
                      onChange={(e) => setTenantPassword(e.target.value)}
                      className="w-full pl-12 pr-12 py-4 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10 transition-all dark:text-white text-base"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-2xl font-bold text-base transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 mt-2"
                >
                  {isLoading
                    ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <><span>Acessar meu Painel</span><ArrowRight size={18} /></>}
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Footer note */}
          <p className="text-center text-xs text-slate-400 dark:text-slate-600 mt-10">
            Seus dados são criptografados e protegidos com o mais alto nível de segurança.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
