import React, { useState, useEffect } from 'react';
import { X, MessageCircle, AlertCircle, Calculator, FileText, CheckCircle2, RotateCcw } from 'lucide-react';
import { Payment, Tenant, Property } from '../types';
import { differenceInDays, format, isAfter, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface BillingActionModalProps {
    isOpen: boolean;
    onClose: () => void;
    payment: Payment | null;
    tenant: Tenant | null;
    property: Property | null;
}

export default function BillingActionModal({ isOpen, onClose, payment, tenant, property }: BillingActionModalProps) {
    const [includeFines, setIncludeFines] = useState(true);
    const [finePercentage, setFinePercentage] = useState(2); // 2% multa
    const [interestPerMonth, setInterestPerMonth] = useState(1); // 1% ao mês

    const [calculatedAmount, setCalculatedAmount] = useState(0);
    const [daysLate, setDaysLate] = useState(0);

    useEffect(() => {
        if (!payment) return;

        const due = startOfDay(new Date(payment.dueDate));
        const today = startOfDay(new Date());

        // Calcula atraso apenas se status não for pago e data já passou
        if (payment.status !== 'paid' && isAfter(today, due)) {
            const days = differenceInDays(today, due);
            setDaysLate(days);
        } else {
            setDaysLate(0);
        }
    }, [payment]);

    useEffect(() => {
        if (!payment) return;

        if (includeFines && daysLate > 0) {
            const fineValue = (payment.amount * finePercentage) / 100;
            // Juros pro rata die = (jurosMensal / 30) * dias
            const interestRate = ((interestPerMonth / 100) / 30) * daysLate;
            const interestValue = payment.amount * interestRate;

            setCalculatedAmount(payment.amount + fineValue + interestValue);
        } else {
            setCalculatedAmount(payment.amount);
        }
    }, [payment, includeFines, daysLate, finePercentage, interestPerMonth]);

    if (!isOpen || !payment || !tenant || !property) return null;

    const titular = tenant.residents?.find(r => r.isTitular) || tenant.residents?.[0];
    const phoneRaw = titular?.phone || '';
    let phone = phoneRaw.replace(/\D/g, '');
    if (phone && !phone.startsWith('55')) phone = '55' + phone;

    const dueDateStr = format(new Date(payment.dueDate), "dd/MM/yyyy");
    const originalStr = payment.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const finalStr = calculatedAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    let greeting = '';
    const nowHour = new Date().getHours();
    if (nowHour < 12) greeting = 'Bom dia';
    else if (nowHour < 18) greeting = 'Boa tarde';
    else greeting = 'Boa noite';

    const isLate = daysLate > 0 && payment.status !== 'paid';

    let toneTitle = 'Lembrete Amigável';
    if (isLate) toneTitle = daysLate > 15 ? 'Cobrança Urgente' : 'Aviso de Inadimplência';

    // Compilar Mensagem
    const messageLines = [];
    messageLines.push(`${greeting} ${titular?.name?.split(' ')[0] || ''}, tudo bem?`);

    if (isLate) {
        messageLines.push(`Estamos entrando em contato referente ao aluguel do imóvel *${property.name}*.`);
        messageLines.push(`Consta em nosso sistema uma pendência com vencimento original em *${dueDateStr}* (${daysLate} dias de atraso).`);

        if (includeFines && calculatedAmount > payment.amount) {
            messageLines.push(`Original: ${originalStr}`);
            messageLines.push(`Multa e Juros Atualizados: ${finalStr}`);
            messageLines.push(`\nO valor atualizado para pagamento hoje é de *${finalStr}*.`);
        } else {
            messageLines.push(`O valor do aluguel é de *${originalStr}*.`);
        }
    } else {
        // Lembrete
        messageLines.push(`Este é apenas um lembrete preventivo sobre o aluguel do imóvel *${property.name}*.`);
        messageLines.push(`O vencimento será em *${dueDateStr}* no valor de *${originalStr}*.`);
    }

    if (tenant.paymentMethod === 'pix' && tenant.pixKey) {
        messageLines.push(`\n🔑 *Chave PIX para pagamento:*`);
        messageLines.push(tenant.pixKey);
    } else {
        messageLines.push(`\nPor favor, realize o depósito ou transferência na conta combinada em contrato.`);
    }

    messageLines.push(`\nCaso já tenha efetuado o pagamento, pedimos a gentileza de nos enviar o comprovante para darmos baixa.\nQualquer dúvida, estamos à disposição!`);

    const finalMessage = messageLines.join('\n');
    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(finalMessage)}`;

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800 shadow-2xl">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-10">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl text-white ${isLate ? 'bg-red-500' : 'bg-primary'}`}>
                            <MessageCircle size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Gerar Cobrança</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{toneTitle}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-5 gap-8">
                    {/* Controls */}
                    <div className="md:col-span-2 space-y-6">

                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-slate-500">Valor Original</span>
                                <span className="font-medium dark:text-white">{originalStr}</span>
                            </div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-slate-500">Vencimento</span>
                                <span className={`font-medium ${isLate ? 'text-red-500' : 'text-slate-700 dark:text-slate-300'}`}>
                                    {dueDateStr} {isLate && `(${daysLate} dias)`}
                                </span>
                            </div>

                            <div className="pt-2 mt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between text-base">
                                <span className="font-bold text-slate-700 dark:text-white">Total Hoje</span>
                                <span className={`font-bold ${includeFines && isLate ? 'text-blue-600 dark:text-blue-400' : 'dark:text-white'}`}>
                                    {finalStr}
                                </span>
                            </div>
                        </div>

                        {isLate && (
                            <div className="space-y-4">
                                <label className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-colors">
                                    <input
                                        type="checkbox"
                                        className="w-5 h-5 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                                        checked={includeFines}
                                        onChange={(e) => setIncludeFines(e.target.checked)}
                                    />
                                    <div className="flex-1">
                                        <p className="font-bold text-slate-800 dark:text-white text-sm">Aplicar Multa e Juros</p>
                                        <p className="text-xs text-slate-500">Atualizar saldo devedor</p>
                                    </div>
                                    <Calculator size={18} className="text-blue-500" />
                                </label>

                                {includeFines && (
                                    <div className="grid grid-cols-2 gap-3 pl-2">
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 mb-1 block">Multa (%)</label>
                                            <input
                                                type="number"
                                                value={finePercentage}
                                                onChange={e => setFinePercentage(Number(e.target.value))}
                                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 mb-1 block">Juros a.m (%)</label>
                                            <input
                                                type="number"
                                                value={interestPerMonth}
                                                onChange={e => setInterestPerMonth(Number(e.target.value))}
                                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {(!phone || phone.length < 10) && (
                            <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/50 rounded-xl flex gap-2 text-sm text-orange-800 dark:text-orange-300">
                                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                                <p>Telefone do Inquilino parece estar incorreto ou vazio no cadastro principal.</p>
                            </div>
                        )}

                    </div>

                    {/* Preview */}
                    <div className="md:col-span-3 space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <FileText size={16} className="text-slate-400" />
                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Prévia da Mensagem</h3>
                        </div>

                        <div className="bg-[#E5DDD5] dark:bg-[#075E54]/20 rounded-2xl rounded-tr-sm p-4 relative shadow-sm border border-slate-200/50 dark:border-slate-800/50">
                            <p className="whitespace-pre-wrap text-sm text-[#111b21] dark:text-white font-sans leading-relaxed">
                                {finalMessage}
                            </p>
                            <div className="text-right mt-2 text-[10px] text-black/40 dark:text-white/40 font-bold">
                                MENSAGEM AUTOMÁTICA
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 pt-2">
                            <a
                                href={whatsappUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={onClose}
                                className="w-full py-3 bg-[#25D366] hover:bg-[#128C7E] text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-green-500/20"
                            >
                                <MessageCircle size={20} />
                                {isLate ? 'Enviar Cobrança' : 'Enviar Lembrete'}
                            </a>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(finalMessage);
                                    alert('Mensagem copiada para a área de transferência');
                                }}
                                className="text-sm font-bold text-slate-500 dark:text-slate-400 py-2 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                            >
                                Copiar apenas o texto
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
