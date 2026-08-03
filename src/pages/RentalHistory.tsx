import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { History, Home, User, Calendar, FileText, Search, Clock } from 'lucide-react';
import { RentalHistory, Property, Tenant, Contract } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function RentalHistoryPage() {
    const { user } = useAuth();
    const [history, setHistory] = useState<RentalHistory[]>([]);
    const [properties, setProperties] = useState<Property[]>([]);
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (!user) return;
        fetchHistory();
    }, [user]);

    const fetchHistory = async () => {
        setIsLoading(true);
        try {
            const [histRes, propRes, tenRes] = await Promise.all([
                supabase.from('rental_history').select('*').eq('owner_id', user?.uid).order('leave_date', { ascending: false }),
                supabase.from('properties').select('*').eq('owner_id', user?.uid),
                supabase.from('tenants').select('*').eq('owner_id', user?.uid)
            ]);

            if (histRes.error) throw histRes.error;
            if (propRes.error) throw propRes.error;
            if (tenRes.error) throw tenRes.error;

            setHistory((histRes.data || []).map(h => ({
                id: h.id,
                ownerId: h.owner_id,
                propertyId: h.property_id,
                tenantId: h.tenant_id,
                contractId: h.contract_id,
                startDate: h.start_date,
                leaveDate: h.leave_date,
                reason: h.reason,
                notes: h.notes,
                createdAt: h.created_at
            })));

            setProperties((propRes.data || []).map(p => ({
                id: p.id,
                ownerId: p.owner_id,
                name: p.name,
                address: p.address,
                type: p.type,
                rentValue: p.rent_value,
                status: p.status,
                photos: p.photos || [],
                createdAt: p.created_at
            })));

            setTenants((tenRes.data || []).map(t => ({
                id: t.id,
                ownerId: t.owner_id,
                propertyId: t.property_id,
                residents: t.residents || [],
                createdAt: t.created_at
            })));

        } catch (e) {
            console.error('Erro ao buscar histórico', e);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredHistory = history.filter(h => {
        const property = properties.find(p => p.id === h.propertyId);
        const tenant = tenants.find(t => t.id === h.tenantId);
        const titular = tenant?.residents.find(r => r.isTitular);

        return (
            (property?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (titular?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            h.reason.toLowerCase().includes(searchTerm.toLowerCase())
        );
    });

    return (
        <Layout>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <History className="text-primary" /> Histórico de Locações
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2">Acompanhe todos os encerramentos e desocupações de seus imóveis.</p>
                </div>
            </div>

            <div className="relative mb-8">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                    type="text"
                    placeholder="Buscar por imóvel, ex-inquilino ou motivo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-primary transition-all dark:text-white"
                />
            </div>

            {isLoading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-32 bg-white dark:bg-slate-900 rounded-3xl animate-pulse border border-slate-100 dark:border-slate-800"></div>
                    ))}
                </div>
            ) : filteredHistory.length > 0 ? (
                <div className="relative overflow-hidden">
                    <div className="absolute left-8 top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-800 hidden md:block"></div>
                    <div className="space-y-6">
                        {filteredHistory.map((h, i) => {
                            const property = properties.find(p => p.id === h.propertyId);
                            const tenant = tenants.find(t => t.id === h.tenantId);
                            const titular = tenant?.residents.find(r => r.isTitular);

                            return (
                                <div key={h.id} className="relative flex flex-col md:flex-row gap-6 md:pl-20 group">
                                    <div className="hidden md:flex absolute left-4 w-8 h-8 bg-white dark:bg-slate-900 rounded-full border-4 border-slate-200 dark:border-slate-700 items-center justify-center -translate-x-1/2 group-hover:border-primary transition-colors mt-6 z-10">
                                        <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600 group-hover:bg-primary transition-colors"></div>
                                    </div>

                                    <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex-1 hover:border-primary/30 hover:shadow-md transition-all">
                                        <div className="flex flex-col md:flex-row gap-6 md:gap-12">

                                            <div className="flex-1 space-y-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl flex items-center justify-center shrinks-0">
                                                        <Home size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Imóvel Destaque</p>
                                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{property?.name || 'Imóvel Arquivado'}</h3>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/10 text-blue-500 rounded-xl flex items-center justify-center shrinks-0">
                                                        <User size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Ex-Inquilino</p>
                                                        <p className="font-bold text-slate-700 dark:text-slate-300">{titular?.name || 'Inquilino Arquivado'}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex-1 space-y-4 md:border-l md:border-slate-100 dark:border-slate-800 md:pl-8">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <p className="text-xs text-slate-400 font-bold mb-1 flex items-center gap-1"><Calendar size={12} /> Entrada</p>
                                                        <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                                                            {h.startDate ? format(new Date(h.startDate), "dd 'de' MMM, yyyy", { locale: ptBR }) : '-'}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-primary font-bold mb-1 flex items-center gap-1"><Clock size={12} /> Saída</p>
                                                        <p className="font-bold text-primary text-sm">
                                                            {h.leaveDate ? format(new Date(h.leaveDate), "dd 'de' MMM, yyyy", { locale: ptBR }) : '-'}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div>
                                                    <p className="text-xs text-slate-400 font-bold mb-1 flex items-center gap-1"><FileText size={12} /> Motivo do Encerramento</p>
                                                    <div className="inline-flex px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-bold">
                                                        {h.reason}
                                                    </div>
                                                </div>

                                                {h.notes && (
                                                    <div>
                                                        <p className="text-xs text-slate-400 font-bold mb-1">Observações</p>
                                                        <p className="text-sm text-slate-600 dark:text-slate-400 italic">"{h.notes}"</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                    <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                        <History className="text-slate-400" size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Nenhum histórico encontrado</h3>
                    <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-sm mx-auto">
                        Quando você encerrar locações, elas aparecerão aqui na sua linha do tempo.
                    </p>
                </div>
            )}
        </Layout>
    );
}
