import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import {
  Users,
  Plus,
  Search,
  Home,
  Phone,
  UserCheck,
  MoreVertical,
  Trash2,
  Edit2,
  Filter,
  LogOut,
  ChevronDown,
  ChevronUp,
  Clock,
  MapPin,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Tenant, Property, TenantStatus } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import DocumentVault from '../components/DocumentVault';
import TenantRatingPanel from '../components/TenantRatingPanel';
import { TenantStatusBadge } from '../components/StatusBadge';

type FilterOption = 'all' | 'ativo' | 'sem_imovel' | 'ex_inquilino' | 'bloqueado';

const FILTER_LABELS: Record<FilterOption, string> = {
  all: 'Todos',
  ativo: '🟢 Locação Ativa',
  sem_imovel: '⚪ Sem Imóvel',
  ex_inquilino: '🔵 Ex-Inquilinos',
  bloqueado: '🔴 Bloqueados',
};

interface TerminationRecord {
  id: string;
  termination_reason: string;
  termination_type: string;
  ended_at: string;
  property_id: string;
  observations?: string;
  propertyName?: string;
}

interface RentalHistoryRecord {
  id: string;
  property_id: string;
  start_date: string;
  leave_date?: string;
  reason?: string;
  notes?: string;
  propertyName?: string;
}

interface TenantHistoryData {
  terminations: TerminationRecord[];
  rentals: RentalHistoryRecord[];
}

