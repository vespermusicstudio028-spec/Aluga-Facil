import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import {
  Users,
  Plus,
  Search,
  Home,
  Phone,
  Mail,
  ChevronRight,
  UserCheck,
  MoreVertical,
  Trash2,
  Edit2,
  Filter
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Tenant, Property } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import DocumentVault from '../components/DocumentVault';
import TenantRatingPanel from '../components/TenantRatingPanel';

export default function Tenants() {
  const { user } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [properties, setProperties] = useState<Record<string, Property>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [tenantRes, propRes] = await Promise.all([
        supabase.from('tenants').select('*').eq('owner_id', user?.uid),
        supabase.from('properties').select('*').eq('owner_id', user?.uid)
      ]);

      if (tenantRes.error) throw tenantRes.error;
      if (propRes.error) throw propRes.error;

      const propMap: Record<string, Property> = {};
      (propRes.data || []).forEach(p => {
        propMap[p.id] = {
          id: p.id,
          ownerId: p.owner_id,
          name: p.name,
          address: p.address,
          type: p.type,
          rentValue: p.rent_value,
          status: p.status,
          groupName: p.group_name,
          photos: p.photos || [],
          createdAt: p.created_at,
          updatedAt: p.updated_at
        };
      });

      setProperties(propMap);

      setTenants((tenantRes.data || []).map(t => ({
        id: t.id,
        ownerId: t.owner_id,
        propertyId: t.property_id,
        residents: t.residents || [],
        paymentMethod: t.payment_method,
        pixKey: t.pix_key,
        dueDay: t.due_day,
        leaseTerm: t.lease_term,
        startDate: t.start_date,
        endDate: t.end_date,
        signature: t.signature,
        ownerSignature: t.owner_signature,
        contractAccepted: t.contract_accepted,
        contractPdf: t.contract_pdf,
        status: t.status,
        leaveDate: t.leave_date,
        createdAt: t.created_at,
        updatedAt: t.updated_at
      })));
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir '${name}'?`)) return;
    try {
      const { error } = await supabase.from('tenants').delete().eq('id', id);

      if (error) {
        if (error.code === '23503' || error.message.includes('foreign key')) {
          const forceConfirm = confirm(`O inquilino '${name}' não pôde ser excluído pois existem contratos, cobranças ou mensagens vinculadas a ele.\n\nDeseja FORÇAR A EXCLUSÃO? Isso apagará DEFINITIVAMENTE todo o histórico, mensagens, cobranças e contratos deste inquilino. Não há como reverter!`);

          if (forceConfirm) {
            await handleForceDelete(id);
          }
        } else {
          alert('Erro ao excluir inquilino: ' + error.message);
        }
        return;
      }

      fetchData();
    } catch (err: any) {
      console.error('Falha inesperada ao tentar excluir inquilino:', err);
      alert('Ocorreu um erro inesperado ao tentar excluir o inquilino.');
    }
  };

  const handleForceDelete = async (id: string) => {
    setIsLoading(true);
    try {
      // Deep delete to satisfy foreign key constraints:
      await supabase.from('chat_messages').delete().eq('tenant_id', id);
      await supabase.from('tenant_ratings').delete().eq('tenant_id', id);
      await supabase.from('maintenance_tickets').delete().eq('tenant_id', id);
      await supabase.from('documents').delete().eq('tenant_id', id);
      await supabase.from('rental_history').delete().eq('tenant_id', id);
      await supabase.from('events').delete().eq('tenant_id', id);
      await supabase.from('payments').delete().eq('tenant_id', id);
      await supabase.from('contracts').delete().eq('tenant_id', id);

      const { error } = await supabase.from('tenants').delete().eq('id', id);
      if (error) throw error;

      alert('Inquilino e seu histórico foram excluídos com sucesso.');
      fetchData();
    } catch (err: any) {
      console.error('Erro no deep delete:', err);
      alert('Falha ao forçar a exclusão. Detalhes: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTenants = tenants.filter(t => {
    const property = properties[t.propertyId];
    const titular = t.residents.find(r => r.isTitular);

    const matchesSearch = titular?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property?.name.toLowerCase().includes(searchTerm.toLowerCase());

    const effectiveStatus = t.status || 'active';
    const matchesStatus = statusFilter === 'all' || effectiveStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <Layout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Inquilinos</h1>
          <p className="text-slate-500 dark:text-slate-400">Gerencie os moradores dos seus imóveis.</p>
        </div>
        <Link
          to="/tenants/new"
          className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-2xl font-bold hover:bg-opacity-90 transition-all shadow-lg shadow-primary/20"
        >
          <Plus size={20} />
          Novo Inquilino
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por nome ou imóvel..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-primary transition-all dark:text-white"
          />
        </div>
        <div className="relative">
          <button
            onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
            className={`flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold transition-all ${statusFilter !== 'all' ? 'text-primary border-primary ring-2 ring-primary/10' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
          >
            <Filter size={20} />
            {statusFilter === 'all' ? 'Filtros' : statusFilter === 'active' ? 'Ativos' : 'Inativos (Desocupado)'}
          </button>

          <AnimatePresence>
            {isFilterMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsFilterMenuOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-20 overflow-hidden"
                >
                  <button
                    onClick={() => { setStatusFilter('all'); setIsFilterMenuOpen(false); }}
                    className={`w-full px-4 py-3 text-left text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${statusFilter === 'all' ? 'text-primary' : 'text-slate-700 dark:text-slate-300'}`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => { setStatusFilter('active'); setIsFilterMenuOpen(false); }}
                    className={`w-full px-4 py-3 text-left text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${statusFilter === 'active' ? 'text-primary' : 'text-slate-700 dark:text-slate-300'}`}
                  >
                    Ativos
                  </button>
                  <button
                    onClick={() => { setStatusFilter('inactive'); setIsFilterMenuOpen(false); }}
                    className={`w-full px-4 py-3 text-left text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${statusFilter === 'inactive' ? 'text-primary' : 'text-slate-700 dark:text-slate-300'}`}
                  >
                    Inativos (Desocupado)
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-white dark:bg-slate-900 rounded-2xl animate-pulse border border-slate-100 dark:border-slate-800"></div>
          ))}
        </div>
      ) : filteredTenants.length > 0 ? (
        <div className="space-y-4">
          {filteredTenants.map((t) => {
            const property = properties[t.propertyId];
            const titular = t.residents.find(r => r.isTitular);
            return (
              <React.Fragment key={t.id}>
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
                  <div className="p-6 flex flex-col md:flex-row items-center gap-6 relative">
                    <div className="w-16 h-16 bg-secondary/10 rounded-2xl flex items-center justify-center shrink-0">
                      {titular?.photo ? (
                        <img src={titular.photo} className="w-full h-full object-cover rounded-2xl" />
                      ) : (
                        <UserCheck className="text-secondary" size={32} />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white truncate">{titular?.name}</h3>
                      <div className="flex flex-wrap gap-4 mt-1">
                        <span className="flex items-center gap-1 text-slate-500 text-sm"><Home size={14} /> {property?.name || 'Imóvel não encontrado'}</span>
                        <span className="flex items-center gap-1 text-slate-500 text-sm"><Phone size={14} /> {titular?.phone}</span>
                        <span className="flex items-center gap-1 text-slate-500 text-sm"><Users size={14} /> {t.residents.length} morador(es)</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                        <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Status</p>
                        <p className={`text-sm font-bold ${(!t.status || t.status === 'active') ? 'text-secondary' : 'text-red-500'}`}>
                          {(!t.status || t.status === 'active') ? 'Contrato Ativo' : 'Desocupado'}
                        </p>
                      </div>

                      <div className="relative">
                        <button
                          onClick={() => setActiveMenu(activeMenu === t.id ? null : t.id)}
                          className="p-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                        >
                          <MoreVertical size={24} />
                        </button>

                        <AnimatePresence>
                          {activeMenu === t.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setActiveMenu(null)} />
                              <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: -10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: -10 }}
                                className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-20 overflow-hidden"
                              >
                                <Link
                                  to={`/tenants/edit/${t.id}`}
                                  className="w-full px-4 py-3 flex items-center gap-3 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                >
                                  <Edit2 size={16} className="text-primary" /> Editar
                                </Link>
                                <button
                                  onClick={() => { handleDelete(t.id, titular?.name || 'Inquilino'); setActiveMenu(null); }}
                                  className="w-full px-4 py-3 flex items-center gap-3 text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                                >
                                  <Trash2 size={16} /> Excluir
                                </button>
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>

                  {/* Document Vault — expandable per tenant */}
                  <div className="px-6 pb-4">
                    <DocumentVault tenantId={t.id} context="tenant" />
                    <TenantRatingPanel tenantId={t.id} />
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
          <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <Users className="text-slate-400" size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Nenhum inquilino cadastrado</h3>
          <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-sm mx-auto">
            Cadastre um novo inquilino vinculando-o a um dos seus imóveis.
          </p>
          <Link
            to="/tenants/new"
            className="bg-primary text-white px-8 py-3 rounded-2xl font-bold hover:bg-opacity-90 transition-all shadow-lg shadow-primary/20"
          >
            Cadastrar Novo Inquilino
          </Link>
        </div>
      )
      }
    </Layout >
  );
}
