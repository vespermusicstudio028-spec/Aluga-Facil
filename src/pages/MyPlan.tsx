import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { Crown, Check, ExternalLink, AlertCircle, Clock } from 'lucide-react';
import { differenceInDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { UserPlan } from '../types';

export default function MyPlan() {
  const { user } = useAuth();
  const [pricing, setPricing] = useState({ basic: 0, pro: 49.90, premium: 99.90 });
  const [mpLinks, setMpLinks] = useState({ basic: '', pro: '', premium: '' });
  const [loading, setLoading] = useState(true);
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [nextExp, setNextExp] = useState<Date | null>(null);

  useEffect(() => {
    if (user?.createdAt && user.plan !== 'basic') {
      const created = new Date(user.createdAt);
      const now = new Date();
      let exp = new Date(now.getFullYear(), now.getMonth(), created.getDate());
      
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      if (exp.getTime() < startOfToday.getTime()) {
        exp.setMonth(exp.getMonth() + 1);
      }
      
      setNextExp(exp);
      setDaysLeft(differenceInDays(exp, startOfToday));
    }
  }, [user]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await supabase.from('global_settings').select('*').eq('key', 'pricing').single();
        if (data && data.value) {
          setPricing({
            basic: data.value.basic || 0,
            pro: data.value.pro || 49.90,
            premium: data.value.premium || 99.90
          });
          if (data.value.links) setMpLinks(data.value.links);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSubscribe = (planId: 'basic' | 'pro' | 'premium') => {
    const link = mpLinks[planId];
    if (link) {
      window.open(link, '_blank');
    } else {
      alert('O link de pagamento via Mercado Pago ainda não foi configurado pelo Administrador.');
    }
  };

  const isCurrentPlan = (planId: UserPlan) => user?.plan === planId;

  const getExpirationText = () => {
    if (daysLeft === null) return '';
    if (daysLeft === 0) return 'Vence Hoje!';
    if (daysLeft === 1) return 'Vence Amanhã!';
    return `Vence em ${String(daysLeft).padStart(2, '0')} dias`;
  };
  
  const getAlertColor = () => {
    if (daysLeft === null) return 'hidden';
    if (daysLeft <= 3) return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800';
    if (daysLeft <= 10) return 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800';
    return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800';
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30 text-white">
            <Crown size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Meu Plano e Assinatura</h1>
            <p className="text-slate-500 dark:text-slate-400">Gerencie sua assinatura e renove seu plano com segurança via Mercado Pago.</p>
          </div>
        </div>

        {/* ALERTA DE VENCIMENTO */}
        {user?.plan !== 'basic' && daysLeft !== null && (
          <div className={`mb-8 p-4 rounded-2xl border flex items-center gap-4 shadow-sm ${getAlertColor()}`}>
            <div className="p-2 bg-white/50 dark:bg-black/20 rounded-xl shrink-0">
              {daysLeft <= 3 ? <AlertCircle size={24} /> : <Clock size={24} />}
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-lg">{getExpirationText()}</h4>
              <p className="text-sm opacity-90 mt-0.5">
                Sua assinatura atual ({user?.plan}) expira em <strong>{nextExp ? format(nextExp, "dd 'de' MMMM", { locale: ptBR }) : ''}</strong>. 
                {daysLeft <= 10 ? ' Renove agora para não perder o acesso às funcionalidades!' : ' Fique tranquilo, você ainda tem tempo de sobra.'}
              </p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="animate-pulse flex gap-4">
            <div className="h-64 w-1/3 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
            <div className="h-64 w-1/3 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
            <div className="h-64 w-1/3 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Basic Plan */}
            <div className={`relative bg-white dark:bg-slate-900 rounded-3xl border-2 p-6 shadow-sm flex flex-col ${isCurrentPlan('basic') ? 'border-primary' : 'border-slate-200 dark:border-slate-800'}`}>
              {isCurrentPlan('basic') && <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full">SEU PLANO ATUAL</span>}
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Basic</h3>
              <div className="mb-6">
                <span className="text-3xl font-black text-slate-900 dark:text-white">R$ {pricing.basic.toFixed(2).replace('.', ',')}</span>
                <span className="text-slate-500 text-sm">/mês</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                <li className="flex gap-2 text-sm text-slate-600 dark:text-slate-400"><Check size={18} className="text-emerald-500" /> Até 2 Imóveis</li>
                <li className="flex gap-2 text-sm text-slate-600 dark:text-slate-400"><Check size={18} className="text-emerald-500" /> Relatórios Básicos</li>
                <li className="flex gap-2 text-sm text-slate-600 dark:text-slate-400 opacity-50"><Check size={18} className="text-slate-300" /> Sem Geração de Contratos</li>
              </ul>
              <button 
                onClick={() => handleSubscribe('basic')}
                className={`w-full py-3 rounded-xl font-bold transition-all flex justify-center items-center gap-2 ${isCurrentPlan('basic') ? 'bg-primary text-white hover:bg-primary/90' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}`}
              >
                {isCurrentPlan('basic') ? 'Renovar Plano Basic' : 'Assinar Basic'} <ExternalLink size={16} />
              </button>
            </div>

            {/* Professional Plan */}
            <div className={`relative bg-white dark:bg-slate-900 rounded-3xl border-2 p-6 shadow-xl flex flex-col transform md:-translate-y-4 ${isCurrentPlan('professional') ? 'border-blue-500' : 'border-blue-200 dark:border-blue-900/50'}`}>
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 to-blue-600 rounded-t-3xl" />
              {isCurrentPlan('professional') && <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg shadow-blue-500/20">SEU PLANO ATUAL</span>}
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Professional</h3>
              <div className="mb-6">
                <span className="text-3xl font-black text-slate-900 dark:text-white">R$ {pricing.pro.toFixed(2).replace('.', ',')}</span>
                <span className="text-slate-500 text-sm">/mês</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                <li className="flex gap-2 text-sm text-slate-600 dark:text-slate-400"><Check size={18} className="text-blue-500" /> Imóveis Ilimitados</li>
                <li className="flex gap-2 text-sm text-slate-600 dark:text-slate-400"><Check size={18} className="text-blue-500" /> Geração de Contratos em PDF</li>
                <li className="flex gap-2 text-sm text-slate-600 dark:text-slate-400"><Check size={18} className="text-blue-500" /> Relatórios Completos</li>
                <li className="flex gap-2 text-sm text-slate-600 dark:text-slate-400"><Check size={18} className="text-blue-500" /> Suporte Prioritário</li>
              </ul>
              <button 
                onClick={() => handleSubscribe('pro')}
                className="w-full py-3 rounded-xl font-bold transition-all flex justify-center items-center gap-2 bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/30"
              >
                {isCurrentPlan('professional') ? 'Renovar Plano Professional' : 'Assinar Professional'} <ExternalLink size={16} />
              </button>
            </div>

            {/* Premium Plan */}
            <div className={`relative bg-white dark:bg-slate-900 rounded-3xl border-2 p-6 shadow-sm flex flex-col ${isCurrentPlan('premium') ? 'border-amber-500' : 'border-slate-200 dark:border-slate-800'}`}>
              {isCurrentPlan('premium') && <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full">SEU PLANO ATUAL</span>}
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Premium</h3>
              <div className="mb-6">
                <span className="text-3xl font-black text-slate-900 dark:text-white">R$ {pricing.premium.toFixed(2).replace('.', ',')}</span>
                <span className="text-slate-500 text-sm">/mês</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                <li className="flex gap-2 text-sm text-slate-600 dark:text-slate-400"><Check size={18} className="text-amber-500" /> Tudo do Professional</li>
                <li className="flex gap-2 text-sm text-slate-600 dark:text-slate-400"><Check size={18} className="text-amber-500" /> Assinatura Digital de Contratos</li>
                <li className="flex gap-2 text-sm text-slate-600 dark:text-slate-400"><Check size={18} className="text-amber-500" /> Notificações de Vencimento por WhatsApp</li>
                <li className="flex gap-2 text-sm text-slate-600 dark:text-slate-400"><Check size={18} className="text-amber-500" /> Conciliação Bancária Automática</li>
              </ul>
              <button 
                onClick={() => handleSubscribe('premium')}
                className={`w-full py-3 rounded-xl font-bold transition-all flex justify-center items-center gap-2 ${isCurrentPlan('premium') ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-lg shadow-amber-500/30' : 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90'}`}
              >
                {isCurrentPlan('premium') ? 'Renovar Plano Premium' : 'Assinar Premium'} <ExternalLink size={16} />
              </button>
            </div>
          </div>
        )}

        <div className="mt-12 bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-6 border border-blue-100 dark:border-blue-800 flex items-center justify-between">
          <div>
            <h4 className="font-bold text-blue-900 dark:text-blue-300">Pagamento Seguro via Mercado Pago</h4>
            <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">Ao clicar em assinar/renovar, você será redirecionado para o ambiente seguro do Mercado Pago.</p>
          </div>
          <img src="https://logospng.org/download/mercado-pago/logo-mercado-pago-icone-1024.png" alt="Mercado Pago" className="w-12 h-12 object-contain mix-blend-multiply dark:mix-blend-normal" />
        </div>
      </div>
    </Layout>
  );
}
