import React from 'react';
import { useFeatureContext } from '../featureContext';
import { LimitType } from '../permissions';
import { motion } from 'motion/react';

interface PlanLimitProps {
    limitType: LimitType | string;
    currentValue: number;
    label: string;
    unit?: string;
}

export function PlanLimit({ limitType, currentValue, label, unit = '' }: PlanLimitProps) {
    const { getLimit } = useFeatureContext();
    const maxLimit = getLimit(limitType);

    const isUnlimited = maxLimit === -1;
    const percentage = isUnlimited ? 0 : Math.min((currentValue / maxLimit) * 100, 100);

    const isNearLimit = !isUnlimited && percentage >= 80;
    const isAtLimit = !isUnlimited && percentage >= 100;

    let progressColor = 'bg-blue-500';
    if (isAtLimit) progressColor = 'bg-red-500';
    else if (isNearLimit) progressColor = 'bg-amber-500';

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex justify-between items-end mb-2">
                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{label}</h4>
                <div className="text-right">
                    <span className={`text-xl font-bold ${isAtLimit ? 'text-red-500' : 'text-slate-900 dark:text-white'}`}>
                        {currentValue}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 text-sm ml-1">
                        / {isUnlimited ? 'Ilimitado' : maxLimit} {unit}
                    </span>
                </div>
            </div>

            {!isUnlimited && (
                <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        className={`h-2.5 rounded-full ${progressColor}`}
                    />
                </div>
            )}

            {isUnlimited && (
                <div className="w-full bg-emerald-100 dark:bg-emerald-900/30 rounded-full h-2.5 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest leading-none">Ilimitado</span>
                </div>
            )}

            {!isUnlimited && isNearLimit && !isAtLimit && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    Você está quase atingindo o limite.
                </p>
            )}

            {!isUnlimited && isAtLimit && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-2 flex items-center gap-1 font-bold">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    Limite atingido!
                </p>
            )}
        </div>
    );
}
