import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    X, Search, UserCheck, ChevronRight, ChevronLeft, Home,
    Calendar, DollarSign, Check, FileText, CreditCard, Bell, History
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { Property, Tenant } from '../types';

interface LinkTenantModalProps {
    isOpen: boolean;
    property: Property;
    onClose: () => void;
    onSuccess: () => void;
}

interface TenantWithHistory extends Tenant {
    lastPropertyName?: string;
}

const STEP_LABELS = ['Selecionar Inquilino', 'Dados da Locação', 'Opções'];

export function LinkTenantModal({ isOpen, property, onClose, onSuccess }: LinkTenantModalProps) {
    const { user } = useAuth();
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Step 1
    const [availableTenants, setAvailableTenants] = useState<TenantWithHistory[]>([]);
    const [isLoadingTenants, setIsLoadingTenants] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedTenant, setSelectedTenant] = useState<TenantWithHistory | null>(null);

    // Step 2
    const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
    const [rentValue, setRentValue] = useState(property?.rentValue?.toString() || '');
    const [dueDay, setDueDay] = useState('5');
    const [leaseTerm, setLeaseTerm] = useState('12');
    const [guaranteeType, setGuaranteeType] = useState<'caução' | 'fiador' | 'seguro'>('caução');
    const [guaranteeValue, setGuaranteeValue] = useState('');
    const [obs, setObs] = useState('');

    // Step 3
    const [createContract, setCreateContract] = useState(true);
    const [generatePayments, setGeneratePayments] = useState(true);
    const [createEvent, setCreateEvent] = useState(true);
    const [logHistory, setLogHistory] = useState(true);

    useEffect(() => {
        if (isOpen && property) {
            setStep(1);
            setSelectedTenant(null);
            setSearch('');
            setError('');
            setRentValue(property.rentValue?.toString() || '');
            fetchAvailableTenants();
        }
    }, [isOpen, property]);

    const fetchAvailableTenants = async () => {
        if (!user) return;
        setIsLoadingTenants(true);
        try {
            // Busca apenas inquilinos SEM imóvel vinculado (property_id nulo)
            const { data: tenants, error: tErr } = await supabase
                .from('tenants')
                .select('*')
                .eq('owner_id', user.uid)
                .is('property_id', null); // somente sem imóvel

            if (tErr) throw tErr;

            const enriched: TenantWithHistory[] = (tenants || []).map((t: any) => ({
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
                tenantStatus: t.tenant_status,
                leaveDate: t.leave_date,
                entryDate: t.start_date,
                createdAt: t.created_at,
                updatedAt: t.updated_at,
                lastPropertyName: undefined,
            }));

            setAvailableTenants(enriched);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoadingTenants(false);
        }
    };

    const filteredTenants = availableTenants.filter(t => {
        const titular = t.residents.find(r => r.isTitular);
        const term = search.toLowerCase();
        return (
            titular?.name?.toLowerCase().includes(term) ||
            titular?.cpf?.toLowerCase().includes(term) ||
            titular?.phone?.toLowerCase().includes(term)
        );
    });

    const handleConfirm = async () => {
        if (!selectedTenant || !user || !property) return;
        setIsSubmitting(true);
        setError('');

        try {
            const now = new Date().toISOString();

            // 1. Update property → rented
            const { error: propErr } = await supabase
                .from('properties')
                .update({ status: 'rented', updated_at: now })
                .eq('id', property.id);
            if (propErr) throw propErr;

            // 2. Update tenant → vincular ao imóvel
            // O trigger fn_auto_set_tenant_status definirá tenant_status = 'ativo' automaticamente
            const { error: tenErr } = await supabase
                .from('tenants')
                .update({
                    property_id: property.id,
                    start_date: new Date(entryDate).toISOString(),
                    updated_at: now,
                })
                .eq('id', selectedTenant.id);
            if (tenErr) throw tenErr;

            let contractId: string | undefined;

            // 3. Create contract (if selected)
            if (createContract) {
                const contractNumber = `CNT-${Math.floor(100000 + Math.random() * 900000)}`;
                const leaseMonths = parseInt(leaseTerm) || 12;
                const endDateTs = new Date(entryDate);
                endDateTs.setMonth(endDateTs.getMonth() + leaseMonths);

                const { data: contractData, error: contErr } = await supabase
                    .from('contracts')
                    .insert({
                        owner_id: user.uid,
                        property_id: property.id,
                        tenant_id: selectedTenant.id,
                        contract_number: contractNumber,
                        start_date: new Date(entryDate).toISOString(),
                        end_date: endDateTs.toISOString(),
                        monthly_value: parseFloat(rentValue) || property.rentValue,
                        due_day: parseInt(dueDay) || 5,
                        guarantee_value: parseFloat(guaranteeValue) || 0,
                        payment_method: 'PIX',
                        status: 'active',
                        created_at: now,
                        updated_at: now,
                    })
                    .select('id')
                    .single();

                if (contErr) throw contErr;
                contractId = contractData?.id;
            }

            // 4. Generate monthly payments (if selected)
            if (generatePayments && createContract && contractId) {
                const leaseMonths = parseInt(leaseTerm) || 12;
                const paymentsToInsert = [];
                for (let i = 0; i < leaseMonths; i++) {
                    const dueDate = new Date(entryDate);
                    dueDate.setMonth(dueDate.getMonth() + i);
                    dueDate.setDate(parseInt(dueDay) || 5);
                    paymentsToInsert.push({
                        owner_id: user.uid,
                        contract_id: contractId,
                        property_id: property.id,
                        tenant_id: selectedTenant.id,
                        amount: parseFloat(rentValue) || property.rentValue,
                        due_date: dueDate.toISOString(),
                        status: 'pending',
                        created_at: now,
                        updated_at: now,
                    });
                }
                const { error: payErr } = await supabase.from('payments').insert(paymentsToInsert);
                if (payErr) console.warn('Erro ao gerar cobranças', payErr);
            }

            // 5. Create agenda event
            if (createEvent) {
                const titular = selectedTenant.residents.find(r => r.isTitular);
                await supabase.from('events').insert({
                    owner_id: user.uid,
                    title: `Novo contrato iniciado — ${property.name}`,
                    type: 'renewal',
                    date: new Date(entryDate).toISOString(),
                    property_id: property.id,
                    tenant_id: selectedTenant.id,
                    notes: `Inquilino: ${titular?.name || ''}. ${obs}`,
                    status: 'scheduled',
                    created_at: now,
                });
            }

            // 6. Log rental history
            if (logHistory) {
                await supabase.from('rental_history').insert({
                    owner_id: user.uid,
                    property_id: property.id,
                    tenant_id: selectedTenant.id,
                    contract_id: contractId || null,
                    start_date: new Date(entryDate).toISOString(),
                    leave_date: null, // placeholder until termination (null means active rental)
                    reason: 'Novo vínculo',
                    notes: `Vinculado via Vincular Inquilino. ${obs}`,
                    created_at: now,
                });
            }

            onSuccess();
        } catch (e: any) {
            console.error(e);
            setError(e.message || 'Erro ao vincular o inquilino. Tente novamente.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const statusBadge = (status?: string) => {
        switch (status) {
            case 'inactive': return <span className="text-[10px] px-2 py-0.5 bg-orange-50 text-orange-600 rounded-full font-bold">Inativo</span>;
            case 'ex_tenant': return <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full font-bold">Ex-Inquilino</span>;
            default: return <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full font-bold">Sem Vínculo</span>;
        }
    };

    if (!isOpen || !property) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                />
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
                    style={{ maxHeight: '90vh' }}
                >
                    {/* Header */}
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Vincular Inquilino ao Imóvel</h3>
                                <p className="text-sm text-slate-500 mt-0.5">{property.name}</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Step indicator */}
                        <div className="flex items-center gap-2 mt-5">
                            {STEP_LABELS.map((label, i) => {
                                const stepNum = i + 1;
                                const isActive = step === stepNum;
                                const isDone = step > stepNum;
                                return (
                                    <React.Fragment key={stepNum}>
                                        <div className={`flex items-center gap-2 transition-all duration-300 ${isActive ? 'flex-1' : ''}`}>
                                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all shrink-0
                        ${isDone ? 'bg-secondary text-white' : isActive ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}
                                            >
                                                {isDone ? <Check size={14} /> : stepNum}
                                            </div>
                                            {isActive && (
                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{label}</span>
                                            )}
                                        </div>
                                        {i < STEP_LABELS.length - 1 && (
                                            <div className={`h-px flex-1 transition-colors ${isDone ? 'bg-secondary' : 'bg-slate-200 dark:bg-slate-700'}`} />
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto p-6">

                        {/* ─── STEP 1: Select Tenant ─── */}
                        {step === 1 && (
                            <div className="space-y-4">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Buscar por nome, CPF ou telefone..."
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary dark:text-white text-sm transition-all"
                                    />
                                </div>

                                {isLoadingTenants ? (
                                    <div className="space-y-3">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="h-20 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
                                        ))}
                                    </div>
                                ) : filteredTenants.length === 0 ? (
                                    <div className="text-center py-12">
                                        <UserCheck className="mx-auto text-slate-300 dark:text-slate-600 mb-3" size={40} />
                                        <p className="text-slate-500 font-semibold mb-1">Nenhum inquilino disponível</p>
                                        <p className="text-slate-400 text-sm mb-6">Todos já possuem locação ativa ou a busca não encontrou resultados.</p>
                                        <Link
                                            to="/tenants/new"
                                            className="inline-flex items-center gap-2 px-6 py-3 bg-secondary text-white rounded-xl font-bold hover:bg-opacity-90 shadow-lg shadow-secondary/20 transition-all"
                                        >
                                            + Novo Inquilino
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {filteredTenants.map(t => {
                                            const titular = t.residents.find(r => r.isTitular);
                                            const isSelected = selectedTenant?.id === t.id;
                                            return (
                                                <button
                                                    key={t.id}
                                                    onClick={() => setSelectedTenant(t)}
                                                    className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${isSelected
                                                        ? 'border-primary bg-primary/5'
                                                        : 'border-slate-200 dark:border-slate-700 hover:border-primary/40 hover:bg-slate-50 dark:hover:bg-slate-800'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-700 overflow-hidden flex items-center justify-center shrink-0">
                                                            {titular?.photo
                                                                ? <img src={titular.photo} className="w-full h-full object-cover" />
                                                                : <UserCheck size={22} className="text-slate-400" />
                                                            }
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <p className="font-bold text-slate-900 dark:text-white truncate">{titular?.name}</p>
                                                                {statusBadge(t.status)}
                                                            </div>
                                                            <div className="flex gap-3 mt-0.5 flex-wrap">
                                                                {titular?.cpf && <span className="text-xs text-slate-500">CPF: {titular.cpf}</span>}
                                                                {titular?.phone && <span className="text-xs text-slate-500">📱 {titular.phone}</span>}
                                                            </div>
                                                            {t.lastPropertyName && (
                                                                <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                                                                    <Home size={10} /> Último imóvel: {t.lastPropertyName}
                                                                </p>
                                                            )}
                                                        </div>
                                                        {isSelected && (
                                                            <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center shrink-0">
                                                                <Check size={14} className="text-white" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ─── STEP 2: Lease Info ─── */}
                        {step === 2 && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Data de Entrada</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                            <input
                                                type="date"
                                                value={entryDate}
                                                onChange={e => setEntryDate(e.target.value)}
                                                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary dark:text-white text-sm transition-all"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Valor do Aluguel</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">R$</span>
                                            <input
                                                type="number"
                                                value={rentValue}
                                                onChange={e => setRentValue(e.target.value)}
                                                className="w-full pl-9 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary dark:text-white text-sm transition-all"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Dia do Vencimento</label>
                                        <input
                                            type="number"
                                            min="1" max="31"
                                            value={dueDay}
                                            onChange={e => setDueDay(e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary dark:text-white text-sm transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Prazo (meses)</label>
                                        <select
                                            value={leaseTerm}
                                            onChange={e => setLeaseTerm(e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary dark:text-white text-sm transition-all"
                                        >
                                            {[3, 6, 12, 18, 24, 36, 48, 60].map(m => (
                                                <option key={m} value={m}>{m} meses</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Tipo de Garantia</label>
                                        <select
                                            value={guaranteeType}
                                            onChange={e => setGuaranteeType(e.target.value as any)}
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary dark:text-white text-sm transition-all"
                                        >
                                            <option value="caução">Caução</option>
                                            <option value="fiador">Fiador</option>
                                            <option value="seguro">Seguro Fiança</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Valor Garantia</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">R$</span>
                                            <input
                                                type="number"
                                                value={guaranteeValue}
                                                onChange={e => setGuaranteeValue(e.target.value)}
                                                className="w-full pl-9 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary dark:text-white text-sm transition-all"
                                            />
                                        </div>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Observações</label>
                                        <textarea
                                            rows={3}
                                            value={obs}
                                            onChange={e => setObs(e.target.value)}
                                            placeholder="Condições especiais, observações..."
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary dark:text-white text-sm transition-all resize-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ─── STEP 3: Options ─── */}
                        {step === 3 && (
                            <div className="space-y-3">
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                                    Selecione o que deseja criar automaticamente ao confirmar o vínculo.
                                </p>
                                {[
                                    {
                                        key: 'contract',
                                        icon: <FileText size={20} className="text-primary" />,
                                        label: 'Criar Contrato Automaticamente',
                                        desc: `CNT-XXXXXX • Ativo • ${leaseTerm} meses`,
                                        checked: createContract,
                                        toggle: () => setCreateContract(v => !v),
                                    },
                                    {
                                        key: 'payments',
                                        icon: <CreditCard size={20} className="text-secondary" />,
                                        label: 'Gerar Cobranças Mensais',
                                        desc: `${leaseTerm} parcelas de R$ ${parseFloat(rentValue || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                                        checked: generatePayments,
                                        toggle: () => setGeneratePayments(v => !v),
                                        disabled: !createContract,
                                    },
                                    {
                                        key: 'event',
                                        icon: <Bell size={20} className="text-amber-500" />,
                                        label: 'Criar Evento na Agenda',
                                        desc: `"Novo contrato iniciado — ${property.name}"`,
                                        checked: createEvent,
                                        toggle: () => setCreateEvent(v => !v),
                                    },
                                    {
                                        key: 'history',
                                        icon: <History size={20} className="text-slate-500" />,
                                        label: 'Registrar no Histórico',
                                        desc: 'Mantém auditoria completa da locação',
                                        checked: logHistory,
                                        toggle: () => setLogHistory(v => !v),
                                    },
                                ].map(opt => (
                                    <button
                                        key={opt.key}
                                        onClick={opt.disabled ? undefined : opt.toggle}
                                        disabled={opt.disabled}
                                        className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${opt.disabled ? 'opacity-40 cursor-not-allowed border-slate-200 dark:border-slate-700' :
                                            opt.checked
                                                ? 'border-primary bg-primary/5'
                                                : 'border-slate-200 dark:border-slate-700 hover:border-primary/30'
                                            }`}
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                                            {opt.icon}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-slate-800 dark:text-white text-sm">{opt.label}</p>
                                            <p className="text-xs text-slate-500 truncate mt-0.5">{opt.desc}</p>
                                        </div>
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${opt.checked ? 'bg-primary border-primary' : 'border-slate-300 dark:border-slate-600'
                                            }`}>
                                            {opt.checked && <Check size={13} className="text-white" />}
                                        </div>
                                    </button>
                                ))}

                                {/* Summary */}
                                <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Resumo</p>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                        <span className="text-slate-500">Imóvel:</span>
                                        <span className="font-semibold text-slate-800 dark:text-white truncate">{property.name}</span>
                                        <span className="text-slate-500">Inquilino:</span>
                                        <span className="font-semibold text-slate-800 dark:text-white truncate">
                                            {selectedTenant?.residents.find(r => r.isTitular)?.name}
                                        </span>
                                        <span className="text-slate-500">Entrada:</span>
                                        <span className="font-semibold text-slate-800 dark:text-white">
                                            {entryDate ? new Date(entryDate).toLocaleDateString('pt-BR') : '-'}
                                        </span>
                                        <span className="text-slate-500">Aluguel:</span>
                                        <span className="font-semibold text-primary">
                                            R$ {parseFloat(rentValue || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
                                {error}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex gap-3 flex-shrink-0">
                        {step > 1 ? (
                            <button
                                onClick={() => setStep(s => s - 1)}
                                className="flex items-center gap-2 px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            >
                                <ChevronLeft size={18} /> Voltar
                            </button>
                        ) : (
                            <button
                                onClick={onClose}
                                className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            >
                                Cancelar
                            </button>
                        )}

                        {step < 3 ? (
                            <button
                                disabled={step === 1 && !selectedTenant}
                                onClick={() => setStep(s => s + 1)}
                                className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary text-white rounded-xl font-bold hover:bg-opacity-90 shadow-lg shadow-primary/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                Próximo <ChevronRight size={18} />
                            </button>
                        ) : (
                            <button
                                disabled={isSubmitting}
                                onClick={handleConfirm}
                                className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary text-white rounded-xl font-bold hover:bg-opacity-90 shadow-lg shadow-primary/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? (
                                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Vinculando...</>
                                ) : (
                                    <><Check size={18} /> Confirmar Vínculo</>
                                )}
                            </button>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
