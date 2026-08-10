import React from 'react';
import { FileSignature, FileText, ShieldCheck, QrCode } from 'lucide-react';

interface TenantContractProps {
    contract: any;
    tenant: any;
    property: any;
    ownerProfile: any;
}

export default function TenantContract({ contract, tenant, property, ownerProfile }: TenantContractProps) {

    if (!contract) {
        return (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 text-center py-12">
                <FileSignature size={48} className="mx-auto text-slate-300 dark:text-slate-700 mb-4" />
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Nenhum contrato ativo</h3>
                <p className="text-slate-500">Seu contrato pode estar sob análise ou a locação foi encerrada.</p>
            </div>
        );
    }

    const titular = tenant?.residents?.find((r: any) => r.isTitular) || tenant?.residents?.[0];
    const otherResidents = tenant?.residents?.filter((r: any) => !r.isTitular) || [];

    const calculateDuration = () => {
        if (!contract?.startDate || !contract?.endDate) return 0;
        const start = new Date(contract.startDate);
        const end = new Date(contract.endDate);
        return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    };

    const getDefaultClauses = () => {
        return `7.1. O INQUILINO compromete-se a zelar pelo imóvel, mantendo-o em perfeitas condições de higiene e uso...
    7.2. É vedada a realização de benfeitorias ou obras sem autorização prévia.
    7.3. O atraso no pagamento implicará em multa estipulada em contrato.`;
    };

    return (
        <div className="space-y-6">

            {/* Resumo do contrato (Topo) */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <FileSignature className="text-primary" /> Visualização do Contrato
                        </h3>
                        <p className="text-sm text-slate-500">Ref: {contract.contractNumber}</p>
                    </div>
                    {tenant?.contractPdf && (
                        <a href={tenant.contractPdf} target="_blank" rel="noreferrer" className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-xl font-bold hover:bg-slate-200 transition-all flex items-center justify-center gap-2 text-sm">
                            <FileText size={16} />
                            Baixar Cópia em PDF
                        </a>
                    )}
                </div>
            </div>

            {/* Papel do Contrato Renderizado */}
            <div className="bg-white dark:bg-slate-950 p-8 md:p-12 shadow-sm border border-slate-200 dark:border-slate-800 rounded-lg min-h-[297mm] text-slate-800 dark:text-slate-200 font-serif leading-relaxed max-w-4xl mx-auto overflow-x-auto">
                <div className="text-center mb-12">
                    <h2 className="text-2xl font-bold uppercase tracking-widest mb-2">Contrato de Locação Residencial</h2>
                    <p className="text-sm font-bold text-slate-500 uppercase">Contrato Nº: {contract?.contractNumber}</p>
                </div>

                <section className="mb-8">
                    <h3 className="font-bold border-b border-slate-200 dark:border-slate-800 pb-2 mb-4 uppercase text-sm tracking-wider">1. Locador (Proprietário)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <p><span className="font-bold">Nome:</span> {ownerProfile?.name || 'Não informado'}</p>
                        <p><span className="font-bold">E-mail:</span> {ownerProfile?.email || 'Não informado'}</p>
                    </div>
                </section>

                <section className="mb-8">
                    <h3 className="font-bold border-b border-slate-200 dark:border-slate-800 pb-2 mb-4 uppercase text-sm tracking-wider">2. Imóvel Locado</h3>
                    <div className="text-sm space-y-2">
                        <p><span className="font-bold">Endereço:</span> {property?.address}</p>
                        <p><span className="font-bold">Tipo:</span> {property?.type}</p>
                    </div>
                </section>

                <section className="mb-8">
                    <h3 className="font-bold border-b border-slate-200 dark:border-slate-800 pb-2 mb-4 uppercase text-sm tracking-wider">3. Inquilino Principal</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <p><span className="font-bold">Nome:</span> {titular?.name}</p>
                        <p><span className="font-bold">CPF:</span> {titular?.cpf}</p>
                        <p><span className="font-bold">RG:</span> {titular?.rg}</p>
                        <p><span className="font-bold">Telefone:</span> {titular?.phone}</p>
                    </div>
                </section>

                {otherResidents.length > 0 && (
                    <section className="mb-8">
                        <h3 className="font-bold border-b border-slate-200 dark:border-slate-800 pb-2 mb-4 uppercase text-sm tracking-wider">4. Demais Moradores</h3>
                        <p className="text-sm mb-4">Quantidade de moradores adicionais: {otherResidents.length}</p>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs border-collapse min-w-[400px]">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-900">
                                        <th className="border border-slate-200 dark:border-slate-800 p-2 text-left">Nome</th>
                                        <th className="border border-slate-200 dark:border-slate-800 p-2 text-left">CPF</th>
                                        <th className="border border-slate-200 dark:border-slate-800 p-2 text-left">Nascimento</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {otherResidents.map((r: any, idx: number) => (
                                        <tr key={idx}>
                                            <td className="border border-slate-200 dark:border-slate-800 p-2">{r.name}</td>
                                            <td className="border border-slate-200 dark:border-slate-800 p-2">{r.cpf}</td>
                                            <td className="border border-slate-200 dark:border-slate-800 p-2">{r.birthDate}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}

                <section className="mb-8">
                    <h3 className="font-bold border-b border-slate-200 dark:border-slate-800 pb-2 mb-4 uppercase text-sm tracking-wider">5. Prazo da Locação</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        <p><span className="font-bold">Início:</span> {contract?.startDate ? new Date(contract.startDate).toLocaleDateString() : '-'}</p>
                        <p><span className="font-bold">Término:</span> {contract?.endDate ? new Date(contract.endDate).toLocaleDateString() : '-'}</p>
                        <p><span className="font-bold">Duração:</span> {calculateDuration()} meses</p>
                    </div>
                </section>

                <section className="mb-8">
                    <h3 className="font-bold border-b border-slate-200 dark:border-slate-800 pb-2 mb-4 uppercase text-sm tracking-wider">6. Valores e Pagamentos</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <p><span className="font-bold">Aluguel Mensal:</span> R$ {contract?.monthlyValue?.toLocaleString()}</p>
                        <p><span className="font-bold">Vencimento:</span> Todo dia {contract?.dueDay}</p>
                        <p><span className="font-bold">Garantia (Caução):</span> R$ {contract?.guaranteeValue?.toLocaleString()}</p>
                        <p><span className="font-bold">Forma:</span> {contract?.paymentMethod}</p>
                        {contract?.pixKey && <p className="col-span-1 sm:col-span-2"><span className="font-bold">Chave PIX:</span> {contract.pixKey}</p>}
                    </div>
                </section>

                <section className="mb-8">
                    <h3 className="font-bold border-b border-slate-200 dark:border-slate-800 pb-2 mb-4 uppercase text-sm tracking-wider">7. Responsabilidades e Cláusulas</h3>
                    <div className="text-[10px] space-y-2 opacity-80 text-justify whitespace-pre-wrap">
                        {contract?.clauses || getDefaultClauses()}
                    </div>
                </section>

                <section className="mb-12">
                    <h3 className="font-bold border-b border-slate-200 dark:border-slate-800 pb-2 mb-4 uppercase text-sm tracking-wider">8. Vistoria do Imóvel</h3>
                    <div className="text-[10px] opacity-80 space-y-2">
                        <p>O imóvel foi entregue ao INQUILINO em plenas condições de uso, conforme laudo de vistoria anexo e fotos digitais armazenadas no sistema.</p>
                        <div className="flex items-center gap-2 text-primary font-bold">
                            <ShieldCheck size={14} /> Vistoria Digital Realizada e Vinculada a este contrato.
                        </div>
                    </div>
                </section>

                <div className="mt-20 grid grid-cols-1 sm:grid-cols-2 gap-12">
                    <div className="text-center">
                        <div className="h-20 border-b border-slate-300 dark:border-slate-700 mb-2 flex items-center justify-center">
                            {contract?.tenantSignature && (
                                <img src={contract.tenantSignature} className="max-h-full" alt="Assinatura Inquilino" />
                            )}
                        </div>
                        <p className="text-xs font-bold uppercase">Assinatura do Inquilino</p>
                        <p className="text-[8px] text-slate-400">{contract?.tenantSignature ? 'Assinado Digitalmente' : 'Pendente'}</p>
                    </div>
                    <div className="text-center">
                        <div className="h-20 border-b border-slate-300 dark:border-slate-700 mb-2 flex items-center justify-center">
                            {contract?.landlordSignature && (
                                <img src={contract.landlordSignature} className="max-h-full" alt="Assinatura Locador" />
                            )}
                        </div>
                        <p className="text-xs font-bold uppercase">Assinatura do Locador</p>
                        <p className="text-[8px] text-slate-400">{contract?.landlordSignature ? 'Assinado Digitalmente' : 'Pendente'}</p>
                    </div>
                </div>

                <div className="mt-12 pt-8 border-t border-slate-100 dark:border-slate-900 flex justify-between items-end">
                    <div className="space-y-1">
                        <p className="text-[8px] font-bold text-slate-400 uppercase">Validação Eletrônica</p>
                        <p className="text-[8px] font-mono text-slate-400">HASH: {contract?.validationHash || 'PENDENTE'}</p>
                        <p className="text-[8px] text-slate-400">Data: {contract?.signatureDate ? new Date(contract.signatureDate).toLocaleDateString() : '-'} | IP: {contract?.signatureIP || '-'}</p>
                    </div>
                    <div className="w-16 h-16 opacity-50">
                        <QrCode size={64} className="text-slate-400" />
                    </div>
                </div>
            </div>

        </div>
    );
}
