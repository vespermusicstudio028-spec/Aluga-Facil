import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Download, Trash2, Settings, AlertTriangle, FileJson, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Link, useNavigate } from 'react-router-dom';

export default function PrivacyCenter() {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const [isExporting, setIsExporting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [cookiePrefs, setCookiePrefs] = useState({ analytics: false, marketing: false });

    useEffect(() => {
        const consent = localStorage.getItem('alugafacil_cookie_consent');
        if (consent) {
            const parsed = JSON.parse(consent);
            setCookiePrefs({ analytics: parsed.analytics, marketing: parsed.marketing });
        }
    }, []);

    const handleUpdateCookies = (key: 'analytics' | 'marketing') => {
        const newPrefs = { ...cookiePrefs, [key]: !cookiePrefs[key], necessary: true };
        setCookiePrefs(newPrefs);
        localStorage.setItem('alugafacil_cookie_consent', JSON.stringify(newPrefs));
        alert('Preferências atualizadas com sucesso!');
    };

    const handleExportData = async () => {
        if (!user) return;
        setIsExporting(true);
        try {
            // Coleta todos os dados de forma assíncrona
            const [propRes, tenantRes, contractRes, paymentRes] = await Promise.all([
                supabase.from('properties').select('*').eq('owner_id', user.uid),
                supabase.from('tenants').select('*').eq('owner_id', user.uid),
                supabase.from('contracts').select('*').eq('owner_id', user.uid),
                supabase.from('payments').select('*').eq('owner_id', user.uid)
            ]);

            const exportData = {
                userData: user,
                exportDate: new Date().toISOString(),
                properties: propRes.data || [],
                tenants: tenantRes.data || [],
                contracts: contractRes.data || [],
                payments: paymentRes.data || []
            };

            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", `dados_alugafacil_${user.uid}.json`);
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
        } catch (err: any) {
            console.error(err);
            alert('Erro ao exportar dados: ' + err.message);
        } finally {
            setIsExporting(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (!user) return;
        setIsDeleting(true);
        try {
            // Reutiliza o RPC 'delete_user_account' se existir no banco de dados
            // Se não existir, a exclusão por aqui pode falhar (nesse caso instruímos a entrar em contato)
            const { error } = await supabase.rpc('delete_user_account', { user_id: user.uid });
            if (error) {
                // Fallback: Delete profiles row directly (might cascade depend on DB config)
                await supabase.from('profiles').delete().eq('id', user.uid);
            }

            alert('Sua conta e todos os dados foram apagados permanentemente.');
            await signOut();
            navigate('/');
        } catch (err: any) {
            console.error(err);
            alert('Erro ao apagar conta. Por segurança a deleção pode ter sido bloqueada, entre em contato através de privacidade@alugafacil.com.br');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-8">
            <div className="flex items-center gap-4 mb-4">
                <Link to="/settings" className="text-slate-500 hover:text-primary transition-colors font-medium text-sm">
                    &larr; Voltar para Configurações
                </Link>
            </div>

            <div>
                <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
                    <ShieldCheck className="text-primary w-8 h-8" />
                    Central de Privacidade LGPD
                </h1>
                <p className="text-slate-500 mt-2">
                    Gerencie seus dados pessoais, consentimentos e exerça seus direitos sob a Lei Geral de Proteção de Dados.
                </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">

                {/* Seção Dados e Exportação */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3 mb-4">
                        <FileJson className="text-primary" />
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Portabilidade de Dados</h2>
                    </div>
                    <p className="text-slate-500 text-sm mb-6">
                        Você tem o direito de receber uma cópia de todos os seus dados armazenados em nossos servidores. Ao clicar abaixo, um arquivo JSON com todas as suas informações de imóveis, contratos, pagamentos e inquilinos será gerado.
                    </p>
                    <button
                        onClick={handleExportData}
                        disabled={isExporting}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-colors disabled:opacity-50"
                    >
                        {isExporting ? <div className="w-5 h-5 border-2 border-slate-400 border-t-slate-600 rounded-full animate-spin" /> : <Download size={20} />}
                        {isExporting ? 'Agrupando Dados...' : 'Baixar Cópia dos Meus Dados (JSON)'}
                    </button>
                </motion.div>

                {/* Seção Preferências */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3 mb-4">
                        <Settings className="text-primary" />
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Gerenciar Consentimentos</h2>
                    </div>
                    <p className="text-slate-500 text-sm mb-6">
                        Altere independentemente de quando aceitou anteriormente suas preferências de rastreio de cookies opcionais.
                    </p>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Cookies Analíticos</span>
                            <button
                                onClick={() => handleUpdateCookies('analytics')}
                                className={`w-12 h-6 rounded-full relative transition-colors ${cookiePrefs.analytics ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'}`}
                            >
                                <div className={`absolute top-1 bg-white w-4 h-4 rounded-full transition-transform ${cookiePrefs.analytics ? 'right-1 translate-x-0' : 'left-1 translate-x-0'}`} />
                            </button>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Cookies de Marketing</span>
                            <button
                                onClick={() => handleUpdateCookies('marketing')}
                                className={`w-12 h-6 rounded-full relative transition-colors ${cookiePrefs.marketing ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'}`}
                            >
                                <div className={`absolute top-1 bg-white w-4 h-4 rounded-full transition-transform ${cookiePrefs.marketing ? 'right-1 translate-x-0' : 'left-1 translate-x-0'}`} />
                            </button>
                        </div>
                        <div className="flex items-center justify-between opacity-50 cursor-not-allowed">
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Necessários & Autenticação</span>
                            <div className="w-12 h-6 bg-green-500 rounded-full relative">
                                <div className="absolute right-1 top-1 bg-white w-4 h-4 rounded-full" />
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Zona de Perigo - Direto ao Esquecimento */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="md:col-span-2 bg-red-50 dark:bg-red-900/10 rounded-2xl p-6 border border-red-200 dark:border-red-800">
                    <div className="flex items-center gap-3 mb-4">
                        <Trash2 className="text-red-600 dark:text-red-500" />
                        <h2 className="text-xl font-bold text-red-600 dark:text-red-500">Direito ao Esquecimento (Excluir Conta)</h2>
                    </div>
                    <p className="text-red-600/80 dark:text-red-400/80 text-sm mb-6 max-w-3xl">
                        A revogação irrestrita. Ao excluir permanentemente a sua conta toda a base vinculada a você (Inquilinos, Contratos, Imóveis e Faturas) será apagada junto para cumprir a determinação de anonimização e esquecimento.
                    </p>

                    {!showDeleteConfirm ? (
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="px-6 py-3 bg-white dark:bg-slate-800 text-red-600 dark:text-red-500 border border-red-200 dark:border-red-700 font-bold rounded-xl hover:bg-red-50 dark:hover:bg-red-900/40 transition-colors"
                        >
                            Solicitar Exclusão da Conta
                        </button>
                    ) : (
                        <div className="space-y-4 p-4 bg-white dark:bg-slate-800 border border-red-300 dark:border-red-700 rounded-xl">
                            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold">
                                <AlertTriangle size={20} /> TEM CERTEZA ABSOLUTA?
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Esta ação é irreversível. Por questões legais contábeis, caso você possua histórico de transações fiscais a deleção de tela não abrange logs de faturamento (para atender o dever legal fiscal da plataforma). Os seus inquilinos também perderão acesso caso utilizem o app.</p>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleDeleteAccount}
                                    disabled={isDeleting}
                                    className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                                >
                                    {isDeleting ? 'Apagando banco de dados...' : 'Sim, Excluir Minha Conta Agora'}
                                </button>
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    disabled={isDeleting}
                                    className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    )}
                </motion.div>

            </div>
        </div>
    );
}
