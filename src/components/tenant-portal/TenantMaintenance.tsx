import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { uploadBase64Image } from '../../lib/storage';
import { Wrench, Plus, CheckCircle, Clock, AlertTriangle, AlertCircle, XCircle, Camera, Trash2, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';

interface TenantMaintenanceProps {
    tenant: any;
    property: any;
}

export default function TenantMaintenance({ tenant, property }: TenantMaintenanceProps) {
    const [tickets, setTickets] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        priority: 'medium',
        photos: [] as string[]
    });

    useEffect(() => {
        if (!tenant) return;
        fetchTickets();
    }, [tenant]);

    const fetchTickets = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('maintenance_tickets')
                .select('*')
                .eq('tenant_id', tenant.id)
                .order('created_at', { ascending: false });

            if (!error && data) {
                setTickets(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
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
        if (!tenant || !property) return;

        // Optional: add validation
        if (!formData.title.trim()) {
            alert("Por favor, descreva o que aconteceu no título.");
            return;
        }

        setIsSaving(true);
        try {
            const photoUrls = await Promise.all(
                formData.photos.map(async (photo, idx) => {
                    if (photo.startsWith('data:')) {
                        const path = `${tenant.ownerId}/tenant_${tenant.id}_${Date.now()}_ticket_${idx}.jpg`;
                        return await uploadBase64Image('property-photos', path, photo);
                    }
                    return photo;
                })
            );

            const pData = {
                owner_id: tenant.ownerId,
                property_id: tenant.propertyId,
                tenant_id: tenant.id,
                title: formData.title,
                description: formData.description,
                priority: formData.priority,
                status: 'open',
                estimated_cost: null,
                photos: photoUrls,
                updated_at: new Date().toISOString()
            };

            const { error } = await supabase.from('maintenance_tickets').insert(pData);
            if (error) throw error;

            setIsModalOpen(false);

            // Reset and fetch
            setFormData({ title: '', description: '', priority: 'medium', photos: [] });
            fetchTickets();
            alert("Chamado aberto com sucesso! O proprietário será notificado.");
        } catch (err) {
            console.error(err);
            alert('Erro ao enviar ticket. Verifique sua conexão ou contate o suporte.');
        } finally {
            setIsSaving(false);
        }
    };

    const getPriorityInfo = (pri: string) => {
        switch (pri) {
            case 'low': return { icon: <CheckCircle size={16} />, color: 'text-blue-500 bg-blue-100', label: 'Baixa' };
            case 'medium': return { icon: <AlertCircle size={16} />, color: 'text-emerald-500 bg-emerald-100', label: 'Média' };
            case 'high': return { icon: <AlertTriangle size={16} />, color: 'text-orange-500 bg-orange-100', label: 'Alta' };
            case 'urgent': return { icon: <AlertTriangle size={16} />, color: 'text-red-500 bg-red-100', label: 'Urgente' };
            default: return { icon: <CheckCircle size={16} />, color: 'text-slate-500 bg-slate-100', label: 'Indeterminada' };
        }
    };

    const getStatusColor = (st: string) => {
        switch (st) {
            case 'open': return 'bg-yellow-100 border-yellow-200 text-yellow-800';
            case 'in_progress': return 'bg-blue-100 border-blue-200 text-blue-800';
            case 'waiting_approval': return 'bg-purple-100 border-purple-200 text-purple-800';
            case 'resolved': return 'bg-emerald-100 border-emerald-200 text-emerald-800';
            case 'cancelled': return 'bg-slate-100 border-slate-200 text-slate-800';
            default: return 'bg-slate-100 border-slate-200 text-slate-800';
        }
    };

    const getStatusName = (st: string) => {
        switch (st) {
            case 'open': return 'Aberto';
            case 'in_progress': return 'Em Andamento';
            case 'waiting_approval': return 'Avaliando Custo';
            case 'resolved': return 'Resolvido';
            case 'cancelled': return 'Cancelado';
            default: return 'Desconhecido';
        }
    };

    return (
        <div className="space-y-6">

            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                    <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                        <Wrench className="text-primary" /> Manutenções e Reparos
                    </h3>
                    <p className="text-slate-500 text-sm">Abra chamados para informar problemas de hidráulica, elétrica ou estrutura no imóvel.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="w-full md:w-auto bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 shrink-0"
                >
                    <Plus size={18} />
                    Novo Chamado
                </button>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-12">
                    <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
            ) : tickets.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 text-center py-16">
                    <Wrench size={48} className="mx-auto text-slate-200 dark:text-slate-800 mb-4" />
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Nenhum chamado aberto</h3>
                    <p className="text-slate-500 text-sm">Problemas com o imóvel? Clique acima para criar o primeiro chamado.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {tickets.map(ticket => {
                        const priInfo = getPriorityInfo(ticket.priority);
                        return (
                            <div key={ticket.id} className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col h-full">
                                <div className="flex justify-between items-start mb-4">
                                    <span className={`px-3 py-1 flex items-center gap-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${priInfo.color}`}>
                                        {priInfo.icon} {priInfo.label}
                                    </span>
                                    <span className={`text-xs font-bold px-3 py-1 rounded-full border ${getStatusColor(ticket.status)}`}>
                                        {getStatusName(ticket.status)}
                                    </span>
                                </div>

                                <h4 className="font-bold text-lg mb-2 text-slate-900 dark:text-white">{ticket.title}</h4>
                                <p className="text-sm text-slate-500 mb-4 line-clamp-3">{ticket.description}</p>

                                <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-3">
                                    {ticket.photos && ticket.photos.length > 0 && (
                                        <div className="flex gap-2 w-full overflow-x-auto pb-1">
                                            {ticket.photos.map((p: string, i: number) => (
                                                <img key={i} src={p} alt="Anexo do chamado" className="w-12 h-12 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0" />
                                            ))}
                                        </div>
                                    )}
                                    <span className="text-xs font-bold text-slate-400 block w-full text-right">
                                        Criado em {format(new Date(ticket.created_at), 'dd/MM/yyyy')}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal Criar Chamado */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900">
                                <h3 className="text-xl font-bold flex items-center gap-2">
                                    Novo Chamado
                                </h3>
                                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><XCircle size={24} /></button>
                            </div>

                            <div className="p-6 overflow-y-auto flex-1">
                                <form id="newTicketForm" onSubmit={handleSubmit} className="space-y-6">

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">O que aconteceu?</label>
                                        <input required type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary dark:text-white" placeholder="Ex: Torneira da cozinha está vazando" />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Prioridade (Urgência)</label>
                                        <select value={formData.priority} onChange={e => setFormData({ ...formData, priority: e.target.value })} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary dark:text-white">
                                            <option value="low">Baixa</option>
                                            <option value="medium">Média (Aguardar próximos dias)</option>
                                            <option value="high">Alta (Requer atenção rápida)</option>
                                            <option value="urgent">Urgente (Risco estrutural ou de vida)</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Detalhar problema</label>
                                        <textarea required value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={4} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary dark:text-white resize-none" placeholder="Explique mais sobre o problema para facilitar a resolução..." />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Anexos / Fotos (Opcional)</label>
                                        <div className="flex gap-4 overflow-x-auto pb-4">
                                            {formData.photos.map((photo, i) => (
                                                <div key={i} className="relative shrink-0">
                                                    <img src={photo} alt="Prévia" className="w-24 h-24 object-cover rounded-xl border border-slate-200 dark:border-slate-800" />
                                                    <button type="button" onClick={() => removePhoto(i)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow hover:scale-110 transition-transform">
                                                        <XCircle size={16} />
                                                    </button>
                                                </div>
                                            ))}
                                            <label className="w-24 h-24 shrink-0 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-primary transition-all">
                                                <Camera className="text-slate-400 mb-1" size={24} />
                                                <span className="text-[10px] font-semibold text-slate-500 uppercase">Adicionar</span>
                                                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                                            </label>
                                        </div>
                                    </div>
                                </form>
                            </div>

                            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                                <button form="newTicketForm" type="submit" disabled={isSaving} className="w-full py-4 bg-primary text-white font-bold rounded-xl shadow-lg hover:bg-opacity-90 transition-all flex items-center justify-center gap-2">
                                    {isSaving ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <> Enviar e Abrir Chamado <CheckCircle size={20} /> </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
}
