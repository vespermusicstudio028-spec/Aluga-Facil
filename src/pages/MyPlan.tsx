import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { Crown, Check, ExternalLink, RefreshCw, FileText, CheckCircle2, Clock } from 'lucide-react';
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
  const [invoices, setInvoices] = useState<any[]>([]);
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [nextExp, setNextExp] = useState<Date | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

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
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [user]);

  useEffect(() => {
    // Gerar fatura automática se faltar 8 dias ou menos e não houver fatura pendente
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

  const handleSubscribe = (planId: 'basic' | 'pro' | 'premium') => {
    const link = mpLinks[planId];
    if (link) {
      window.open(link, '_blank');
    } else {
      alert('O link de pagamento via Mercado Pago ainda não foi configurado pelo Administrador.');
    }
  };

  const handleConfirmPayment = async (inv: any) => {
    if (!window.confirm("Confirmar que você já realizou o pagamento desta fatura? O seu sistema será desbloqueado automaticamente.")) return;
    setConfirming(inv.id);
    try {
      // 1. Marca fatura como paga
      await supabase.from('plan_invoices').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', inv.id);
      
      // 2. Calcula nova expiração (+1 mês da data de vencimento original)
      const nextDate = new Date(inv.due_date);
      nextDate.setMonth(nextDate.getMonth() + 1);
      
      // 3. Atualiza perfil
      await supabase.from('profiles').update({ 
        status: 'active', 
        plan_expires_at: nextDate.toISOString() 
      }).eq('id', user?.uid);
      
      alert("Pagamento confirmado com sucesso! O seu sistema foi restaurado.");
      window.location.reload();
    } catch (e) {
      console.error(e);
      alert("Erro ao confirmar pagamento.");
    } finally {
      setConfirming(null);
    }
  };

  const isCurrentPlan = (planId: UserPlan) => user?.plan === planId;

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

        {loading ? (
          <div className="animate-pulse flex gap-4 mb-12">
            <div className="h-64 w-1/3 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
            <div className="h-64 w-1/3 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
            <div className="h-64 w-1/3 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
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
                {isCurrentPlan('basic') ? 'Mudar para Plano Basic' : 'Assinar Basic'} <ExternalLink size={16} />
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
                {isCurrentPlan('professional') ? 'Mudar para Plano Professional' : 'Assinar Professional'} <ExternalLink size={16} />
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
                {isCurrentPlan('premium') ? 'Mudar para Plano Premium' : 'Assinar Premium'} <ExternalLink size={16} />
              </button>
            </div>
          </div>
        )}
        
        {/* Minhas Faturas */}
        <div className="mb-12">
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
                          <p className="text-sm opacity-70 mt-1">Sua primeira fatura será gerada 8 dias antes do vencimento.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    invoices.map(inv => (
                      <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {format(new Date(inv.due_date), "dd 'de' MMM, yyyy", { locale: ptBR })}
                          </div>
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
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                              <Clock size={14} /> Pendente
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          {inv.status === 'pending' && (
                            <div className="flex justify-end gap-2">
                              <button 
                                onClick={() => handleSubscribe(inv.plan_id as any)}
                                className="px-4 py-2 bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-sm font-bold rounded-lg hover:opacity-90 transition-opacity"
                              >
                                Pagar
                              </button>
                              <button 
                                onClick={() => handleConfirmPayment(inv)}
                                disabled={confirming === inv.id}
                                className="px-4 py-2 bg-emerald-500 text-white text-sm font-bold rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                              >
                                {confirming === inv.id ? <RefreshCw className="animate-spin" size={16} /> : <Check size={16} />}
                                Já paguei
                              </button>
                            </div>
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

        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-6 border border-blue-100 dark:border-blue-800 flex items-center justify-between">
          <div>
            <h4 className="font-bold text-blue-900 dark:text-blue-300">Pagamento Seguro via Mercado Pago</h4>
            <p className="text-sm text-blue-700 dark:text-blue-400 mt-1 max-w-2xl">
              Ao clicar em pagar, você será redirecionado para o ambiente seguro do Mercado Pago. 
              Após realizar o pagamento, clique em <strong>"Já paguei"</strong> para que nosso sistema restaure o seu acesso instantaneamente.
            </p>
          </div>
          <img src="https://logospng.org/download/mercado-pago/logo-mercado-pago-icone-1024.png" alt="Mercado Pago" className="w-16 h-16 object-contain mix-blend-multiply dark:mix-blend-normal hidden sm:block" />
        </div>
      </div>
    </Layout>
  );
}
