import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { FolderOpen, FileText, FileImage, File, ExternalLink, Shield } from 'lucide-react';
import { format } from 'date-fns';

interface TenantDocumentsProps {
    tenant: any;
}

const CATEGORY_LABELS: Record<string, string> = {
    escritura: '📜 Escritura',
    iptu: '🏛️ IPTU',
    contrato: '📋 Contrato',
    vistoria: '🔍 Vistoria',
    rg: '🪪 RG',
    cpf: '🪪 CPF',
    comprovante_renda: '💰 Comp. Renda',
    comprovante_residencia: '🏠 Comp. Residência',
    outro: '📎 Outros Arquivos'
};

export default function TenantDocuments({ tenant }: TenantDocumentsProps) {
    const [documents, setDocuments] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!tenant) return;
        fetchDocuments();
    }, [tenant]);

    const fetchDocuments = async () => {
        setIsLoading(true);
        try {
            // The logged in tenant uses a JWT? No, they use RPC or just auth if we set up RLS properly.
            // But actually, we just query the documents table. The RLS might block it if anon.
            // Let's use get_tenant_dashboard_info or fetch normally. 
            // If RLS blocks, we might need an RPC. Let's try direct first.
            const { data, error } = await supabase
                .from('documents')
                .select('*')
                .eq('tenant_id', tenant.id)
                .order('created_at', { ascending: false });

            if (error) {
                console.warn('Could not fetch documents (RLS or error):', error);
            } else if (data) {
                setDocuments(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const getFileIcon = (type: string) => {
        if (['jpg', 'jpeg', 'png', 'webp'].includes(type)) return <FileImage size={24} className="text-blue-500" />;
        if (type === 'pdf') return <FileText size={24} className="text-red-500" />;
        return <File size={24} className="text-slate-400" />;
    };

    // Group by category
    const grouped = documents.reduce((acc, doc) => {
        if (!acc[doc.category]) acc[doc.category] = [];
        acc[doc.category].push(doc);
        return acc;
    }, {} as Record<string, any[]>);

    if (isLoading) {
        return (
            <div className="flex justify-center py-12">
                <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <div>
                    <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                        <Shield className="text-primary" /> Cofre de Documentos
                    </h3>
                    <p className="text-slate-500 text-sm">Visualize todos os documentos anexados pelo seu locador (Vistorias, Comprovantes, Contratos, etc).</p>
                </div>
            </div>

            {documents.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 text-center py-16">
                    <FolderOpen size={48} className="mx-auto text-slate-200 dark:text-slate-800 mb-4" />
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Seu cofre está vazio</h3>
                    <p className="text-slate-500 text-sm">Nenhum documento foi vinculado ao seu perfil até o momento.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Object.entries(grouped).map(([cat, docs]) => (
                        <div key={cat} className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                            <h4 className="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">
                                {CATEGORY_LABELS[cat] || cat}
                            </h4>
                            <div className="space-y-4">
                                {(docs as any[]).map(doc => (
                                    <div key={doc.id} className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group">
                                        <div className="w-12 h-12 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center shadow-sm shrink-0">
                                            {getFileIcon(doc.file_type)}
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <span className="block text-sm font-bold text-slate-800 dark:text-white truncate">{doc.title}</span>
                                            <span className="block text-xs text-slate-400">Adicionado em {format(new Date(doc.created_at), 'dd/MM/yyyy')}</span>
                                        </div>
                                        <a
                                            href={doc.file_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-10 h-10 flex items-center justify-center bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-xl transition-all shrink-0"
                                            title="Abrir Documento"
                                        >
                                            <ExternalLink size={18} />
                                        </a>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
