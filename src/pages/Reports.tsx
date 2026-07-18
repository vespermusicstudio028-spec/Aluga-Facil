import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { 
  BarChart3, 
  Download, 
  FileText, 
  Table as TableIcon, 
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Payment, Property, Contract } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function Reports() {
  const { user } = useAuth();
  const [data, setData] = useState<{
    payments: Payment[],
    properties: Property[],
    contracts: Contract[]
  }>({ payments: [], properties: [], contracts: [] });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [pRes, prRes, cRes] = await Promise.all([
        supabase.from('payments').select('*').eq('owner_id', user?.uid),
        supabase.from('properties').select('*').eq('owner_id', user?.uid),
        supabase.from('contracts').select('*').eq('owner_id', user?.uid)
      ]);

      setData({
        payments: (pRes.data || []).map(p => ({
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
        })),
        properties: (prRes.data || []).map(p => ({
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
        })),
        contracts: (cRes.data || []).map(c => ({
          id: c.id,
          propertyId: c.property_id,
          tenantId: c.tenant_id,
          ownerId: c.owner_id,
          startDate: c.start_date,
          endDate: c.end_date,
          monthlyValue: c.monthly_value,
          dueDay: c.due_day,
          status: c.status,
          paymentMethod: c.payment_method,
          createdAt: c.created_at,
          updatedAt: c.updated_at
        }))
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text('Relatório de Pagamentos - AlugaFácil', 14, 15);
    
    const tableData = data.payments.map(p => [
      new Date(p.dueDate).toLocaleDateString(),
      `R$ ${p.amount.toLocaleString()}`,
      p.status.toUpperCase()
    ]);

    autoTable(doc, {
      head: [['Data Vencimento', 'Valor', 'Status']],
      body: tableData,
      startY: 25,
    });

    doc.save('relatorio-alugafacil.pdf');
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(data.payments.map(p => ({
      'Vencimento': new Date(p.dueDate).toLocaleDateString(),
      'Valor': p.amount,
      'Status': p.status
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pagamentos");
    XLSX.writeFile(wb, "relatorio-alugafacil.xlsx");
  };

  const totalRevenue = data.payments.filter(p => p.status === 'paid').reduce((acc, p) => acc + p.amount, 0);
  const pendingRevenue = data.payments.filter(p => p.status === 'pending').reduce((acc, p) => acc + p.amount, 0);

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Relatórios</h1>
        <p className="text-slate-500 dark:text-slate-400">Analise o desempenho financeiro do seu portfólio.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Receita Acumulada</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-secondary">R$ {totalRevenue.toLocaleString()}</span>
            <span className="text-slate-500 font-medium italic">total recebido</span>
          </div>
          <div className="mt-8 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 flex items-center gap-2"><CheckCircle2 size={16} className="text-secondary"/> Pagamentos Recebidos</span>
              <span className="font-bold text-slate-900 dark:text-white">{data.payments.filter(p => p.status === 'paid').length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 flex items-center gap-2"><Clock size={16} className="text-orange-500"/> Pendentes</span>
              <span className="font-bold text-slate-900 dark:text-white">R$ {pendingRevenue.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Exportar Dados</h3>
            <p className="text-slate-500 mb-6">Gere documentos profissionais para sua contabilidade ou arquivo pessoal.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button 
              onClick={exportPDF}
              className="flex items-center justify-center gap-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 py-4 rounded-2xl font-bold hover:scale-105 transition-transform"
            >
              <FileText size={20} /> PDF
            </button>
            <button 
              onClick={exportExcel}
              className="flex items-center justify-center gap-2 bg-secondary text-white py-4 rounded-2xl font-bold hover:scale-105 transition-transform"
            >
              <TableIcon size={20} /> Excel
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Ocupação de Imóveis</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
          <div>
            <p className="text-4xl font-bold text-primary">{data.properties.length}</p>
            <p className="text-slate-500 font-bold uppercase text-xs tracking-widest mt-2">Total</p>
          </div>
          <div>
            <p className="text-4xl font-bold text-secondary">{data.properties.filter(p => p.status === 'rented').length}</p>
            <p className="text-slate-500 font-bold uppercase text-xs tracking-widest mt-2">Alugados</p>
          </div>
          <div>
            <p className="text-4xl font-bold text-orange-500">{data.properties.filter(p => p.status === 'available').length}</p>
            <p className="text-slate-500 font-bold uppercase text-xs tracking-widest mt-2">Vagos</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
