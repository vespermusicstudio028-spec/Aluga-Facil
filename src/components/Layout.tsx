import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Logo from './Logo';
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  FileText, 
  CreditCard, 
  Receipt, 
  BarChart3, 
  User, 
  Settings, 
  LogOut, 
  ShieldCheck,
  Menu, 
  X, 
  Sun, 
  Moon,
  Bell,
  Check,
  MessageSquare,
  Users as UsersIcon
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { Notification } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [chatUnread, setChatUnread] = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;

    // Initial fetch
    const fetchNotifications = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.uid)
        .order('created_at', { ascending: false });
      setNotifications((data || []).map(n => ({
        id: n.id,
        userId: n.user_id,
        title: n.title,
        message: n.message,
        read: n.read,
        createdAt: n.created_at
      } as Notification)));
    };
    fetchNotifications();

    // Real-time updates via Supabase Realtime
    const channel = supabase
      .channel('notifications_' + user.uid)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.uid}`
      }, () => fetchNotifications())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Conta mensagens não lidas de todos os inquilinos
  useEffect(() => {
    if (!user || location.pathname === '/chat') return;

    const fetchChatUnread = async () => {
      try {
        // Query direta na tabela chat_messages — mais rápido que chamar RPC por tenant
        const { data, error } = await supabase
          .from('chat_messages')
          .select('id')
          .eq('owner_id', user.uid)
          .eq('sender_role', 'tenant')
          .eq('read_by_owner', false);

        if (error) throw error;
        setChatUnread(data?.length ?? 0);
      } catch {}
    };

    fetchChatUnread();

    // Polling de fallback a cada 60s
    const interval = setInterval(fetchChatUnread, 60000);

    // Real-time: escuta INSERT e UPDATE na tabela CORRETA (chat_messages)
    const channel = supabase
      .channel('chat_unread_' + user.uid)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `owner_id=eq.${user.uid}`
      }, () => fetchChatUnread())
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'chat_messages',
        filter: `owner_id=eq.${user.uid}`
      }, () => fetchChatUnread())
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [user, location.pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await supabase.from('notifications').update({ read: true }).eq('id', notificationId);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const menuItems = [
    { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/dashboard' },
    { icon: <Building2 size={20} />, label: 'Imóveis', path: '/properties' },
    { icon: <Users size={20} />, label: 'Inquilinos', path: '/tenants' },
    { icon: <MessageSquare size={20} />, label: 'Chat', path: '/chat' },
    { icon: <FileText size={20} />, label: 'Contratos', path: '/contracts' },
    { icon: <CreditCard size={20} />, label: 'Pagamentos', path: '/payments' },
    { icon: <Receipt size={20} />, label: 'Comprovantes', path: '/receipts' },
    { icon: <BarChart3 size={20} />, label: 'Relatórios', path: '/reports' },
  ];

  const secondaryItems = [
    { icon: <User size={20} />, label: 'Perfil', path: '/profile' },
    { icon: <Settings size={20} />, label: 'Configurações', path: '/settings' },
  ];

  if (user?.role === 'admin') {
    menuItems.push({ icon: <ShieldCheck size={20} />, label: 'Admin', path: '/admin' } as any);
  }

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
        <div className="p-6 flex items-center gap-2">
          <Logo className="h-10" />
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 mt-4">Menu Principal</p>
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all ${
                location.pathname === item.path
                  ? 'bg-primary text-white shadow-lg shadow-primary/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {item.icon}
              <span className="font-medium flex-1">{item.label}</span>
              {item.path === '/chat' && chatUnread > 0 && (
                <span className="bg-red-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                  {chatUnread > 9 ? '9+' : chatUnread}
                </span>
              )}
            </Link>
          ))}

          <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 mt-8">Preferências</p>
          {secondaryItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all ${
                location.pathname === item.path
                  ? 'bg-primary text-white shadow-lg shadow-primary/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {item.icon}
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-colors font-medium"
          >
            <LogOut size={20} />
            Sair da conta
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-72 bg-white dark:bg-slate-900 z-50 lg:hidden flex flex-col shadow-2xl"
            >
              <div className="p-6 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Logo className="h-8" />
                </div>
                <button onClick={() => setIsSidebarOpen(false)} className="text-slate-500"><X size={24} /></button>
              </div>
              <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
                {menuItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${
                      location.pathname === item.path
                        ? 'bg-primary text-white'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {item.icon}
                    <span className="font-medium text-lg flex-1">{item.label}</span>
                    {item.path === '/chat' && chatUnread > 0 && (
                      <span className="bg-red-500 text-white text-[12px] font-bold px-2.5 py-0.5 rounded-full shadow-sm animate-pulse">
                        {chatUnread > 9 ? '9+' : chatUnread}
                      </span>
                    )}
                  </Link>
                ))}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              <Menu size={24} />
            </button>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white hidden sm:block">
              {menuItems.find(item => item.path === location.pathname)?.label || secondaryItems.find(item => item.path === location.pathname)?.label || (location.pathname === '/chat' ? 'Chat' : 'Bem-vindo')}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            
            {/* Notifications Dropdown */}
            <div className="relative" ref={notifRef}>
              <button 
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors relative"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
                )}
              </button>
              
              <AnimatePresence>
                {isNotifOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden"
                  >
                    <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <h3 className="font-bold text-slate-900 dark:text-white">Notificações</h3>
                      {unreadCount > 0 && (
                        <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded-lg">
                          {unreadCount} novas
                        </span>
                      )}
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-slate-500 text-sm">
                          Nenhuma notificação no momento.
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <div 
                            key={notif.id} 
                            onClick={() => {
                              if (!notif.read) handleMarkAsRead(notif.id);
                            }}
                            className={`p-4 border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors ${!notif.read ? 'bg-primary/5 dark:bg-primary/5' : ''}`}
                          >
                            <div className="flex gap-3">
                              <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${!notif.read ? 'bg-primary' : 'bg-transparent'}`} />
                              <div>
                                <h4 className={`text-sm ${!notif.read ? 'font-bold text-slate-900 dark:text-white' : 'font-medium text-slate-700 dark:text-slate-300'}`}>
                                  {notif.title}
                                </h4>
                                <p className="text-sm text-slate-500 mt-1 line-clamp-2">{notif.message}</p>
                                <span className="text-xs text-slate-400 mt-2 block">
                                  {notif.createdAt ? format(new Date(notif.createdAt), "d 'de' MMM 'às' HH:mm", { locale: ptBR }) : ''}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 mx-1"></div>
            
            {/* Profile Dropdown */}
            <div className="relative" ref={profileRef}>
              <div 
                className="flex items-center gap-3 cursor-pointer select-none"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
              >
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold text-slate-900 dark:text-white leading-none">{user?.name}</p>
                  <p className="text-xs text-slate-500 mt-1 capitalize">{user?.plan} Plan</p>
                </div>
                {user?.photoURL ? (
                  <img src={user.photoURL} alt={user.name} className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-800" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-10 h-10 bg-secondary/20 text-secondary rounded-full flex items-center justify-center font-bold hover:bg-secondary/30 transition-colors">
                    {user?.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              <AnimatePresence>
                {isProfileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden"
                  >
                    <div className="p-4 border-b border-slate-200 dark:border-slate-800 sm:hidden">
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{user?.name}</p>
                      <p className="text-xs text-slate-500 mt-1 truncate">{user?.email}</p>
                    </div>
                    <div className="p-2">
                      <Link 
                        to="/profile" 
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center gap-3 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                      >
                        <User size={16} />
                        Meu Perfil
                      </Link>
                      <Link 
                        to="/settings" 
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center gap-3 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                      >
                        <Settings size={16} />
                        Configurações
                      </Link>
                    </div>
                    <div className="p-2 border-t border-slate-200 dark:border-slate-800">
                      <button 
                        onClick={() => {
                          setIsProfileOpen(false);
                          handleLogout();
                        }}
                        className="flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-colors w-full text-left"
                      >
                        <LogOut size={16} />
                        Sair da conta
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Scrollable Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Botão Flutuante de Inquilinos */}
      {location.pathname !== '/tenants' && (
        <Link
          to="/tenants"
          className="fixed bottom-24 right-6 z-40 w-14 h-14 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform group"
        >
          <UsersIcon size={26} />
          <span className="absolute right-16 bg-slate-800 text-white text-xs font-medium px-2.5 py-1 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
            Inquilinos
          </span>
        </Link>
      )}

      {/* Botão Flutuante de Chat para o Proprietário */}
      {location.pathname !== '/chat' && (
      <Link 
          to="/chat"
          className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform group"
        >
          <div className="relative flex items-center justify-center w-full h-full">
            <MessageSquare size={26} />
            {chatUnread > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[11px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white shadow">
                {chatUnread > 9 ? '9+' : chatUnread}
              </span>
            )}
          </div>
          <span className="absolute right-16 bg-slate-800 text-white text-xs font-medium px-2.5 py-1 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
            Chat
          </span>
        </Link>
      )}
    </div>
  );
}
