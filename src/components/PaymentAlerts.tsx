import React, { useState } from 'react';
import { differenceInDays, startOfDay } from 'date-fns';
import { AlertCircle, X, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Payment } from '../types';

interface PaymentAlertsProps {
  payments: Payment[];
  getPropertyName?: (propertyId: string) => string;
}

export default function PaymentAlerts({ payments, getPropertyName }: PaymentAlertsProps) {
  const [closedAlerts, setClosedAlerts] = useState<Set<string>>(new Set());

  const getAlertMessage = (payment: Payment) => {
    if (!payment.dueDate) return null;
    
    // Converte a data de vencimento (considerando o timezone local ou apenas pegando a data)
    // Para ser mais seguro com datas do banco, extraímos ano, mês, dia
    const dueDateStr = payment.dueDate.split('T')[0];
    const [year, month, day] = dueDateStr.split('-');
    const dueDate = startOfDay(new Date(Number(year), Number(month) - 1, Number(day)));
    const today = startOfDay(new Date());
    
    const daysDiff = differenceInDays(dueDate, today);

    if (daysDiff < 0) return null; // Atrasados podem ter outro tratamento
    
    if (daysDiff === 10) return 'Faltam 10 dias para o vencimento do aluguel';
    if (daysDiff === 5) return 'Faltam 5 dias para o vencimento do aluguel';
    if (daysDiff === 3) return 'Faltam 3 dias para o vencimento do aluguel';
    if (daysDiff === 2) return 'Faltam 2 dias para o vencimento do aluguel';
    if (daysDiff === 1) return 'O vencimento do aluguel é Amanhã';
    if (daysDiff === 0) return 'O vencimento do aluguel é Hoje!';

    return null;
  };

  const activeAlerts = payments
    .filter(p => p.status === 'pending')
    .map(p => {
      const msg = getAlertMessage(p);
      return msg ? { id: p.id, message: msg, amount: p.amount, propertyId: p.propertyId } : null;
    })
    .filter(Boolean);

  if (activeAlerts.length === 0) return null;

  return (
    <div className="space-y-3 mb-6 w-full">
      <AnimatePresence>
        {activeAlerts.map(alert => {
          if (!alert || closedAlerts.has(alert.id)) return null;
          
          const propName = getPropertyName ? getPropertyName(alert.propertyId) : '';
          
          return (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, height: 0, marginBottom: 0, overflow: 'hidden' }}
              transition={{ duration: 0.2 }}
              className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-500/30 p-4 rounded-2xl flex items-start justify-between shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 bg-amber-100 dark:bg-amber-500/20 p-2 rounded-xl text-amber-600 dark:text-amber-500">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-amber-900 dark:text-amber-400 text-sm md:text-base">
                    {alert.message} {propName ? `(${propName})` : ''}
                  </h4>
                  <p className="text-sm text-amber-700 dark:text-amber-500/80 mt-1 font-medium">
                    Valor: R$ {Number(alert.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  const newSet = new Set(closedAlerts);
                  newSet.add(alert.id);
                  setClosedAlerts(newSet);
                }}
                className="text-amber-400 hover:text-amber-600 dark:hover:text-amber-300 transition-colors p-2 bg-amber-100/50 hover:bg-amber-200/50 dark:bg-transparent dark:hover:bg-amber-500/10 rounded-xl"
              >
                <X size={18} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
