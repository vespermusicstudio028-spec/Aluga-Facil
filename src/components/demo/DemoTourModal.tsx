import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronLeft, ChevronRight, Home, Users, Building2, CreditCard, Bell, MousePointer2 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface DemoTourModalProps {
    onClose: () => void;
}

export default function DemoTourModal({ onClose }: DemoTourModalProps) {
    const [currentStep, setCurrentStep] = useState(0);

    const steps = [
        {
            title: 'Visão Geral (Dashboard)',
            desc: 'Acompanhe as métricas de receita, taxas de vacância e inadimplência em tempo real.',
            content: (
                <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: 'Receita Mensal', value: 'R$ 15.450', trend: '+12%' },
                            { label: 'Imóveis Alugados', value: '8/10', trend: '80%' },
                            { label: 'Inadimplência', value: '0%', trend: 'Estável' },
                            { label: 'Contratos Ativos', value: '8', trend: '+2' },
                        ].map((stat, i) => (
                            <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm">
                                <p className="text-slate-500 text-xs font-semibold uppercase">{stat.label}</p>
                                <div className="flex items-end justify-between mt-2">
                                    <span className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white">{stat.value}</span>
                                    <span className="text-emerald-500 text-xs font-bold bg-emerald-100 dark:bg-emerald-900/30 px-2 py-1 rounded-full">{stat.trend}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm h-48 flex items-center justify-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
                        <p className="text-slate-400 font-medium z-10">Gráfico Interativo de Receitas (Simulação)</p>
                        <MousePointer2 className="absolute text-primary top-1/2 left-1/2 translate-x-12 translate-y-4 animate-bounce z-10" />
                    </div>
                </div>
            ),
        },
        {
            title: 'Controle de Imóveis',
            desc: 'Cadastre e visualize o status de cada imóvel de forma visual e centralizada.',
            content: (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                        { tag: 'Alugado', color: 'text-emerald-600 bg-emerald-100', address: 'Apto 302 - Ed. Solar', val: 'R$ 2.500' },
                        { tag: 'Disponível', color: 'text-amber-600 bg-amber-100', address: 'Casa - Jd. Botânico', val: 'R$ 3.200' },
                        { tag: 'Manutenção', color: 'text-rose-600 bg-rose-100', address: 'Loja 4 - Centro', val: 'R$ 1.800' },
                        { tag: 'Alugado', color: 'text-emerald-600 bg-emerald-100', address: 'Apto 105 - Sul', val: 'R$ 1.950' },
                    ].map((prop, i) => (
                        <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex flex-col justify-between hover:border-primary transition-colors cursor-pointer">
                            <div className="flex justify-between items-start mb-4">
                                <Building2 className="text-slate-400" />
                                <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full ${prop.color}`}>{prop.tag}</span>
                            </div>
                            <div>
                                <p className="font-bold text-slate-800 dark:text-white text-sm truncate">{prop.address}</p>
                                <p className="text-primary font-bold">{prop.val}</p>
                            </div>
                        </div>
                    ))}
                </div>
            ),
        },
        {
            title: 'Gestão de Inquilinos',
            desc: 'Acesse documentos, histórico financeiro e envie alertas por WhatsApp.',
            content: (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-xl overflow-hidden shadow-sm">
                    <div className="border-b border-slate-100 dark:border-slate-800 p-3 bg-slate-50 dark:bg-slate-950 flex justify-between items-center">
                        <span className="font-semibold text-sm text-slate-700 dark:text-slate-300">Lista de Inquilinos</span>
                        <div className="flex gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                        </div>
                    </div>
                    <div className="p-3">
                        <div className="space-y-3">
                            {[
                                { name: 'João Silva', status: 'Em dia', color: 'emerald' },
                                { name: 'Maria Souza', status: 'Vence em 2 dias', color: 'amber' },
                                { name: 'Carlos Santos', status: 'Atrasado', color: 'rose' },
                            ].map((t, i) => (
                                <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                                            {t.name.charAt(0)}
                                        </div>
                                        <span className="font-semibold text-sm text-slate-700 dark:text-slate-200">{t.name}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`text-xs font-bold text-${t.color}-600 bg-${t.color}-100 px-2 py-1 rounded-full`}>{t.status}</span>
                                        <button className="text-slate-400 hover:text-primary"><Bell size={14} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ),
        }
    ];

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(s => s + 1);
        }
    };

    const handlePrev = () => {
        if (currentStep > 0) {
            setCurrentStep(s => s - 1);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50 transition-opacity" onClick={onClose}>
            <div
                className="bg-slate-50 dark:bg-slate-950 w-full max-w-4xl max-h-[95vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col pt-16 sm:pt-0"
                onClick={e => e.stopPropagation()}
            >

                {/* Header - Mobile Absolute Close Button */}
                <div className="sm:hidden absolute top-4 right-4 z-50">
                    <button onClick={onClose} className="p-2 bg-white/10 backdrop-blur rounded-full text-slate-500 hover:text-slate-800">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex flex-col sm:flex-row h-full overflow-hidden">

                    {/* Sidebar Nav (Desktop) / Tabs (Mobile) */}
                    <div className="w-full sm:w-64 bg-white dark:bg-slate-900 border-b sm:border-b-0 sm:border-r border-slate-200 dark:border-slate-800 p-4 sm:p-6 shrink-0 flex flex-row sm:flex-col justify-between">
                        <div className="hidden sm:block mb-8">
                            <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">AlugaFácil</h2>
                            <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-semibold">Demo Mode</p>
                        </div>

                        <div className="flex sm:flex-col gap-2 overflow-x-auto pb-2 sm:pb-0 hide-scrollbar w-full">
                            {steps.map((step, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setCurrentStep(idx)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-semibold text-sm whitespace-nowrap sm:whitespace-normal shrink-0 sm:shrink ${idx === currentStep
                                            ? 'bg-primary text-white shadow-md shadow-primary/20'
                                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                        }`}
                                >
                                    {idx === 0 && <Home size={18} />}
                                    {idx === 1 && <Building2 size={18} />}
                                    {idx === 2 && <Users size={18} />}
                                    {step.title}
                                </button>
                            ))}
                        </div>

                        <div className="hidden sm:block text-slate-400 text-xs text-center p-4 border border-slate-100 dark:border-slate-800 rounded-xl mt-auto">
                            Esta é uma simulação interativa das principais telas do sistema.
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden relative">
                        <div className="hidden sm:flex shrink-0 min-h-[64px] border-b border-slate-200 dark:border-slate-800 items-center justify-between px-6 bg-white dark:bg-slate-900">
                            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                {currentStep === 0 && <Home className="text-slate-400" size={18} />}
                                {currentStep === 1 && <Building2 className="text-slate-400" size={18} />}
                                {currentStep === 2 && <Users className="text-slate-400" size={18} />}
                                {steps[currentStep].title}
                            </h3>
                            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 sm:p-8">
                            <div className="max-w-3xl mx-auto h-full flex flex-col justify-center">
                                <motion.div
                                    key={currentStep}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3 }}
                                    className="w-full"
                                >
                                    <div className="mb-6">
                                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{steps[currentStep].title}</h2>
                                        <p className="text-slate-500">{steps[currentStep].desc}</p>
                                    </div>

                                    {/* Interfaz Simulada */}
                                    <div className="bg-slate-100 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-inner">
                                        {steps[currentStep].content}
                                    </div>
                                </motion.div>
                            </div>
                        </div>

                        {/* Fotter Controls */}
                        <div className="shrink-0 p-4 sm:p-6 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
                            <div className="flex gap-2">
                                <button
                                    onClick={handlePrev}
                                    disabled={currentStep === 0}
                                    className={`px-4 py-2 font-bold rounded-lg flex items-center gap-1 transition-all ${currentStep === 0
                                            ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                        }`}
                                >
                                    <ChevronLeft size={16} /> Anterior
                                </button>
                            </div>

                            <div className="flex gap-2">
                                {currentStep < steps.length - 1 ? (
                                    <button
                                        onClick={handleNext}
                                        className="px-6 py-2 bg-primary text-white font-bold rounded-lg flex items-center gap-1 hover:bg-opacity-90 shadow-lg shadow-primary/20 transition-all"
                                    >
                                        Próximo <ChevronRight size={16} />
                                    </button>
                                ) : (
                                    <Link
                                        to="/register"
                                        className="px-6 py-2 bg-secondary text-white font-bold rounded-lg flex items-center gap-2 hover:bg-opacity-90 shadow-lg shadow-secondary/20 transition-all"
                                    >
                                        Criar Conta Grátis
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
