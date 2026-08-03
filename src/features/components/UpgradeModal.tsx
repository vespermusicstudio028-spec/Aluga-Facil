import React from 'react';
import { useFeatureContext } from '../featureContext';
import { Crown, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function UpgradeModal() {
    const { showUpgradeModal, setShowUpgradeModal } = useFeatureContext();
    const navigate = useNavigate();

    if (!showUpgradeModal) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div
                className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-sm w-full mx-auto relative shadow-2xl border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200"
            >
                <button
                    onClick={() => setShowUpgradeModal(false)}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors bg-slate-100 dark:bg-slate-800 p-2 rounded-full"
                >
                    <X size={20} />
                </button>

                <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
                        <Crown size={32} className="text-white" />
                    </div>
                </div>

                <h2 className="text-2xl font-bold text-slate-900 dark:text-white text-center mb-2">
                    🔒 Recurso exclusivo de planos superiores
                </h2>
                <p className="text-slate-600 dark:text-slate-300 text-center mb-8">
                    Faça upgrade agora e desbloqueie esta funcionalidade.
                </p>

                <button
                    onClick={() => {
                        setShowUpgradeModal(false);
                        navigate('/plan');
                    }}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold rounded-xl shadow-lg shadow-amber-500/25 transition-all active:scale-[0.98]"
                >
                    Fazer Upgrade
                </button>
                <button
                    onClick={() => setShowUpgradeModal(false)}
                    className="w-full py-3 px-4 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white font-medium rounded-xl transition-colors mt-2"
                >
                    Talvez mais tarde
                </button>
            </div>
        </div>
    );
}
