import React, { useState } from 'react';
import { RefreshCcw, DollarSign, X, Copy } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';

interface TenantPaymentsProps {
    tenant: any;
    contract: any;
    property: any;
    payments: any[];
    fetchData: () => void;
}

export default function TenantPayments({ tenant, contract, property, payments, fetchData }: TenantPaymentsProps) {
    const [isGeneratingPayment, setIsGeneratingPayment] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState<any>(null);

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
                                                    p.status === 'processing' ? 'bg-blue-500/10 text-blue-500' :
                                                        p.status === 'pending' ? 'bg-orange-500/10 text-orange-500' : 'bg-red-500/10 text-red-500'
                                                }`}>
                                                {p.status === 'paid' ? 'Pago' : p.status === 'processing' ? 'Processando' : p.status === 'pending' ? 'Pendente' : 'Atrasado'}
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
                                                <button onClick={() => setSelectedPayment(p)} className="text-primary font-bold text-sm hover:underline">Detalhes / Pagar</button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal "Detalhes / Pagar" */}
            {selectedPayment && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">

                        {/* Header */}
                        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                            <h2 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <DollarSign size={18} className="text-secondary" />
                                Detalhes do Pagamento
                            </h2>
                            <button onClick={() => setSelectedPayment(null)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-400 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Corpo */}
                        <div className="p-6 space-y-4">
                            <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700">
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-slate-500">Competência</span>
                                    <span className="font-bold dark:text-white capitalize">
                                        {format(new Date(selectedPayment.dueDate), 'MMMM / yyyy')}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-slate-500">Vencimento</span>
                                    <span className={`font-bold ${selectedPayment.status === 'late' || (selectedPayment.status === 'pending' && new Date(selectedPayment.dueDate) < new Date())
                                        ? 'text-red-500'
                                        : 'text-slate-700 dark:text-slate-300'
                                        }`}>
                                        {format(new Date(selectedPayment.dueDate), 'dd/MM/yyyy')}
                                    </span>
                                </div>
                                <div className="pt-2 mt-2 border-t border-slate-200 dark:border-slate-600 flex justify-between items-center text-lg">
                                    <span className="font-bold text-slate-700 dark:text-slate-300">Valor</span>
                                    <span className="font-black text-secondary">
                                        R$ {selectedPayment.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Como Pagar</h4>

                                {property?.paymentLink ? (
                                    <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800 rounded-xl p-4">
                                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mb-2">Pague Online com Cartão / Boleto / Pix:</p>
                                        <a
                                            href={property.paymentLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-all shadow-sm"
                                        >
                                            <DollarSign size={20} />
                                            Acessar Link de Pagamento
                                        </a>
                                    </div>
                                ) : contract?.paymentMethod === 'PIX' || contract?.pixKey ? (
                                    <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-xl p-4">
                                        <p className="text-xs text-blue-600 dark:text-blue-400 font-bold mb-2">Sua Chave PIX contratual:</p>
                                        <div className="flex items-center gap-2">
                                            <code className="flex-1 bg-white dark:bg-slate-900 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 font-mono truncate">
                                                {contract?.pixKey || 'Não informada'}
                                            </code>
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(contract?.pixKey || '');
                                                    alert('Chave PIX copiada!');
                                                }}
                                                className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors shadow-sm"
                                                title="Copiar Chave PIX"
                                            >
                                                <Copy size={20} />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-800 rounded-xl p-4 text-sm text-orange-700 dark:text-orange-400">
                                        Método de pagamento: <strong>{contract?.paymentMethod || 'Não definido'}</strong>.<br /><br />
                                        Por favor, realize o depósito ou transferência na conta informada no seu contrato, ou faça contato diretamente com seu locador pela aba Mensagens.
                                    </div>
                                )}
                            </div>

                            <div className="pt-4 flex justify-end gap-2 text-[10px] text-slate-400 text-center border-t border-slate-100 dark:border-slate-800">
                                Lembre-se de enviar o comprovante ao locador após o pagamento para dar baixa no sistema.
                            </div>
                        </div>

                    </div>
                </div>
            )}

        </div>
    );
}
