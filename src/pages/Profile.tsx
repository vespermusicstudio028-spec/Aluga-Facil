import React, { useState } from 'react';
import Layout from '../components/Layout';
import { User, Mail, Shield, Award, Edit2, Phone, Check, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';

export default function Profile() {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSave = async () => {
    if (!user || !name.trim()) return;
    setIsLoading(true);
    try {
      await supabase.from('profiles').update({
        name: name.trim(),
        phone: phone.trim()
      }).eq('id', user.uid);
      setMessage('Perfil atualizado com sucesso! Recarregue a página para ver as alterações.');
      setIsEditing(false);
      setTimeout(() => setMessage(''), 5000);
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage('Erro ao atualizar perfil.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Meu Perfil</h1>
        <p className="text-slate-500 dark:text-slate-400">Visualize e edite as informações da sua conta.</p>
      </div>

      <div className="max-w-3xl space-y-6">
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm relative overflow-hidden">
          {/* Header background */}
          <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-r from-primary/20 to-secondary/20 dark:from-primary/10 dark:to-secondary/10"></div>
          
          <div className="relative pt-12 flex flex-col sm:flex-row items-center sm:items-end gap-6 mb-8">
            {user?.photoURL ? (
              <img 
                src={user.photoURL} 
                alt={user.name} 
                className="w-24 h-24 rounded-full object-cover border-4 border-white dark:border-slate-900 shadow-lg shrink-0" 
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-24 h-24 bg-primary text-white rounded-full flex items-center justify-center text-4xl font-bold border-4 border-white dark:border-slate-900 shadow-lg shrink-0">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
            )}
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{user?.name}</h2>
              <p className="text-slate-500 dark:text-slate-400">{user?.email}</p>
            </div>
            {!isEditing && (
              <button 
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium transition-colors flex items-center gap-2"
              >
                <Edit2 size={16} />
                Editar Perfil
              </button>
            )}
          </div>

          {message && (
            <div className={`p-4 rounded-xl mb-6 ${message.includes('Erro') ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' : 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400'}`}>
              {message}
            </div>
          )}

          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <User size={16} className="text-primary" /> Nome Completo
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none transition-all text-slate-900 dark:text-white"
                  />
                ) : (
                  <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-medium">
                    {user?.name}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Mail size={16} className="text-primary" /> E-mail
                </label>
                <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl text-slate-500 dark:text-slate-400 truncate">
                  {user?.email}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Phone size={16} className="text-primary" /> WhatsApp
                </label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(00) 00000-0000"
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none transition-all text-slate-900 dark:text-white"
                  />
                ) : (
                  <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-medium">
                    {user?.phone || 'Não informado'}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Award size={16} className="text-secondary" /> Plano Atual
                </label>
                <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-medium capitalize flex items-center justify-between">
                  {user?.plan || 'Básico'}
                  <button onClick={() => window.location.href = '/settings'} className="text-xs text-primary hover:underline font-bold">Gerenciar</button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Shield size={16} className="text-accent" /> Nível de Acesso
                </label>
                <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-medium capitalize">
                  {user?.role === 'owner' ? 'Proprietário' : user?.role || 'Usuário'}
                </div>
              </div>
            </div>

            {isEditing && (
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800 mt-6">
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setName(user?.name || '');
                  }}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={isLoading}
                  className="px-6 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isLoading ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
