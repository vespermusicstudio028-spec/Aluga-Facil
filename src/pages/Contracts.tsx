import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import {
  FileText,
  Plus,
  Search,
  Clock,
  CheckCircle2,
  X,
  Calendar,
  DollarSign,
  User,
  Home,
  MoreVertical,
  Edit2,
  Trash2,
  ChevronRight,
  ShieldCheck,
  Filter
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Contract, Property, Tenant, ContractStatus, ContractOptions } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { ContractStatusBadge } from '../components/StatusBadge';

export default function Contracts() {
  const { user } = useAuth();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending' | 'closed' | 'rescindido' | 'em_renovacao' | 'cancelado'>('all');
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);

  const [newContract, setNewContract] = useState<{
    propertyId: string;
    tenantId: string;
    startDate: string;
    endDate: string;
    monthlyValue: string;
    dueDay: string;
    guaranteeValue: string;
    paymentMethod: 'PIX' | 'Transferência' | 'Boleto';
    pixKey: string;
    status: ContractStatus;
    options: ContractOptions;
    generatePayments: boolean;
  }>({
    propertyId: '',
    tenantId: '',
    startDate: '',
    endDate: '',
    monthlyValue: '',
    dueDay: '5',
    guaranteeValue: '',
    paymentMethod: 'PIX',
    pixKey: '',
    status: 'pending',
    options: {
      allowsPets: true,
      hasGarage: false,
      includesWater: false,
      includesCondo: false,
      includesIptu: false,
      includesInternet: false,
      includesEnergy: false,
      includesGas: false,
      allowsPainting: false,
      allowsRenovation: false,
      allowsSublease: false,
      isFurnished: false,
      requiresInsurance: false,
    },
    generatePayments: true
  });

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [conRes, propRes, tenRes] = await Promise.all([
        supabase.from('contracts').select('*').eq('owner_id', user?.uid).order('updated_at', { ascending: false }),
        supabase.from('properties').select('*').eq('owner_id', user?.uid),
        supabase.from('tenants').select('*').eq('owner_id', user?.uid)
      ]);

      if (conRes.error) throw conRes.error;
      if (propRes.error) throw propRes.error;
      if (tenRes.error) throw tenRes.error;

      setContracts((conRes.data || []).map(c => ({
        id: c.id,
        ownerId: c.owner_id,
        propertyId: c.property_id,
        tenantId: c.tenant_id,
        contractNumber: c.contract_number,
        startDate: c.start_date,
        endDate: c.end_date,
        monthlyValue: c.monthly_value,
        dueDay: c.due_day,
        guaranteeValue: c.guarantee_value,
        paymentMethod: c.payment_method,
        pixKey: c.pix_key,
        status: c.status,
        tenantSignature: c.tenant_signature,
        landlordSignature: c.landlord_signature,
        signatureDate: c.signature_date,
        signatureTime: c.signature_time,
        signatureIP: c.signature_ip,
        validationHash: c.validation_hash,
        witnesses: c.witnesses,
        clauses: c.clauses,
        options: c.options,
        inspectionUrl: c.inspection_url,
        inspectionAgreed: c.inspection_agreed,
        createdAt: c.created_at,
        updatedAt: c.updated_at
      })));

      setProperties((propRes.data || []).map(p => ({
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
      })));

      setTenants((tenRes.data || []).map(t => ({
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
        createdAt: t.created_at,
        updatedAt: t.updated_at
      })));
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (contract?: Contract) => {
    if (contract) {
      setEditingContract(contract);
      setNewContract({
        propertyId: contract.propertyId,
        tenantId: contract.tenantId,
        startDate: contract.startDate ? new Date(contract.startDate).toISOString().split('T')[0] : '',
        endDate: contract.endDate ? new Date(contract.endDate).toISOString().split('T')[0] : '',
        monthlyValue: contract.monthlyValue.toString(),
        dueDay: contract.dueDay.toString(),
        guaranteeValue: contract.guaranteeValue.toString(),
        paymentMethod: contract.paymentMethod,
        pixKey: contract.pixKey || '',
        status: contract.status,
        options: contract.options || {
          allowsPets: true, hasGarage: false, includesWater: false, includesCondo: false,
          includesIptu: false, includesInternet: false, includesEnergy: false, includesGas: false,
          allowsPainting: false, allowsRenovation: false, allowsSublease: false, isFurnished: false, requiresInsurance: false
        },
        generatePayments: false
      });
    } else {
      setEditingContract(null);
      setNewContract({
        propertyId: '',
        tenantId: '',
        startDate: '',
        endDate: '',
        monthlyValue: '',
        dueDay: '5',
        guaranteeValue: '',
        paymentMethod: 'PIX',
        pixKey: '',
        status: 'pending',
        options: {
          allowsPets: true, hasGarage: false, includesWater: false, includesCondo: false,
          includesIptu: false, includesInternet: false, includesEnergy: false, includesGas: false,
          allowsPainting: false, allowsRenovation: false, allowsSublease: false, isFurnished: false, requiresInsurance: false
        },
        generatePayments: true
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const contractData = {
        owner_id: user.uid,
        property_id: newContract.propertyId,
        tenant_id: newContract.tenantId,
        monthly_value: Number(newContract.monthlyValue),
        due_day: Number(newContract.dueDay),
        guarantee_value: Number(newContract.guaranteeValue),
        payment_method: newContract.paymentMethod,
        pix_key: newContract.pixKey,
        status: newContract.status,
        start_date: new Date(newContract.startDate).toISOString(),
        end_date: new Date(newContract.endDate).toISOString(),
        updated_at: new Date().toISOString(),
        options: newContract.options
      };

      if (editingContract) {
        await supabase.from('contracts').update(contractData).eq('id', editingContract.id);
      } else {
        const year = new Date().getFullYear();
        const sequencialId = Math.random().toString(36).substring(2, 8).toUpperCase();
        const contractNumber = `ALF-${year}-${sequencialId}`;
        const { data: newDbContract, error: insertError } = await supabase.from('contracts').insert({
          ...contractData,
          contract_number: contractNumber,
          created_at: new Date().toISOString()
        }).select().single();

        if (insertError) throw insertError;

        // Gerar parcelas se solicitado
        if (newContract.generatePayments && newDbContract) {
          const sDate = new Date(newContract.startDate);
          const eDate = new Date(newContract.endDate);
          let totalMonths = (eDate.getFullYear() - sDate.getFullYear()) * 12 + (eDate.getMonth() - sDate.getMonth());
          if (totalMonths <= 0) totalMonths = 12; // fallback

          const paymentsToInsert = [];
          for (let i = 0; i < totalMonths; i++) {
            const payDate = new Date(sDate.getFullYear(), sDate.getMonth() + i + 1, Number(newContract.dueDay));
            paymentsToInsert.push({
              owner_id: user.uid,
              contract_id: newDbContract.id,
              property_id: newContract.propertyId,
              tenant_id: newContract.tenantId,
              amount: Number(newContract.monthlyValue),
              due_date: payDate.toISOString(),
              status: 'pending',
            });
          }
          if (paymentsToInsert.length > 0) {
            await supabase.from('payments').insert(paymentsToInsert);
          }
        }

        // Engatilhar eventos (Início e Renovação)
        const eventData = [
          {
            owner_id: user.uid,
            title: `Início de Locação: Contrato ${contractNumber}`,
            type: 'visit', // ou tipo 'início' caso exista no enum custom
            date: new Date(newContract.startDate).toISOString(),
            status: 'scheduled',
            property_id: newContract.propertyId,
            tenant_id: newContract.tenantId,
          },
          {
            owner_id: user.uid,
            title: `Vencimento do Contrato ${contractNumber}`,
            type: 'renewal',
            date: new Date(newContract.endDate).toISOString(),
            status: 'scheduled',
            property_id: newContract.propertyId,
            tenant_id: newContract.tenantId,
          }
        ];
        await supabase.from('events').insert(eventData);

        // Registro de log na history
        await supabase.from('rental_history').insert({
          owner_id: user.uid,
          property_id: newContract.propertyId,
          tenant_id: newContract.tenantId,
          contract_id: newDbContract.id,
          start_date: new Date(newContract.startDate).toISOString(),
          leave_date: null,
          reason: 'Início de novo contrato de locação',
          created_at: new Date().toISOString()
        });
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    const contract = contracts.find(c => c.id === id);
    if (!contract) return;

    if (!confirm('Tem certeza que deseja excluir este contrato? Esta ação não pode ser desfeita e o imóvel voltará a ficar disponível.')) return;

    try {
      // 1. Delete the contract
      await supabase.from('contracts').delete().eq('id', id);

      // 2. Update property status back to available
      if (contract.propertyId) {
        try {
          await supabase.from('properties').update({ status: 'available' }).eq('id', contract.propertyId);
        } catch (propErr) {
          console.warn('Imóvel não encontrado ou sem permissão para atualizar status', propErr);
        }
      }

      fetchData();
    } catch (err) {
      console.error('Erro ao excluir contrato:', err);
      alert('Erro ao excluir contrato. Verifique as permissões.');
    }
  };

  // getStatusLabel replaced by ContractStatusBadge component (see render)

  return (
    <Layout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Contratos</h1>
          <p className="text-slate-500 dark:text-slate-400">Gerencie os termos de locação.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-2xl font-bold hover:bg-opacity-90 transition-all shadow-lg shadow-primary/20"
        >
          <Plus size={20} />
          Novo Contrato
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por contrato, imóvel ou inquilino..."
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
            {statusFilter === 'all' ? 'Filtros' : statusFilter === 'active' ? 'Ativos' : statusFilter === 'pending' ? 'Pendentes' : 'Encerrados'}
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
                    🟢 Ativos
                  </button>
                  <button
                    onClick={() => { setStatusFilter('pending'); setIsFilterMenuOpen(false); }}
                    className={`w-full px-4 py-3 text-left text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${statusFilter === 'pending' ? 'text-primary' : 'text-slate-700 dark:text-slate-300'}`}
                  >
                    🟡 Pendentes
                  </button>
                  <button
                    onClick={() => { setStatusFilter('em_renovacao'); setIsFilterMenuOpen(false); }}
                    className={`w-full px-4 py-3 text-left text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${statusFilter === 'em_renovacao' ? 'text-primary' : 'text-slate-700 dark:text-slate-300'}`}
                  >
                    🔵 Em Renovação
                  </button>
                  <button
                    onClick={() => { setStatusFilter('closed'); setIsFilterMenuOpen(false); }}
                    className={`w-full px-4 py-3 text-left text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${statusFilter === 'closed' ? 'text-primary' : 'text-slate-700 dark:text-slate-300'}`}
                  >
                    ⚫ Encerrados
                  </button>
                  <button
                    onClick={() => { setStatusFilter('rescindido'); setIsFilterMenuOpen(false); }}
                    className={`w-full px-4 py-3 text-left text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${statusFilter === 'rescindido' ? 'text-primary' : 'text-slate-700 dark:text-slate-300'}`}
                  >
                    🔴 Rescindidos
                  </button>
                  <button
                    onClick={() => { setStatusFilter('cancelado'); setIsFilterMenuOpen(false); }}
                    className={`w-full px-4 py-3 text-left text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${statusFilter === 'cancelado' ? 'text-primary' : 'text-slate-700 dark:text-slate-300'}`}
                  >
                    🟠 Cancelados
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="h-32 bg-white dark:bg-slate-900 rounded-3xl animate-pulse border border-slate-100 dark:border-slate-800"></div>
          ))}
        </div>
      ) : contracts.length > 0 ? (
        <div className="grid grid-cols-1 gap-6">
          {contracts.filter(c => {
            const property = properties.find(p => p.id === c.propertyId);
            const tenant = tenants.find(t => t.id === c.tenantId);
            const titular = tenant?.residents.find(r => r.isTitular);
            const matchesSearch = c.contractNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
              (property?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
              (titular?.name || '').toLowerCase().includes(searchTerm.toLowerCase());

            let normalizedStatus = c.status;
            if (statusFilter === 'active') return matchesSearch && (c.status === 'active' || c.status === 'ativo' || c.status === 'signed_all');
            if (statusFilter === 'pending') return matchesSearch && (c.status === 'pending' || c.status === 'signed_tenant');
            if (statusFilter === 'closed') return matchesSearch && (c.status === 'closed' || c.status === 'encerrado');
            if (statusFilter === 'rescindido') return matchesSearch && c.status === 'rescindido';
            if (statusFilter === 'em_renovacao') return matchesSearch && c.status === 'em_renovacao';
            if (statusFilter === 'cancelado') return matchesSearch && c.status === 'cancelado';
            return matchesSearch;
          }).map((c) => {
            const property = properties.find(p => p.id === c.propertyId);
            const tenant = tenants.find(t => t.id === c.tenantId);
            const titular = tenant?.residents.find(r => r.isTitular);

            return (
              <div key={c.id} className="group bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-8 relative hover:border-primary/30 transition-all">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                        <FileText size={20} />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Contrato {c.contractNumber}</h3>
                        <div className="mt-1">
                          <ContractStatusBadge status={c.status} size="sm" />
                        </div>
                      </div>
                    </div>
                    <div className="relative">
                      <button
                        onClick={() => setActiveMenu(activeMenu === c.id ? null : c.id)}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        <MoreVertical size={20} />
                      </button>
                      <AnimatePresence>
                        {activeMenu === c.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setActiveMenu(null)} />
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: -10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: -10 }}
                              className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 z-20 overflow-hidden"
                            >
                              <button
                                onClick={() => { handleOpenModal(c); setActiveMenu(null); }}
                                className="w-full px-4 py-3 text-left text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
                              >
                                <Edit2 size={16} /> Editar Termos
                              </button>
                              <button
                                onClick={() => { handleDelete(c.id); setActiveMenu(null); }}
                                className="w-full px-4 py-3 text-left text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2"
                              >
                                <Trash2 size={16} /> Excluir
                              </button>
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    <div>
                      <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Imóvel</p>
                      <p className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1"><Home size={14} /> {property?.name || 'Não encontrado'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Inquilino</p>
                      <p className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1"><User size={14} /> {titular?.name || 'Não encontrado'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Valor Mensal</p>
                      <p className="font-bold text-primary">R$ {c.monthlyValue?.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
                <div className="md:w-px bg-slate-100 dark:bg-slate-800"></div>
                <div className="flex flex-col justify-center gap-4">
                  <div className="flex items-center gap-3">
                    <Calendar className="text-slate-400" size={18} />
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Vigência</p>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                        {c.startDate ? new Date(c.startDate).toLocaleDateString() : '-'} - {c.endDate ? new Date(c.endDate).toLocaleDateString() : '-'}
                      </p>
                    </div>
                  </div>
                  <Link
                    to={`/contracts/${c.id}`}
                    className="w-full py-2 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl font-bold text-sm hover:bg-primary hover:text-white transition-all flex items-center justify-center gap-2"
                  >
                    Ver Contrato <ChevronRight size={16} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
          <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <FileText className="text-slate-400" size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Nenhum contrato ativo</h3>
          <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-sm mx-auto">
            Crie um contrato para oficializar a locação entre seu imóvel e o inquilino.
          </p>
          <button
            onClick={() => handleOpenModal()}
            className="bg-primary text-white px-8 py-3 rounded-2xl font-bold hover:bg-opacity-90 transition-all shadow-lg shadow-primary/20"
          >
            Criar Primeiro Contrato
          </button>
        </div>
      )}

      {/* Add/Edit Contract Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{editingContract ? 'Editar Contrato' : 'Novo Contrato'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={24} /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto scrollbar-hide">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Imóvel</label>
                  <select
                    required
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all dark:text-white"
                    value={newContract.propertyId}
                    onChange={(e) => setNewContract({ ...newContract, propertyId: e.target.value })}
                  >
                    <option value="">Selecione o imóvel</option>
                    {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Inquilino (Titular)</label>
                  <select
                    required
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all dark:text-white"
                    value={newContract.tenantId}
                    onChange={(e) => setNewContract({ ...newContract, tenantId: e.target.value })}
                  >
                    <option value="">Selecione o inquilino</option>
                    {tenants.map(t => <option key={t.id} value={t.id}>{t.residents.find(r => r.isTitular)?.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Início</label>
                    <input
                      required
                      type="date"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all dark:text-white"
                      value={newContract.startDate}
                      onChange={(e) => setNewContract({ ...newContract, startDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Fim</label>
                    <input
                      required
                      type="date"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all dark:text-white"
                      value={newContract.endDate}
                      onChange={(e) => setNewContract({ ...newContract, endDate: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Valor Mensal</label>
                    <input
                      required
                      type="number"
                      placeholder="R$ 0.00"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all dark:text-white"
                      value={newContract.monthlyValue}
                      onChange={(e) => setNewContract({ ...newContract, monthlyValue: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Caução / Garantia</label>
                    <input
                      required
                      type="number"
                      placeholder="R$ 0.00"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all dark:text-white"
                      value={newContract.guaranteeValue}
                      onChange={(e) => setNewContract({ ...newContract, guaranteeValue: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Dia Vencimento</label>
                    <input
                      required
                      type="number"
                      min="1" max="31"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all dark:text-white"
                      value={newContract.dueDay}
                      onChange={(e) => setNewContract({ ...newContract, dueDay: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Forma de Pagamento</label>
                    <select
                      required
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all dark:text-white"
                      value={newContract.paymentMethod}
                      onChange={(e) => setNewContract({ ...newContract, paymentMethod: e.target.value as any })}
                    >
                      <option value="PIX">PIX</option>
                      <option value="Transferência">Transferência</option>
                      <option value="Boleto">Boleto</option>
                    </select>
                  </div>
                </div>
                {newContract.paymentMethod === 'PIX' && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Chave PIX</label>
                    <input
                      required
                      type="text"
                      placeholder="Sua chave PIX"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all dark:text-white"
                      value={newContract.pixKey}
                      onChange={(e) => setNewContract({ ...newContract, pixKey: e.target.value })}
                    />
                  </div>
                )}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 col-span-2">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3">Cláusulas Opcionais e Permissões</h4>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                    {Object.keys(newContract.options).map((key) => {
                      const labelMap: Record<string, string> = {
                        allowsPets: 'Permite Animais',
                        hasGarage: 'Possui Garagem',
                        includesWater: 'Água Inclusa',
                        includesCondo: 'Condomínio',
                        includesIptu: 'IPTU',
                        includesInternet: 'Internet',
                        includesEnergy: 'Energia',
                        includesGas: 'Gás',
                        allowsPainting: 'Pintura',
                        allowsRenovation: 'Reformas',
                        allowsSublease: 'Sublocação',
                        isFurnished: 'Mobiliado',
                        requiresInsurance: 'Seguro'
                      };
                      return (
                        <label key={key} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                          <input
                            type="checkbox"
                            checked={(newContract.options as any)[key]}
                            onChange={(e) => setNewContract({
                              ...newContract,
                              options: { ...newContract.options, [key]: e.target.checked }
                            })}
                            className="w-4 h-4 text-primary rounded border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-primary"
                          />
                          <span className="text-slate-600 dark:text-slate-400 font-medium">{labelMap[key]}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {!editingContract && (
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 col-span-2">
                    <label className="flex items-center justify-between cursor-pointer p-4 bg-primary/5 rounded-xl border border-primary/20 hover:bg-primary/10 transition-colors">
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Gerar parcelas mensais automaticamente?</span>
                      <input
                        type="checkbox"
                        checked={newContract.generatePayments}
                        onChange={(e) => setNewContract({ ...newContract, generatePayments: e.target.checked })}
                        className="w-5 h-5 text-primary rounded border-slate-300 focus:ring-primary focus:ring-offset-0"
                      />
                    </label>
                  </div>
                )}

                <div className="pt-4 flex gap-4 col-span-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-primary text-white rounded-xl font-bold hover:bg-opacity-90 shadow-lg shadow-primary/20 transition-all"
                  >
                    {editingContract ? 'Salvar Alterações' : 'Gerar Contrato'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
