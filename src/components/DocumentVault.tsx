import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { uploadBase64Image } from '../lib/storage';
import { useAuth } from '../contexts/AuthContext';
import { VaultDocument, DocumentCategory } from '../types';
import {
    FolderOpen, Upload, FileText, FileImage, File, Trash2,
    ExternalLink, Plus, X, Shield, ChevronDown, ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DocumentVaultProps {
    propertyId?: string;
    tenantId?: string;
    context?: 'property' | 'tenant';
}

const CATEGORY_LABELS: Record<DocumentCategory, string> = {
    escritura: '📜 Escritura',
    iptu: '🏛️ IPTU',
    contrato: '📋 Contrato',
    vistoria: '🔍 Vistoria',
    rg: '🪪 RG',
    cpf: '🪪 CPF',
    comprovante_renda: '💰 Comp. Renda',
    comprovante_residencia: '🏠 Comp. Residência',
    outro: '📎 Outro'
};

const PROPERTY_CATEGORIES: DocumentCategory[] = ['escritura', 'iptu', 'contrato', 'vistoria', 'outro'];
const TENANT_CATEGORIES: DocumentCategory[] = ['rg', 'cpf', 'comprovante_renda', 'comprovante_residencia', 'contrato', 'outro'];

export default function DocumentVault({ propertyId, tenantId, context = 'property' }: DocumentVaultProps) {
    const { user } = useAuth();
    const [documents, setDocuments] = useState<VaultDocument[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newDoc, setNewDoc] = useState({ title: '', category: (context === 'tenant' ? 'rg' : 'escritura') as DocumentCategory });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const categories = context === 'tenant' ? TENANT_CATEGORIES : PROPERTY_CATEGORIES;

    useEffect(() => {
        if (!isExpanded) return;
        fetchDocuments();
    }, [isExpanded, propertyId, tenantId]);

    const fetchDocuments = async () => {
        setIsLoading(true);
        try {
            let query = supabase.from('documents').select('*').eq('owner_id', user?.uid);
            if (propertyId) query = query.eq('property_id', propertyId);
            if (tenantId) query = query.eq('tenant_id', tenantId);
            const { data } = await query.order('created_at', { ascending: false });
            if (data) setDocuments(data.map(d => ({
                id: d.id,
                ownerId: d.owner_id,
                propertyId: d.property_id,
                tenantId: d.tenant_id,
                category: d.category,
                title: d.title,
                fileUrl: d.file_url,
                fileType: d.file_type,
                createdAt: d.created_at
            })));
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0] || null;
        setSelectedFile(f);
        if (f && !newDoc.title) setNewDoc(prev => ({ ...prev, title: f.name.replace(/\.[^/.]+$/, '') }));
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFile || !user) return;
        setIsUploading(true);

        try {
            const ext = selectedFile.name.split('.').pop()?.toLowerCase() || 'bin';
            const path = `${user.uid}/docs/${Date.now()}_${newDoc.category}.${ext}`;

            // Read file as base64 or upload directly
            const isImage = selectedFile.type.startsWith('image/');
            let fileUrl = '';

            if (isImage) {
                const reader = new FileReader();
                await new Promise<void>((resolve, reject) => {
                    reader.onloadend = async () => {
                        try {
                            fileUrl = await uploadBase64Image('property-photos', path, reader.result as string);
                            resolve();
                        } catch (err) {
                            reject(err);
                        }
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(selectedFile);
                });
            } else {
                // Non-image: upload with supabase storage directly
                const { data, error } = await supabase.storage
                    .from('property-photos')
                    .upload(path, selectedFile, { upsert: true });
                if (error) throw error;
                const { data: { publicUrl } } = supabase.storage.from('property-photos').getPublicUrl(path);
                fileUrl = publicUrl;
            }

            await supabase.from('documents').insert({
                owner_id: user.uid,
                property_id: propertyId || null,
                tenant_id: tenantId || null,
                category: newDoc.category,
                title: newDoc.title || selectedFile.name,
                file_url: fileUrl,
                file_type: ext,
                created_at: new Date().toISOString()
            });

            setIsAddOpen(false);
            setSelectedFile(null);
            setNewDoc({ title: '', category: categories[0] });
            fetchDocuments();
        } catch (err) {
            console.error(err);
            alert('Erro ao fazer upload do documento.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Remover este documento?')) return;
        try {
            await supabase.from('documents').delete().eq('id', id);
            fetchDocuments();
        } catch (err) {
            console.error(err);
        }
    };

    const getFileIcon = (type: string) => {
        if (['jpg', 'jpeg', 'png', 'webp'].includes(type)) return <FileImage size={20} className="text-blue-500" />;
        if (type === 'pdf') return <FileText size={20} className="text-red-500" />;
        return <File size={20} className="text-slate-400" />;
    };

    // Group documents by category
    const grouped = documents.reduce((acc, doc) => {
        if (!acc[doc.category]) acc[doc.category] = [];
        acc[doc.category].push(doc);
        return acc;
    }, {} as Record<string, VaultDocument[]>);

    return (
        <div className="mt-6 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
            {/* Header */}
            <button
                onClick={() => setIsExpanded(prev => !prev)}
                className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <Shield size={20} className="text-primary" />
                    <span className="font-bold text-slate-800 dark:text-white">Cofre de Documentos</span>
                    {documents.length > 0 && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                            {documents.length} arquivo{documents.length !== 1 ? 's' : ''}
                        </span>
                    )}
                </div>
                {isExpanded ? <ChevronUp size={18} className="text-slate-500" /> : <ChevronDown size={18} className="text-slate-500" />}
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
                        <div className="p-4 space-y-4 bg-white dark:bg-slate-900">
                            {/* Add button */}
                            <div className="flex justify-end">
                                <button
                                    onClick={() => setIsAddOpen(prev => !prev)}
                                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-bold rounded-xl shadow hover:bg-opacity-90 transition-all"
                                >
                                    {isAddOpen ? <X size={16} /> : <Plus size={16} />}
                                    {isAddOpen ? 'Cancelar' : 'Novo Documento'}
                                </button>
                            </div>

                            {/* Upload Form */}
                            <AnimatePresence>
                                {isAddOpen && (
                                    <motion.form
                                        onSubmit={handleUpload}
                                        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                                        className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3"
                                    >
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Categoria</label>
                                                <select
                                                    value={newDoc.category}
                                                    onChange={e => setNewDoc(prev => ({ ...prev, category: e.target.value as DocumentCategory }))}
                                                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-primary dark:text-white"
                                                >
                                                    {categories.map(c => (
                                                        <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Título (Opcional)</label>
                                                <input
                                                    type="text"
                                                    value={newDoc.title}
                                                    onChange={e => setNewDoc(prev => ({ ...prev, title: e.target.value }))}
                                                    placeholder="Nome do documento..."
                                                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-primary dark:text-white"
                                                />
                                            </div>
                                        </div>

                                        <label className={`flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed rounded-xl cursor-pointer transition-all ${selectedFile ? 'border-primary bg-primary/5' : 'border-slate-300 dark:border-slate-600 hover:border-primary'}`}>
                                            <Upload size={24} className={selectedFile ? 'text-primary' : 'text-slate-400'} />
                                            <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                                                {selectedFile ? selectedFile.name : 'Clique para selecionar PDF, imagem ou outro arquivo'}
                                            </span>
                                            <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={handleFileChange} className="hidden" />
                                        </label>

                                        <button
                                            type="submit"
                                            disabled={isUploading || !selectedFile}
                                            className="w-full py-2.5 bg-primary text-white text-sm font-bold rounded-xl disabled:opacity-60 transition-all flex items-center justify-center gap-2"
                                        >
                                            {isUploading ? (
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            ) : (
                                                <><Upload size={16} /> Enviar Documento</>
                                            )}
                                        </button>
                                    </motion.form>
                                )}
                            </AnimatePresence>

                            {/* Document List */}
                            {isLoading ? (
                                <div className="flex justify-center py-6">
                                    <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                </div>
                            ) : documents.length === 0 ? (
                                <div className="text-center py-8 text-slate-400">
                                    <FolderOpen size={36} className="mx-auto mb-2 opacity-50" />
                                    <p className="text-sm font-semibold">Nenhum documento armazenado</p>
                                    <p className="text-xs mt-1">Adicione escrituras, contratos, IPTU e mais.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {Object.entries(grouped).map(([cat, docs]) => (
                                        <div key={cat}>
                                            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">
                                                {CATEGORY_LABELS[cat as DocumentCategory]}
                                            </h4>
                                            <div className="space-y-2">
                                                {docs.map(doc => (
                                                    <div key={doc.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                                                        {getFileIcon(doc.fileType)}
                                                        <span className="flex-1 text-sm font-semibold text-slate-800 dark:text-white truncate">{doc.title}</span>
                                                        <span className="text-xs text-slate-400 uppercase font-mono">.{doc.fileType}</span>
                                                        <a
                                                            href={doc.fileUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                                            title="Abrir"
                                                        >
                                                            <ExternalLink size={16} />
                                                        </a>
                                                        <button
                                                            onClick={() => handleDelete(doc.id)}
                                                            className="p-1.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                            title="Remover"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