export default function Tenants() {
  const { user } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [properties, setProperties] = useState<Record<string, Property>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<FilterOption>('all');
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null);
  const [tenantHistories, setTenantHistories] = useState<Record<string, TenantHistoryData>>({});
  const [confirmAction, setConfirmAction] = useState<{
    type: 'deactivate' | 'delete' | 'forceDelete';
    tenantId: string;
    tenantName: string;
  } | null>(null);

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
        tenantStatus: t.tenant_status as TenantStatus || undefined,
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

  const fetchTenantHistory = async (tenantId: string, forceOpen = false) => {
    // Se já foi carregado, só faz toggle (ou força abertura se vier do menu)
    if (tenantHistories[tenantId]) {
      if (forceOpen) {
        setExpandedHistory(tenantId);
      } else {
        setExpandedHistory(expandedHistory === tenantId ? null : tenantId);
      }
      return;
    }

    try {
      const [terminationRes, rentalRes] = await Promise.all([
        supabase
          .from('termination_history')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('ended_at', { ascending: false }),
        supabase
          .from('rental_history')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('start_date', { ascending: false }),
      ]);

      const terminations: TerminationRecord[] = (terminationRes.data || []).map(h => ({
        ...h,
        propertyName: properties[h.property_id]?.name || 'Imóvel removido',
      }));

      const rentals: RentalHistoryRecord[] = (rentalRes.data || []).map(r => ({
        ...r,
        propertyName: properties[r.property_id]?.name || 'Imóvel removido',
      }));

      const historyData: TenantHistoryData = { terminations, rentals };
      setTenantHistories(prev => ({ ...prev, [tenantId]: historyData }));
      setExpandedHistory(tenantId); // sempre abre ao buscar
    } catch (err) {
      console.error('Erro ao buscar histórico:', err);
    }
  };

  const handleDelete = (id: string, name: string) => {
    setConfirmAction({ type: 'delete', tenantId: id, tenantName: name });
  };

  const handleDeactivate = (id: string, name: string) => {
    setConfirmAction({ type: 'deactivate', tenantId: id, tenantName: name });
  };

  const executeConfirmAction = async () => {
    if (!confirmAction) return;
    const { type, tenantId, tenantName } = confirmAction;

    if (type === 'deactivate') {
      try {
        setIsLoading(true);
        // Atualiza apenas property_id (coluna original no schema cache).
        // O trigger fn_auto_set_tenant_status no banco cuida de setar tenant_status = 'ex_inquilino' automaticamente.
        const { error } = await supabase
          .from('tenants')
          .update({ property_id: null })
          .eq('id', tenantId);
        if (error) throw error;

        alert('Inquilino inativado com sucesso!');
        fetchData();
        setConfirmAction(null);
      } catch (err: any) {
        alert('Erro ao inativar: ' + err.message);
      } finally {
        setIsLoading(false);
      }
    } else if (type === 'delete') {
      try {
        setIsLoading(true);
        const { error } = await supabase.from('tenants').delete().eq('id', tenantId);

        if (error) {
          if (error.code === '23503' || error.message.includes('foreign key')) {
            setConfirmAction({ type: 'forceDelete', tenantId, tenantName });
          } else {
            alert('Erro ao excluir inquilino: ' + error.message);
            setConfirmAction(null);
          }
          return;
        }

        fetchData();
        setConfirmAction(null);
      } catch (err: any) {
        console.error('Erro ao excluir:', err);
        alert('Ocorreu um erro inesperado ao excluir o inquilino.');
        setConfirmAction(null);
      } finally {
        setIsLoading(false);
      }
    } else if (type === 'forceDelete') {
      setIsLoading(true);
      try {
        await supabase.from('termination_history').delete().eq('tenant_id', tenantId);
        await supabase.from('chat_messages').delete().eq('tenant_id', tenantId);
        await supabase.from('tenant_ratings').delete().eq('tenant_id', tenantId);
        await supabase.from('maintenance_tickets').delete().eq('tenant_id', tenantId);
        await supabase.from('documents').delete().eq('tenant_id', tenantId);
        await supabase.from('rental_history').delete().eq('tenant_id', tenantId);
        await supabase.from('events').delete().eq('tenant_id', tenantId);
        await supabase.from('payments').delete().eq('tenant_id', tenantId);
        await supabase.from('contracts').delete().eq('tenant_id', tenantId);
        const { error } = await supabase.from('tenants').delete().eq('id', tenantId);
        if (error) throw error;
        alert('Inquilino e seu histórico foram excluídos com sucesso.');
        fetchData();
        setConfirmAction(null);
      } catch (err: any) {
        console.error('Erro no deep delete:', err);
        alert('Falha ao forçar a exclusão. Detalhes: ' + err.message);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const getEffectiveTenantStatus = (t: Tenant): TenantStatus => {
    if (t.tenantStatus) return t.tenantStatus;
    if (t.status === 'inactive') return 'ex_inquilino';
    if (t.propertyId) return 'ativo';
    return 'sem_imovel';
  };

  const filteredTenants = tenants.filter(t => {
    const property = properties[t.propertyId];
    const titular = t.residents.find(r => r.isTitular);
    const matchesSearch =
      (titular?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (property?.name || '').toLowerCase().includes(searchTerm.toLowerCase());

    const effectiveStatus = getEffectiveTenantStatus(t);
    const matchesStatus = statusFilter === 'all' || effectiveStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try { return new Date(dateStr).toLocaleDateString('pt-BR'); }
    catch { return dateStr; }
  };

  const getTypeLabel = (type: string) =>
    type === 'rescindido' ? '🔴 Rescisão' : '⚫ Encerrado';

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
            className={`flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold transition-all ${statusFilter !== 'all' ? 'text-primary border-primary ring-2 ring-primary/10' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
          >
            <Filter size={20} />
            {FILTER_LABELS[statusFilter]}
          </button>

          <AnimatePresence>
            {isFilterMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsFilterMenuOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  className="absolute right-0 mt-2 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-20 overflow-hidden"
                >
                  {(Object.entries(FILTER_LABELS) as [FilterOption, string][]).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => { setStatusFilter(key); setIsFilterMenuOpen(false); }}
                      className={`w-full px-4 py-3 text-left text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${statusFilter === key ? 'text-primary' : 'text-slate-700 dark:text-slate-300'}`}
                    >
                      {label}
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-white dark:bg-slate-900 rounded-2xl animate-pulse border border-slate-100 dark:border-slate-800" />
          ))}
        </div>
      ) : filteredTenants.length > 0 ? (
        <div className="space-y-4">
          {filteredTenants.map((t) => {
            const property = properties[t.propertyId];
            const titular = t.residents.find(r => r.isTitular);
            const effectiveStatus = getEffectiveTenantStatus(t);
            const history = tenantHistories[t.id];
            const isHistoryOpen = expandedHistory === t.id;

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
                        <span className="flex items-center gap-1 text-slate-500 text-sm">
                          <Home size={14} /> {property?.name || 'Sem imóvel vinculado'}
                        </span>
                        {titular?.phone && (
                          <span className="flex items-center gap-1 text-slate-500 text-sm">
                            <Phone size={14} /> {titular.phone}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-slate-500 text-sm">
                          <Users size={14} /> {t.residents.length} morador(es)
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                        <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Status</p>
                        <TenantStatusBadge
                          tenantStatus={effectiveStatus}
                          legacyStatus={t.status}
                          hasProperty={!!t.propertyId}
                        />
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
                                className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-20 overflow-hidden"
                              >
                                <Link
                                  to={`/tenants/edit/${t.id}`}
                                  className="w-full px-4 py-3 flex items-center gap-3 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                >
                                  <Edit2 size={16} className="text-primary" /> Editar
                                </Link>
                                <button
                                  onClick={() => { setActiveMenu(null); fetchTenantHistory(t.id, true); }}
                                  className="w-full px-4 py-3 flex items-center gap-3 text-sm font-bold text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors"
                                >
                                  <Clock size={16} /> Ver Histórico
                                </button>
                                {effectiveStatus === 'ativo' && (
                                  <button
                                    onClick={() => { handleDeactivate(t.id, titular?.name || 'Inquilino'); setActiveMenu(null); }}
                                    className="w-full px-4 py-3 flex items-center gap-3 text-sm font-bold text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-colors"
                                  >
                                    <LogOut size={16} /> Marcar como Inativo
                                  </button>
                                )}
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

                  {/* History Timeline (accordion) */}
                  <AnimatePresence>
                    {isHistoryOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div className="px-6 pb-6 border-t border-slate-100 dark:border-slate-800 pt-4">
                          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 mb-4">
                            <Clock size={16} className="text-blue-500" /> Histórico de Locações
                          </h4>

                          {/* Caso os dados ainda não tenham sido carregados */}
                          {!tenantHistories[t.id] ? (
                            <div className="flex items-center gap-2 text-sm text-slate-400">
                              <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                              Carregando histórico...
                            </div>
                          ) : (
                            (() => {
                              const hist = tenantHistories[t.id];
                              const hasTerminations = hist.terminations.length > 0;
                              const hasRentals = hist.rentals.length > 0;

                              if (!hasTerminations && !hasRentals) {
                                return (
                                  <div className="text-center py-6">
                                    <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                                      <Clock size={20} className="text-slate-400" />
                                    </div>
                                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Sem histórico registrado</p>
                                    <p className="text-xs text-slate-400 mt-1">Nenhuma locação anterior encontrada para este inquilino.</p>
                                  </div>
                                );
                              }

                              return (
                                <div className="relative">
                                  <div className="absolute left-3 top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-700" />
                                  <div className="space-y-4 pl-8">
                                    {/* Registros de rental_history */}
                                    {hist.rentals.map((r) => (
                                      <div key={r.id} className="relative">
                                        <div className="absolute -left-5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 bg-green-500 top-1" />
                                        <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4">
                                          <div className="flex items-start justify-between gap-2 mb-2">
                                            <div className="flex items-center gap-2">
                                              <MapPin size={14} className="text-slate-400 flex-shrink-0 mt-0.5" />
                                              <span className="font-bold text-slate-800 dark:text-white text-sm">{r.propertyName}</span>
                                            </div>
                                            <span className="text-xs font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full">📋 Locação</span>
                                          </div>
                                          <p className="text-xs text-slate-500 mb-1">
                                            <span className="font-semibold">Início:</span> {formatDate(r.start_date)}
                                            {r.leave_date && <span> &nbsp;→&nbsp; <span className="font-semibold">Saída:</span> {formatDate(r.leave_date)}</span>}
                                          </p>
                                          {r.reason && (
                                            <p className="text-xs text-slate-500 mb-1"><span className="font-semibold">Motivo:</span> {r.reason}</p>
                                          )}
                                          {r.notes && (
                                            <p className="text-xs text-slate-400 italic mt-1">{r.notes}</p>
                                          )}
                                        </div>
                                      </div>
                                    ))}

                                    {/* Registros de termination_history */}
                                    {hist.terminations.map((h) => (
                                      <div key={h.id} className="relative">
                                        <div className="absolute -left-5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 bg-blue-500 top-1" />
                                        <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4">
                                          <div className="flex items-start justify-between gap-2 mb-2">
                                            <div className="flex items-center gap-2">
                                              <MapPin size={14} className="text-slate-400 flex-shrink-0 mt-0.5" />
                                              <span className="font-bold text-slate-800 dark:text-white text-sm">{h.propertyName}</span>
                                            </div>
                                            <span className="text-xs font-bold text-slate-500 flex-shrink-0">{getTypeLabel(h.termination_type)}</span>
                                          </div>
                                          <p className="text-xs text-slate-500 mb-1">
                                            <span className="font-semibold">Encerrado em:</span> {formatDate(h.ended_at)}
                                          </p>
                                          <p className="text-xs text-slate-500 mb-1">
                                            <span className="font-semibold">Motivo:</span> {h.termination_reason}
                                          </p>
                                          {h.observations && (
                                            <p className="text-xs text-slate-400 italic mt-1">{h.observations}</p>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })()
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* History toggle button - visível para todos os inquilinos */}
                  <button
                    onClick={() => fetchTenantHistory(t.id)}
                    className="w-full px-6 py-3 border-t border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-500 hover:text-primary flex items-center justify-center gap-1 transition-colors"
                  >
                    {isHistoryOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    {isHistoryOpen ? 'Ocultar Histórico' : 'Ver Histórico de Locações'}
                  </button>

                  {/* Document Vault */}
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
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Nenhum inquilino encontrado</h3>
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
      )}

      {/* Modern Confirm Modal Overlay */}
      <AnimatePresence>
        {confirmAction && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmAction(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 relative z-10 shadow-xl border border-slate-200 dark:border-slate-800"
            >
              <div className={`flex items-center justify-center w-16 h-16 rounded-full mx-auto mb-4 
                ${confirmAction.type === 'deactivate' ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-500' : 'bg-red-100 dark:bg-red-900/40 text-red-500'}`}>
                <AlertCircle size={32} />
              </div>
              <h3 className="text-xl font-bold text-center text-slate-900 dark:text-white mb-2">
                {confirmAction.type === 'deactivate' ? 'Marcar como Inativo' : confirmAction.type === 'delete' ? 'Excluir Inquilino' : 'Forçar Exclusão'}
              </h3>
              <p className="text-center text-sm text-slate-500 dark:text-slate-400 mb-8 max-w-sm mx-auto">
                {confirmAction.type === 'deactivate'
                  ? `Deseja marcar '${confirmAction.tenantName}' como Inativo? Isso removerá o vínculo com o imóvel atual, mas manterá o histórico intacto.`
                  : confirmAction.type === 'delete'
                    ? `Tem certeza que deseja excluir '${confirmAction.tenantName}'?`
                    : `O inquilino '${confirmAction.tenantName}' possui dados vinculados (histórico, contratos, etc).\n\nDeseja FORÇAR a exclusão apagando TUDO definitivamente?`}
              </p>

              <div className="flex gap-4">
                <button
                  onClick={() => setConfirmAction(null)}
                  disabled={isLoading}
                  className="flex-1 py-3 px-4 rounded-xl font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 transition-colors disabled:opacity-50"
                  type="button"
                >
                  Cancelar
                </button>
                <button
                  onClick={executeConfirmAction}
                  disabled={isLoading}
                  className={`flex-1 py-3 px-4 rounded-xl font-bold text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2
                    ${confirmAction.type === 'deactivate' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-red-500 hover:bg-red-600'}`}
                >
                  {isLoading ? 'Processando...' : 'Confirmar'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
