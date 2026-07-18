import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { 
  Users, 
  ShieldCheck, 
  TrendingUp, 
  UserPlus, 
  AlertCircle, 
  CheckCircle2,
  Lock,
  Unlock,
  MoreVertical
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { User } from '../types';

export default function Admin() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    monthlyRevenue: 0,
    newToday: 0
  });

  useEffect(() => {
    if (currentUser?.role !== 'admin') return;
    fetchUsers();
  }, [currentUser]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      const userList = (data || []).map(doc => ({ uid: doc.id, email: doc.email, name: doc.name, plan: doc.plan, status: doc.status, role: doc.role, createdAt: doc.created_at } as User));
      setUsers(userList);
      
      setStats({
        totalUsers: userList.length,
        activeUsers: userList.filter(u => u.status === 'active').length,
        monthlyRevenue: userList.length * 99, // Simplified estimation
        newToday: userList.filter(u => {
          const date = u.createdAt ? new Date(u.createdAt) : new Date();
          return date.toDateString() === new Date().toDateString();
        }).length
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleUserStatus = async (uid: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'blocked' : 'active';
    try {
      await supabase.from('profiles').update({ status: newStatus }).eq('id', uid);
      fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
          <ShieldCheck className="text-primary" size={32} /> Painel Administrativo
        </h1>
        <p className="text-slate-500 dark:text-slate-400">Gerenciamento global da plataforma AlugaFácil.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {[
          { label: 'Total Usuários', value: stats.totalUsers, icon: <Users />, color: 'text-primary bg-primary/10' },
          { label: 'Assinaturas Ativas', value: stats.activeUsers, icon: <CheckCircle2 />, color: 'text-secondary bg-secondary/10' },
          { label: 'Receita Est. Mês', value: `R$ ${stats.monthlyRevenue.toLocaleString()}`, icon: <TrendingUp />, color: 'text-accent bg-accent/10' },
          { label: 'Novos Hoje', value: stats.newToday, icon: <UserPlus />, color: 'text-orange-500 bg-orange-500/10' },
        ].map((s, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${s.color}`}>
              {s.icon}
            </div>
            <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">{s.label}</p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{s.value}</h3>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Gerenciar Clientes</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Usuário</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Plano</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Cadastro</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                [1, 2].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-6 py-8"><div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-1/2"></div></td>
                  </tr>
                ))
              ) : users.map((u) => (
                <tr key={u.uid} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-900 dark:text-white">{u.name}</p>
                    <p className="text-sm text-slate-500">{u.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded-full uppercase tracking-wider">
                      {u.plan}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      u.status === 'active' ? 'bg-secondary/10 text-secondary' : 'bg-red-500/10 text-red-500'
                    }`}>
                      {u.status === 'active' ? 'Ativo' : 'Bloqueado'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => toggleUserStatus(u.uid, u.status)}
                        className={`p-2 rounded-lg transition-all ${
                          u.status === 'active' ? 'text-red-500 bg-red-50 dark:bg-red-900/10' : 'text-secondary bg-secondary/10'
                        }`}
                      >
                        {u.status === 'active' ? <Lock size={18} /> : <Unlock size={18} />}
                      </button>
                      <button className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-lg hover:bg-slate-200">
                        <MoreVertical size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
