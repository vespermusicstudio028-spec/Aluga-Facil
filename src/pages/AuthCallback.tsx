import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const handleCallback = async () => {
      try {
        // --- Fluxo PKCE: URL contém ?code= ---
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');

        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error('Erro ao trocar código:', error);
            setError(error.message);
            timeoutId = setTimeout(() => navigate('/login', { replace: true }), 3000);
            return;
          }
          if (data.session) {
            navigate('/dashboard', { replace: true });
            return;
          }
        }

        // --- Fluxo Implícito: URL contém #access_token= ---
        const hash = window.location.hash;
        if (hash && hash.includes('access_token=')) {
          // O Supabase detecta o token do hash automaticamente via getSession
          const { data: { session }, error } = await supabase.auth.getSession();
          if (error) {
            setError(error.message);
            timeoutId = setTimeout(() => navigate('/login', { replace: true }), 3000);
            return;
          }
          if (session) {
            navigate('/dashboard', { replace: true });
            return;
          }
        }

        // --- Fallback: aguarda o evento de autenticação ---
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'SIGNED_IN' && session) {
            subscription.unsubscribe();
            clearTimeout(timeoutId);
            navigate('/dashboard', { replace: true });
          }
        });

        // Timeout de segurança: 10 segundos
        timeoutId = setTimeout(() => {
          subscription.unsubscribe();
          navigate('/login', { replace: true });
        }, 10000);

      } catch (err: any) {
        console.error('Erro no callback:', err);
        setError(err.message);
        timeoutId = setTimeout(() => navigate('/login', { replace: true }), 3000);
      }
    };

    handleCallback();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [navigate]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50 dark:bg-slate-950">
        <p className="text-red-500 font-medium text-lg mb-2">Erro no login</p>
        <p className="text-slate-500 text-sm">{error}</p>
        <p className="text-slate-400 text-xs mt-4">Redirecionando para o login...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-slate-50 dark:bg-slate-950">
      <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4" />
      <p className="text-slate-600 dark:text-slate-400 font-medium text-lg">Processando login...</p>
      <p className="text-slate-400 dark:text-slate-500 text-sm mt-2">Aguarde um instante</p>
    </div>
  );
}
