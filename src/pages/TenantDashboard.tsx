import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { LogOut, Home, User, FileSignature, DollarSign, Wrench, MessageCircle, Folder, Menu, X, Bell } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

// Sub-components
import TenantHome from '../components/tenant-portal/TenantHome';
import TenantProfile from '../components/tenant-portal/TenantProfile';
import TenantContract from '../components/tenant-portal/TenantContract';
import TenantPayments from '../components/tenant-portal/TenantPayments';
import TenantDocuments from '../components/tenant-portal/TenantDocuments';
import TenantMaintenance from '../components/tenant-portal/TenantMaintenance';
import TenantChatWidget from '../components/TenantChatWidget';

type TabType = 'home' | 'profile' | 'contract' | 'payments' | 'maintenance' | 'documents' | 'messages';

const NAV_ITEMS = [
  { id: 'home', label: 'Início', icon: Home },
  { id: 'payments', label: 'Pagamentos', icon: DollarSign },
  { id: 'contract', label: 'Meu Contrato', icon: FileSignature },
  { id: 'documents', label: 'Documentos', icon: Folder },
  { id: 'maintenance', label: 'Manutenção', icon: Wrench },
  { id: 'messages', label: 'Mensagens', icon: MessageCircle },
  { id: 'profile', label: 'Meu Perfil', icon: User },
];

