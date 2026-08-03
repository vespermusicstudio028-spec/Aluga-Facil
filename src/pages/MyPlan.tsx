import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { Crown, Check, ExternalLink, RefreshCw, FileText, CheckCircle2, Clock, XCircle, X } from 'lucide-react';
import { differenceInDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useFeature } from '../features/useFeature';
import { PlanLimit } from '../features/components/PlanLimit';
import { LimitType, Feature } from '../features/permissions';
import { motion, AnimatePresence } from 'motion/react';

export default function MyPlan() {
  const { user } = useAuth();
  const { hasFeature, loading: featuresLoading } = useFeature();
  const [pricing, setPricing] = useState({ basic: 0, pro: 49.90, premium: 99.90 });
  const [mpLinks, setMpLinks] = useState({ basic: '', pro: '', premium: '' });
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [nextExp, setNextExp] = useState<Date | null>(null);
  const [checkoutPlanId, setCheckoutPlanId] = useState<'basic' | 'pro' | 'premium' | null>(null);

  const [usage, setUsage] = useState({
    properties: 0,
    tenants: 0,
    contracts: 0
  });

  useEffect(() => {
    if (user) {
      let exp;
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      if ((user as any).plan_expires_at) {
        exp = new Date((user as any).plan_expires_at);
      } else if (user.createdAt) {
        const created = new Date(user.createdAt);
        exp = new Date(now.getFullYear(), now.getMonth(), created.getDate());
        if (exp.getTime() < startOfToday.getTime()) {
          exp.setMonth(exp.getMonth() + 1);
        }
      }

      if (exp) {
        setNextExp(exp);
        setDaysLeft(differenceInDays(exp, startOfToday));
      }
    }
  }, [user]);

  const fetchInvoices = async () => {
    if (!user) return;
    const { data } = await supabase.from('plan_invoices').select('*').eq('user_id', user.uid).order('due_date', { ascending: false });
    if (data) setInvoices(data);
  };

  const fetchUsageData = async () => {
    if (!user) return;
    try {
      const p = await supabase.from('properties').select('id', { count: 'exact', head: true }).eq('owner_id', user.uid);
      const t = await supabase.from('tenants').select('id', { count: 'exact', head: true }).eq('owner_id', user.uid);
      const c = await supabase.from('contracts').select('id', { count: 'exact', head: true }).eq('owner_id', user.uid);

      setUsage({
        properties: p.count || 0,
        tenants: t.count || 0,
        contracts: c.count || 0
      });
    } catch (e) { console.error(e); }
  }

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
        await fetchInvoices();
        await fetchUsageData();
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [user]);

  useEffect(() => {
    const generateInvoiceIfNeeded = async () => {
      if (daysLeft === null || nextExp === null || !user || loading) return;
      if (daysLeft <= 8) {
        const hasPending = invoices.some(i => i.status === 'pending');
        if (!hasPending) {
          let planCost = 0;
          if (user.plan === 'basic') planCost = pricing.basic;
          if (user.plan === 'professional') planCost = pricing.pro;
          if (user.plan === 'premium') planCost = pricing.premium;

          if (planCost > 0) {
            const { data } = await supabase.from('plan_invoices').insert({
              user_id: user.uid,
              plan_id: user.plan,
              amount: planCost,
              status: 'pending',
              due_date: nextExp.toISOString()
            }).select();

            if (data && data.length > 0) {
              setInvoices([data[0], ...invoices]);
            }
          }
        }
      }
    };
    generateInvoiceIfNeeded();
  }, [daysLeft, nextExp, user, invoices, loading, pricing]);

  const handleSubscribeClick = (planId: 'basic' | 'pro' | 'premium') => {
    setCheckoutPlanId(planId);
  };

  const confirmCheckout = async () => {
    if (!checkoutPlanId) return;
    const planId = checkoutPlanId;
    const link = mpLinks[planId];
    if (link) {
      if (user && !loading) {
        const pId = planId === 'pro' ? 'professional' : planId;
        const hasPendingForPlan = invoices.some(i => i.status === 'pending' && i.plan_id === pId);

        if (!hasPendingForPlan) {
          let planCost = 0;
          if (planId === 'basic') planCost = pricing.basic;
          if (planId === 'pro') planCost = pricing.pro;
          if (planId === 'premium') planCost = pricing.premium;

          const dueDate = nextExp ? nextExp.toISOString() : new Date().toISOString();

          const { data } = await supabase.from('plan_invoices').insert({
            user_id: user.uid,
            plan_id: pId,
            amount: planCost,
            status: 'pending',
            due_date: dueDate
          }).select();

          if (data && data.length > 0) {
            setInvoices(prev => [data[0], ...prev]);
          }
        }
      }
      setCheckoutPlanId(null);
      window.open(link, '_blank');
    } else {
      alert('O link de pagamento via Mercado Pago ainda não foi configurado pelo Administrador.');
    }
  };

  // Temporário para manter suporte ao histórico de faturas antigas
  const handleSubscribe = (planId: 'basic' | 'pro' | 'premium') => {
    setCheckoutPlanId(planId);
  };

  const isFreeTrial = user?.plan === 'trial' && daysLeft !== null && daysLeft >= 0;
  const isCurrentPlan = (planId: string) => (!isFreeTrial || planId === 'trial') && (user?.plan === planId || (user?.plan === 'professional' && planId === 'pro'));

  const getProfileTitle = () => {
    switch (user?.plan) {
      case 'professional': return '🏢 Investidor';
      case 'premium': return '🏢 Imobiliária';
      default: return '👤 Proprietário';
    }
  };

  const allSystemFeatures = [
    { id: Feature.AGENDA, name: 'Agenda Inteligente' },
    { id: Feature.HELPDESK, name: 'Manutenções (Helpdesk)' },
    { id: Feature.DOCUMENT_VAULT, name: 'Cofre de Documentos' },
    { id: Feature.CONTRACTS, name: 'Criação de Contratos' },
    { id: Feature.CONTRACTS_PDF, name: 'Contratos em PDF' },
    { id: Feature.REPORTS_ADVANCED, name: 'Relatórios Avançados' },
    { id: Feature.FINANCIAL, name: 'Módulo Financeiro' },
    { id: Feature.TENANT_RATING, name: 'Avaliação de Inquilinos' },
    { id: Feature.WHATSAPP, name: 'Integração WhatsApp' },
    { id: Feature.DIGITAL_SIGNATURE, name: 'Assinatura Digital' },
    { id: Feature.BANK_RECONCILIATION, name: 'Conciliação Bancária' },
    { id: Feature.NOTIFICATIONS, name: 'Auto-Notificações' },
  ];

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-12 pb-24">
        {/* CABEÇALHO */}
        <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 text-white shrink-0">
              <Crown size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white">Meu Plano SaaS</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">Visão geral da sua assinatura, consumo de recursos e fatura.</p>
            </div>
          </div>
        </div>

        {loading || featuresLoading ? (
          <div className="animate-pulse space-y-8">
            <div className="h-40 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
            <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
          </div>
        ) : (
          <>
            {/* PAINEL GLOBAL DO PLANO */}
            <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row gap-8 items-start">
              <div className="flex-1 space-y-6 w-full">
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Plano Atual</p>
                    <span className="text-sm font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-4 py-1.5 rounded-full inline-block mt-2 sm:mt-0">
                      Seu Perfil: {getProfileTitle()}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-3">
                    <h2 className="text-4xl font-black text-slate-900 dark:text-white capitalize tracking-tight">
                      {user?.plan}
                    </h2>
                    {isFreeTrial && (
                      <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full border border-emerald-200">
                        TESTE GRÁTIS
                      </span>
                    )}
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 mt-2">
                    Sua assinatura {daysLeft !== null && daysLeft > 0 ? `termina em ${daysLeft} dias.` : daysLeft === 0 ? 'termina hoje!' : 'está expirada.'}
                    <br />
                    Data de vencimento: <strong className="text-slate-700 dark:text-slate-200">{nextExp ? format(nextExp, "dd 'de' MMMM, yyyy", { locale: ptBR }) : ''}</strong>
                  </p>
                  {isFreeTrial && (
                    <p className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-sm font-bold rounded-xl border border-emerald-100 dark:border-emerald-800">
                      Você está utilizando todas as funcionalidades Premium durante seu período de teste.
                    </p>
                  )}
                </div>

                <div className="w-full h-px bg-slate-100 dark:bg-slate-800" />

                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Recursos & Limites de Consumo</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    <PlanLimit limitType={LimitType.PROPERTY_LIMIT} currentValue={usage.properties} label="Imóveis Cadastrados" />
                    <PlanLimit limitType={LimitType.TENANT_LIMIT} currentValue={usage.tenants} label="Inquilinos Ativos" />
                    <PlanLimit limitType={LimitType.CONTRACT_LIMIT} currentValue={usage.contracts} label="Contratos Ofertados" />
                  </div>
                </div>
              </div>

              {/* GRID DE FUNCIONALIDADES DESBLOQUEADAS */}
              <div className="w-full lg:w-80 shrink-0 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <CheckCircle2 className="text-primary" size={20} /> Permissões Ativas
                </h3>
                <ul className="space-y-3">
                  {allSystemFeatures.map(f => {
                    const hasIt = hasFeature(f.id);
                    return (
                      <li key={f.id} className="flex items-center gap-3">
                        {hasIt ? (
                          <Check size={18} className="text-emerald-500 shrink-0" />
                        ) : (
                          <XCircle size={18} className="text-slate-300 dark:text-slate-600 shrink-0" />
                        )}
                        <span className={`text-sm font-medium ${hasIt ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400 dark:text-slate-600 line-through'}`}>
                          {f.name}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>

            {/* NOVOS CARDS DE PLANOS REFINADOS */}
            <div className="mt-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-3">Mudar Plano / Renovar</h2>
                <p className="text-slate-500 dark:text-slate-400 text-lg max-w-2xl mx-auto">
                  Escolha o plano ideal e leve a gestão dos seus imóveis para o próximo nível. Não há taxas ocultas, cancele a qualquer momento.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start max-w-6xl mx-auto">

                {/* BASIC CARD */}
                <div className={`relative bg-white dark:bg-slate-900 rounded-[2rem] border-2 p-8 shadow-sm flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${isCurrentPlan('basic') ? 'border-primary' : 'border-slate-200 dark:border-slate-800 hover:border-primary/50'}`}>
                  {isCurrentPlan('basic') && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-black px-4 py-1.5 rounded-full shadow-md whitespace-nowrap">SEU PLANO ATUAL</span>
                  )}

                  <div className="inline-flex items-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold px-3 py-1.5 rounded-full mb-6 w-max">
                    👤 Para Proprietários
                  </div>

                  <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Basic</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 min-h-[40px]">
                    Ideal para proprietários independentes com poucos imóveis.
                  </p>

                  <div className="mb-2 flex items-end gap-1">
                    <span className="text-4xl font-black text-slate-900 dark:text-white">R$ {pricing.basic.toFixed(2).replace('.', ',')}</span>
                    <span className="text-slate-500 font-medium mb-1">/mês</span>
                  </div>
                  <p className="text-sm text-sky-600 dark:text-sky-400 font-bold mb-6">Comece a organizar seus imóveis.</p>

                  <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50 mb-8 min-h-[72px] flex items-center">
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                      Gerencie seus imóveis de forma simples, organizada e segura.
                    </p>
                  </div>

                  <ul className="mb-8 space-y-4 text-sm text-slate-600 dark:text-slate-400 flex-1">
                    <li className="flex gap-3 items-center font-bold text-slate-800 dark:text-slate-200"><Check size={20} className="text-primary shrink-0" /> Até 5 imóveis</li>
                    <li className="flex gap-3 items-center"><Check size={20} className="text-primary shrink-0" /> Inquilinos ilimitados</li>
                    <li className="flex gap-3 items-center"><Check size={20} className="text-primary shrink-0" /> Modelos básicos de contrato</li>
                    <li className="flex gap-3 items-center"><Check size={20} className="text-primary shrink-0" /> Dashboard completo</li>
                    <li className="flex gap-3 items-center"><Check size={20} className="text-primary shrink-0" /> Relatórios básicos</li>
                    <li className="flex gap-3 items-center"><Check size={20} className="text-primary shrink-0" /> Cadastro de imóveis</li>
                    <li className="flex gap-3 items-center"><Check size={20} className="text-primary shrink-0" /> Cadastro de inquilinos</li>
                    <li className="flex gap-3 items-center"><Check size={20} className="text-primary shrink-0" /> Suporte por Chat</li>
                  </ul>

                  <button
                    onClick={() => handleSubscribeClick('basic')}
                    className={`w-full py-4 rounded-xl font-bold transition-all duration-300 flex justify-center items-center gap-2 text-base ${isCurrentPlan('basic') ? 'bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/30' : 'bg-sky-50 text-sky-700 hover:bg-sky-100 dark:bg-sky-900/30 dark:text-sky-400 dark:hover:bg-sky-900/50'}`}
                  >
                    {isCurrentPlan('basic') ? 'Renovar Plano Basic' : 'Assinar Basic'}
                  </button>
                </div>

                {/* PROFESSIONAL CARD (Destacado) */}
                <div className={`group relative bg-white dark:bg-slate-900 rounded-[2rem] border-[3px] p-8 shadow-2xl flex flex-col transform md:-translate-y-4 transition-all duration-300 hover:scale-[1.03] z-10 ${isCurrentPlan('pro') ? 'border-blue-500' : 'border-blue-500'}`}>
                  <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-400 to-blue-600 rounded-t-[1.8rem]" />

                  <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs font-black px-4 py-1.5 rounded-full shadow-lg shadow-blue-500/40 uppercase tracking-widest whitespace-nowrap flex items-center gap-1.5 border border-blue-400">
                    <Crown size={14} /> MAIS VENDIDO
                  </span>

                  <div className="inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-bold px-3 py-1.5 rounded-full mb-6 w-max mt-2">
                    ⭐ Para Investidores
                  </div>

                  <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-2">Professional</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 min-h-[40px]">
                    Ideal para investidores e administradores de imóveis.
                  </p>

                  <div className="mb-2 flex items-end gap-1">
                    <span className="text-4xl font-black text-slate-900 dark:text-white">R$ {pricing.pro.toFixed(2).replace('.', ',')}</span>
                    <span className="text-slate-500 font-medium mb-1">/mês</span>
                  </div>
                  <p className="text-sm text-blue-600 dark:text-blue-400 font-bold mb-6">A escolha da maioria dos nossos clientes.</p>

                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-900/50 mb-8 min-h-[72px] flex items-center">
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-semibold">
                      Controle completo para quem administra vários imóveis e deseja automatizar processos.
                    </p>
                  </div>

                  <ul className="mb-8 space-y-4 text-sm text-slate-600 dark:text-slate-400 flex-1">
                    <li className="flex gap-3 items-center font-bold text-slate-900 dark:text-white"><Check size={20} className="text-blue-500 shrink-0" /> Até 20 imóveis</li>
                    <li className="flex gap-3 items-center font-medium text-slate-800 dark:text-slate-200"><Check size={20} className="text-blue-500 shrink-0" /> Inquilinos ilimitados</li>
                    <li className="flex gap-3 items-center font-medium text-slate-800 dark:text-slate-200"><Check size={20} className="text-blue-500 shrink-0" /> Lembretes automáticos por WhatsApp</li>
                    <li className="flex gap-3 items-center"><Check size={20} className="text-blue-500 shrink-0" /> Cofre de Documentos</li>
                    <li className="flex gap-3 items-center"><Check size={20} className="text-blue-500 shrink-0" /> Central de Tickets</li>
                    <li className="flex gap-3 items-center"><Check size={20} className="text-blue-500 shrink-0" /> Help Desk</li>
                    <li className="flex gap-3 items-center"><Check size={20} className="text-blue-500 shrink-0" /> Relatórios Avançados</li>
                    <li className="flex gap-3 items-center"><Check size={20} className="text-blue-500 shrink-0" /> Gestor Financeiro</li>
                    <li className="flex gap-3 items-center"><Check size={20} className="text-blue-500 shrink-0" /> Portal Público</li>
                    <li className="flex gap-3 items-center"><Check size={20} className="text-blue-500 shrink-0" /> API Mercado Pago & WhatsApp</li>
                    <li className="flex gap-3 items-center"><Check size={20} className="text-blue-500 shrink-0" /> Suporte Prioritário</li>
                  </ul>

                  <button
                    onClick={() => handleSubscribeClick('pro')}
                    className="w-full py-4 rounded-xl font-black transition-all duration-300 flex justify-center items-center gap-2 text-lg bg-blue-600 text-white hover:bg-blue-700 shadow-xl shadow-blue-600/30 hover:shadow-blue-600/50"
                  >
                    Quero o Professional
                  </button>
                </div>

                {/* PREMIUM CARD */}
                <div className={`relative bg-white dark:bg-slate-900 rounded-[2rem] border-2 p-8 shadow-sm flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${isCurrentPlan('premium') ? 'border-amber-500' : 'border-slate-200 dark:border-slate-800 hover:border-amber-500/50'}`}>
                  {isCurrentPlan('premium') && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-xs font-black px-4 py-1.5 rounded-full shadow-md whitespace-nowrap">SEU PLANO ATUAL</span>
                  )}

                  <div className="inline-flex items-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold px-3 py-1.5 rounded-full mb-6 w-max">
                    🏢 Para Imobiliárias
                  </div>

                  <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Premium</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 min-h-[40px]">
                    Ideal para imobiliárias e empresas com equipes.
                  </p>

                  <div className="mb-2 flex items-end gap-1">
                    <span className="text-4xl font-black text-slate-900 dark:text-white">R$ {pricing.premium.toFixed(2).replace('.', ',')}</span>
                    <span className="text-slate-500 font-medium mb-1">/mês</span>
                  </div>
                  <p className="text-sm text-amber-600 dark:text-amber-500 font-bold mb-6">A plataforma completa para empresas.</p>

                  <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-xl border border-amber-100 dark:border-amber-900/30 mb-8 min-h-[72px] flex items-center">
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                      A solução completa para empresas que administram muitos imóveis e precisam de recursos avançados.
                    </p>
                  </div>

                  <ul className="mb-8 space-y-4 text-sm text-slate-600 dark:text-slate-400 flex-1">
                    <li className="flex gap-3 items-center font-bold text-slate-900 dark:text-white"><Check size={20} className="text-amber-500 shrink-0" /> Imóveis ilimitados</li>
                    <li className="flex gap-3 items-center font-medium text-slate-800 dark:text-slate-200"><Check size={20} className="text-amber-500 shrink-0" /> Todo o pacote Professional</li>
                    <li className="flex gap-3 items-center"><Check size={20} className="text-amber-500 shrink-0" /> Usuários adicionais</li>
                    <li className="flex gap-3 items-center"><Check size={20} className="text-amber-500 shrink-0" /> Corretores adicionais</li>
                    <li className="flex gap-3 items-center"><Check size={20} className="text-amber-500 shrink-0" /> Upload ilimitado de fotos</li>
                    <li className="flex gap-3 items-center"><Check size={20} className="text-amber-500 shrink-0" /> Upload de vídeos</li>
                    <li className="flex gap-3 items-center"><Check size={20} className="text-amber-500 shrink-0" /> Assinaturas Digitais (Em breve)</li>
                    <li className="flex gap-3 items-center"><Check size={20} className="text-amber-500 shrink-0" /> Concierge</li>
                    <li className="flex gap-3 items-center"><Check size={20} className="text-amber-500 shrink-0" /> Suporte VIP 24h</li>
                    <li className="flex gap-3 items-center"><Check size={20} className="text-amber-500 shrink-0" /> Recursos Premium futuros</li>
                  </ul>

                  <button
                    onClick={() => handleSubscribeClick('premium')}
                    className={`w-full py-4 rounded-xl font-bold transition-all duration-300 flex justify-center items-center gap-2 text-base ${isCurrentPlan('premium') ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-lg shadow-amber-500/30' : 'bg-slate-900 text-amber-400 dark:bg-white dark:text-slate-900 shadow-lg hover:shadow-xl hover:opacity-90'}`}
                  >
                    {isCurrentPlan('premium') ? 'Renovar Plano Premium' : 'Assinar Premium'}
                  </button>
                </div>
              </div>
            </div>

            {/* TABELA DE COMPARAÇÃO COMPLETA */}
            <div className="mt-20 mb-16 max-w-5xl mx-auto overflow-hidden bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm scroll-mt-20">
              <div className="p-6 lg:p-8 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">Comparação Completa de Funcionalidades</h3>
                <p className="text-slate-500 dark:text-slate-400 mt-2">Veja ao lado a lado tudo o que sua assinatura oferece</p>
              </div>
              <div className="overflow-x-auto selection:bg-primary/20">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead className="bg-white dark:bg-slate-900 border-b-2 border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-6 px-8 font-semibold text-slate-500 w-[28%] text-sm uppercase tracking-wider">Recurso / Integração</th>
                      <th className="py-6 px-6 text-center w-[24%]">
                        <span className="block text-xl font-black text-slate-900 dark:text-white">Basic</span>
                      </th>
                      <th className="py-6 px-6 text-center w-[24%] bg-blue-50/50 dark:bg-blue-900/10 border-x border-blue-100 dark:border-blue-900/30">
                        <span className="inline-block text-[10px] font-black text-white bg-blue-500 px-3 py-1 rounded-full mb-2 tracking-widest uppercase shadow-sm">MAIS VENDIDO</span>
                        <span className="block text-xl font-black text-blue-600 dark:text-blue-400">Professional</span>
                      </th>
                      <th className="py-6 px-6 text-center w-[24%]">
                        <span className="block text-xl font-black text-slate-900 dark:text-white">Premium</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                    {[
                      { f: 'Imóveis', b: 'Até 5', p: 'Até 20', m: 'Ilimitado', highlight: true },
                      { f: 'Inquilinos', b: 'Ilimitados', p: 'Ilimitados', m: 'Ilimitados' },
                      { f: 'Geração de Contratos', b: 'Modelos Básicos', p: 'Modelos Premium', m: 'Customizados' },
                      { f: 'Automação WhatsApp', b: '—', p: 'Sim (Nativo)', m: 'Sim (Nativo)' },
                      { f: 'Portal Público (Inquilinos)', b: '—', p: 'Sim', m: 'Sim' },
                      { f: 'Módulo Financeiro', b: 'Básico', p: 'Avançado', m: 'Avançado' },
                      { f: 'Cofre de Documentos', b: '—', p: 'PDFs limitados', m: 'Ilimitado' },
                      { f: 'Central Help Desk', b: '—', p: 'Sim', m: 'Sim' },
                      { f: 'Integração de APIs', b: '—', p: 'Mercado Pago e WhatsApp', m: 'Todas as APIs' },
                      { f: 'Usuários Administrativos', b: 'Apenas Proprietário', p: 'Apenas Administrador', m: 'Usuários Ilimitados' },
                      { f: 'Contas de Corretores', b: 'Não', p: 'Não', m: 'Sim (Organizações)' },
                      { f: 'Armazenamento de Fotos', b: 'Limitado', p: 'Limitado', m: 'Ilimitado' },
                      { f: 'Armazenamento de Vídeos', b: '—', p: '—', m: 'Ilimitado' },
                      { f: 'Assinatura Digital (DocuSign)', b: '—', p: '—', m: 'Em breve' },
                      { f: 'Suporte', b: 'Por Chat (Fila Comum)', p: 'Prioritário', m: 'VIP 24h & Concierge' },
                    ].map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className={`py-5 px-8 font-semibold ${row.highlight ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>{row.f}</td>
                        <td className="py-5 px-6 text-center text-slate-500 dark:text-slate-400">{row.b}</td>
                        <td className={`py-5 px-6 text-center border-x border-blue-100/50 dark:border-blue-900/30 bg-blue-50/30 dark:bg-blue-900/10 ${row.highlight ? 'font-black text-blue-600 dark:text-blue-400' : 'font-medium text-slate-700 dark:text-slate-200'}`}>{row.p}</td>
                        <td className={`py-5 px-6 text-center ${row.highlight ? 'font-bold text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>{row.m}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* MINHAS FATURAS ORIGINAL */}
            <div>
              <div className="flex items-center gap-2 mb-6">
                <FileText className="text-primary" size={24} />
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Minhas Faturas</h2>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Vencimento</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Plano</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Valor</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {invoices.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center">
                            <div className="flex flex-col items-center justify-center text-slate-500">
                              <FileText size={32} className="mb-2 opacity-50" />
                              <p>Nenhuma fatura encontrada.</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        invoices.map(inv => (
                          <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-900 dark:text-white">
                              {format(new Date(inv.due_date), "dd 'de' MMM, yyyy", { locale: ptBR })}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap capitalize text-slate-700 dark:text-slate-300">
                              {inv.plan_id}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-700 dark:text-slate-300">
                              R$ {Number(inv.amount).toFixed(2).replace('.', ',')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {inv.status === 'paid' ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                  <CheckCircle2 size={14} /> Pago
                                </span>
                              ) : inv.status === 'under_review' ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                  <RefreshCw size={14} className="animate-spin-slow" /> Em Análise
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                                  <Clock size={14} /> Pendente
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              {inv.status === 'pending' && (
                                <button
                                  onClick={() => handleSubscribe(inv.plan_id === 'professional' ? 'pro' : inv.plan_id)}
                                  className="px-4 py-2 bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-sm font-bold rounded-lg hover:opacity-90 transition-opacity"
                                >
                                  Pagar
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* CHECKOUT SUMMARY MODAL */}
      <AnimatePresence>
        {checkoutPlanId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCheckoutPlanId(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col p-8"
            >
              <button
                onClick={() => setCheckoutPlanId(null)}
                className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              >
                <X size={20} />
              </button>

              <div className="text-center mb-6 mt-2">
                <div className="w-16 h-16 bg-primary/10 dark:bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Crown size={32} className="text-primary" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">Você escolheu</h3>
                <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Apenas mais um passo para o upgrade.</p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/80 rounded-2xl p-6 border border-slate-200 dark:border-slate-700/50 mb-8">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Resumo da Assinatura</p>
                <div className="flex justify-between items-center mb-3">
                  <span className="font-black text-slate-800 dark:text-slate-200 capitalize text-2xl tracking-tight">
                    {checkoutPlanId === 'pro' ? 'Professional' : checkoutPlanId}
                  </span>
                  <div className="text-right">
                    <span className="font-black text-slate-900 dark:text-white text-2xl">
                      R$ {checkoutPlanId === 'basic' ? pricing.basic.toFixed(2).replace('.', ',') : checkoutPlanId === 'pro' ? pricing.pro.toFixed(2).replace('.', ',') : pricing.premium.toFixed(2).replace('.', ',')}
                    </span>
                    <span className="text-sm font-medium text-slate-500 block -mt-1">/ mês</span>
                  </div>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {checkoutPlanId === 'basic' ? 'Ideal para proprietários com poucos imóveis.' : checkoutPlanId === 'pro' ? 'Ideal para investidores e administradores de imóveis.' : 'A solução completa para imobiliárias.'}
                </p>
              </div>

              <div className="grid gap-3">
                <button
                  onClick={confirmCheckout}
                  className="w-full py-4 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/30 hover:bg-opacity-90 hover:-translate-y-0.5 transition-transform flex items-center justify-center gap-2 text-lg"
                >
                  <ExternalLink size={18} /> Confirmar pelo Mercado Pago
                </button>
                <button
                  onClick={() => setCheckoutPlanId(null)}
                  className="w-full py-4 bg-transparent text-slate-500 dark:text-slate-400 font-bold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancelar, escolherei depois
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </Layout>
  );
}
