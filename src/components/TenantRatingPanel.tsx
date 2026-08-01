import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { TenantRating } from '../types';
import { Star, ChevronDown, ChevronUp, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TenantRatingPanelProps {
    tenantId: string;
}

const METRICS = [
    { key: 'punctuality' as const, label: '⏰ Pontualidade', hint: 'Paga no prazo?' },
    { key: 'conservation' as const, label: '🏠 Conservação', hint: 'Cuida do imóvel?' },
    { key: 'communication' as const, label: '💬 Comunicação', hint: 'É acessível e cordial?' }
];

function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
    const [hovered, setHovered] = useState(0);
    return (
        <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(star => (
                <button
                    key={star}
                    type="button"
                    onClick={() => onChange(star)}
                    onMouseEnter={() => setHovered(star)}
                    onMouseLeave={() => setHovered(0)}
                    className="transition-transform hover:scale-110"
                >
                    <Star
                        size={24}
                        className={`transition-colors ${star <= (hovered || value)
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-300 dark:text-slate-600'
                            }`}
                    />
                </button>
            ))}
        </div>
    );
}

function StarDisplay({ value, size = 16 }: { value: number; size?: number }) {
    return (
        <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map(star => (
                <Star
                    key={star}
                    size={size}
                    className={star <= value ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'}
                />
            ))}
        </div>
    );
}

export default function TenantRatingPanel({ tenantId }: TenantRatingPanelProps) {
    const { user } = useAuth();
    const [isExpanded, setIsExpanded] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [existingRating, setExistingRating] = useState<TenantRating | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    const [form, setForm] = useState({ punctuality: 3, conservation: 3, communication: 3, notes: '' });

    useEffect(() => {
        if (!isExpanded) return;
        fetchRating();
    }, [isExpanded, tenantId]);

    const fetchRating = async () => {
        try {
            const { data } = await supabase
                .from('tenant_ratings')
                .select('*')
                .eq('owner_id', user?.uid)
                .eq('tenant_id', tenantId)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (data) {
                setExistingRating({
                    id: data.id,
                    ownerId: data.owner_id,
                    tenantId: data.tenant_id,
                    punctuality: data.punctuality,
                    conservation: data.conservation,
                    communication: data.communication,
                    notes: data.notes,
                    createdAt: data.created_at
                });
                setForm({
                    punctuality: data.punctuality,
                    conservation: data.conservation,
                    communication: data.communication,
                    notes: data.notes || ''
                });
            } else {
                setExistingRating(null);
                setIsEditing(true);
            }
        } catch {
            setExistingRating(null);
            setIsEditing(true);
        }
    };

    const handleSave = async () => {
        if (!user) return;
        setIsSaving(true);
        try {
            const payload = {
                owner_id: user.uid,
                tenant_id: tenantId,
                punctuality: form.punctuality,
                conservation: form.conservation,
                communication: form.communication,
                notes: form.notes || null
            };

            if (existingRating) {
                await supabase.from('tenant_ratings').update(payload).eq('id', existingRating.id);
            } else {
                await supabase.from('tenant_ratings').insert({ ...payload, created_at: new Date().toISOString() });
            }
            setIsEditing(false);
            fetchRating();
        } catch (err) {
            console.error(err);
            alert('Erro ao salvar avaliação');
        } finally {
            setIsSaving(false);
        }
    };

    const avg = existingRating
        ? ((existingRating.punctuality + existingRating.conservation + existingRating.communication) / 3).toFixed(1)
        : null;

    return (
        <div className="mt-3 border border-amber-100 dark:border-amber-900/30 rounded-2xl overflow-hidden">
            <button
                onClick={() => setIsExpanded(prev => !prev)}
                className="w-full flex items-center justify-between p-3 bg-amber-50/80 dark:bg-amber-900/10 hover:bg-amber-100 dark:hover:bg-amber-900/20 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Award size={18} className="text-amber-500" />
                    <span className="font-bold text-amber-800 dark:text-amber-300 text-sm">Avaliação do Inquilino</span>
                    {avg && (
                        <div className="flex items-center gap-1 bg-amber-200 dark:bg-amber-900/50 px-2 py-0.5 rounded-full">
                            <Star size={12} className="fill-amber-500 text-amber-500" />
                            <span className="text-xs font-black text-amber-700 dark:text-amber-300">{avg}</span>
                        </div>
                    )}
                </div>
                {isExpanded ? <ChevronUp size={16} className="text-amber-500" /> : <ChevronDown size={16} className="text-amber-500" />}
            </button>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="p-4 bg-white dark:bg-slate-900 space-y-4">
                            {existingRating && !isEditing ? (
                                <>
                                    <div className="space-y-3">
                                        {METRICS.map(m => (
                                            <div key={m.key} className="flex items-center justify-between">
                                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{m.label}</span>
                                                <StarDisplay value={existingRating[m.key]} />
                                            </div>
                                        ))}
                                    </div>
                                    {existingRating.notes && (
                                        <p className="text-sm text-slate-500 italic border-t border-slate-100 dark:border-slate-800 pt-3">"{existingRating.notes}"</p>
                                    )}
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="w-full py-2 text-sm font-bold text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-xl transition-colors"
                                    >
                                        ✏️ Editar Avaliação
                                    </button>
                                </>
                            ) : (
                                <div className="space-y-4">
                                    {METRICS.map(m => (
                                        <div key={m.key}>
                                            <div className="flex items-center justify-between mb-1">
                                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">{m.label}</label>
                                                <span className="text-xs text-slate-400">{m.hint}</span>
                                            </div>
                                            <StarInput value={form[m.key]} onChange={v => setForm(prev => ({ ...prev, [m.key]: v }))} />
                                        </div>
                                    ))}

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Observações (Opcional)</label>
                                        <textarea
                                            value={form.notes}
                                            onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                                            rows={2}
                                            placeholder="Descreva sua experiência com este inquilino..."
                                            className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-amber-400 dark:text-white resize-none"
                                        />
                                    </div>

                                    <div className="flex gap-3">
                                        {existingRating && (
                                            <button
                                                onClick={() => setIsEditing(false)}
                                                className="flex-1 py-2 text-sm font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl transition-colors"
                                            >
                                                Cancelar
                                            </button>
                                        )}
                                        <button
                                            onClick={handleSave}
                                            disabled={isSaving}
                                            className="flex-1 py-2 text-sm font-bold bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                                        >
                                            {isSaving ? (
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            ) : '⭐ Salvar Avaliação'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export { StarDisplay };
