import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { CalendarEvent, EventType, EventStatus, Property, Tenant } from '../types';
import { Plus, Calendar as CalendarIcon, Clock, MapPin, CheckCircle, XCircle, Search, Edit2, Trash2, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Agenda() {
    const { user } = useAuth();
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [properties, setProperties] = useState<Property[]>([]);
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
    const [formData, setFormData] = useState({
        title: '',
        type: 'visit' as EventType,
        date: '',
        endDate: '',
        propertyId: '',
        tenantId: '',
        notes: '',
        status: 'scheduled' as EventStatus
    });

    useEffect(() => {
        if (!user) return;
        fetchData();
    }, [user]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [eventsRes, propsRes, tenantsRes] = await Promise.all([
                supabase.from('events').select('*').eq('owner_id', user?.uid).order('date', { ascending: true }),
                supabase.from('properties').select('*').eq('owner_id', user?.uid),
                supabase.from('tenants').select('id, residents').eq('owner_id', user?.uid)
            ]);

            if (eventsRes.data) {
                setEvents(eventsRes.data.map(e => ({
                    id: e.id,
                    ownerId: e.owner_id,
                    title: e.title,
                    type: e.type,
                    date: e.date,
                    endDate: e.end_date,
                    propertyId: e.property_id,
                    tenantId: e.tenant_id,
                    notes: e.notes,
                    status: e.status,
                    createdAt: e.created_at
                })));
            }
            if (propsRes.data) setProperties(propsRes.data.map(p => ({
                id: p.id, ownerId: p.owner_id, name: p.name, address: p.address, type: p.type,
                rentValue: p.rent_value, status: p.status, photos: p.photos || [], createdAt: p.created_at
            })));
            if (tenantsRes.data) setTenants(tenantsRes.data.map(t => ({ id: t.id, residents: t.residents, ownerId: '', propertyId: '', createdAt: '' })));
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenModal = (evt?: CalendarEvent) => {
        if (evt) {
            setEditingEvent(evt);
            setFormData({
                title: evt.title,
                type: evt.type,
                date: evt.date.substring(0, 16),
                endDate: evt.endDate ? evt.endDate.substring(0, 16) : '',
                propertyId: evt.propertyId || '',
                tenantId: evt.tenantId || '',
                notes: evt.notes || '',
                status: evt.status
            });
        } else {
            setEditingEvent(null);
            setFormData({
                title: '',
                type: 'visit',
                date: '',
                endDate: '',
                propertyId: '',
                tenantId: '',
                notes: '',
                status: 'scheduled'
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        // Converte datas locais datetime-local do Chrome para ISO full se tiver algo
        const isoDate = formData.date ? new Date(formData.date).toISOString() : null;
        const isoEndDate = formData.endDate ? new Date(formData.endDate).toISOString() : null;

        const pData = {
            owner_id: user.uid,
            title: formData.title,
            type: formData.type,
            date: isoDate,
            end_date: isoEndDate,
            property_id: formData.propertyId || null,
            tenant_id: formData.tenantId || null,
            notes: formData.notes,
            status: formData.status
        };

        try {
            if (editingEvent) {
                await supabase.from('events').update(pData).eq('id', editingEvent.id);
            } else {
                await supabase.from('events').insert(pData);
            }
            setIsModalOpen(false);
            fetchData();
        } catch (err) {
            console.error(err);
            alert('Erro ao salvar evento');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Deseja cancelar e excluir este evento?')) return;
        try {
            await supabase.from('events').delete().eq('id', id);
            fetchData();
        } catch (err) {
            console.error(err);
        }
    };

    const getTypeColor = (type: EventType) => {
        switch (type) {
            case 'visit': return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800';
            case 'inspection': return 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800';
            case 'maintenance': return 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800';
            case 'renewal': return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800';
        }
    };

    const getTypeName = (type: EventType) => {
        switch (type) {
            case 'visit': return 'Visita';
            case 'inspection': return 'Vistoria';
            case 'maintenance': return 'Manutenção';
            case 'renewal': return 'Renovação';
        }
    };

    // Separa eventos futuros de passados (histórico)
    const today = new Date();
    const upcomingEvents = events.filter(e => new Date(e.date) >= today || e.status === 'scheduled');
    const pastEvents = events.filter(e => new Date(e.date) < today && e.status !== 'scheduled');

    return (
        <Layout>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <CalendarIcon className="text-primary w-8 h-8" />
                        Agenda
                    </h1>
                    <p className="text-slate-500 mt-2">Visitas, vistorias e compromissos importantes</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 px-6 py-3 bg-primary text-white font-bold rounded-xl shadow-lg hover:bg-opacity-90 transition-all"
                >
                    <Plus size={20} /> Novo Evento
                </button>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Clock className="text-primary" size={24} /> Próximos Compromissos
                    </h2>
                    {isLoading ? (
                        <div className="space-y-4">
                            {[1, 2].map(i => <div key={i} className="h-32 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-2xl" />)}
                        </div>
                    ) : upcomingEvents.length > 0 ? (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 rounded-3xl p-4 md:p-6 shadow-sm border border-slate-200 dark:border-slate-800">
                            {upcomingEvents.map(evt => {
                                const prop = properties.find(p => p.id === evt.propertyId);
                                const ten = tenants.find(t => t.id === evt.tenantId);
                                const titular = ten?.residents?.find(r => r.isTitular)?.name;

                                return (
                                    <motion.div key={evt.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-4 first:pt-0 last:pb-0 flex flex-col md:flex-row md:items-center gap-4">
                                        <div className="w-full md:w-32 flex-shrink-0 flex flex-col items-start md:items-center justify-center p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                                            <span className="font-bold text-lg text-primary">{new Date(evt.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).toUpperCase()}</span>
                                            <span className="text-sm font-medium text-slate-500">{new Date(evt.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>

                                        <div className="flex-1">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold border mb-2 ${getTypeColor(evt.type)}`}>
                                                        {getTypeName(evt.type)}
                                                    </div>
                                                    <h3 className="font-bold text-lg text-slate-800 dark:text-white">{evt.title}</h3>

                                                    {(prop || titular) && (
                                                        <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-slate-500 dark:text-slate-400">
                                                            {prop && (
                                                                <span className="flex items-center gap-1"><MapPin size={14} /> {prop.name}</span>
                                                            )}
                                                            {titular && (
                                                                <span className="flex items-center gap-1"><User size={14} /> {titular}</span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex gap-2">
                                                    <button onClick={() => handleOpenModal(evt)} className="p-2 text-slate-400 hover:text-primary transition-colors"><Edit2 size={18} /></button>
                                                    <button onClick={() => handleDelete(evt.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )
                            })}
                        </div>
                    ) : (
                        <div className="p-8 text-center bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
                            <CalendarIcon className="w-16 h-16 mx-auto mb-4 text-slate-300 dark:text-slate-700" />
                            <p className="font-bold text-slate-700 dark:text-slate-300">Sua agenda está livre!</p>
                            <p className="text-sm text-slate-500 mt-2">Nenhum compromisso marcado para os próximos dias.</p>
                        </div>
                    )}
                </div>

                {/* Histórico Recente Lateral */}
                <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-6">
                        <CheckCircle className="text-slate-400" size={24} /> Histórico Concluído
                    </h2>
                    <div className="bg-slate-50 dark:bg-slate-800/40 rounded-3xl p-6 border border-slate-200 dark:border-slate-800">
                        {pastEvents.length === 0 ? (
                            <p className="text-slate-500 text-sm text-center">Nenhum histórico recente.</p>
                        ) : (
                            <div className="space-y-4">
                                {pastEvents.slice(0, 5).map(evt => (
                                    <div key={evt.id} className="flex items-start gap-3">
                                        <div className="w-2 h-2 mt-2 rounded-full bg-slate-300 dark:bg-slate-600 flex-shrink-0" />
                                        <div>
                                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300 line-clamp-1">{evt.title}</p>
                                            <p className="text-xs text-slate-500">{new Date(evt.date).toLocaleDateString('pt-BR')}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-6">

                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                                    {editingEvent ? 'Editar Compromisso' : 'Agendar Compromisso'}
                                </h3>
                                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><XCircle size={24} /></button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Título do Evento</label>
                                    <input required type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary dark:text-white" />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Tipo</label>
                                        <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value as EventType })} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary dark:text-white">
                                            <option value="visit">Visita</option>
                                            <option value="inspection">Vistoria</option>
                                            <option value="maintenance">Manutenção</option>
                                            <option value="renewal">Renovação Contrato</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Status</label>
                                        <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as EventStatus })} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary dark:text-white">
                                            <option value="scheduled">Agendado</option>
                                            <option value="completed">Concluído</option>
                                            <option value="cancelled">Cancelado</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Data e Hora Inicial</label>
                                        <input required type="datetime-local" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary dark:text-white" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 text-slate-500">Hora Final (Opcional)</label>
                                        <input type="datetime-local" value={formData.endDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary dark:text-white" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Vincular a Imóvel (Opcional)</label>
                                    <select value={formData.propertyId} onChange={e => setFormData({ ...formData, propertyId: e.target.value })} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary dark:text-white">
                                        <option value="">Nenhum</option>
                                        {properties.map(p => <option key={p.id} value={p.id}>{p.name} - {p.address}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Vincular a Inquilino/Candidato (Opcional)</label>
                                    <select value={formData.tenantId} onChange={e => setFormData({ ...formData, tenantId: e.target.value })} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary dark:text-white">
                                        <option value="">Nenhum</option>
                                        {tenants.map(t => {
                                            const tit = t.residents?.find(r => r.isTitular)?.name || 'Inquilino Desconhecido';
                                            return <option key={t.id} value={t.id}>{tit}</option>
                                        })}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Observações</label>
                                    <textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} rows={3} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary dark:text-white resize-none" placeholder="Ex: Chave está na portaria..." />
                                </div>

                                <div className="pt-4">
                                    <button type="submit" className="w-full py-4 bg-primary text-white font-bold rounded-xl shadow-lg hover:bg-opacity-90 transition-all text-lg">
                                        Salvar Evento
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
