
import React, { useEffect, useState, useCallback } from 'react';
import Layout from '../components/Layout';
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  MapPin,
  Home,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  Upload,
  Trash2,
  Edit2,
  Users,
  Share2,
  LogOut,
  ChevronLeft, ChevronRight,
  Phone
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { uploadBase64Image } from '../lib/storage';
import { useAuth } from '../contexts/AuthContext';
import { useViaCEP } from '../hooks/useViaCEP';
import { Property, PropertyStatus } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import DocumentVault from '../components/DocumentVault';
import { TerminateRentalModal } from '../components/TerminateRentalModal';
import { LinkTenantModal } from '../components/LinkTenantModal';
import { Tenant, Contract } from '../types';

interface VilaHouse {
  id: string;
  number: string;
  rentValue: string;
  status: PropertyStatus;
  photos: string[];
}

const PropertyPhotoCarousel = ({ photos, altText }: { photos: string[], altText: string }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  if (!photos || photos.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-slate-400">
        <Home size={48} />
      </div>
    );
  }

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      setCurrentIndex(prev => (prev === photos.length - 1 ? 0 : prev + 1));
    } else if (isRightSwipe) {
      setCurrentIndex(prev => (prev === 0 ? photos.length - 1 : prev - 1));
    }
  };

  return (
    <div
      className="w-full h-full relative group"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <img src={photos[currentIndex]} alt={altText} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />

      {photos.length > 1 && (
        <>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCurrentIndex(prev => (prev === 0 ? photos.length - 1 : prev - 1)); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/30 hover:bg-black/50 text-white rounded-full backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100 hidden md:flex"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCurrentIndex(prev => (prev === photos.length - 1 ? 0 : prev + 1)); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/30 hover:bg-black/50 text-white rounded-full backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100 hidden md:flex"
          >
            <ChevronRight size={20} />
          </button>

          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
            {photos.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 rounded-full transition-all ${currentIndex === idx ? 'bg-white w-3' : 'bg-white/50 w-1.5'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};
export default function Properties() {
  const { user } = useAuth();
  const { fetchAddress, loading: cepLoading } = useViaCEP();
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<PropertyStatus | 'all'>('all');
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);

  const [propertyToTerminate, setPropertyToTerminate] = useState<Property | null>(null);
  const [tenantToTerminate, setTenantToTerminate] = useState<Tenant | null>(null);
  const [contractToTerminate, setContractToTerminate] = useState<Contract | null>(null);

  const [propertyToLink, setPropertyToLink] = useState<Property | null>(null);
  // Cache: property id → active tenant data (card display)
  const [rentedTenantCache, setRentedTenantCache] = useState<Record<string, { name: string; phone: string; contractId?: string }>>({});
  // Full tenant details loaded when modal opens for a rented property
  const [modalTenantData, setModalTenantData] = useState<{
    residents: Array<{ name: string; phone: string; email?: string; cpf?: string; isTitular?: boolean }>;
    entryDate?: string;
    rentValue?: number;
    dueDay?: number;
    endDate?: string;
    contractNumber?: string;
  } | null>(null);
  // Whether modal is in view-only mode (rented property opened via 'Detalhes')
  const [viewMode, setViewMode] = useState(false);

  const [vilaHouses, setVilaHouses] = useState<VilaHouse[]>([
    { id: Date.now().toString(), number: '', rentValue: '', status: 'available', photos: [] }
  ]);

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    type: 'Casa',
    rentValue: '',
    status: 'available' as PropertyStatus,
    groupName: '',
    photos: [] as string[],
    zipCode: '',
    bedrooms: '',
    bathrooms: '',
    parkingSpaces: '',
    area: '',
    iptuValue: '',
    condoValue: ''
  });

  useEffect(() => {
    if (!user) return;
    fetchProperties();
  }, [user]);

  const fetchProperties = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('owner_id', user?.uid)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setProperties((data || []).map(p => ({
        id: p.id,
        ownerId: p.owner_id,
        name: p.name,
        address: p.address,
        type: p.type,
        rentValue: p.rent_value,
        status: p.status,
        groupName: p.group_name,
        photos: p.photos || [],
        zipCode: p.zip_code,
        bedrooms: p.bedrooms,
        bathrooms: p.bathrooms,
        parkingSpaces: p.parking_spaces,
        area: p.area,
        iptuValue: p.iptu_value,
        condoValue: p.condo_value,
        floorPlanUrl: p.floor_plan_url,
        createdAt: p.created_at,
        updatedAt: p.updated_at
      })));
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load active tenant info for all rented properties (for card display)
  const fetchRentedTenants = useCallback(async (props: Property[]) => {
    const rented = props.filter(p => p.status === 'rented');
    if (rented.length === 0) return;
    const cache: Record<string, { name: string; phone: string; contractId?: string }> = {};
    await Promise.all(rented.map(async (p) => {
      const { data: tenants } = await supabase
        .from('tenants').select('id, residents, property_id')
        .eq('property_id', p.id).eq('status', 'active').limit(1);
      if (tenants && tenants.length > 0) {
        const t = tenants[0];
        const titular = (t.residents || []).find((r: any) => r.isTitular);
        const { data: contracts } = await supabase
          .from('contracts').select('id')
          .eq('property_id', p.id).neq('status', 'closed').limit(1);
        cache[p.id] = {
          name: titular?.name || 'Inquilino',
          phone: titular?.phone || '',
          contractId: contracts?.[0]?.id,
        };
      }
    }));
    setRentedTenantCache(cache);
  }, []);

  useEffect(() => {
    if (properties.length > 0) fetchRentedTenants(properties);
  }, [properties, fetchRentedTenants]);

  const handleOpenTerminateModal = async (property: Property) => {
    try {
      const { data: tenants } = await supabase.from('tenants').select('*').eq('property_id', property.id).neq('status', 'inactive');
      const tenant = tenants && tenants.length > 0 ? tenants[0] : null;

      let contract = null;
      if (tenant) {
        const { data: contracts } = await supabase.from('contracts').select('*').eq('tenant_id', tenant.id).neq('status', 'closed');
        contract = contracts && contracts.length > 0 ? contracts[0] : null;
      }

      setTenantToTerminate(tenant ? { ...tenant, ownerId: tenant.owner_id, propertyId: tenant.property_id } : null);
      setContractToTerminate(contract ? { ...contract, monthlyValue: contract.monthly_value || 0 } : null);
      setPropertyToTerminate(property);
    } catch (e) {
      console.error(e);
      alert('Erro ao carregar dados do locatário.');
    }
  };

  const handleOpenModal = (property?: Property, readOnly = false) => {
    setModalTenantData(null); // reset
    setViewMode(readOnly);
    if (property) {
      setEditingProperty(property);
      setFormData({
        name: property.name,
        address: property.address,
        type: property.type,
        rentValue: property.rentValue.toString(),
        status: property.status,
        groupName: property.groupName || '',
        photos: property.photos || [],
        zipCode: property.zipCode || '',
        bedrooms: property.bedrooms?.toString() || '',
        bathrooms: property.bathrooms?.toString() || '',
        parkingSpaces: property.parkingSpaces?.toString() || '',
        area: property.area?.toString() || '',
        iptuValue: property.iptuValue?.toString() || '',
        condoValue: property.condoValue?.toString() || ''
      });
      // If rented, fetch detailed tenant data
      if (property.status === 'rented') {
        supabase.from('tenants')
          .select('residents, entry_date, due_day')
          .eq('property_id', property.id)
          .eq('owner_id', user?.uid)
          .order('created_at', { ascending: false })
          .limit(1)
          .then(({ data: tenants, error: tErr }) => {
            if (tErr) { console.error('tenant fetch:', tErr); }
            const t = tenants?.[0];
            supabase.from('contracts')
              .select('monthly_value, due_day, end_date, contract_number')
              .eq('property_id', property.id)
              .eq('owner_id', user?.uid)
              .order('created_at', { ascending: false })
              .limit(1)
              .then(({ data: contracts, error: cErr }) => {
                if (cErr) { console.error('contract fetch:', cErr); }
                const c = contracts?.[0];
                setModalTenantData({
                  residents: t?.residents || [],
                  entryDate: t?.entry_date,
                  rentValue: c?.monthly_value,
                  dueDay: c?.due_day || t?.due_day,
                  endDate: c?.end_date,
                  contractNumber: c?.contract_number,
                });
              });
          });
      }
    } else {
      setEditingProperty(null);
      setFormData({
        name: '', address: '', type: 'Casa', rentValue: '', status: 'available', groupName: '', photos: [],
        zipCode: '', bedrooms: '', bathrooms: '', parkingSpaces: '', area: '', iptuValue: '', condoValue: ''
      });
      setVilaHouses([{ id: Date.now().toString(), number: '', rentValue: '', status: 'available', photos: [] }]);
    }
    setIsModalOpen(true);
  };

  const compressImage = (base64Str: string, maxWidth = 800, maxHeight = 800): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
    });
  };

  const handleVilaPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, houseId: string) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    try {
      const newPhotos = await Promise.all(
        files.map(file => {
          return new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = async () => {
              const compressed = await compressImage(reader.result as string);
              resolve(compressed);
            };
            reader.readAsDataURL(file);
          });
        })
      );

      setVilaHouses(prev => prev.map(h =>
        h.id === houseId
          ? { ...h, photos: [...h.photos, ...newPhotos].slice(0, 8) }
          : h
      ));
    } catch (err) {
      console.error('Error processing images:', err);
    }
  };

  const removeVilaPhoto = (houseId: string, photoIndex: number) => {
    setVilaHouses(prev => prev.map(h =>
      h.id === houseId
        ? { ...h, photos: h.photos.filter((_, i) => i !== photoIndex) }
        : h
    ));
  };

  const addVilaHouse = () => {
    if (vilaHouses.length >= 20) return;
    setVilaHouses(prev => [...prev, { id: Date.now().toString(), number: '', rentValue: '', status: 'available', photos: [] }]);
  };

  const removeVilaHouse = (id: string) => {
    setVilaHouses(prev => prev.filter(h => h.id !== id));
  };

  const updateVilaHouse = (id: string, field: keyof VilaHouse, value: string) => {
    setVilaHouses(prev => prev.map(h => h.id === id ? { ...h, [field]: value } : h));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert('Você precisa estar logado para salvar um imóvel.');
      return;
    }
    setIsSaving(true);

    // Função helper para forçar timeout se o Supabase travar
    const withTimeout = <T,>(promise: Promise<T>, ms = 8000) => {
      return Promise.race([
        promise,
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('TIMEOUT_SUPABASE')), ms))
      ]);
    };

    try {
      if (formData.type === 'Vila') {
        for (const house of vilaHouses) {
          const photoUrls = await Promise.all(
            house.photos.map(async (photo, idx) => {
              if (photo.startsWith('data:')) {
                const path = `${user.uid}/${Date.now()}_vila_${idx}.jpg`;
                return await withTimeout(uploadBase64Image('property-photos', path, photo));
              }
              return photo;
            })
          );
          const { error } = await withTimeout(supabase.from('properties').insert({
            owner_id: user.uid,
            name: `${formData.name} - ${house.number}`,
            address: `${formData.address}, ${house.number}`,
            group_name: formData.name,
            type: 'Casa',
            rent_value: Number(house.rentValue),
            status: house.status,
            photos: photoUrls,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }));
          if (error) throw error;
        }
      } else {
        const photoUrls = await Promise.all(
          formData.photos.map(async (photo, idx) => {
            if (photo.startsWith('data:')) {
              const path = `${user.uid}/${Date.now()}_prop_${idx}.jpg`;
              return await withTimeout(uploadBase64Image('property-photos', path, photo));
            }
            return photo;
          })
        );
        const propertyData = {
          owner_id: user.uid,
          name: formData.name,
          address: formData.address,
          type: formData.type,
          rent_value: Number(formData.rentValue) || 0,
          status: formData.status,
          group_name: formData.groupName,
          photos: photoUrls,
          zip_code: formData.zipCode,
          bedrooms: Number(formData.bedrooms) || 0,
          bathrooms: Number(formData.bathrooms) || 0,
          parking_spaces: Number(formData.parkingSpaces) || 0,
          area: Number(formData.area) || 0,
          iptu_value: Number(formData.iptuValue) || 0,
          condo_value: Number(formData.condoValue) || 0,
          updated_at: new Date().toISOString()
        };
        if (editingProperty) {
          const { error } = await withTimeout(supabase.from('properties').update(propertyData).eq('id', editingProperty.id));
          if (error) throw error;
        } else {
          const { error } = await withTimeout(supabase.from('properties').insert({
            ...propertyData,
            created_at: new Date().toISOString()
          }));
          if (error) throw error;
        }
      }
      setIsModalOpen(false);
      fetchProperties();
      alert('Imóvel salvo com sucesso!');
    } catch (err: any) {
      console.error('Erro CRÍTICO Supabase:', err);
      let errMsg = err?.message || JSON.stringify(err);
      if (errMsg === 'TIMEOUT_SUPABASE') errMsg = 'O servidor demorou muito para responder (Timeout).';
      alert('ERRO EXATO QUE ESTÁ IMPEDINDO O SALVAMENTO:\n\n' + errMsg + '\n\nPor favor, me copie este erro exato!');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este imóvel? Esta ação é irreversível.')) return;

    try {
      // Tentativa 1: delete direto
      const { error } = await supabase.from('properties').delete().eq('id', id);

      if (!error) {
        fetchProperties();
        return;
      }

      // Tentativa 2: erro de FK — perguntar se quer forçar
      const forceDelete = confirm(
        'Este imóvel possui contratos, histórico ou registros associados.\n\nDeseja excluir tudo permanentemente? Esta ação é IRREVERSÍVEL.'
      );

      if (!forceDelete) return;

      // Remover todos os registros dependentes em ordem
      await supabase.from('rental_history').delete().eq('property_id', id);
      await supabase.from('maintenance_tickets').delete().eq('property_id', id);
      await supabase.from('agenda').delete().eq('property_id', id);

      // Buscar contratos para limpar pagamentos associados
      const { data: linkedContracts } = await supabase
        .from('contracts')
        .select('id')
        .eq('property_id', id);

      if (linkedContracts && linkedContracts.length > 0) {
        const contractIds = linkedContracts.map((c: any) => c.id);
        await supabase.from('payments').delete().in('contract_id', contractIds);
        await supabase.from('contracts').delete().eq('property_id', id);
      }

      // Agora excluir o imóvel
      const { error: finalError } = await supabase.from('properties').delete().eq('id', id);

      if (finalError) {
        alert(`Erro ao excluir o imóvel: ${finalError.message}`);
      } else {
        fetchProperties();
      }
    } catch (err) {
      console.error('Erro ao excluir imóvel:', err);
      alert('Ocorreu um erro inesperado ao excluir o imóvel.');
    }
  };

  const handleShare = (propertyId: string) => {
    const url = `${window.location.origin}/p/${propertyId}`;
    if (navigator.share) {
      navigator.share({
        title: 'Ver Imóvel',
        url: url
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(url);
      alert('Link copiado para a área de transferência!');
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remainingSlots = 8 - formData.photos.length;
    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    filesToProcess.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result as string);
        setFormData(prev => ({
          ...prev,
          photos: [...prev.photos, compressed].slice(0, 8)
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let cep = e.target.value.replace(/\D/g, '');
    if (cep.length > 8) cep = cep.slice(0, 8);
    setFormData(prev => ({ ...prev, zipCode: cep }));

    if (cep.length === 8) {
      const addr = await fetchAddress(cep);
      if (addr) {
        setFormData(prev => ({
          ...prev,
          address: `${addr.logradouro}, , ${addr.bairro}, ${addr.localidade} - ${addr.uf}`
        }));
      }
    }
  };

  const filteredProperties = properties.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.groupName && p.groupName.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const groupedProperties = filteredProperties.reduce((acc, property) => {
    const group = property.groupName?.trim() || 'Imóveis Individuais';
    if (!acc[group]) acc[group] = [];
    acc[group].push(property);
    return acc;
  }, {} as Record<string, Property[]>);

  // Sort groups: Individuals first, then alphabetical
  const sortedGroups = Object.keys(groupedProperties).sort((a, b) => {
    if (a === 'Imóveis Individuais') return -1;
    if (b === 'Imóveis Individuais') return 1;
    return a.localeCompare(b);
  });

  return (
    <Layout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Meus Imóveis</h1>
          <p className="text-slate-500 dark:text-slate-400">Gerencie seu portfólio de propriedades.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-2xl font-bold hover:bg-opacity-90 transition-all shadow-lg shadow-primary/20"
        >
          <Plus size={20} />
          Adicionar Imóvel
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por nome ou endereço..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-primary transition-all dark:text-white"
          />
        </div>
        <div className="relative">
          <button
            onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
            className={`flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold transition-all ${statusFilter !== 'all' ? 'text-primary border-primary ring-2 ring-primary/10' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
          >
            <Filter size={20} />
            {statusFilter === 'all' ? 'Filtros' : statusFilter === 'available' ? 'Disponível' : statusFilter === 'rented' ? 'Alugado' : 'Manutenção'}
          </button>

          <AnimatePresence>
            {isFilterMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsFilterMenuOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-20 overflow-hidden"
                >
                  <button
                    onClick={() => { setStatusFilter('all'); setIsFilterMenuOpen(false); }}
                    className={`w-full px-4 py-3 text-left text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${statusFilter === 'all' ? 'text-primary' : 'text-slate-700 dark:text-slate-300'}`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => { setStatusFilter('available'); setIsFilterMenuOpen(false); }}
                    className={`w-full px-4 py-3 text-left text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${statusFilter === 'available' ? 'text-primary' : 'text-slate-700 dark:text-slate-300'}`}
                  >
                    Disponível
                  </button>
                  <button
                    onClick={() => { setStatusFilter('rented'); setIsFilterMenuOpen(false); }}
                    className={`w-full px-4 py-3 text-left text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${statusFilter === 'rented' ? 'text-primary' : 'text-slate-700 dark:text-slate-300'}`}
                  >
                    Alugado
                  </button>
                  <button
                    onClick={() => { setStatusFilter('maintenance'); setIsFilterMenuOpen(false); }}
                    className={`w-full px-4 py-3 text-left text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${statusFilter === 'maintenance' ? 'text-primary' : 'text-slate-700 dark:text-slate-300'}`}
                  >
                    Manutenção
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Properties Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white dark:bg-slate-900 h-80 rounded-3xl animate-pulse border border-slate-100 dark:border-slate-800"></div>
          ))}
        </div>
      ) : filteredProperties.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredProperties.map((p) => (
            <motion.div
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              key={p.id}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-xl transition-all group flex flex-col"
            >
              <div className="h-48 bg-slate-200 dark:bg-slate-800 relative overflow-hidden flex-shrink-0">
                <PropertyPhotoCarousel photos={p.photos || []} altText={p.name} />
                <div className="absolute top-4 right-4 px-3 py-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur rounded-full text-xs font-bold shadow-sm">
                  <span className={
                    p.status === 'available' ? 'text-secondary' :
                      p.status === 'rented' ? 'text-primary' : 'text-orange-500'
                  }>
                    {p.status === 'available' ? 'Disponível' :
                      p.status === 'rented' ? 'Alugado' : 'Manutenção'}
                  </span>
                </div>
                {p.groupName && p.groupName.trim() !== '' && (
                  <div className="absolute top-4 left-4 px-3 py-1 bg-slate-900/80 dark:bg-slate-100/80 backdrop-blur rounded-full text-xs font-bold shadow-sm text-white dark:text-slate-900 flex items-center gap-1.5">
                    <MapPin size={12} />
                    {p.groupName}
                  </div>
                )}
              </div>
              <div className="p-6 flex flex-col flex-1">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white truncate pr-2">{p.name}</h3>
                  <div className="relative flex items-center">
                    {p.status === 'available' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleShare(p.id); }}
                        className="p-2 text-primary hover:text-primary/80 rounded-lg hover:bg-primary/10 transition-all mr-1"
                        title="Compartilhar Link Público"
                      >
                        <Share2 size={20} />
                      </button>
                    )}
                    <button
                      onClick={() => setActiveMenu(activeMenu === p.id ? null : p.id)}
                      className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                    >
                      <MoreVertical size={20} />
                    </button>

                    <AnimatePresence>
                      {activeMenu === p.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setActiveMenu(null)} />
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: -10 }}
                            className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-20 overflow-hidden"
                          >
                            <button
                              onClick={() => { handleOpenModal(p); setActiveMenu(null); }}
                              className="w-full px-4 py-3 flex items-center gap-3 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                            >
                              <Edit2 size={16} className="text-primary" /> Editar
                            </button>
                            {p.status === 'available' && (
                              <button
                                onClick={() => { setPropertyToLink(p); setActiveMenu(null); }}
                                className="w-full px-4 py-3 flex items-center gap-3 text-sm font-bold text-secondary hover:bg-secondary/5 transition-colors"
                              >
                                <Users size={16} /> Vincular Inquilino
                              </button>
                            )}
                            {p.status === 'rented' && (
                              <button
                                onClick={() => { handleOpenTerminateModal(p); setActiveMenu(null); }}
                                className="w-full px-4 py-3 flex items-center gap-3 text-sm font-bold text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-colors"
                              >
                                <LogOut size={16} /> Encerrar Locação
                              </button>
                            )}
                            <button
                              onClick={() => { handleDelete(p.id); setActiveMenu(null); }}
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
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm mb-4 flex-1">
                  <MapPin size={16} className="flex-shrink-0" />
                  <span className="truncate">{p.address}</span>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800 mt-auto">
                  {p.status === 'rented' && rentedTenantCache[p.id] ? (
                    <div className="flex-1 mr-4">
                      <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Inquilino Atual</p>
                      <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{rentedTenantCache[p.id].name}</p>
                      {rentedTenantCache[p.id].phone && (
                        <p className="text-xs text-slate-500">{rentedTenantCache[p.id].phone}</p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Aluguel</p>
                      <p className="text-lg font-bold text-primary dark:text-white">R$ {p.rentValue.toLocaleString()}</p>
                    </div>
                  )}
                  {p.status === 'available' ? (
                    <button
                      onClick={() => setPropertyToLink(p)}
                      className="flex items-center gap-2 px-4 py-2 bg-secondary text-white rounded-xl font-bold text-sm hover:bg-opacity-90 transition-colors shadow-sm shadow-secondary/20"
                    >
                      <Users size={16} /> Vincular
                    </button>
                  ) : (
                    <button
                      onClick={() => handleOpenModal(p)}
                      className="px-4 py-2 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      Detalhes
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
          <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <Home className="text-slate-400" size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Nenhum imóvel encontrado</h3>
          <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-sm mx-auto">
            Comece adicionando seu primeiro imóvel para gerenciar seus aluguéis.
          </p>
          <button
            onClick={() => handleOpenModal()}
            className="bg-primary text-white px-8 py-3 rounded-2xl font-bold hover:bg-opacity-90 transition-all shadow-lg shadow-primary/20"
          >
            Adicionar Primeiro Imóvel
          </button>
        </div>
      )}

      {/* Add/Edit Property Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  {viewMode ? 'Visualizar Imóvel' : editingProperty ? 'Editar Imóvel' : 'Novo Imóvel'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={24} /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">

                {editingProperty?.status === 'rented' && (
                  <div className="border border-primary/20 rounded-2xl overflow-hidden mb-2">
                    <div className="bg-primary px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users size={16} className="text-white/80" />
                        <span className="text-sm font-bold text-white uppercase tracking-wider">Inquilino(s) Atual</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => { window.location.href = '/tenants'; }}
                        className="text-xs font-bold text-white/80 hover:text-white underline transition-colors"
                      >
                        Ver todos →
                      </button>
                    </div>

                    {modalTenantData ? (
                      <div className="bg-primary/5 dark:bg-primary/10 p-4 space-y-3">
                        {/* Residents list */}
                        {modalTenantData.residents.map((r, idx) => (
                          <div key={idx} className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-100 dark:border-slate-700">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-slate-800 dark:text-white">{r.name}</span>
                              {r.isTitular && (
                                <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-bold rounded-full">Titular</span>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
                              {r.phone && <span className="flex items-center gap-1"><Phone size={12} /> {r.phone}</span>}
                              {r.email && <span className="truncate">✉ {r.email}</span>}
                              {r.cpf && <span>CPF: {r.cpf}</span>}
                            </div>
                          </div>
                        ))}

                        {/* Contract summary — without rent value */}
                        <div className="grid grid-cols-2 gap-3 pt-1">
                          {modalTenantData.entryDate && (
                            <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-100 dark:border-slate-700">
                              <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-0.5">Data de Entrada</p>
                              <p className="text-sm font-bold text-slate-700 dark:text-white">
                                {new Date(modalTenantData.entryDate).toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                          )}
                          {modalTenantData.dueDay && (
                            <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-100 dark:border-slate-700">
                              <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-0.5">Vencimento</p>
                              <p className="text-sm font-bold text-slate-700 dark:text-white">Dia {modalTenantData.dueDay}</p>
                            </div>
                          )}
                          {modalTenantData.endDate && (
                            <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-100 dark:border-slate-700">
                              <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-0.5">Fim do Contrato</p>
                              <p className="text-sm font-bold text-slate-700 dark:text-white">
                                {new Date(modalTenantData.endDate).toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                          )}
                        </div>
                        {modalTenantData.contractNumber && (
                          <p className="text-xs text-slate-400 text-center pt-1">Contrato Nº {modalTenantData.contractNumber}</p>
                        )}
                      </div>
                    ) : (
                      <div className="p-4 flex items-center justify-center gap-2 text-slate-400 text-sm">
                        <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                        Carregando dados do inquilino...
                      </div>
                    )}
                  </div>
                )}
                {formData.type !== 'Vila' && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Fotos (Máximo 8)</label>
                    <div className="grid grid-cols-4 gap-2 mb-2">
                      {formData.photos.map((photo, idx) => (
                        <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 group">
                          <img src={photo} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removePhoto(idx)}
                            className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                      {formData.photos.length < 8 && (
                        <div className="aspect-square rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center gap-1 p-1">
                          <label className="flex flex-col items-center justify-center w-full cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md py-1 transition-colors" title="Escolher da galeria">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                            <input type="file" className="hidden" accept="image/*" multiple onChange={handlePhotoUpload} />
                          </label>
                          <div className="w-full border-t border-slate-200 dark:border-slate-700" />
                          <label className="flex flex-col items-center justify-center w-full cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md py-1 transition-colors" title="Tirar foto com câmera">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
                            <input type="file" className="hidden" accept="image/*" capture="environment" onChange={handlePhotoUpload} />
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    {formData.type === 'Vila' ? 'Nome da Vila' : 'Nome do Imóvel'}
                  </label>
                  <input
                    required
                    type="text"
                    placeholder={formData.type === 'Vila' ? 'Ex: Vila Esperança' : 'Ex: Edifício Solar Apt 102'}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all dark:text-white"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">CEP</label>
                    <input
                      type="text"
                      placeholder="00000000"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all dark:text-white"
                      value={formData.zipCode}
                      onChange={handleCepChange}
                      maxLength={8}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Endereço Completo {cepLoading && <span className="text-xs text-primary animate-pulse">(Buscando...)</span>}
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="Rua, Número, Bairro, Cidade"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all dark:text-white"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>
                </div>

                {formData.address && formData.type !== 'Vila' && (
                  <div className="w-full h-48 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
                    <iframe
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      scrolling="no"
                      marginHeight={0}
                      marginWidth={0}
                      src={`https://maps.google.com/maps?q=${encodeURIComponent(formData.address)}&output=embed`}
                    ></iframe>
                  </div>
                )}

                {formData.type !== 'Vila' && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Agrupamento (Vila / Condomínio)</label>
                    <input
                      type="text"
                      placeholder="Ex: Vila Esperança (Opcional)"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all dark:text-white"
                      value={formData.groupName}
                      onChange={(e) => setFormData({ ...formData, groupName: e.target.value })}
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Tipo</label>
                    <select
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all dark:text-white"
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      disabled={!!editingProperty}
                    >
                      <option>Casa</option>
                      <option>Apartamento</option>
                      <option>Comercial</option>
                      <option>Terreno</option>
                      {!editingProperty && <option>Vila</option>}
                    </select>
                  </div>
                  {formData.type !== 'Vila' && (
                    <>
                      <div className="col-span-2">
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Valor Aluguel</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">R$</span>
                          <input
                            required
                            type="number"
                            placeholder="0.00"
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all dark:text-white"
                            value={formData.rentValue}
                            onChange={(e) => setFormData({ ...formData, rentValue: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Valor IPTU (Mês)</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">R$</span>
                          <input
                            type="number"
                            placeholder="0.00"
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all dark:text-white"
                            value={formData.iptuValue}
                            onChange={(e) => setFormData({ ...formData, iptuValue: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Valor Condomínio</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">R$</span>
                          <input
                            type="number"
                            placeholder="0.00"
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all dark:text-white"
                            value={formData.condoValue}
                            onChange={(e) => setFormData({ ...formData, condoValue: e.target.value })}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Quartos</label>
                        <input
                          type="number"
                          min="0"
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all dark:text-white"
                          value={formData.bedrooms}
                          onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Banheiros</label>
                        <input
                          type="number"
                          min="0"
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all dark:text-white"
                          value={formData.bathrooms}
                          onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Vagas</label>
                        <input
                          type="number"
                          min="0"
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all dark:text-white"
                          value={formData.parkingSpaces}
                          onChange={(e) => setFormData({ ...formData, parkingSpaces: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Área (m²)</label>
                        <input
                          type="number"
                          min="0"
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all dark:text-white"
                          value={formData.area}
                          onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                        />
                      </div>
                    </>
                  )}
                </div>

                {formData.type === 'Vila' && !editingProperty && (
                  <div className="mt-8 space-y-6 border-t border-slate-200 dark:border-slate-800 pt-6">
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-slate-900 dark:text-white">Casas na Vila</h4>
                      <span className="text-xs text-slate-500 font-bold">{vilaHouses.length}/20</span>
                    </div>

                    {vilaHouses.map((house, idx) => (
                      <div key={house.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
                        <div className="flex justify-between items-center mb-2">
                          <h5 className="font-bold text-sm text-slate-700 dark:text-slate-300">Casa {idx + 1}</h5>
                          {vilaHouses.length > 1 && (
                            <button type="button" onClick={() => removeVilaHouse(house.id)} className="text-red-500 hover:text-red-600">
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Número</label>
                            <input
                              required
                              type="text"
                              placeholder="Ex: Casa 1"
                              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-primary transition-all text-sm dark:text-white"
                              value={house.number}
                              onChange={(e) => updateVilaHouse(house.id, 'number', e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Valor Aluguel</label>
                            <input
                              required
                              type="number"
                              placeholder="R$ 0.00"
                              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-primary transition-all text-sm dark:text-white"
                              value={house.rentValue}
                              onChange={(e) => updateVilaHouse(house.id, 'rentValue', e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Status</label>
                            <select
                              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-primary transition-all text-sm dark:text-white"
                              value={house.status}
                              onChange={(e) => updateVilaHouse(house.id, 'status', e.target.value)}
                            >
                              <option value="available">Disponível</option>
                              <option value="rented">Alugado</option>
                              <option value="maintenance">Manutenção</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-2">Fotos Específicas</label>
                          <div className="flex flex-wrap gap-2">
                            {house.photos.map((photo, pIdx) => (
                              <div key={pIdx} className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 group">
                                <img src={photo} className="w-full h-full object-cover" />
                                <button
                                  type="button"
                                  onClick={() => removeVilaPhoto(house.id, pIdx)}
                                  className="absolute top-1 right-1 p-0.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X size={10} />
                                </button>
                              </div>
                            ))}
                            {house.photos.length < 8 && (
                              <div className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center gap-0.5 p-1">
                                <label className="flex items-center justify-center w-full cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors flex-1" title="Galeria">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                                  <input type="file" className="hidden" accept="image/*" multiple onChange={(e) => handleVilaPhotoUpload(e, house.id)} />
                                </label>
                                <div className="w-full border-t border-slate-200 dark:border-slate-700" />
                                <label className="flex items-center justify-center w-full cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors flex-1" title="Câmera">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
                                  <input type="file" className="hidden" accept="image/*" capture="environment" onChange={(e) => handleVilaPhotoUpload(e, house.id)} />
                                </label>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    {vilaHouses.length < 20 && (
                      <button
                        type="button"
                        onClick={addVilaHouse}
                        className="w-full py-3 border-2 border-dashed border-primary text-primary rounded-xl font-bold hover:bg-primary/5 transition-colors flex items-center justify-center gap-2"
                      >
                        <Plus size={18} /> Adicionar Casa
                      </button>
                    )}
                  </div>
                )}

                {formData.type !== 'Vila' && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Status</label>
                    <select
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all dark:text-white"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as PropertyStatus })}
                    >
                      <option value="available">Disponível</option>
                      <option value="rented">Alugado</option>
                      <option value="maintenance">Manutenção</option>
                    </select>
                  </div>
                )}

                {/* Document Vault — visible when editing */}
                {editingProperty && (
                  <DocumentVault propertyId={editingProperty.id} context="property" />
                )}

                <div className="pt-4 flex gap-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 py-3 bg-primary text-white rounded-xl font-bold hover:bg-opacity-90 shadow-lg shadow-primary/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSaving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                    {isSaving ? 'Salvando...' : (editingProperty ? 'Salvar Alterações' : 'Salvar Imóvel')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Link
        to="/tenants"
        className="fixed bottom-24 right-6 z-40 bg-secondary text-white w-14 h-14 rounded-full shadow-2xl hover:bg-opacity-90 hover:scale-110 transition-all flex items-center justify-center"
        title="Ir para Inquilinos"
      >
        <Users size={24} />
      </Link>
      <TerminateRentalModal
        isOpen={!!propertyToTerminate}
        property={propertyToTerminate!}
        tenant={tenantToTerminate}
        contract={contractToTerminate}
        onClose={() => setPropertyToTerminate(null)}
        onSuccess={() => {
          setPropertyToTerminate(null);
          fetchProperties();
        }}
      />
      <LinkTenantModal
        isOpen={!!propertyToLink}
        property={propertyToLink!}
        onClose={() => setPropertyToLink(null)}
        onSuccess={() => {
          setPropertyToLink(null);
          fetchProperties();
        }}
      />
    </Layout>
  );
}
