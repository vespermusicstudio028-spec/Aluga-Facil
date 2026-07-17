import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { 
  Users, 
  Plus, 
  Search, 
  Home, 
  Phone, 
  Mail, 
  ChevronRight,
  UserCheck,
  MoreVertical,
  Trash2,
  Edit2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Tenant, Property } from '../types';
import { motion, AnimatePresence } from 'motion/react';

export default function Tenants() {
  const { user } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [properties, setProperties] = useState<Record<string, Property>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [tenantRes, propRes] = await Promise.all([
        supabase.from('tenants').select('*').eq('owner_id', user?.uid),
        supabase.from('properties').select('*').eq('owner_id', user?.uid)
      ]);

      if (tenantRes.error) throw tenantRes.error;
      if (propRes.error) throw propRes.error;

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

      setProperties(propMap);
      
      setTenants((tenantRes.data || []).map(t => ({
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
      })));
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este inquilino?')) return;
    try {
      await supabase.from('tenants').delete().eq('id', id);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredTenants = tenants.filter(t => {
    const property = properties[t.propertyId];
    const titular = t.residents.find(r => r.isTitular);
    return titular?.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
           property?.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <Layout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Inquilinos</h1>
          <p className="text-slate-500 dark:text-slate-400">Gerencie os moradores dos seus imóveis.</p>
        </div>
        <Link 
          to="/tenants/new"
          className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-2xl font-bold hover:bg-opacity-90 transition-all shadow-lg shadow-primary/20"
        >
          <Plus size={20} />
          Novo Inquilino
        </Link>
      </div>

      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input 
          type="text" 
          placeholder="Buscar por nome ou imóvel..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-primary transition-all dark:text-white"
        />
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-white dark:bg-slate-900 rounded-2xl animate-pulse border border-slate-100 dark:border-slate-800"></div>
          ))}
        </div>
      ) : filteredTenants.length > 0 ? (
        <div className="space-y-4">
          {filteredTenants.map((t) => {
            const property = properties[t.propertyId];
            const titular = t.residents.find(r => r.isTitular);
            return (
              <div key={t.id} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row items-center gap-6 relative">
                <div className="w-16 h-16 bg-secondary/10 rounded-2xl flex items-center justify-center shrink-0">
                  {titular?.photo ? (
                    <img src={titular.photo} className="w-full h-full object-cover rounded-2xl" />
                  ) : (
                    <UserCheck className="text-secondary" size={32} />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white truncate">{titular?.name}</h3>
                  <div className="flex flex-wrap gap-4 mt-1">
                    <span className="flex items-center gap-1 text-slate-500 text-sm"><Home size={14}/> {property?.name || 'Imóvel não encontrado'}</span>
                    <span className="flex items-center gap-1 text-slate-500 text-sm"><Phone size={14}/> {titular?.phone}</span>
                    <span className="flex items-center gap-1 text-slate-500 text-sm"><Users size={14}/> {t.residents.length} morador(es)</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Status</p>
                    <p className="text-sm font-bold text-secondary">Contrato Ativo</p>
                  </div>
                  
                  <div className="relative">
                    <button 
                      onClick={() => setActiveMenu(activeMenu === t.id ? null : t.id)}
                      className="p-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                    >
                      <MoreVertical size={24} />
                    </button>

                    <AnimatePresence>
                      {activeMenu === t.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setActiveMenu(null)} />
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: -10 }}
                            className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-20 overflow-hidden"
                          >
                            <Link 
                              to={`/tenants/edit/${t.id}`}
                              className="w-full px-4 py-3 flex items-center gap-3 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                            >
                              <Edit2 size={16} className="text-primary" /> Editar
                            </Link>
                            <button 
                              onClick={() => { handleDelete(t.id); setActiveMenu(null); }}
                              className="w-full px-4 py-3 flex items-center gap-3 text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                            >
                              <Trash2 size={16} /> Excluir
                            </button>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
          <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <Users className="text-slate-400" size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Nenhum inquilino cadastrado</h3>
          <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-sm mx-auto">
            Cadastre um novo inquilino vinculando-o a um dos seus imóveis.
          </p>
          <Link 
            to="/tenants/new"
            className="bg-primary text-white px-8 py-3 rounded-2xl font-bold hover:bg-opacity-90 transition-all shadow-lg shadow-primary/20"
          >
            Cadastrar Novo Inquilino
          </Link>
        </div>
      )}
    </Layout>
  );
}
