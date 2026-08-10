import React, { useRef } from 'react';
import { FileSignature, FileText, ShieldCheck, QrCode, Printer, Download } from 'lucide-react';

interface TenantContractProps {
    contract: any;
    tenant: any;
    property: any;
    ownerProfile: any;
}

export default function TenantContract({ contract, tenant, property, ownerProfile }: TenantContractProps) {
    const printRef = useRef<HTMLDivElement>(null);

    const handlePrint = () => {
        const printContent = printRef.current?.innerHTML;
        if (!printContent) return;

        const win = window.open('', '_blank', 'width=900,height=1200');
        if (!win) return;

        win.document.write(`
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8" />
                <title>Contrato de Locação – ${contract?.contractNumber}</title>
                <style>
                    * { box-sizing: border-box; margin: 0; padding: 0; }
                    body {
                        font-family: 'Georgia', 'Times New Roman', serif;
                        font-size: 11pt;
                        color: #1e293b;
                        background: #fff;
                        padding: 20mm 18mm;
                        line-height: 1.7;
                    }
                    .print-header {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        border-bottom: 2px solid #2563eb;
                        padding-bottom: 12px;
                        margin-bottom: 28px;
                    }
                    .print-header img {
                        height: 50px;
                        object-fit: contain;
                    }
                    .print-header .brand-info {
                        text-align: right;
                    }
                    .print-header .brand-info p {
                        font-size: 8pt;
                        color: #64748b;
                    }
                    .print-header .brand-info strong {
                        font-size: 10pt;
                        color: #2563eb;
                        font-family: Arial, sans-serif;
                    }
                    h1 {
                        text-align: center;
                        font-size: 15pt;
                        text-transform: uppercase;
                        letter-spacing: 2px;
                        margin-bottom: 6px;
                    }
                    .contract-number {
                        text-align: center;
                        font-size: 9pt;
                        color: #64748b;
                        text-transform: uppercase;
                        margin-bottom: 28px;
                        font-weight: bold;
                    }
                    section { margin-bottom: 22px; }
                    h3 {
                        font-size: 9pt;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                        border-bottom: 1px solid #e2e8f0;
                        padding-bottom: 4px;
                        margin-bottom: 10px;
                        color: #374151;
                    }
                    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; }
                    .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px 16px; }
                    p { font-size: 10pt; margin-bottom: 4px; }
                    span.label { font-weight: bold; }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        font-size: 9pt;
                    }
                    th, td { border: 1px solid #e2e8f0; padding: 6px 8px; }
                    th { background: #f8fafc; font-weight: bold; text-align: left; }
                    .clauses {
                        font-size: 9pt;
                        white-space: pre-wrap;
                        text-align: justify;
                        opacity: 0.85;
                    }
                    .signatures {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 40px;
                        margin-top: 60px;
                    }
                    .sig-box { text-align: center; }
                    .sig-line {
                        height: 60px;
                        border-bottom: 1px solid #94a3b8;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin-bottom: 6px;
                    }
                    .sig-line img { max-height: 100%; }
                    .sig-label { font-size: 8pt; text-transform: uppercase; font-weight: bold; }
                    .sig-sub { font-size: 7pt; color: #94a3b8; }
                    .footer-validation {
                        margin-top: 40px;
                        padding-top: 16px;
                        border-top: 1px solid #f1f5f9;
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-end;
                    }
                    .footer-validation p { font-size: 7pt; color: #94a3b8; }
                    .footer-validation .hash { font-family: monospace; }
                    .shield-check { color: #2563eb; font-weight: bold; font-size: 9pt; }
                    @media print {
                        body { padding: 15mm; }
                        .no-print { display: none !important; }
                    }
                    .print-watermark {
                        position: fixed;
                        bottom: 10mm;
                        right: 10mm;
                        font-size: 7pt;
                        color: #cbd5e1;
                        font-family: Arial, sans-serif;
                    }
                </style>
            </head>
            <body>
                <div class="print-header">
                    <img src="${window.location.origin}/logocanvas%20AlugaFacil.png" alt="AlugaFácil" onerror="this.style.display='none'" />
                    <div class="brand-info">
                        <strong>AlugaFácil</strong>
                        <p>Plataforma de Gestão Imobiliária</p>
                        <p>${window.location.origin}</p>
                    </div>
                </div>

                <h1>Contrato de Locação Residencial</h1>
                <p class="contract-number">Contrato Nº: ${contract?.contractNumber}</p>

                <section>
                    <h3>1. Locador (Proprietário)</h3>
                    <div class="grid-2">
                        <p><span class="label">Nome:</span> ${ownerProfile?.name || 'Não informado'}</p>
                        <p><span class="label">E-mail:</span> ${ownerProfile?.email || 'Não informado'}</p>
                    </div>
                </section>

                <section>
                    <h3>2. Imóvel Locado</h3>
                    <p><span class="label">Endereço:</span> ${property?.address || '-'}</p>
                    <p><span class="label">Tipo:</span> ${property?.type || '-'}</p>
                </section>

                <section>
                    <h3>3. Inquilino Principal</h3>
                    <div class="grid-2">
                        <p><span class="label">Nome:</span> ${tenant?.residents?.[0]?.name || '-'}</p>
                        <p><span class="label">CPF:</span> ${tenant?.residents?.[0]?.cpf || '-'}</p>
                        <p><span class="label">RG:</span> ${tenant?.residents?.[0]?.rg || '-'}</p>
                        <p><span class="label">Telefone:</span> ${tenant?.residents?.[0]?.phone || '-'}</p>
                    </div>
                </section>

                <section>
                    <h3>4. Prazo da Locação</h3>
                    <div class="grid-3">
                        <p><span class="label">Início:</span> ${contract?.startDate ? new Date(contract.startDate).toLocaleDateString('pt-BR') : '-'}</p>
                        <p><span class="label">Término:</span> ${contract?.endDate ? new Date(contract.endDate).toLocaleDateString('pt-BR') : '-'}</p>
                        <p><span class="label">Vencimento:</span> Todo dia ${contract?.dueDay}</p>
                    </div>
                </section>

                <section>
                    <h3>5. Valores e Pagamentos</h3>
                    <div class="grid-2">
                        <p><span class="label">Aluguel Mensal:</span> R$ ${contract?.monthlyValue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '-'}</p>
                        <p><span class="label">Garantia (Caução):</span> R$ ${contract?.guaranteeValue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}</p>
                        <p><span class="label">Forma de Pagamento:</span> ${contract?.paymentMethod || '-'}</p>
                        ${contract?.pixKey ? `<p><span class="label">Chave PIX:</span> ${contract.pixKey}</p>` : ''}
                    </div>
                </section>

                <section>
                    <h3>6. Cláusulas e Responsabilidades</h3>
                    <div class="clauses">${(contract?.clauses || '7.1. O INQUILINO compromete-se a zelar pelo imóvel, mantendo-o em perfeitas condições de higiene e uso.\n7.2. É vedada a realização de benfeitorias ou obras sem autorização prévia.\n7.3. O atraso no pagamento implicará em multa estipulada em contrato.').replace(/</g, '&lt;')}</div>
                </section>

                <section>
                    <h3>7. Vistoria do Imóvel</h3>
                    <p>O imóvel foi entregue ao INQUILINO em plenas condições de uso, conforme laudo de vistoria e fotos digitais armazenadas no sistema.</p>
                    <p class="shield-check">✓ Vistoria Digital Realizada e Vinculada a este contrato.</p>
                </section>

                <div class="signatures">
                    <div class="sig-box">
                        <div class="sig-line">
                            ${contract?.tenantSignature ? `<img src="${contract.tenantSignature}" alt="Assinatura Inquilino" />` : ''}
                        </div>
                        <p class="sig-label">Assinatura do Inquilino</p>
                        <p class="sig-sub">${contract?.tenantSignature ? 'Assinado Digitalmente' : 'Pendente'}</p>
                    </div>
                    <div class="sig-box">
                        <div class="sig-line">
                            ${contract?.landlordSignature ? `<img src="${contract.landlordSignature}" alt="Assinatura Locador" />` : ''}
                        </div>
                        <p class="sig-label">Assinatura do Locador</p>
                        <p class="sig-sub">${contract?.landlordSignature ? 'Assinado Digitalmente' : 'Pendente'}</p>
                    </div>
                </div>

                <div class="footer-validation">
                    <div>
                        <p style="font-weight:bold;text-transform:uppercase;margin-bottom:2px">Validação Eletrônica</p>
                        <p class="hash">HASH: ${contract?.validationHash || 'PENDENTE'}</p>
                        <p>Data: ${contract?.signatureDate ? new Date(contract.signatureDate).toLocaleDateString('pt-BR') : '-'} | IP: ${contract?.signatureIP || '-'}</p>
                    </div>
                </div>

                <div class="print-watermark">Gerado por AlugaFácil · ${new Date().toLocaleString('pt-BR')}</div>

                <script>
                    window.onload = function() { window.print(); }
                <\/script>
            </body>
            </html>
        `);
        win.document.close();
    };

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

            {/* Cabeçalho de ações */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <FileSignature className="text-primary" /> Visualização do Contrato
                        </h3>
                        <p className="text-sm text-slate-500">Ref: {contract.contractNumber}</p>
                    </div>
                    <div className="flex flex-wrap gap-3 w-full md:w-auto">
                        {/* Botão principal: Imprimir / Salvar como PDF */}
                        <button
                            onClick={handlePrint}
                            className="flex-1 md:flex-none bg-primary text-white px-5 py-2.5 rounded-xl font-bold hover:bg-opacity-90 transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-primary/20"
                        >
                            <Printer size={16} />
                            Imprimir / Salvar PDF
                        </button>

                        {/* Botão secundário: PDF direto se houver link salvo */}
                        {tenant?.contractPdf && (
                            <a
                                href={tenant.contractPdf}
                                target="_blank"
                                rel="noreferrer"
                                className="flex-1 md:flex-none bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-5 py-2.5 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2 text-sm"
                            >
                                <Download size={16} />
                                Baixar PDF Original
                            </a>
                        )}
                    </div>
                </div>
            </div>

            {/* Papel do Contrato (visualização na tela) */}
            <div ref={printRef} className="bg-white dark:bg-slate-950 p-8 md:p-12 shadow-sm border border-slate-200 dark:border-slate-800 rounded-lg min-h-[297mm] text-slate-800 dark:text-slate-200 font-serif leading-relaxed max-w-4xl mx-auto overflow-x-auto">

                {/* Logo no topo do contrato */}
                <div className="flex items-center justify-between border-b-2 border-primary pb-4 mb-10">
                    <img
                        src="/logocanvas%20AlugaFacil.png"
                        alt="AlugaFácil"
                        className="h-10 object-contain"
                        style={{ mixBlendMode: 'multiply' }}
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                    <div className="text-right">
                        <p className="text-xs font-bold text-primary">AlugaFácil</p>
                        <p className="text-[10px] text-slate-400">Plataforma de Gestão Imobiliária</p>
                    </div>
                </div>

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
                        <p><span className="font-bold">Início:</span> {contract?.startDate ? new Date(contract.startDate).toLocaleDateString('pt-BR') : '-'}</p>
                        <p><span className="font-bold">Término:</span> {contract?.endDate ? new Date(contract.endDate).toLocaleDateString('pt-BR') : '-'}</p>
                        <p><span className="font-bold">Duração:</span> {calculateDuration()} meses</p>
                    </div>
                </section>

                <section className="mb-8">
                    <h3 className="font-bold border-b border-slate-200 dark:border-slate-800 pb-2 mb-4 uppercase text-sm tracking-wider">6. Valores e Pagamentos</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <p><span className="font-bold">Aluguel Mensal:</span> R$ {contract?.monthlyValue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        <p><span className="font-bold">Vencimento:</span> Todo dia {contract?.dueDay}</p>
                        <p><span className="font-bold">Garantia (Caução):</span> R$ {contract?.guaranteeValue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
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
                        <p className="text-[8px] text-slate-400">Data: {contract?.signatureDate ? new Date(contract.signatureDate).toLocaleDateString('pt-BR') : '-'} | IP: {contract?.signatureIP || '-'}</p>
                    </div>
                    <div className="w-16 h-16 opacity-50">
                        <QrCode size={64} className="text-slate-400" />
                    </div>
                </div>
            </div>

        </div>
    );
}
