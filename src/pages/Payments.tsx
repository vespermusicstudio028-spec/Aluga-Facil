
import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { 
  CreditCard, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  MoreVertical,
  DollarSign,
  Download,
  Calendar,
  RefreshCcw,
  MessageCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Payment, Property, Tenant, Contract } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import PaymentAlerts from '../components/PaymentAlerts';

export default function Payments() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [properties, setProperties] = useState<Record<string, Property>>({});
  const [tenants, setTenants] = useState<Record<string, Tenant>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

    const fetchData = async () => {
    setIsLoading(true);
    try {
      const [payRes, propRes, tenRes] = await Promise.all([
        supabase.from('payments').select('*').eq('owner_id', user?.uid).order('due_date', { ascending: false }),
        supabase.from('properties').select('*').eq('owner_id', user?.uid),
        supabase.from('tenants').select('*').eq('owner_id', user?.uid)
      ]);

      const propMap: Record<string, Property> = {};
      (propRes.data || []).forEach(p => {
        propMap[p.id] = {
          id: p.id,
          ownerId: p.owner_id,
          name: p.name,
          address: p.address,
          type: p.type,
          rentValue: p.rent_value,
          status: p.status,
          groupName: p.group_name,
          photos: p.photos || [],
          createdAt: p.created_at,
          updatedAt: p.updated_at
        };
      });

      const tenMap: Record<string, Tenant> = {};
      (tenRes.data || []).forEach(t => {
        tenMap[t.id] = {
          id: t.id,
          ownerId: t.owner_id,
          propertyId: t.property_id,
          residents: t.residents || [],
          paymentMethod: t.payment_method,
          pixKey: t.pix_key,
          dueDay: t.due_day,
          leaseTerm: t.lease_term,
          startDate: t.start_date,
          endDate: t.end_date,
          signature: t.signature,
          ownerSignature: t.owner_signature,
          contractAccepted: t.contract_accepted,
          contractPdf: t.contract_pdf,
          createdAt: t.created_at,
          updatedAt: t.updated_at
        };
      });

      setProperties(propMap);
      setTenants(tenMap);
      setPayments((payRes.data || []).map(p => ({
        id: p.id,
        ownerId: p.owner_id,
        contractId: p.contract_id,
        propertyId: p.property_id,
        tenantId: p.tenant_id,
        amount: p.amount,
        dueDate: p.due_date,
        paidAt: p.paid_at,
        status: p.status,
        receiptUrl: p.receipt_url,
        createdAt: p.created_at,
        updatedAt: p.updated_at
      })));
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsPaid = async (paymentId: string) => {
    try {
      await supabase.from('payments').update({
        status: 'paid',
        paid_at: new Date().toISOString()
      }).eq('id', paymentId);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const generatePayments = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data: contracts, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('owner_id', user.uid)
        .eq('status', 'active');
        
      if (error) throw error;
      
      const today = new Date();
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();

      for (const contract of (contracts || [])) {
        const dueDate = new Date(currentYear, currentMonth, contract.due_day);
        
        const startDateStr = new Date(currentYear, currentMonth, 1).toISOString();
        const endDateStr = new Date(currentYear, currentMonth + 1, 0).toISOString();
        
        const { data: existingPayments } = await supabase
          .from('payments')
          .select('id')
          .eq('contract_id', contract.id)
          .gte('due_date', startDateStr)
          .lte('due_date', endDateStr);

        const alreadyExists = existingPayments && existingPayments.length > 0;

        if (!alreadyExists) {
          await supabase.from('payments').insert({
            owner_id: user.uid,
            contract_id: contract.id,
            property_id: contract.property_id,
            tenant_id: contract.tenant_id,
            amount: contract.monthly_value,
            due_date: dueDate.toISOString(),
            status: 'pending',
            created_at: new Date().toISOString()
          });
        }
      }
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPayments = payments.filter(p => filter === 'all' || p.status === filter);

  const getWhatsAppReminderLink = (payment: Payment, tenant: Tenant, property: Property) => {
    if (!tenant?.residents || tenant.residents.length === 0) return '#';
    const titular = tenant.residents.find(r => r.isTitular) || tenant.residents[0];
    if (!titular?.phone) return '#';
    let phone = titular.phone.replace(/\D/g, '');
    if (!phone.startsWith('55')) phone = '55' + phone;

    let dueDate = '';
      dueDate = format(new Date(payment.dueDate), 'dd/MM/yyyy');
    const amount = Number(payment.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    
    let text = `Olá ${titular.name},\n\nEste é um lembrete automático sobre o pagamento do imóvel *${property?.name || ''}*.\n\n`;
    text += `*Valor:* R$ ${amount}\n`;
    text += `*Vencimento:* ${dueDate}\n\n`;
    
    if (tenant.paymentMethod === 'pix' && tenant.pixKey) {
        text += `Você pode realizar o pagamento via PIX utilizando a chave:\n*${tenant.pixKey}*\n\n`;
    }
    
    text += `Por favor, desconsidere esta mensagem caso o pagamento já tenha sido realizado.\nObrigado!`;

    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  };

  return (
    <Layout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Pagamentos</h1>
          <p className="text-slate-500 dark:text-slate-400">Controle de recebimentos e inadimplência.</p>
        </div>
        <button 
          onClick={generatePayments}
          disabled={isLoading}
          className="flex items-center gap-2 bg-secondary text-white px-6 py-3 rounded-2xl font-bold hover:bg-opacity-90 transition-all shadow-lg shadow-secondary/20"
        >
          <RefreshCcw size={20} className={isLoading ? 'animate-spin' : ''} />
          Gerar Cobranças do Mês
        </button>
      </div>

      <PaymentAlerts 
        payments={payments} 
        getPropertyName={(id) => properties[id]?.name || 'Imóvel'} 
      />

      <div className="flex flex-wrap gap-2 mb-8">
        {['all', 'pending', 'paid', 'late'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-6 py-2 rounded-xl font-bold text-sm transition-all capitalize ${
              filter === s 
                ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
            }`}
          >
            {s === 'all' ? 'Todos' : s === 'pending' ? 'Pendentes' : s === 'paid' ? 'Pagos' : 'Atrasados'}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Imóvel / Inquilino</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Vencimento</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Valor</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                [1, 2, 3].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-6 py-8"><div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-1/2"></div></td>
                  </tr>
                ))
              ) : filteredPayments.length > 0 ? (
                filteredPayments.map((p) => {
                  const property = properties[p.propertyId];
                  const tenant = tenants[p.tenantId];
                  const titular = tenant?.residents.find(r => r.isTitular);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900 dark:text-white truncate max-w-[200px]">{property?.name}</p>
                        <p className="text-sm text-slate-500 truncate max-w-[200px]">{titular?.name}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
                          <Calendar size={16} className="text-slate-400" />
                          {format(new Date(p.dueDate), 'dd/MM/yyyy')}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900 dark:text-white">R$ {p.amount.toLocaleString()}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          p.status === 'paid' ? 'bg-secondary/10 text-secondary' : 
                          p.status === 'pending' ? 'bg-orange-500/10 text-orange-500' : 'bg-red-500/10 text-red-500'
                        }`}>
                          {p.status === 'paid' ? 'Pago' : p.status === 'pending' ? 'Pendente' : 'Atrasado'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {p.status !== 'paid' && (
                            <button 
                              onClick={() => handleMarkAsPaid(p.id)}
                              className="p-2 bg-secondary/10 text-secondary rounded-lg hover:bg-secondary hover:text-white transition-all"
                              title="Marcar como pago"
                            >
                              <CheckCircle2 size={18} />
                            </button>
                          )}
                          
                          {p.status !== 'paid' && (
                            <a 
                              href={getWhatsAppReminderLink(p, tenant, property)}
                              target="_blank" rel="noopener noreferrer"
                              className="p-2 bg-green-500/10 text-green-500 rounded-lg hover:bg-green-500 hover:text-white transition-all flex items-center justify-center"
                              title="Enviar Lembrete"
                            >
                              <MessageCircle size={18} />
                            </a>
                          )}

                          <button className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-lg hover:bg-slate-200 transition-all">
                            <MoreVertical size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-slate-500">Nenhum pagamento encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
