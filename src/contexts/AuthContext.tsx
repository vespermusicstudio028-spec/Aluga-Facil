import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User, UserRole, UserPlan } from '../types';
import { determineActualPlan } from '../lib/planHelper';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, pass: string) => Promise<void>;
  signUp: (email: string, pass: string, name: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (partial: Partial<User>) => void;
  /** Dias restantes do trial/plano (null = sem contagem a exibir) */
  trialDaysLeft: number | null;
  /** true enquanto o trial/plano ainda não expirou */
  isSubscriptionActive: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TRIAL_DAYS = 5;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);
  const [isSubscriptionActive, setIsSubscriptionActive] = useState(true);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await fetchProfile(session.user);
      } else {
        setLoading(false);
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        await fetchProfile(session.user);
      } else {
        setUser(null);
        setTrialDaysLeft(null);
        setIsSubscriptionActive(true);
        setLoading(false);
      }
    });

    return () => { subscription.unsubscribe(); };
  }, []);

  /** Calcula dias restantes e status ativo a partir da data de expiração */
  const computeSubscriptionStatus = (expiresAt: string | null | undefined) => {
    if (!expiresAt) {
      setIsSubscriptionActive(true);
      setTrialDaysLeft(null);
      return;
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const expDate = new Date(expiresAt);
    const expDay = new Date(expDate.getFullYear(), expDate.getMonth(), expDate.getDate());
    const diff = Math.floor((expDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    setIsSubscriptionActive(diff >= 0);
    // Exibe contagem se restar ≤ TRIAL_DAYS dias
    setTrialDaysLeft(diff >= 0 && diff <= TRIAL_DAYS ? diff : null);
  };

  const fetchProfile = async (authUser: any) => {
    try {
      const uid = authUser.id;
      const email = authUser.email || '';
      const metadata = authUser.user_metadata || {};
      const googlePhoto = metadata.avatar_url || metadata.picture;
      const googleName = metadata.full_name || metadata.name || email.split('@')[0];

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
      }

      let profileData = data;

      if (profileData) {
        // Salva foto do Google silenciosamente se necessário
        if (googlePhoto && !profileData.photo_url) {
          supabase.from('profiles').update({ photo_url: googlePhoto }).eq('id', uid).then();
          profileData.photo_url = googlePhoto;
        }

        // ── TRIAL AUTOMÁTICO ──────────────────────────────────────────────
        // Usuários sem plan_expires_at (novos ou antigos sem trial) recebem 5 dias
        if (!profileData.plan_expires_at && profileData.role !== 'admin') {
          const trialEnd = new Date();
          trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);
          const trialEndISO = trialEnd.toISOString();

          await supabase.from('profiles').update({
            plan_expires_at: trialEndISO,
            status: 'active',
            plan: 'trial'
          }).eq('id', uid);

          profileData.plan_expires_at = trialEndISO;
          profileData.status = 'active';
          profileData.plan = 'trial';
        } else if (
          profileData.plan === 'basic' &&
          profileData.created_at &&
          profileData.plan_expires_at &&
          profileData.role !== 'admin'
        ) {
          const created = new Date(profileData.created_at);
          const expires = new Date(profileData.plan_expires_at);
          const diffDays = Math.round((expires.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));

          // Se o plano expira em 5 dias ou menos a partir da criação, é o trial automático do banco
          if (diffDays <= TRIAL_DAYS) {
            await supabase.from('profiles').update({ plan: 'trial' }).eq('id', uid);
            profileData.plan = 'trial';
          }
        }
        // ── AUTO-UPGRADE SE JÁ PAGOU ────────────────────────────────────
        // Se o plano ainda é 'trial' mas o usuário tem uma fatura PAGA,
        // atualiza o plano automaticamente para o plano correto
        if (profileData.plan === 'trial' && profileData.role !== 'admin') {
          const { data: paidInvoices } = await supabase
            .from('plan_invoices')
            .select('plan_id, due_date')
            .eq('user_id', uid)
            .eq('status', 'paid')
            .order('due_date', { ascending: false })
            .limit(1);

          if (paidInvoices && paidInvoices.length > 0) {
            const paidPlan = paidInvoices[0].plan_id as string;
            const validPlans = ['basic', 'professional', 'premium'];
            if (validPlans.includes(paidPlan)) {
              // Calcula nova expiração: +1 mês da data da fatura
              const newExpiry = new Date(paidInvoices[0].due_date);
              newExpiry.setMonth(newExpiry.getMonth() + 1);
              await supabase.from('profiles').update({
                plan: paidPlan,
                status: 'active',
                plan_expires_at: newExpiry.toISOString()
              }).eq('id', uid);
              profileData.plan = paidPlan;
              profileData.status = 'active';
              profileData.plan_expires_at = newExpiry.toISOString();
            }
          }
        }
        // ─────────────────────────────────────────────────────────────────

        computeSubscriptionStatus(profileData.plan_expires_at);

        setUser({
          uid: profileData.id,
          email: profileData.email,
          name: profileData.name || googleName,
          phone: profileData.phone || undefined,
          photoURL: profileData.photo_url || undefined,
          coverURL: profileData.cover_url || undefined,
          role: profileData.role as UserRole,
          plan: determineActualPlan(profileData.plan, profileData.created_at, profileData.plan_expires_at) as UserPlan,
          status: profileData.status,
          createdAt: profileData.created_at,
          plan_expires_at: profileData.plan_expires_at || undefined,
        } as any);
      } else {
        // Perfil ainda não existe no DB (falha ou falta de trigger)
        // ── CRIA O PERFIL AUTOMATICAMENTE COM TRIAL ───────────────────
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);
        const trialEndISO = trialEnd.toISOString();
        const createdAt = new Date().toISOString();

        const newProfile = {
          id: uid,
          email,
          name: googleName,
          photo_url: googlePhoto || null,
          cover_url: null,
          role: 'owner',
          plan: 'trial',
          status: 'active',
          plan_expires_at: trialEndISO,
          created_at: createdAt
        };

        const { error: insertError } = await supabase.from('profiles').insert([newProfile]);

        if (insertError) {
          console.error('Failed to create profile on fallback:', insertError);
        }

        computeSubscriptionStatus(trialEndISO);

        setUser({
          uid,
          email,
          name: googleName,
          photoURL: googlePhoto,
          coverURL: undefined,
          role: 'owner',
          plan: 'trial',
          status: 'active',
          createdAt: createdAt,
          plan_expires_at: trialEndISO,
        } as any);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, pass: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) throw error;
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    });
    if (error) throw error;
  };

  const signUp = async (email: string, pass: string, name: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password: pass,
      options: { data: { name } }
    });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const updateUser = (partial: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...partial } : null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
      updateUser,
      trialDaysLeft,
      isSubscriptionActive,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
