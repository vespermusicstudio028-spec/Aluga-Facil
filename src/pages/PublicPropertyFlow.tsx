import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Property, User, Resident } from '../types';
import { motion } from 'motion/react';
import { 
  Home, 
  MapPin, 
  Phone, 
  MessageCircle, 
  ChevronRight, 
  ChevronLeft,
  User as UserIcon,
  Calendar,
  CreditCard,
  CheckCircle2
} from 'lucide-react';

function createEmptyResident(isTitular = true): Resident {
  return {
    name: '',
    cpf: '',
    rg: '',
    birthDate: '',
    phone: '',
    email: '',
    profession: '',
    maritalStatus: '',
    isTitular,
    documents: {}
  };
}

export default function PublicPropertyFlow() {
  const { id } = useParams();
  const [property, setProperty] = useState<Property | null>(null);
  const [owner, setOwner] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0); // 0 = details, 1-4 = form
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

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
      setCurrentPhotoIndex(prev => prev === (property?.photos?.length || 1) - 1 ? 0 : prev + 1);
    } else if (isRightSwipe) {
      setCurrentPhotoIndex(prev => prev === 0 ? (property?.photos?.length || 1) - 1 : prev - 1);
    }
  };

  const [residents, setResidents] = useState<Resident[]>([createEmptyResident(true)]);
  const [leaseTerm, setLeaseTerm] = useState('12');
  const [dueDay, setDueDay] = useState('05');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit' | 'debit' | 'cash' | null>(null);
  const [pixKey, setPixKey] = useState('');

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      try {
        const { data: propData, error: propError } = await supabase.from('properties').select('*').eq('id', id).single();
        if (propData) {
          const mappedProp = {
            id: propData.id,
            ownerId: propData.owner_id,
            name: propData.name,
            address: propData.address,
            type: propData.type,
            rentValue: propData.rent_value,
            status: propData.status,
            groupName: propData.group_name,
            photos: propData.photos || [],
            createdAt: propData.created_at,
            updatedAt: propData.updated_at
          } as Property;
          setProperty(mappedProp);
          
          if (mappedProp.ownerId) {
            const { data: ownerData } = await supabase.from('profiles').select('*').eq('id', mappedProp.ownerId).single();
            if (ownerData) {
              setOwner({
                uid: ownerData.id,
                email: ownerData.email,
                name: ownerData.name,
                plan: ownerData.plan,
                status: ownerData.status,
                role: ownerData.role
              } as User);
            }
          }
        }
      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center p-8 bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700">
          <Home size={48} className="mx-auto text-slate-400 mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Imóvel não encontrado</h1>
          <p className="text-slate-500">O imóvel que você está procurando não existe ou foi removido.</p>
        </div>
      </div>
    );
  }

  const handleResidentChange = (index: number, field: string, value: string) => {
    const updated = [...residents];
    updated[index] = { ...updated[index], [field]: value };
    setResidents(updated);
  };

  const getWhatsAppLink = (type: 'chat' | 'rent') => {
    if (!owner?.phone) return '#';
    let phone = owner.phone.replace(/\D/g, '');
    if (!phone.startsWith('55')) phone = '55' + phone;
    
    let text = '';
    if (type === 'chat') {
      text = `Olá! Vi o imóvel "${property.name}" e gostaria de mais informações.`;
    } else {
      const titular = residents.find(r => r.isTitular) || residents[0];
      text = `*Solicitação de Locação*\n\n`;
      text += `*Imóvel:* ${property.name}\n`;
      text += `*Valor:* R$ ${property.rentValue}\n\n`;
      text += `*Dados do Titular:*\n`;
      text += `Nome: ${titular.name}\n`;
      text += `CPF: ${titular.cpf}\n`;
      text += `Telefone: ${titular.phone}\n\n`;
      text += `*Condições:*\n`;
      text += `Prazo: ${leaseTerm} meses\n`;
      text += `Vencimento: Dia ${dueDay}\n`;
      text += `Pagamento: ${paymentMethod === 'pix' ? 'PIX' : paymentMethod}\n`;
      if (paymentMethod === 'pix' && pixKey) {
        text += `Chave PIX: ${pixKey}\n`;
      }
    }
    
    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
      {/* Header image */}
      <div className="h-64 sm:h-80 w-full bg-slate-200 dark:bg-slate-800 relative group" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
        {property.photos && property.photos.length > 0 ? (
          <>
            <img 
              src={property.photos[currentPhotoIndex]} 
              alt={`${property.name} - Foto ${currentPhotoIndex + 1}`} 
              className="w-full h-full object-cover transition-opacity duration-300" 
            />
            
            {property.photos.length > 1 && (
              <>
                <button 
                  onClick={() => setCurrentPhotoIndex(prev => prev === 0 ? (property.photos?.length || 1) - 1 : prev - 1)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/30 hover:bg-black/50 text-white rounded-full backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100 hidden md:flex z-20"
                >
                  <ChevronLeft size={24} />
                </button>
                <button 
                  onClick={() => setCurrentPhotoIndex(prev => prev === (property.photos?.length || 1) - 1 ? 0 : prev + 1)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/30 hover:bg-black/50 text-white rounded-full backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100 hidden md:flex z-20"
                >
                  <ChevronRight size={24} />
                </button>
                
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
                  {(Array.isArray(property.photos) ? property.photos : []).map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentPhotoIndex(idx)}
                      className={`w-2 h-2 rounded-full transition-all ${currentPhotoIndex === idx ? 'bg-white w-4' : 'bg-white/50 hover:bg-white/80'}`}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400">
            <Home size={64} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 max-w-3xl mx-auto text-white z-10">
          <div className="inline-block px-3 py-1 bg-primary/20 backdrop-blur border border-primary/30 rounded-full text-xs font-bold text-primary-100 mb-3">
            {property.status === 'available' ? 'Disponível' : 'Indisponível'}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">{property.name}</h1>
          <div className="flex items-center gap-2 text-slate-300">
            <MapPin size={18} />
            <span>{property.address}</span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-6 relative z-10">
        
        {step === 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 dark:border-slate-700">
              <div className="mb-8">
                <p className="text-sm text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider mb-1">Valor do Aluguel</p>
                <div className="text-4xl font-bold text-primary">
                  R$ {Number(property.rentValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>

              {owner?.phone ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <a 
                    href={getWhatsAppLink('chat')}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-4 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                  >
                    <MessageCircle size={20} /> Conversar
                  </a>
                  <button 
                    onClick={() => setStep(1)}
                    disabled={property.status !== 'available'}
                    className="w-full py-4 bg-primary text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    <Home size={20} /> Alugar Agora
                  </button>
                </div>
              ) : (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center gap-3">
                  <Phone size={24} />
                  <p className="text-sm font-medium">O proprietário ainda não informou um número de WhatsApp.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {step > 0 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-100 dark:border-slate-700">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {step === 1 && <><UserIcon size={24} className="text-primary"/> Dados Pessoais</>}
                {step === 2 && <><Calendar size={24} className="text-primary"/> Prazos</>}
                {step === 3 && <><CreditCard size={24} className="text-primary"/> Pagamento</>}
                {step === 4 && <><CheckCircle2 size={24} className="text-primary"/> Revisão</>}
              </h2>
              <div className="text-sm font-bold text-slate-400">Passo {step} de 4</div>
            </div>

            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Nome Completo</label>
                  <input type="text" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary dark:text-white" value={residents[0].name} onChange={e => handleResidentChange(0, 'name', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">CPF</label>
                  <input type="text" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary dark:text-white" value={residents[0].cpf} onChange={e => handleResidentChange(0, 'cpf', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">WhatsApp / Telefone</label>
                  <input type="tel" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary dark:text-white" value={residents[0].phone} onChange={e => handleResidentChange(0, 'phone', e.target.value)} />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Prazo do Contrato</label>
                  <select className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary dark:text-white" value={leaseTerm} onChange={e => setLeaseTerm(e.target.value)}>
                    <option value="6">6 meses</option>
                    <option value="12">12 meses</option>
                    <option value="24">24 meses</option>
                    <option value="36">36 meses</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Melhor dia para vencimento</label>
                  <select className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary dark:text-white" value={dueDay} onChange={e => setDueDay(e.target.value)}>
                    <option value="01">Dia 1</option>
                    <option value="05">Dia 5</option>
                    <option value="10">Dia 10</option>
                    <option value="15">Dia 15</option>
                    <option value="20">Dia 20</option>
                    <option value="25">Dia 25</option>
                  </select>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Como prefere pagar?</label>
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => setPaymentMethod('pix')} className={`p-4 rounded-2xl border-2 font-bold transition-all ${paymentMethod === 'pix' ? 'border-primary bg-primary/10 text-primary' : 'border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900'}`}>PIX</button>
                  <button onClick={() => setPaymentMethod('cash')} className={`p-4 rounded-2xl border-2 font-bold transition-all ${paymentMethod === 'cash' ? 'border-primary bg-primary/10 text-primary' : 'border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900'}`}>Dinheiro</button>
                </div>
                {paymentMethod === 'pix' && (
                  <div className="mt-4">
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Sua Chave PIX (Opcional)</label>
                    <input type="text" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary dark:text-white" value={pixKey} onChange={e => setPixKey(e.target.value)} />
                  </div>
                )}
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6">
                <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-2xl space-y-4 text-sm text-slate-700 dark:text-slate-300">
                  <p><strong>Nome:</strong> {residents[0].name}</p>
                  <p><strong>CPF:</strong> {residents[0].cpf}</p>
                  <p><strong>Telefone:</strong> {residents[0].phone}</p>
                  <p><strong>Prazo:</strong> {leaseTerm} meses</p>
                  <p><strong>Vencimento:</strong> Dia {dueDay}</p>
                  <p><strong>Pagamento:</strong> {paymentMethod === 'pix' ? 'PIX' : paymentMethod}</p>
                </div>
                <a 
                  href={getWhatsAppLink('rent')}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-4 bg-[#25D366] text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#25D366]/20 hover:bg-opacity-90 transition-colors"
                >
                  <MessageCircle size={20} /> Enviar pelo WhatsApp
                </a>
              </div>
            )}

            <div className="mt-8 flex justify-between pt-6 border-t border-slate-100 dark:border-slate-700">
              <button 
                onClick={() => setStep(step - 1)} 
                className="px-6 py-3 bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              >
                <ChevronLeft size={20} /> Voltar
              </button>
              {step < 4 && (
                <button 
                  onClick={() => setStep(step + 1)} 
                  disabled={(step === 1 && (!residents[0].name || !residents[0].cpf || !residents[0].phone)) || (step === 3 && !paymentMethod)}
                  className="px-8 py-3 bg-primary text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50 hover:bg-primary/90 transition-colors"
                >
                  Próximo <ChevronRight size={20} />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