export default function TenantDashboard() {
  const navigate = useNavigate();
  const [tenant, setTenant] = useState<any>(null);
  const [property, setProperty] = useState<any>(null);
  const [contract, setContract] = useState<any>(null);
  const [ownerProfile, setOwnerProfile] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Layout State
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const session = localStorage.getItem('tenantSession');
    if (!session) {
      navigate('/login');
      return;
    }
    const t = JSON.parse(session);
    setTenant(t);
    fetchData(t);
  }, [navigate]);

  const fetchData = async (t: any = tenant) => {
    if (!t) return;
    try {
      // get property and owner info via secure RPC
      const { data: info } = await supabase.rpc('get_tenant_dashboard_info', {
        p_property_id: t.propertyId,
        p_owner_id: t.ownerId
      });

      if (info?.property) {
        setProperty({
          id: info.property.id,
          ownerId: info.property.owner_id,
          name: info.property.name,
          address: info.property.address,
          type: info.property.type,
          rentValue: info.property.rent_value,
          status: info.property.status,
          groupName: info.property.group_name
        });
      }

      if (info?.owner) {
        setOwnerProfile({
          name: info.owner.name,
          email: info.owner.email,
          photo: info.owner.photo_url || info.owner.photoURL
        });
      }

      // get contract
      const { data: conSnap } = await supabase.from('contracts').select('*').eq('tenant_id', t.id).eq('status', 'active');
      if (conSnap && conSnap.length > 0) {
        const first = conSnap[0];
        setContract({
          id: first.id,
          propertyId: first.property_id,
          tenantId: first.tenant_id,
          ownerId: first.owner_id,
          startDate: first.start_date,
          endDate: first.end_date,
          monthlyValue: first.monthly_value,
          guaranteeValue: first.guarantee_value || 0,
          dueDay: first.due_day,
          status: first.status,
          contractNumber: first.contract_number,
          paymentMethod: first.payment_method,
          pixKey: first.pix_key,
          clauses: first.clauses,
          tenantSignature: first.tenant_signature,
          landlordSignature: first.landlord_signature,
          signatureDate: first.signature_date,
          signatureIP: first.signature_ip,
          validationHash: first.validation_hash,
          createdAt: first.created_at,
          updatedAt: first.updated_at
        });
      } else {
        setContract(null);
      }

      // get payments
      const { data: paySnap } = await supabase.from('payments').select('*').eq('tenant_id', t.id);
      const payList = (paySnap || []).map(p => ({
        id: p.id,
        ownerId: p.owner_id,
        contractId: p.contract_id,
        propertyId: p.property_id,
        tenantId: p.tenant_id,
        amount: p.amount,
        dueDate: p.due_date,
        paidAt: p.paid_at,
        status: p.status,
        receiptUrl: p.receipt_url,
        createdAt: p.created_at,
        updatedAt: p.updated_at
      }));
      payList.sort((a: any, b: any) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
      setPayments(payList);

    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('tenantSession');
    navigate('/login');
  };

  const renderActiveTab = () => {
    if (isLoading) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      );
    }

    switch (activeTab) {
      case 'home':
        return <TenantHome tenant={tenant} property={property} contract={contract} payments={payments} setActiveTab={setActiveTab as any} />;
      case 'profile':
        return <TenantProfile tenant={tenant} property={property} setTenant={setTenant} />;
      case 'payments':
        return <TenantPayments tenant={tenant} contract={contract} property={property} payments={payments} fetchData={fetchData} />;
      case 'contract':
        return <TenantContract contract={contract} tenant={tenant} property={property} ownerProfile={ownerProfile} />;
      case 'documents':
        return <TenantDocuments tenant={tenant} />;
      case 'maintenance':
        return <TenantMaintenance tenant={tenant} property={property} />;
      case 'messages':
        return (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 md:p-8 border border-slate-200 dark:border-slate-800 min-h-[70vh] flex flex-col relative overflow-hidden">
            <div className="mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <MessageCircle className="text-primary" /> Falar com Locador
              </h3>
            </div>
            <div className="flex-1 w-full relative">
              <TenantChatWidget tenant={tenant} ownerInfo={ownerProfile} isEmbedded={true} />
            </div>
          </div>
        );
      default:
        return <TenantHome tenant={tenant} property={property} contract={contract} payments={payments} setActiveTab={setActiveTab as any} />;
    }
  };

  const TopBar = () => (
    <>
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 sticky top-0 z-40 flex justify-between items-center md:hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
            <Home size={20} />
          </div>
          <div>
            <h1 className="font-bold leading-tight">AlugaFácil</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Inquilino</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 text-slate-400 hover:text-primary transition-colors">
            <Bell size={20} />
          </button>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-slate-600 dark:text-slate-300"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden fixed top-[73px] left-0 right-0 bg-white dark:bg-slate-900 z-30 border-b border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden"
          >
            <nav className="p-4 space-y-2 max-h-[70vh] overflow-y-auto">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id as TabType);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${isActive
                      ? 'bg-primary text-white shadow-lg shadow-primary/20'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                      }`}
                  >
                    <Icon size={20} />
                    {item.label}
                  </button>
                );
              })}
              <div className="pt-2 mt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                >
                  <LogOut size={20} />
                  Sair da Conta
                </button>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );

  const SideBar = () => (
    <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 h-screen sticky top-0">
      <div className="p-6 flex items-center gap-3 border-b border-slate-200 dark:border-slate-800">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
          <Home size={20} />
        </div>
        <div>
          <h1 className="font-bold leading-tight">AlugaFácil</h1>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Portal do Inquilino</p>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as TabType)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${isActive
                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              <Icon size={20} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-200 dark:border-slate-800">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
        >
          <LogOut size={20} />
          Sair da Conta
        </button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col md:flex-row">

      <TopBar />
      <SideBar />

      <main className="flex-1 overflow-y-auto">
        {/* Desktop Header */}
        <header className="hidden md:flex justify-end items-center p-6 bg-slate-50 dark:bg-slate-950 sticky top-0 z-10 backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80 border-b border-transparent">
          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-400 hover:text-primary transition-colors bg-white dark:bg-slate-900 rounded-full shadow-sm">
              <Bell size={20} />
            </button>
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-800" />
            <div className="flex items-center gap-3 bg-white dark:bg-slate-900 pl-2 pr-4 py-1.5 rounded-full shadow-sm border border-slate-100 dark:border-slate-800 cursor-pointer" onClick={() => setActiveTab('profile')}>
              {tenant?.residents?.[0]?.photo ? (
                <img src={tenant.residents[0].photo} alt="Avatar" className="w-8 h-8 rounded-full" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-500">
                  {tenant?.residents?.[0]?.name?.charAt(0) || 'U'}
                </div>
              )}
              <span className="text-sm font-bold truncate max-w-[120px]">{tenant?.residents?.[0]?.name || 'Usuário'}</span>
            </div>
          </div>
        </header>

        <div className="p-4 md:p-8 md:max-w-6xl mx-auto pb-32 md:pb-8">
          {/* If location is terminated */}
          {tenant?.status === 'inactive' && activeTab !== 'documents' && activeTab !== 'profile' && activeTab !== 'home' ? (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-3xl p-8 text-center max-w-lg mx-auto mt-10">
              <LogOut size={48} className="mx-auto mb-4 opacity-50" />
              <h2 className="text-2xl font-bold mb-2">Locação Encerrada</h2>
              <p>O seu contrato de locação encontra-se inativo. Você apenas possui acesso de leitura a documentos físicos ou seu histórico passado.</p>
              <button onClick={() => setActiveTab('home')} className="mt-6 px-6 py-2 bg-red-500 text-white font-bold rounded-xl shadow-lg hover:bg-red-600">Voltar ao Início</button>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="min-h-[60vh] flex flex-col"
              >
                {renderActiveTab()}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </main>

      {/* Mobile Bottom Navigation removida a pedido do usuário */}

      {/* Widget Global do Chat - Fica sempre visível exceto na aba mensagens */}
      {tenant && ownerProfile && activeTab !== 'messages' && (
        <TenantChatWidget tenant={tenant} ownerInfo={ownerProfile} />
      )}

    </div>
  );
}
