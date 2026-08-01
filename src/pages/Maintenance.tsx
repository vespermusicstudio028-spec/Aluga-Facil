import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { uploadBase64Image } from '../lib/storage';
import { Property, Tenant } from '../types';
import { Wrench, Plus, CheckCircle, Clock, AlertTriangle, AlertCircle, XCircle, Search, Edit2, Trash2, Camera, User, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Use local types since they were just added to types/index.ts
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TicketStatus = 'open' | 'in_progress' | 'waiting_approval' | 'resolved' | 'cancelled';

export interface MaintenanceTicket {
    id: string;
    ownerId: string;
    propertyId: string;
    tenantId?: string;
    title: string;
    description: string;
    priority: TicketPriority;
    status: TicketStatus;
    estimatedCost?: number;
    photos: string[];
    createdAt: string;
    updatedAt: string;
}

export default function Maintenance() {
    const { user } = useAuth();
    const [tickets, setTickets] = useState<MaintenanceTicket[]>([]);
    const [properties, setProperties] = useState<Property[]>([]);
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTicket, setEditingTicket] = useState<MaintenanceTicket | null>(null);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        propertyId: '',
        tenantId: '',
        priority: 'medium' as TicketPriority,
        status: 'open' as TicketStatus,
        estimatedCost: '',
        photos: [] as string[]
    });

    useEffect(() => {
        if (!user) return;
        fetchData();
    }, [user]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [ticketsRes, propsRes, tenantsRes] = await Promise.all([
                supabase.from('maintenance_tickets').select('*').eq('owner_id', user?.uid).order('created_at', { ascending: false }),
                supabase.from('properties').select('*').eq('owner_id', user?.uid),
                supabase.from('tenants').select('id, residents').eq('owner_id', user?.uid)
            ]);

            if (ticketsRes.data) {
                setTickets(ticketsRes.data.map(t => ({
                    id: t.id,
                    ownerId: t.owner_id,
                    propertyId: t.property_id,
                    tenantId: t.tenant_id,
                    title: t.title,
                    description: t.description,
                    priority: t.priority,
                    status: t.status,
                    estimatedCost: t.estimated_cost,
                    photos: t.photos || [],
                    createdAt: t.created_at,
                    updatedAt: t.updated_at
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

    const handleOpenModal = (ticket?: MaintenanceTicket) => {
        if (ticket) {
            setEditingTicket(ticket);
            setFormData({
                title: ticket.title,
                description: ticket.description,
                propertyId: ticket.propertyId,
                tenantId: ticket.tenantId || '',
                priority: ticket.priority,
                status: ticket.status,
                estimatedCost: ticket.estimatedCost?.toString() || '',
                photos: ticket.photos || []
            });
        } else {
            setEditingTicket(null);
            setFormData({
                title: '',
                description: '',
                propertyId: '',
                tenantId: '',
                priority: 'medium',
                status: 'open',
                estimatedCost: '',
                photos: []
            });
        }
        setIsModalOpen(true);
    };

    const compressImage = (base64Str: string, maxWidth = 800, maxHeight = 800): Promise<string> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = base64Str;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidth) {
                        height *= maxWidth / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width *= maxHeight / height;
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.6));
            };
        });
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            setIsSaving(true);
            const reader = new FileReader();
            reader.onloadend = async () => {
                const compressed = await compressImage(reader.result as string);
                setFormData(prev => ({ ...prev, photos: [...prev.photos, compressed] }));
                setIsSaving(false);
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error(error);
            alert('Erro ao processar a imagem.');
            setIsSaving(false);
        }
    };

    const removePhoto = (index: number) => {
        setFormData(prev => ({ ...prev, photos: prev.photos.filter((_, i) => i !== index) }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        if (!formData.propertyId) { alert('Selecione o imóvel.'); return; }

        setIsSaving(true);
        try {
            const photoUrls = await Promise.all(
                formData.photos.map(async (photo, idx) => {
                    if (photo.startsWith('data:')) {
                        const path = `${user.uid}/${Date.now()}_ticket_${idx}.jpg`;
                        return await uploadBase64Image('property-photos', path, photo);
                    }
                    return photo;
                })
            );

            const pData = {
                owner_id: user.uid,
                property_id: formData.propertyId,
                tenant_id: formData.tenantId || null,
                title: formData.title,
                description: formData.description,
                priority: formData.priority,
                status: formData.status,
                estimated_cost: Number(formData.estimatedCost) || null,
                photos: photoUrls,
                updated_at: new Date().toISOString()
            };

            if (editingTicket) {
                await supabase.from('maintenance_tickets').update(pData).eq('id', editingTicket.id);
            } else {
                await supabase.from('maintenance_tickets').insert(pData);
            }
            setIsModalOpen(false);
            fetchData();
        } catch (err) {
            console.error(err);
            alert('Erro ao salvar ticket');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Deseja excluir este ticket?')) return;
        try {
            await supabase.from('maintenance_tickets').delete().eq('id', id);
            fetchData();
        } catch (err) {
            console.error(err);
        }
    };

    const getPriorityInfo = (pri: TicketPriority) => {
        switch (pri) {
            case 'low': return { icon: <CheckCircle size={16} />, color: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30 font-bold', label: 'Baixa' };
            case 'medium': return { icon: <AlertCircle size={16} />, color: 'text-emerald-500 bg-emerald-100 dark:bg-emerald-900/30 font-bold', label: 'Média' };
            case 'high': return { icon: <AlertTriangle size={16} />, color: 'text-orange-500 bg-orange-100 dark:bg-orange-900/30 font-bold', label: 'Alta' };
            case 'urgent': return { icon: <AlertTriangle size={16} />, color: 'text-red-500 bg-red-100 dark:bg-red-900/30 font-black', label: 'Urgente' };
        }
    };

    const getStatusColor = (st: TicketStatus) => {
        switch (st) {
            case 'open': return 'bg-yellow-100 border-yellow-200 text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-800 dark:text-yellow-400';
            case 'in_progress': return 'bg-blue-100 border-blue-200 text-blue-800 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400';
            case 'waiting_approval': return 'bg-purple-100 border-purple-200 text-purple-800 dark:bg-purple-900/30 dark:border-purple-800 dark:text-purple-400';
            case 'resolved': return 'bg-emerald-100 border-emerald-200 text-emerald-800 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-400';
            case 'cancelled': return 'bg-slate-100 border-slate-200 text-slate-800 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400';
        }
    };

    const getStatusName = (st: TicketStatus) => {
        switch (st) {
            case 'open': return 'Aberto';
            case 'in_progress': return 'Em Andamento';
            case 'waiting_approval': return 'Aguardando Orçamento/Aprovação';
            case 'resolved': return 'Resolvido';
            case 'cancelled': return 'Cancelado';
        }
    };

    const filteredTickets = tickets.filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase()));

    // Setup simplified Kanban layout (Columns for Open, In Progress, Resolved)
    const cols = [
        { key: 'open', statusIds: ['open', 'waiting_approval'], title: 'Pendentes' },
        { key: 'in_progress', statusIds: ['in_progress'], title: 'Em Andamento' },
        { key: 'resolved', statusIds: ['resolved', 'cancelled'], title: 'Resolvidos' }
    ];

    return (
        <Layout>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <Wrench className="text-primary w-8 h-8" />
                        Manutenções
                    </h1>
                    <p className="text-slate-500 mt-2">Visão geral dos tickets e chamados de serviço</p>
                </div>
                <div className="flex flex-col sm:flex-row w-full md:w-auto gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar chamado..."
                            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all dark:text-white"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => handleOpenModal()}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white font-bold rounded-xl shadow-lg hover:bg-opacity-90 transition-all shrink-0"
                    >
                        <Plus size={20} /> Novo Ticket
                    </button>
                </div>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
            ) : (
                <div className="grid lg:grid-cols-3 gap-6 items-start">
                    {cols.map(col => {
                        const colTickets = filteredTickets.filter(t => col.statusIds.includes(t.status));
                        return (
                            <div key={col.key} className="flex flex-col gap-4">
                                <h2 className="font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 py-2 px-4 rounded-xl flex justify-between items-center">
                                    {col.title} <span className="text-xs bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded-full">{colTickets.length}</span>
                                </h2>

                                <div className="space-y-4">
                                    {colTickets.length === 0 && (
                                        <div className="p-6 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                                            Vazio
                                        </div>
                                    )}
                                    <AnimatePresence>
                                        {colTickets.map(ticket => {
                                            const prop = properties.find(p => p.id === ticket.propertyId);
                                            const priInfo = getPriorityInfo(ticket.priority);
                                            return (
                                                <motion.div
                                                    key={ticket.id}
                                                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
                                                    className={`bg-white dark:bg-slate-900 rounded-2xl shadow-sm border p-4 cursor-pointer hover:shadow-md hover:border-primary/50 transition-all ${getStatusColor(ticket.status)}`}
                                                    onClick={() => handleOpenModal(ticket)}
                                                >
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className={`px-2 py-1 flex items-center gap-1 rounded-full text-xs uppercase tracking-wider ${priInfo.color}`}>
                                                            {priInfo.icon} {priInfo.label}
                                                        </span>
                                                        <span className="text-xs font-bold px-2 py-1 rounded-lg bg-white/50 dark:bg-black/20 text-current">{getStatusName(ticket.status)}</span>
                                                    </div>

                                                    <h3 className="font-bold text-lg mt-3 text-slate-900 dark:text-white leading-tight">{ticket.title}</h3>
                                                    <p className="text-sm text-slate-500 mt-2 line-clamp-2">{ticket.description}</p>

                                                    {prop && (
                                                        <div className="flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-400 mt-4 bg-slate-50 dark:bg-slate-950 p-2 rounded-lg border border-slate-100 dark:border-slate-800 truncate">
                                                            <MapPin size={12} /> {prop.name}
                                                        </div>
                                                    )}

                                                    {ticket.estimatedCost && (
                                                        <div className="mt-3 text-sm font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 w-max">
                                                            Orçamento: R$ {ticket.estimatedCost.toFixed(2)}
                                                        </div>
                                                    )}

                                                    {ticket.photos?.length > 0 && (
                                                        <div className="mt-3 flex gap-2">
                                                            {ticket.photos.map((url, i) => (
                                                                <img key={i} src={url} alt="anexo" className="w-10 h-10 rounded-lg object-cover border border-slate-200 dark:border-slate-700" />
                                                            ))}
                                                        </div>
                                                    )}
                                                </motion.div>
                                            )
                                        })}
                                    </AnimatePresence>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl z-20">
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Wrench className="text-primary" /> {editingTicket ? 'Detalhes do Chamado' : 'Novo Chamado'}
                                </h3>
                                <div className="flex gap-2">
                                    {editingTicket && (
                                        <button onClick={() => { setIsModalOpen(false); handleDelete(editingTicket.id); }} className="text-red-500 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"><Trash2 size={24} /></button>
                                    )}
                                    <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2"><XCircle size={24} /></button>
                                </div>
                            </div>

                            <div className="p-6 overflow-y-auto w-full">
                                <form id="ticketForm" onSubmit={handleSubmit} className="space-y-6">

                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Imóvel Afetado</label>
                                            <select required value={formData.propertyId} onChange={e => setFormData({ ...formData, propertyId: e.target.value })} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary dark:text-white">
                                                <option value="">Selecione o imóvel...</option>
                                                {properties.map(p => <option key={p.id} value={p.id}>{p.name} - {p.address}</option>)}
                                            </select>
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Relacionar Inquilino (Opcional)</label>
                                            <select value={formData.tenantId} onChange={e => setFormData({ ...formData, tenantId: e.target.value })} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary dark:text-white">
                                                <option value="">Nenhum (Problema externo ou imóvel vazio)</option>
                                                {tenants.map(t => {
                                                    const tit = t.residents?.find(r => r.isTitular)?.name || 'Inquilino';
                                                    return <option key={t.id} value={t.id}>{tit}</option>
                                                })}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Status</label>
                                            <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as TicketStatus })} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary dark:text-white">
                                                <option value="open">Aberto</option>
                                                <option value="in_progress">Em Andamento</option>
                                                <option value="waiting_approval">Aguardando Avaliação/Orçamento</option>
                                                <option value="resolved">Resolvido / Concluído</option>
                                                <option value="cancelled">Cancelado</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Prioridade</label>
                                            <select value={formData.priority} onChange={e => setFormData({ ...formData, priority: e.target.value as TicketPriority })} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary dark:text-white font-bold">
                                                <option value="low">Baixa</option>
                                                <option value="medium">Normal / Média</option>
                                                <option value="high">Alta (Requer Atenção Rápida)</option>
                                                <option value="urgent">Urgente (Risco ao Imóvel/Vida)</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">O que aconteceu?</label>
                                        <input required type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary dark:text-white font-bold" placeholder="Ex: Vazamento de água na cozinha" />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Detalhes (Opcional)</label>
                                        <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={3} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary dark:text-white resize-none" placeholder="Explique mais sobre o problema..." />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Custos Estimados (R$ - Opcional)</label>
                                        <input type="number" min="0" step="0.01" value={formData.estimatedCost} onChange={e => setFormData({ ...formData, estimatedCost: e.target.value })} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary dark:text-white" placeholder="0.00" />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Anexos / Fotos do Problema</label>
                                        <div className="flex gap-4 overflow-x-auto pb-4">
                                            {formData.photos.map((photo, i) => (
                                                <div key={i} className="relative shrink-0">
                                                    <img src={photo} alt="" className="w-32 h-32 object-cover rounded-xl border border-slate-200 dark:border-slate-800" />
                                                    <button type="button" onClick={() => removePhoto(i)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow hover:scale-110 transition-transform">
                                                        <XCircle size={16} />
                                                    </button>
                                                </div>
                                            ))}

                                            <label className="w-32 h-32 shrink-0 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-primary transition-all">
                                                <Camera className="text-slate-400 mb-2" size={24} />
                                                <span className="text-xs font-semibold text-slate-500">Adicionar</span>
                                                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                                            </label>
                                        </div>
                                    </div>

                                </form>
                            </div>

                            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 sticky bottom-0">
                                <button form="ticketForm" type="submit" disabled={isSaving} className="w-full py-4 bg-primary text-white font-bold rounded-xl shadow-lg hover:bg-opacity-90 transition-all text-lg flex items-center justify-center gap-2">
                                    {isSaving ? (
                                        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <> Salvar Ticket <CheckCircle size={20} /> </>
                                    )}
                                </button>
                            </div>

                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </Layout>
    );
}
