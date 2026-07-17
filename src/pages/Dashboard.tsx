import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { 
  Building2, 
  Users, 
  CreditCard, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area 
} from 'recharts';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Property, Tenant, Contract, Payment } from '../types';
import PaymentAlerts from '../components/PaymentAlerts';

const data = [
  { name: 'Jan', revenue: 4000 },
  { name: 'Fev', revenue: 3000 },
  { name: 'Mar', revenue: 5000 },
  { name: 'Abr', revenue: 4500 },
  { name: 'Mai', revenue: 6000 },
  { name: 'Jun', revenue: 5500 },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalProperties: 0,
    rentedProperties: 0,
    availableProperties: 0,
    activeTenants: 0,
    monthlyRevenue: 0,
    pendingPayments: 0,
    latePayments: 0,
  });
  const [trends, setTrends] = useState({
    properties: 0,
    tenants: 0,
    revenue: 0,
  });
  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);
  const [pendingAlerts, setPendingAlerts] = useState<Payment[]>([]);
  const [propertiesMap, setPropertiesMap] = useState<Record<string, Property>>({});

  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      // Date helpers for current and previous month
      const now = new Date();
      const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();

      const [propRes, tenantRes, contractRes, paymentRes,
             lastMonthPayRes, prevTenantRes, prevPropRes, pendingRes] = await Promise.all([
        supabase.from('properties').select('*').eq('owner_id', user.uid),
        supabase.from('tenants').select('id').eq('owner_id', user.uid),
        supabase.from('contracts').select('*').eq('owner_id', user.uid).eq('status', 'active'),
        supabase.from('payments').select('*').eq('owner_id', user.uid).order('due_date', { ascending: false }).limit(5),
        // Last month payments for revenue trend
        supabase.from('payments').select('amount').eq('owner_id', user.uid)
          .gte('due_date', firstDayLastMonth).lte('due_date', lastDayLastMonth).eq('status', 'paid'),
        // Tenants created before this month for trend
        supabase.from('tenants').select('id, created_at').eq('owner_id', user.uid).lt('created_at', firstDayThisMonth),
        // Properties created before this month for trend
        supabase.from('properties').select('id, created_at').eq('owner_id', user.uid).lt('created_at', firstDayThisMonth),
        // All pending payments for alerts
        supabase.from('payments').select('*').eq('owner_id', user.uid).eq('status', 'pending')
      ]);

      const properties = (propRes.data || []).map(p => ({
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
      } as Property));

      const mapProps: Record<string, Property> = {};
      properties.forEach(p => { mapProps[p.id] = p; });
      setPropertiesMap(mapProps);

      const payments = (paymentRes.data || []).map(p => ({
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
      } as Payment));

      const pending = (pendingRes.data || []).map(p => ({
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
      } as Payment));
      setPendingAlerts(pending);

      // Revenue current month (contracts)
      const contractRevenue = (contractRes.data || []).reduce((acc, c) => acc + (Number(c.monthly_value) || 0), 0);
      const contractedPropertyIds = new Set((contractRes.data || []).map(c => c.property_id));
      const nonContractedRevenue = properties
        .filter(p => p.status === 'rented' && !contractedPropertyIds.has(p.id))
        .reduce((acc, p) => acc + (Number(p.rentValue) || 0), 0);
      const currentRevenue = contractRevenue + nonContractedRevenue;

      // Revenue last month (paid payments)
      const lastMonthRevenue = (lastMonthPayRes.data || []).reduce((acc: number, p: any) => acc + (Number(p.amount) || 0), 0);

      // Current counts
      const currentTenants = tenantRes.data?.length || 0;
      const currentProps = properties.length;

      // Previous month counts
      const prevTenants = prevTenantRes.data?.length || 0;
      const prevProps = prevPropRes.data?.length || 0;

      // Calculate % trends (avoid divide-by-zero)
      const calcTrend = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100);
      };

      setTrends({
        properties: calcTrend(currentProps, prevProps),
        tenants: calcTrend(currentTenants, prevTenants),
        revenue: calcTrend(currentRevenue, lastMonthRevenue),
      });

      setStats({
        totalProperties: currentProps,
        rentedProperties: properties.filter(p => p.status === 'rented').length,
        availableProperties: properties.filter(p => p.status === 'available').length,
        activeTenants: currentTenants,
        monthlyRevenue: currentRevenue,
        pendingPayments: 0,
        latePayments: 0,
      });
      setRecentPayments(payments);
    };

    fetchStats();
  }, [user]);

  const StatCard = ({ icon, label, value, trend, color }: any) => (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-2xl ${color}`}>
          {icon}
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-sm font-bold ${trend > 0 ? 'text-secondary' : 'text-red-500'}`}>
            {trend > 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{label}</p>
      <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{value}</h3>
    </div>
  );

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Olá, {user?.name} 👋</h1>
        <p className="text-slate-500 dark:text-slate-400">Aqui está o resumo da sua gestão hoje.</p>
      </div>

      <PaymentAlerts payments={pendingAlerts} getPropertyName={(id) => propertiesMap[id]?.name || 'Imóvel'} />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard 
          icon={<Building2 className="text-primary" />} 
          label="Total de Imóveis" 
          value={stats.totalProperties} 
          trend={trends.properties}
          color="bg-primary/10"
        />
        <StatCard 
          icon={<Users className="text-secondary" />} 
          label="Inquilinos Ativos" 
          value={stats.activeTenants} 
          trend={trends.tenants}
          color="bg-secondary/10"
        />
        <StatCard 
          icon={<CreditCard className="text-accent" />} 
          label="Receita Mensal" 
          value={`R$ ${stats.monthlyRevenue.toLocaleString('pt-BR')}`} 
          trend={trends.revenue}
          color="bg-accent/10"
        />
        <StatCard 
          icon={<AlertCircle className="text-red-500" />} 
          label="Pendências" 
          value={stats.pendingPayments} 
          color="bg-red-500/10"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Desempenho Financeiro</h3>
            <select className="bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm font-bold px-4 py-2 outline-none">
              <option>Últimos 6 meses</option>
              <option>Este ano</option>
            </select>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1e3a8a" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#1e3a8a" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ color: '#1e3a8a', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#1e3a8a" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Últimos Pagamentos</h3>
          <div className="space-y-6">
            {recentPayments.length > 0 ? recentPayments.map((p, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${p.status === 'paid' ? 'bg-secondary/10 text-secondary' : 'bg-orange-500/10 text-orange-500'}`}>
                  {p.status === 'paid' ? <CheckCircle2 size={20} /> : <Clock size={20} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">Aluguel Ref. {p.id.slice(0, 5)}</p>
                  <p className="text-xs text-slate-500">Vencimento: {new Date(p.dueDate).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">R$ {p.amount}</p>
                  <p className={`text-[10px] font-bold uppercase tracking-wider ${p.status === 'paid' ? 'text-secondary' : 'text-orange-500'}`}>{p.status}</p>
                </div>
              </div>
            )) : (
              <div className="text-center py-10">
                <p className="text-slate-500 text-sm">Nenhum pagamento recente.</p>
              </div>
            )}
          </div>
          <button className="w-full mt-8 py-3 bg-slate-50 dark:bg-slate-800 text-primary dark:text-white rounded-xl font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            Ver Todos
          </button>
        </div>
      </div>
    </Layout>
  );
}
