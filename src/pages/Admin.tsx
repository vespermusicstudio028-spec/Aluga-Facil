import React, { useEffect, useState, useCallback } from 'react';
import Layout from '../components/Layout';
import { 
  Users, ShieldCheck, TrendingUp, UserPlus, 
  CheckCircle2, Lock, Unlock, Crown, Search,
  RefreshCw, Building2, CreditCard, AlertTriangle,
  ChevronDown, X, Star
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

export default function Admin() {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [filtered, setFiltered] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState<'all' | UserPlan>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'blocked'>('all');
  const [actionUserId, setActionUserId] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalProperties: 0,
    totalTenants: 0,
  });

  // Guard: only admins
  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin') {
      navigate('/dashboard');
    }
  }, [currentUser, navigate]);

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

      setUsers(userList);
      setStats({
        totalUsers: userList.length,
        activeUsers: userList.filter(u => u.status === 'active').length,
        totalProperties: propCount ?? 0,
        totalTenants: tenantCount ?? 0,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Realtime: escuta mudanças em profiles, properties e tenants
  useEffect(() => {
    if (currentUser?.role !== 'admin') return;

    const channel = supabase
      .channel('admin_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'properties' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tenants' }, () => fetchData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUser, fetchData]);

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

  const toggleStatus = async (uid: string, current: string) => {
    const next = current === 'active' ? 'blocked' : 'active';
    await supabase.from('profiles').update({ status: next }).eq('id', uid);
    setUsers(prev => prev.map(u => u.uid === uid ? { ...u, status: next as any } : u));
    setActionUserId(null);
  };

  const changePlan = async (uid: string, plan: UserPlan) => {
    await supabase.from('profiles').update({ plan }).eq('id', uid);
    setUsers(prev => prev.map(u => u.uid === uid ? { ...u, plan } : u));
    setActionUserId(null);
  };

  const toggleRole = async (uid: string, current: string) => {
    if (current === 'admin') return; // can't demote admin via UI
    const next = current === 'owner' ? 'admin' : 'owner';
    await supabase.from('profiles').update({ role: next }).eq('id', uid);
    setUsers(prev => prev.map(u => u.uid === uid ? { ...u, role: next as any } : u));
    setActionUserId(null);
  };

  if (currentUser?.role !== 'admin') {
    return null;
  }

  const statCards = [
    { label: 'Total de Usuários', value: stats.totalUsers, icon: <Users size={22} />, color: 'from-blue-500 to-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Usuários Ativos', value: stats.activeUsers, icon: <CheckCircle2 size={22} />, color: 'from-emerald-500 to-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    { label: 'Total de Imóveis', value: stats.totalProperties, icon: <Building2 size={22} />, color: 'from-violet-500 to-violet-600', bg: 'bg-violet-50 dark:bg-violet-900/20' },
    { label: 'Total de Inquilinos', value: stats.totalTenants, icon: <CreditCard size={22} />, color: 'from-orange-500 to-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20' },
  ];

  return (
    <Layout>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg">
              <ShieldCheck className="text-white" size={20} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Painel Administrativo</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm ml-13 pl-1">Gerenciamento global da plataforma AlugaFácil</p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all text-sm font-medium shadow-sm"
        >
          <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm"
          >
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
              <div className={`bg-gradient-to-br ${s.color} bg-clip-text text-transparent`}>
                {s.icon}
              </div>
            </div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{s.label}</p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">
              {isLoading ? <span className="inline-block w-8 h-6 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" /> : s.value}
            </h3>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 mb-4 flex flex-wrap gap-3 items-center shadow-sm">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome ou email..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          )}
        </div>
        {/* Plan filter */}
        <select
          value={planFilter}
          onChange={e => setPlanFilter(e.target.value as any)}
          className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="all">Todos os planos</option>
          <option value="basic">Basic</option>
          <option value="professional">Professional</option>
          <option value="premium">Premium</option>
        </select>
        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as any)}
          className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="all">Todos os status</option>
          <option value="active">Ativos</option>
          <option value="blocked">Bloqueados</option>
        </select>
        <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
          {filtered.length} usuário{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Usuário</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Plano</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Perfil</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Cadastro</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {[...Array(6)].map((_, j) => (
                      <td key={j} className="px-6 py-4">
                        <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-lg w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <AlertTriangle className="mx-auto mb-2 text-slate-300 dark:text-slate-600" size={32} />
                    <p className="text-slate-400 font-medium">Nenhum usuário encontrado</p>
                  </td>
                </tr>
              ) : filtered.map((u) => (
                <motion.tr
                  key={u.uid}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  {/* User */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {u.photoURL ? (
                        <img src={u.photoURL} alt={u.name} referrerPolicy="no-referrer" className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                          {u.name?.charAt(0)?.toUpperCase() ?? '?'}
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white text-sm">{u.name}</p>
                        <p className="text-xs text-slate-400 truncate max-w-[180px]">{u.email}</p>
                      </div>
                    </div>
                  </td>

                  {/* Plan */}
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider ${PLAN_COLORS[u.plan as UserPlan] || PLAN_COLORS.basic}`}>
                      {u.plan === 'premium' && <Star size={10} className="inline mr-1" />}
                      {PLAN_LABELS[u.plan as UserPlan] ?? u.plan}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider ${
                      u.status === 'active'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${u.status === 'active' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      {u.status === 'active' ? 'Ativo' : 'Bloqueado'}
                    </span>
                  </td>

                  {/* Role */}
                  <td className="px-6 py-4">
                    {u.role === 'admin' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-primary/10 text-primary">
                        <Crown size={11} /> Admin
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 font-medium">Proprietário</span>
                    )}
                  </td>

                  {/* Created At */}
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {u.createdAt ? format(new Date(u.createdAt), "dd/MM/yyyy", { locale: ptBR }) : 'N/A'}
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 text-right">
                    <div className="relative inline-block">
                      <button
                        onClick={() => setActionUserId(actionUserId === u.uid ? null : u.uid)}
                        className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                      >
                        <ChevronDown size={16} />
                      </button>
                      <AnimatePresence>
                        {actionUserId === u.uid && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -5 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -5 }}
                            transition={{ duration: 0.12 }}
                            className="absolute right-0 top-10 z-50 w-52 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden"
                          >
                            <div className="p-2">
                              <p className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Alterar Plano</p>
                              {(['basic', 'professional', 'premium'] as UserPlan[]).map(plan => (
                                <button
                                  key={plan}
                                  onClick={() => changePlan(u.uid, plan)}
                                  className={`w-full text-left px-3 py-2 text-sm rounded-xl transition-colors ${
                                    u.plan === plan
                                      ? 'bg-primary/10 text-primary font-semibold'
                                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                  }`}
                                >
                                  {plan === 'premium' && '⭐ '}{PLAN_LABELS[plan]}
                                  {u.plan === plan && ' ✓'}
                                </button>
                              ))}
                            </div>
                            <div className="border-t border-slate-100 dark:border-slate-800 p-2">
                              <p className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Conta</p>
                              {u.email !== 'alugafacilhome@gmail.com' && (
                                <button
                                  onClick={() => toggleStatus(u.uid, u.status)}
                                  className={`w-full text-left flex items-center gap-2 px-3 py-2 text-sm rounded-xl transition-colors ${
                                    u.status === 'active'
                                      ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10'
                                      : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/10'
                                  }`}
                                >
                                  {u.status === 'active' ? <Lock size={14} /> : <Unlock size={14} />}
                                  {u.status === 'active' ? 'Bloquear conta' : 'Desbloquear conta'}
                                </button>
                              )}
                              {u.role !== 'admin' && (
                                <button
                                  onClick={() => toggleRole(u.uid, u.role)}
                                  className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-primary hover:bg-primary/5 rounded-xl transition-colors"
                                >
                                  <Crown size={14} /> Tornar Admin
                                </button>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
