import React from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import {
  User,
  Bell,
  CreditCard,
  Moon,
  Crown,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

export default function Settings() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  // Detecta se o usuário entrou via Google (não tem senha, logo esconde "Alterar Senha")
  const isGoogleUser = !!(user?.photoURL?.includes('googleusercontent') || user?.photoURL?.includes('google'));

  // Formata a data de expiração do plano
  const planExpires = (user as any)?.plan_expires_at
    ? new Date((user as any).plan_expires_at).toLocaleDateString('pt-BR')
    : null;

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Configurações</h1>
        <p className="text-slate-500 dark:text-slate-400">Gerencie sua conta e preferências do sistema.</p>
      </div>

      <div className="max-w-3xl space-y-6">
        {/* Profile Section */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
          <div className="flex items-center gap-6 mb-8">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.name}
                className="w-20 h-20 rounded-full object-cover border-2 border-primary/20 shadow"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center text-3xl font-bold">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
            )}
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">{user?.name || 'Usuário'}</h3>
              <p className="text-slate-500">{user?.email}</p>
            </div>
          </div>
          <div className={`grid grid-cols-1 ${!isGoogleUser ? 'sm:grid-cols-2' : ''} gap-4`}>
            <button
              onClick={() => navigate('/profile')}
              className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors group"
            >
              <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300 font-bold">
                <User size={20} className="text-primary" /> Editar Perfil
              </div>
              <ChevronRight size={18} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
            </button>
            {!isGoogleUser && (
              <button className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors group">
                <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300 font-bold">
                  <Crown size={20} className="text-primary" /> Alterar Senha
                </div>
                <ChevronRight size={18} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
              </button>
            )}
          </div>
        </div>

        {/* Preferences */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Preferências</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
              <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300 font-bold">
                <Moon size={20} className="text-primary" /> Modo Escuro
              </div>
              <button
                onClick={toggleTheme}
                className={`w-14 h-8 rounded-full transition-all relative ${theme === 'dark' ? 'bg-primary' : 'bg-slate-300'}`}
              >
                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${theme === 'dark' ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
              <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300 font-bold">
                <Bell size={20} className="text-primary" /> Notificações Push
              </div>
              <button className="w-14 h-8 bg-primary rounded-full relative">
                <div className="absolute top-1 left-7 w-6 h-6 bg-white rounded-full" />
              </button>
            </div>
          </div>
        </div>

        {/* Subscription */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Assinatura</h3>
            <span className="px-4 py-1 bg-secondary/10 text-secondary rounded-full text-xs font-bold uppercase tracking-widest">
              Ativa
            </span>
          </div>
          <div className="p-6 bg-primary/5 border border-primary/10 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary text-white rounded-xl flex items-center justify-center">
                <CreditCard size={24} />
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-white capitalize">Plano {user?.plan || 'Basic'}</p>
                {planExpires && (
                  <p className="text-sm text-slate-500 italic">Válido até {planExpires}</p>
                )}
              </div>
            </div>
            <button
              onClick={() => navigate('/plan')}
              className="bg-primary text-white px-6 py-2 rounded-xl font-bold hover:bg-opacity-90 transition-all shadow-lg shadow-primary/20"
            >
              Gerenciar Plano
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
