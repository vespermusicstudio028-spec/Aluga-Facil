import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cookie, X, Check, Settings, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

interface CookiePreferences {
    necessary: boolean;
    analytics: boolean;
    marketing: boolean;
}

export default function CookieBanner() {
    const [isVisible, setIsVisible] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [preferences, setPreferences] = useState<CookiePreferences>({
        necessary: true, // Always true
        analytics: false,
        marketing: false
    });

    useEffect(() => {
        const consent = localStorage.getItem('alugafacil_cookie_consent');
        if (!consent) {
            setIsVisible(true);
        } else {
            setPreferences(JSON.parse(consent));
        }
    }, []);

    const handleAcceptAll = () => {
        const prefs = { necessary: true, analytics: true, marketing: true };
        localStorage.setItem('alugafacil_cookie_consent', JSON.stringify(prefs));
        setPreferences(prefs);
        setIsVisible(false);
        setShowSettings(false);
    };

    const handleSaveSettings = () => {
        localStorage.setItem('alugafacil_cookie_consent', JSON.stringify(preferences));
        setIsVisible(false);
        setShowSettings(false);
    };

    const handleDeclineOptional = () => {
        const prefs = { necessary: true, analytics: false, marketing: false };
        localStorage.setItem('alugafacil_cookie_consent', JSON.stringify(prefs));
        setPreferences(prefs);
        setIsVisible(false);
        setShowSettings(false);
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    className="fixed bottom-0 left-0 right-0 z-50 p-4 pointer-events-none flex justify-center"
                >
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl p-6 md:p-8 max-w-4xl w-full pointer-events-auto relative">
                        <button
                            onClick={() => setIsVisible(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        >
                            <X size={20} />
                        </button>

                        {!showSettings ? (
                            <div className="flex flex-col md:flex-row items-center gap-6">
                                <div className="flex-1 text-center md:text-left">
                                    <div className="flex items-center gap-3 mb-2 justify-center md:justify-start">
                                        <Cookie className="text-primary w-6 h-6" />
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Sua privacidade é importante</h3>
                                    </div>
                                    <p className="text-slate-600 dark:text-slate-400 text-sm">
                                        Utilizamos cookies para oferecer a melhor experiência, analisar o tráfego do site e personalizar conteúdo.
                                        Você pode aceitar todos os cookies ou configurar suas preferências. Saiba mais em nossa {' '}
                                        <Link to="/politica-de-privacidade" className="text-primary hover:underline font-medium">Política de Privacidade</Link>.
                                    </p>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                                    <button
                                        onClick={() => setShowSettings(true)}
                                        className="px-6 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
                                    >
                                        Configurar
                                    </button>
                                    <button
                                        onClick={handleDeclineOptional}
                                        className="px-6 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
                                    >
                                        Recusar opcionais
                                    </button>
                                    <button
                                        onClick={handleAcceptAll}
                                        className="px-6 py-2 bg-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:bg-opacity-90 transition-all whitespace-nowrap"
                                    >
                                        Aceitar Todos
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col">
                                <div className="flex items-center pb-4 mb-4 border-b border-slate-100 dark:border-slate-800 gap-3">
                                    <Settings className="text-primary" />
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Preferências de Cookies</h3>
                                </div>

                                <div className="space-y-4 mb-6">
                                    {/* Necessários */}
                                    <div className="flex items-start justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50">
                                        <div>
                                            <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                                Estritamente Necessários <ShieldCheck size={16} className="text-green-500" />
                                            </h4>
                                            <p className="text-sm text-slate-500 mt-1 pb-1">Essenciais para autenticação, segurança e navegação. Não podem ser desativados.</p>
                                        </div>
                                        <div className="w-12 h-6 bg-green-500 rounded-full relative opacity-70 cursor-not-allowed">
                                            <div className="absolute right-1 top-1 bg-white w-4 h-4 rounded-full" />
                                        </div>
                                    </div>

                                    {/* Estatísticos */}
                                    <div className="flex items-start justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50">
                                        <div>
                                            <h4 className="font-bold text-slate-900 dark:text-white">Desempenho e Estatísticas</h4>
                                            <p className="text-sm text-slate-500 mt-1 pb-1">Coletam dados anonimizados sobre como você usa o sistema para continuarmos evoluindo.</p>
                                        </div>
                                        <button
                                            onClick={() => setPreferences(p => ({ ...p, analytics: !p.analytics }))}
                                            className={`w-12 h-6 rounded-full relative transition-colors ${preferences.analytics ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'}`}
                                        >
                                            <div className={`absolute top-1 bg-white w-4 h-4 rounded-full transition-transform ${preferences.analytics ? 'right-1 translate-x-0' : 'left-1 translate-x-0'}`} />
                                        </button>
                                    </div>

                                    {/* Marketing */}
                                    <div className="flex items-start justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50">
                                        <div>
                                            <h4 className="font-bold text-slate-900 dark:text-white">Marketing e Terceiros</h4>
                                            <p className="text-sm text-slate-500 mt-1 pb-1">Utilizados para fornecer anúncios baseados em seus interesses de navegação.</p>
                                        </div>
                                        <button
                                            onClick={() => setPreferences(p => ({ ...p, marketing: !p.marketing }))}
                                            className={`w-12 h-6 rounded-full relative transition-colors ${preferences.marketing ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'}`}
                                        >
                                            <div className={`absolute top-1 bg-white w-4 h-4 rounded-full transition-transform ${preferences.marketing ? 'right-1 translate-x-0' : 'left-1 translate-x-0'}`} />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 mt-4 border-t border-slate-100 dark:border-slate-800 pt-4">
                                    <button
                                        onClick={() => setShowSettings(false)}
                                        className="px-6 py-2 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                    >
                                        Voltar
                                    </button>
                                    <button
                                        onClick={handleSaveSettings}
                                        className="px-6 py-2 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-opacity-90 transition-all flex items-center gap-2"
                                    >
                                        <Check size={18} /> Salvar Preferências
                                    </button>
                                </div>

                            </div>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
