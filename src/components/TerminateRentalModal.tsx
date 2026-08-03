import React, { useState } from 'react';
import { X, AlertTriangle, FileText, UploadCloud, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Property, Tenant, Contract } from '../types';
import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TerminateRentalModalProps {
    isOpen: boolean;
    onClose: () => void;
    property: Property;
    tenant: Tenant | null;
    contract: Contract | null;
    onSuccess: () => void;
}

export function TerminateRentalModal({ isOpen, onClose, property, tenant, contract, onSuccess }: TerminateRentalModalProps) {
    const [leaveDate, setLeaveDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [reason, setReason] = useState('Fim do contrato');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleGeneratePdf = () => {
        try {
            const doc = new jsPDF();
            doc.setFontSize(20);
            doc.text('Termo de Encerramento de Locação', 105, 20, { align: 'center' });

            doc.setFontSize(12);
            doc.text(`Imóvel: ${property.name}`, 20, 40);
            doc.text(`Endereço: ${property.address}`, 20, 50);
            if (tenant && tenant.residents.length > 0) {
                doc.text(`Inquilino Principal: ${tenant.residents[0].name}`, 20, 60);
                doc.text(`CPF: ${tenant.residents[0].cpf}`, 20, 70);
            }
            doc.text(`Data de Saída: ${format(new Date(leaveDate), "dd/MM/yyyy")}`, 20, 80);
            doc.text(`Motivo: ${reason}`, 20, 90);

            if (contract) {
                doc.text(`Valor do Aluguel Referência: R$ ${contract.monthlyValue.toFixed(2).replace('.', ',')}`, 20, 100);
            }

            doc.text('Observações:', 20, 115);
            doc.setFontSize(10);
            const splitNotes = doc.splitTextToSize(notes || 'Nenhuma observação', 170);
            doc.text(splitNotes, 20, 125);

            doc.setFontSize(12);
            doc.text('_________________________________________________', 105, 200, { align: 'center' });
            doc.text('Assinatura do Responsável', 105, 210, { align: 'center' });

            doc.save(`Encerramento_${property.name.replace(/\s+/g, '_')}.pdf`);
        } catch (e) {
            console.error(e);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!leaveDate || !reason) {
            setError('Preencha a data e o motivo.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // 1. Inativar Inquilino (set property=null)
            if (tenant) {
                const { error: tErr } = await supabase
                    .from('tenants')
                    .update({
                        status: 'inactive',
                        property_id: null,
                        leave_date: leaveDate
                    })
                    .eq('id', tenant.id);
                if (tErr) throw tErr;
            }

            // 2. Encerrar Contrato Ativo
            if (contract) {
                const { error: cErr } = await supabase
                    .from('contracts')
                    .update({
                        status: 'closed',
                        end_date: leaveDate
                    })
                    .eq('id', contract.id);
                if (cErr) throw cErr;
            }

            // 3. Atualizar Imóvel para Disponível (Liberar Imóvel)
            const { error: pErr } = await supabase
                .from('properties')
                .update({
                    status: 'available'
                    // Note: In Aluga Fácil, properties does not have tenant_id natively, it relies on tenants referencing it.
                })
                .eq('id', property.id);
            if (pErr) throw pErr;

            // 4. Salvar Histórico if we have some link
            if (tenant && contract) {
                const { error: hErr } = await supabase
                    .from('rental_history')
                    .insert({
                        property_id: property.id,
                        tenant_id: tenant.id,
                        contract_id: contract.id,
                        start_date: contract.startDate,
                        leave_date: leaveDate,
                        reason: reason,
                        notes: notes
                    });
                if (hErr) throw hErr;
            }

            // Automatically generate PDF
            handleGeneratePdf();

            onSuccess();
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Erro ao processar o encerramento.');
        } finally {
            setLoading(false);
        }
    };

    const REASONS = [
        'Fim do contrato',
        'Mudança',
        'Despejo',
        'Distrato',
        'Venda do imóvel',
        'Outro'
    ];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 max-w-lg w-full relative shadow-2xl border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
                <button
                    onClick={onClose}
                    disabled={loading}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 p-2 rounded-full transition-colors disabled:opacity-50"
                >
                    <X size={20} />
                </button>

                <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400">
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Encerrar Locação</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{property.name}</p>
                    </div>
                </div>

                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-6 text-sm text-amber-800 dark:text-amber-400">
                    <strong>Aviso:</strong> Esta ação removerá o vínculo do inquilino com o imóvel, encerrará o contrato ativo e deixará o imóvel <strong>Disponível</strong>, porém manterá todo o histórico intacto.
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm font-medium">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Data da Saída</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="date"
                                required
                                disabled={loading}
                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                value={leaveDate}
                                onChange={(e) => setLeaveDate(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Motivo da Saída</label>
                        <select
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            disabled={loading}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                        >
                            {REASONS.map(r => (
                                <option key={r} value={r}>{r}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Observações (opcional)</label>
                        <textarea
                            disabled={loading}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            placeholder="Ex: Entregou as chaves para a portaria. Pendência no reparo da janela."
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none"
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            disabled={loading}
                            onClick={onClose}
                            className="flex-1 px-4 py-3.5 rounded-xl font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-3.5 rounded-xl font-bold bg-red-600 hover:bg-red-700 text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                        >
                            {loading ? (
                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <FileText size={18} /> Confirmar & Gerar PDF
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
