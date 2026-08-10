import React, { useState } from 'react';
import { RefreshCcw, DollarSign } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';

interface TenantPaymentsProps {
    tenant: any;
    contract: any;
    payments: any[];
    fetchData: () => void;
}

export default function TenantPayments({ tenant, contract, payments, fetchData }: TenantPaymentsProps) {
    const [isGeneratingPayment, setIsGeneratingPayment] = useState(false);

    const handleGeneratePayment = async () => {
        if (!contract || !tenant || isGeneratingPayment) return;
        setIsGeneratingPayment(true);
        try {
            const today = new Date();
            const currentMonth = today.getMonth();
            const currentYear = today.getFullYear();
            const dueDate = new Date(currentYear, currentMonth, contract.dueDay);

            // check if payment exists for this month/year combo
            const existing = payments.find(p => {
                const dDate = new Date(p.dueDate);
                return dDate.getMonth() === currentMonth && dDate.getFullYear() === currentYear;
            });

            if (existing) {
                alert('A cobrança deste mês já foi gerada!');
            } else {
                const newPayment = {
                    owner_id: tenant.ownerId,
                    contract_id: contract.id,
                    property_id: tenant.propertyId,
                    tenant_id: tenant.id,
                    amount: contract.monthlyValue,
                    due_date: dueDate.toISOString(),
                    status: 'pending',
                    created_at: new Date().toISOString()
                };
                await supabase.from('payments').insert(newPayment);
                alert('Cobrança gerada com sucesso!');
                fetchData();
            }
        } catch (err) {
            console.error(err);
            alert('Erro ao gerar cobrança.');
        } finally {
            setIsGeneratingPayment(false);
        }
    };

    return (
        <div className="space-y-6">

            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                    <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                        <DollarSign className="text-secondary" /> Histórico Financeiro
                    </h3>
                    <p className="text-slate-500 text-sm">Visualize e gerencie os pagamentos mensais da sua locação.</p>
                </div>
                <button
                    onClick={handleGeneratePayment}
                    disabled={isGeneratingPayment}
                    className="w-full md:w-auto bg-secondary text-white px-6 py-3 rounded-xl font-bold hover:bg-opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-secondary/20 shrink-0"
                >
                    <RefreshCcw size={18} className={isGeneratingPayment ? 'animate-spin' : ''} />
                    Gerar Cobrança do Mês
                </button>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                {payments.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                        <DollarSign size={48} className="mx-auto text-slate-300 dark:text-slate-700 mb-4" />
                        <p className="font-semibold">Nenhum pagamento registrado.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[600px]">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                                    <th className="p-4 font-bold text-sm text-slate-600 dark:text-slate-300">Competência</th>
                                    <th className="p-4 font-bold text-sm text-slate-600 dark:text-slate-300">Vencimento</th>
                                    <th className="p-4 font-bold text-sm text-slate-600 dark:text-slate-300">Valor (R$)</th>
                                    <th className="p-4 font-bold text-sm text-slate-600 dark:text-slate-300">Status</th>
                                    <th className="p-4 font-bold text-sm text-slate-600 dark:text-slate-300 text-right">Ação</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payments.map(p => (
                                    <tr key={p.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="p-4 font-semibold text-slate-800 dark:text-white capitalize">
                                            {format(new Date(p.dueDate), 'MMMM / yyyy')}
                                        </td>
                                        <td className="p-4 text-slate-500">
                                            {format(new Date(p.dueDate), 'dd/MM/yyyy')}
                                        </td>
                                        <td className="p-4 font-bold text-slate-700 dark:text-slate-300">
                                            {p.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${p.status === 'paid' ? 'bg-secondary/10 text-secondary' :
                                                    p.status === 'pending' ? 'bg-orange-500/10 text-orange-500' : 'bg-red-500/10 text-red-500'
                                                }`}>
                                                {p.status === 'paid' ? 'Pago' : p.status === 'pending' ? 'Pendente' : 'Atrasado'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            {p.status === 'paid' ? (
                                                p.receiptUrl ? (
                                                    <a href={p.receiptUrl} target="_blank" rel="noreferrer" className="text-secondary font-bold text-sm hover:underline">Ver Recibo</a>
                                                ) : (
                                                    <span className="text-xs text-slate-400">Sem Recibo</span>
                                                )
                                            ) : (
                                                <button className="text-primary font-bold text-sm hover:underline">Detalhes / Pagar</button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

        </div>
    );
}
