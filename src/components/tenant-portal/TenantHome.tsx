import React from 'react';
import { DollarSign, FileSignature, MapPin, Receipt } from 'lucide-react';
import PaymentAlerts from '../PaymentAlerts';
import { format } from 'date-fns';

interface TenantHomeProps {
    tenant: any;
    property: any;
    contract: any;
    payments: any[];
    setActiveTab: (tab: string) => void;
}

export default function TenantHome({ tenant, property, contract, payments, setActiveTab }: TenantHomeProps) {
    const titular = tenant?.residents?.find((r: any) => r.isTitular) || tenant?.residents?.[0];

    // Find next pending or late payment
    const nextPayment = payments.find(p => p.status !== 'paid');
    const recentPayments = payments.slice(0, 3); // top 3 for preview

    return (
        <div className="space-y-6">

            <div className="bg-primary text-white rounded-3xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-xl shadow-primary/20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
                <div>
                    <h2 className="text-3xl font-black mb-2">Olá, {titular?.name?.split(' ')[0]}! 👋</h2>
                    <p className="text-primary-100 opacity-90 max-w-md">
                        Bem-vindo ao seu Portal do Inquilino. Aqui você gerencia sua locação, pagamentos, contratos e solicita manutenções.
                    </p>
                </div>
                {tenant.status === 'inactive' && (
                    <div className="bg-red-500/20 text-white border border-red-400 px-4 py-2 rounded-xl text-sm font-bold shadow-lg">
                        Locação Encerrada
                    </div>
                )}
            </div>

            <PaymentAlerts payments={payments} getPropertyName={() => property?.name || 'Imóvel'} />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Next Payment Card */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm md:col-span-1">
                    <div className="flex items-center gap-2 mb-4">
                        <DollarSign size={20} className="text-secondary" />
                        <h3 className="font-bold text-slate-700 dark:text-slate-300">Próximo Vencimento</h3>
                    </div>
                    {nextPayment ? (
                        <div>
                            <p className="text-3xl font-black text-slate-900 dark:text-white">
                                R$ {nextPayment.amount.toLocaleString()}
                            </p>
                            <p className="text-sm font-bold mt-1 text-slate-500">
                                Vence em: {format(new Date(nextPayment.dueDate), 'dd/MM/yyyy')}
                            </p>
                            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    onClick={() => setActiveTab('payments')}
                                    className="w-full bg-secondary/10 text-secondary hover:bg-secondary hover:text-white transition-all py-2.5 rounded-xl font-bold flex items-center justify-center gap-2"
                                >
                                    <Receipt size={16} />
                                    Ver Faturas
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-4">
                            <p className="text-emerald-500 font-bold mb-1">Tudo em dia!</p>
                            <p className="text-xs text-slate-400">Nenhum pagamento pendente foi encontrado para a competência atual.</p>
                            <button
                                onClick={() => setActiveTab('payments')}
                                className="w-full mt-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all py-2.5 rounded-xl font-bold text-sm"
                            >
                                Histórico Financeiro
                            </button>
                        </div>
                    )}
                </div>

                {/* Property & Contract Preview */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm md:col-span-2">
                    <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-4">Resumo da Locação</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {property && (
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl flex items-start gap-3">
                                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                                    <MapPin size={20} className="text-primary" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Imóvel Atual</p>
                                    <p className="font-bold text-slate-800 dark:text-white mt-0.5">{property.name}</p>
                                    <p className="text-xs text-slate-500 mt-1 line-clamp-1">{property.address}</p>
                                </div>
                            </div>
                        )}
                        {contract && (
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl flex items-start gap-3">
                                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                                    <FileSignature size={20} className="text-primary" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Seu Contrato</p>
                                    <p className="font-bold text-slate-800 dark:text-white mt-0.5">Venc. Dia {contract.dueDay}</p>
                                    <button
                                        onClick={() => setActiveTab('contract')}
                                        className="text-xs font-bold text-primary mt-1 hover:underline"
                                    >
                                        Ler na íntegra &rarr;
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
