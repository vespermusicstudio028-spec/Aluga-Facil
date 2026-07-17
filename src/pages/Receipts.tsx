import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { FileText, Download, Search, CheckCircle2, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Payment, Property, Tenant } from '../types';
import jsPDF from 'jspdf';
import { format } from 'date-fns';

export default function Receipts() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [properties, setProperties] = useState<Record<string, Property>>({});
  const [tenants, setTenants] = useState<Record<string, Tenant>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [payRes, propRes, tenRes] = await Promise.all([
        supabase.from('payments').select('*').eq('owner_id', user?.uid).eq('status', 'paid').order('due_date', { ascending: false }),
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

  const generatePDF = async (payment: Payment) => {
    const property = properties[payment.propertyId];
    const tenant = tenants[payment.tenantId];
    if (!property || !tenant) return;

    const titular = tenant.residents.find(r => r.isTitular);
    const { data: ownerData } = await supabase.from('profiles').select('*').eq('id', payment.ownerId).single();

    const pdf = new jsPDF();
    
    // Header
    pdf.setFontSize(20);
    pdf.text('RECIBO DE ALUGUEL', 105, 20, { align: 'center' });
    
    pdf.setFontSize(12);
    pdf.text(`Valor: R$ ${payment.amount.toLocaleString()}`, 20, 40);
    pdf.text(`Data de Vencimento: ${format(new Date(payment.dueDate), 'dd/MM/yyyy')}`, 20, 50);
    if (payment.paidAt) {
      pdf.text(`Data do Pagamento: ${format(new Date(payment.paidAt), 'dd/MM/yyyy')}`, 20, 60);
    }
    
    pdf.text('Recebemos de:', 20, 80);
    pdf.text(titular?.name || 'Inquilino', 20, 90);
    if (titular?.documents?.cpf) {
      pdf.text(`CPF: ${titular.documents.cpf}`, 20, 100);
    }

    pdf.text('Referente ao aluguel do imóvel situado em:', 20, 120);
    pdf.text(property.address, 20, 130);

    pdf.text('Emissor (Locador):', 20, 160);
    pdf.text(ownerData?.name || 'Locador', 20, 170);

    pdf.text('Assinatura do Locador:', 20, 210);
    pdf.line(20, 220, 100, 220);

    pdf.save(`Recibo_${titular?.name}_${format(new Date(payment.dueDate), 'MM_yyyy')}.pdf`);
  };

  return (
    <Layout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Comprovantes</h1>
          <p className="text-slate-500 dark:text-slate-400">Emissão de recibos de aluguel.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Imóvel / Inquilino</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Mês Referência</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Valor Pago</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Data Pgto</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                [1, 2, 3].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-6 py-8"><div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-1/2"></div></td>
                  </tr>
                ))
              ) : payments.length > 0 ? (
                payments.map((p) => {
                  const property = properties[p.propertyId];
                  const tenant = tenants[p.tenantId];
                  const titular = tenant?.residents.find(r => r.isTitular);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900 dark:text-white truncate max-w-[200px]">{property?.name || 'Não encontrado'}</p>
                        <p className="text-sm text-slate-500 truncate max-w-[200px]">{titular?.name || 'Não encontrado'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
                          <Calendar size={16} className="text-slate-400" />
                          {format(new Date(p.dueDate), 'MM/yyyy')}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900 dark:text-white">R$ {p.amount.toLocaleString()}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                          <CheckCircle2 size={16} className="text-secondary" />
                          {p.paidAt ? format(new Date(p.paidAt), 'dd/MM/yyyy') : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => generatePDF(p)}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-primary hover:text-white transition-all text-sm font-bold"
                        >
                          <Download size={16} /> Recibo
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-slate-500">Nenhum pagamento efetuado ainda.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
