import React, { useEffect, useState, useCallback } from 'react';
import Layout from '../components/Layout';
import { 
  Users, ShieldCheck, TrendingUp, UserPlus, 
  Settings as SettingsIcon, Trash2, Download,
  CheckCircle2, Lock, Unlock, Crown, Search,
  RefreshCw, Building2, CreditCard, AlertTriangle,
  ChevronDown, X, Star, Activity, BellRing, Send,
  Eye, MessageCircle, Mail
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { User, UserPlan } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const PLAN_LABELS: Record<UserPlan, string> = {
  basic: 'Basic',
  professional: 'Professional',
  premium: 'Premium',
};

const PLAN_COLORS: Record<UserPlan, string> = {
  basic: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  professional: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  premium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

type TabType = 'overview' | 'activities' | 'broadcast' | 'settings';

export default function Admin() {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  
  // Overview state
  const [users, setUsers] = useState<User[]>([]);
  const [filtered, setFiltered] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState<'all' | UserPlan>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'blocked'>('all');
  const [actionUserId, setActionUserId] = useState<string | null>(null);
  
  // Pricing Settings
  const [pricing, setPricing] = useState({ pro: 49.90, premium: 99.90 });
  const [savingPricing, setSavingPricing] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalProperties: 0,
    totalTenants: 0,
    mrr: 0
  });

  // Modals & Extras
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userStats, setUserStats] = useState({ properties: 0, tenants: 0, loading: false });
  const [userActivities, setUserActivities] = useState<any[]>([]);
  const [loadingUserActivities, setLoadingUserActivities] = useState(false);
  
  // Broadcast
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState(false);

  // Activities
  const [activities, setActivities] = useState<any[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);

  // Guard: only admins
  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin') {
      navigate('/dashboard');
    }
  }, [currentUser, navigate]);

  const fetchSettings = useCallback(async () => {
    try {
      const { data } = await supabase.from('global_settings').select('*').eq('key', 'pricing').single();
      if (data && data.value) {
        setPricing({ pro: data.value.pro || 49.90, premium: data.value.premium || 99.90 });
      }
    } catch(e) {}
  }, []);

  const fetchData = useCallback(async () => {
    if (currentUser?.role !== 'admin') return;
    setIsLoading(true);
    try {
      const [{ data: profiles }, { count: propCount }, { count: tenantCount }] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('properties').select('*', { count: 'exact', head: true }),
        supabase.from('tenants').select('*', { count: 'exact', head: true }),
      ]);

      const userList: User[] = (profiles || []).map(d => ({
        uid: d.id,
        email: d.email,
        name: d.name,
        plan: d.plan,
        status: d.status,
        role: d.role,
        photoURL: d.photo_url,
        createdAt: d.created_at,
      }));

      // Calculate MRR using dynamic pricing
      let mrr = 0;
      userList.forEach(u => {
        if (u.status === 'active') {
          if (u.plan === 'professional') mrr += pricing.pro;
          if (u.plan === 'premium') mrr += pricing.premium;
        }
      });

      setUsers(userList);
      setStats({
        totalUsers: userList.length,
        activeUsers: userList.filter(u => u.status === 'active').length,
        totalProperties: propCount ?? 0,
        totalTenants: tenantCount ?? 0,
        mrr
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, pricing]);

  const fetchActivities = useCallback(async () => {
    setLoadingActivities(true);
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select(`
          *,
          profiles:user_id(name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(50);
        
      if (!error && data) setActivities(data);
    } catch (err) {} finally {
      setLoadingActivities(false);
    }
  }, []);

  useEffect(() => { 
    fetchSettings().then(() => {
      if (activeTab === 'overview') fetchData();
    });
    if (activeTab === 'activities') fetchActivities();
  }, [fetchData, fetchActivities, fetchSettings, activeTab]);

  // Realtime overview
  useEffect(() => {
    if (currentUser?.role !== 'admin') return;
    const channel = supabase
      .channel('admin_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'properties' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tenants' }, () => fetchData())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_logs' }, () => {
         if(activeTab === 'activities') fetchActivities()
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUser, fetchData, fetchActivities, activeTab]);

  // Filter logic
  useEffect(() => {
    let list = [...users];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(u => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q));
    }
    if (planFilter !== 'all') list = list.filter(u => u.plan === planFilter);
    if (statusFilter !== 'all') list = list.filter(u => u.status === statusFilter);
    setFiltered(list);
  }, [users, search, planFilter, statusFilter]);

  // Actions
  const toggleStatus = async (uid: string, current: string) => {
    const next = current === 'active' ? 'blocked' : 'active';
    await supabase.from('profiles').update({ status: next }).eq('id', uid);
    setActionUserId(null);
  };

  const changePlan = async (uid: string, plan: UserPlan) => {
    await supabase.from('profiles').update({ plan }).eq('id', uid);
    setActionUserId(null);
  };

  const deleteUser = async (uid: string) => {
    if (!window.confirm("ATENÇÃO: Isso excluirá permanentemente o usuário, imóveis, inquilinos e contratos associados. Tem certeza?")) return;
    try {
      await supabase.rpc('delete_user_account', { p_user_id: uid });
      setActionUserId(null);
      fetchData();
    } catch(e) {
      console.error(e);
      alert("Erro ao excluir usuário. Certifique-se de ter rodado o script SQL.");
    }
  };

  const openUserDetails = async (user: User) => {
    setSelectedUser(user);
    setUserStats({ properties: 0, tenants: 0, loading: true });
    setLoadingUserActivities(true);
    
    try {
      const [{ count: pCount }, { count: tCount }, { data: logs }] = await Promise.all([
        supabase.from('properties').select('*', { count: 'exact', head: true }).eq('owner_id', user.uid),
        supabase.from('tenants').select('*', { count: 'exact', head: true }).eq('owner_id', user.uid),
        supabase.from('activity_logs').select('*').eq('user_id', user.uid).order('created_at', { ascending: false }).limit(10)
      ]);
      setUserStats({ properties: pCount ?? 0, tenants: tCount ?? 0, loading: false });
      setUserActivities(logs || []);
    } catch(e) {
      setUserStats(s => ({...s, loading: false}));
    } finally {
      setLoadingUserActivities(false);
    }
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!broadcastTitle || !broadcastMsg) return;
    setBroadcastLoading(true);
    try {
      const { error } = await supabase.rpc('broadcast_notification', {
        p_title: broadcastTitle,
        p_message: broadcastMsg
      });
      if(error) throw error;
      setBroadcastSuccess(true);
      setBroadcastTitle('');
      setBroadcastMsg('');
      setTimeout(() => setBroadcastSuccess(false), 3000);
    } catch(err) {
      alert("Erro ao enviar comunicado. Tente rodar o script SQL de permissões.");
    } finally {
      setBroadcastLoading(false);
    }
  };

  const saveSettings = async () => {
    setSavingPricing(true);
    try {
      await supabase.from('global_settings').upsert({
        key: 'pricing',
        value: pricing
      });
      alert("Configurações salvas com sucesso!");
      fetchData(); // Recalculate MRR
    } catch(e) {
      alert("Erro ao salvar. Rode o script SQL global_settings.");
    } finally {
      setSavingPricing(false);
    }
  };

  const exportCSV = () => {
    const headers = ["ID", "Nome", "Email", "Plano", "Status", "Data de Cadastro"];
    const rows = filtered.map(u => [
      u.uid, 
      `"${u.name}"`, 
      u.email, 
      u.plan, 
      u.status, 
      u.createdAt ? format(new Date(u.createdAt), "dd/MM/yyyy") : ""
    ]);
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `AlugaFacil_Usuarios_${format(new Date(), 'ddMMyyyy')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (currentUser?.role !== 'admin') return null;

  return (
    <Layout>
      {/* Header & Tabs */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg">
            <ShieldCheck className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Central de Controle</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Visão panorâmica do SaaS AlugaFácil</p>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide border-b border-slate-200 dark:border-slate-800">
          <button onClick={() => setActiveTab('overview')} className={`flex items-center gap-2 px-5 py-3 font-medium text-sm border-b-2 transition-colors ${activeTab === 'overview' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
            <TrendingUp size={16} /> Visão Geral
          </button>
          <button onClick={() => setActiveTab('activities')} className={`flex items-center gap-2 px-5 py-3 font-medium text-sm border-b-2 transition-colors ${activeTab === 'activities' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
            <Activity size={16} /> Atividades Globais
          </button>
          <button onClick={() => setActiveTab('broadcast')} className={`flex items-center gap-2 px-5 py-3 font-medium text-sm border-b-2 transition-colors ${activeTab === 'broadcast' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
            <BellRing size={16} /> Comunicados
          </button>
          <button onClick={() => setActiveTab('settings')} className={`flex items-center gap-2 px-5 py-3 font-medium text-sm border-b-2 transition-colors ${activeTab === 'settings' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
            <SettingsIcon size={16} /> Configurações
          </button>
        </div>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Dashboard Financeiro</h2>
            <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-sm font-medium">
              <Download size={16} /> Exportar CSV
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Total Receita (MRR)</p>
              <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {isLoading ? '...' : `R$ ${stats.mrr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              </h3>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Total de Usuários</p>
              <h3 className="text-2xl font-bold text-blue-600 dark:text-blue-400">{isLoading ? '...' : stats.totalUsers}</h3>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Imóveis Ativos</p>
              <h3 className="text-2xl font-bold text-violet-600 dark:text-violet-400">{isLoading ? '...' : stats.totalProperties}</h3>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Inquilinos Cadastrados</p>
              <h3 className="text-2xl font-bold text-orange-600 dark:text-orange-400">{isLoading ? '...' : stats.totalTenants}</h3>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 mb-4 flex flex-wrap gap-3 items-center shadow-sm">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar usuário..." className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <select value={planFilter} onChange={e => setPlanFilter(e.target.value as any)} className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none">
              <option value="all">Planos (Todos)</option><option value="basic">Basic</option><option value="professional">Professional</option><option value="premium">Premium</option>
            </select>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Usuário</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Plano</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filtered.map(u => (
                    <tr key={u.uid} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {u.photoURL ? (
                            <img src={u.photoURL} alt={u.name} className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                              {u.name?.charAt(0)?.toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                              {u.name}
                              {u.role === 'admin' && <Crown size={12} className="text-primary" />}
                            </p>
                            <p className="text-xs text-slate-400">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider ${PLAN_COLORS[u.plan as UserPlan] || PLAN_COLORS.basic}`}>
                          {PLAN_LABELS[u.plan as UserPlan] ?? u.plan}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider ${u.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
                          {u.status === 'active' ? 'Ativo' : 'Bloqueado'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => openUserDetails(u)} className="p-2 mr-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-primary hover:text-white transition-colors" title="Ver Raio-X">
                          <Eye size={16} />
                        </button>
                        <div className="relative inline-block text-left">
                          <button onClick={() => setActionUserId(actionUserId === u.uid ? null : u.uid)} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 transition-colors">
                            <ChevronDown size={16} />
                          </button>
                          {actionUserId === u.uid && (
                            <div className="absolute right-0 top-10 z-50 w-48 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-2">
                              {(['basic', 'professional', 'premium'] as UserPlan[]).map(plan => (
                                <button key={plan} onClick={() => changePlan(u.uid, plan)} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">{PLAN_LABELS[plan]}</button>
                              ))}
                              <div className="border-t my-1 border-slate-100 dark:border-slate-800" />
                              <button onClick={() => toggleStatus(u.uid, u.status)} className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl">
                                {u.status === 'active' ? 'Bloquear conta' : 'Desbloquear'}
                              </button>
                              <button onClick={() => deleteUser(u.uid)} className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl flex items-center gap-2">
                                <Trash2 size={14}/> Excluir Conta
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* ACTIVITIES TAB */}
      {activeTab === 'activities' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Últimos Eventos na Plataforma</h3>
            <div className="space-y-6">
              {loadingActivities ? (
                <div className="animate-pulse space-y-4">
                  {[1,2,3].map(i => <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded-xl w-full" />)}
                </div>
              ) : activities.length === 0 ? (
                <p className="text-slate-500 text-sm">Nenhuma atividade registrada ainda. Execute o script de triggers no banco se o log estiver vazio.</p>
              ) : activities.map((act) => (
                <div key={act.id} className="flex gap-4 relative">
                  <div className="absolute left-[19px] top-10 bottom-[-24px] w-[2px] bg-slate-100 dark:bg-slate-800 last:hidden" />
                  <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 border-2 border-white dark:border-slate-950 flex items-center justify-center shrink-0 z-10 text-primary">
                    {act.entity_type === 'property' ? <Building2 size={16} /> : act.entity_type === 'tenant' ? <Users size={16} /> : <UserPlus size={16} />}
                  </div>
                  <div className="pt-2 pb-1">
                    <p className="text-sm text-slate-900 dark:text-white font-medium">
                      <span className="text-primary font-bold">{act.profiles?.name || 'Alguém'}</span>{' '}
                      {act.action === 'create' ? 'criou' : act.action}{' '}
                      um {act.entity_type === 'property' ? 'imóvel' : act.entity_type === 'tenant' ? 'inquilino' : 'cadastro'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">{format(new Date(act.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* BROADCAST TAB */}
      {activeTab === 'broadcast' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Enviar Comunicado Global</h3>
            <p className="text-sm text-slate-500 mb-6">Esta mensagem aparecerá como uma notificação para TODOS os proprietários cadastrados.</p>
            
            <form onSubmit={handleBroadcast} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Título do Comunicado</label>
                <input required value={broadcastTitle} onChange={e => setBroadcastTitle(e.target.value)} placeholder="Ex: Nova atualização disponível!" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Mensagem</label>
                <textarea required value={broadcastMsg} onChange={e => setBroadcastMsg(e.target.value)} placeholder="Detalhes do aviso..." rows={4} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary/30 resize-none" />
              </div>
              <button disabled={broadcastLoading} className="w-full py-3 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary-hover disabled:opacity-50 transition-colors">
                {broadcastLoading ? <RefreshCw className="animate-spin" size={20} /> : <Send size={20} />}
                Disparar Comunicado
              </button>
              {broadcastSuccess && <p className="text-emerald-600 text-sm font-medium text-center bg-emerald-50 py-2 rounded-lg mt-4">✓ Enviado com sucesso para todos os usuários!</p>}
            </form>
          </div>
        </motion.div>
      )}

      {/* SETTINGS TAB */}
      {activeTab === 'settings' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Configurações Globais</h3>
            <p className="text-sm text-slate-500 mb-6">Ajuste os valores dos planos para refletir no cálculo de Receita (MRR).</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Preço Plano Professional (R$)</label>
                <input type="number" step="0.01" value={pricing.pro} onChange={e => setPricing({...pricing, pro: parseFloat(e.target.value) || 0})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Preço Plano Premium (R$)</label>
                <input type="number" step="0.01" value={pricing.premium} onChange={e => setPricing({...pricing, premium: parseFloat(e.target.value) || 0})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary/30" />
              </div>
              
              <button disabled={savingPricing} onClick={saveSettings} className="w-full mt-4 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-colors">
                {savingPricing ? <RefreshCw className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                Salvar Configurações
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* RAIO-X MODAL */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto py-10">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto">
              <div className="relative h-24 bg-gradient-to-r from-primary to-secondary">
                <button onClick={() => setSelectedUser(null)} className="absolute top-4 right-4 w-8 h-8 bg-black/20 hover:bg-black/40 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-colors">
                  <X size={18} />
                </button>
              </div>
              <div className="px-6 pb-6 relative">
                <div className="flex justify-between items-start">
                  <div className="w-20 h-20 -mt-10 rounded-2xl bg-white dark:bg-slate-900 p-1.5 shadow-lg mb-4">
                    {selectedUser.photoURL ? (
                      <img src={selectedUser.photoURL} alt={selectedUser.name} className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <div className="w-full h-full bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-2xl font-bold text-primary">
                        {selectedUser.name?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  
                  {/* Botões de Contato Rápido */}
                  <div className="mt-4 flex gap-2">
                    <a href={`mailto:${selectedUser.email}`} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors">
                      <Mail size={16} /> E-mail
                    </a>
                    <a href={`https://wa.me/?text=Olá ${selectedUser.name}, falo do suporte do AlugaFácil.`} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-1.5 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] rounded-lg text-sm font-medium transition-colors">
                      <MessageCircle size={16} /> WhatsApp
                    </a>
                  </div>
                </div>
                
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{selectedUser.name}</h2>
                <p className="text-slate-500 mb-6">{selectedUser.email}</p>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 text-slate-500 mb-2">
                      <Building2 size={16} /> <span className="text-xs font-bold uppercase tracking-wider">Imóveis</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">
                      {userStats.loading ? '...' : userStats.properties}
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 text-slate-500 mb-2">
                      <Users size={16} /> <span className="text-xs font-bold uppercase tracking-wider">Inquilinos</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">
                      {userStats.loading ? '...' : userStats.tenants}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 border-t border-slate-100 dark:border-slate-800 pt-6 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Cadastro:</span>
                    <span className="font-medium text-slate-900 dark:text-white">{selectedUser.createdAt ? format(new Date(selectedUser.createdAt), "dd/MM/yyyy") : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Renovação / Expiração:</span>
                    <span className="font-medium text-slate-900 dark:text-white">
                      {selectedUser.plan === 'basic' 
                        ? 'Plano Gratuito (Vitalício)' 
                        : (selectedUser.createdAt 
                            ? `Todo dia ${new Date(selectedUser.createdAt).getDate()}` 
                            : 'N/A')}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Plano Atual:</span>
                    <span className="font-bold text-primary">{PLAN_LABELS[selectedUser.plan as UserPlan]}</span>
                  </div>
                </div>

                {/* Histórico Individual de Atividades */}
                <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 uppercase tracking-wider flex items-center gap-2">
                    <Activity size={16} /> Histórico Recente do Usuário
                  </h3>
                  
                  <div className="space-y-4 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    {loadingUserActivities ? (
                       <p className="text-sm text-slate-500 animate-pulse">Carregando histórico...</p>
                    ) : userActivities.length === 0 ? (
                       <p className="text-sm text-slate-500">Nenhuma atividade registrada ainda.</p>
                    ) : userActivities.map(act => (
                      <div key={act.id} className="flex gap-3 text-sm">
                        <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-primary shrink-0">
                          {act.entity_type === 'property' ? <Building2 size={14} /> : act.entity_type === 'tenant' ? <Users size={14} /> : <UserPlus size={14} />}
                        </div>
                        <div>
                          <p className="text-slate-900 dark:text-white">
                            {act.action === 'create' ? 'Cadastrou um novo ' : act.action + ' '}
                            <span className="font-semibold">{act.entity_type === 'property' ? 'imóvel' : act.entity_type === 'tenant' ? 'inquilino' : 'item'}</span>
                          </p>
                          <p className="text-xs text-slate-400">{format(new Date(act.created_at), "dd/MM 'às' HH:mm")}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
