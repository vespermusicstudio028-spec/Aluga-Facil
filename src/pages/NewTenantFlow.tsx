import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { 
  Building2, 
  Users, 
  ChevronRight, 
  ChevronLeft, 
  Home, 
  MapPin, 
  CheckCircle2, 
  User, 
  Camera, 
  FileText,
  Trash2,
  Eye,
  EyeOff,
  RefreshCw,
  Key,
  Upload,
  Smartphone,
  Eraser,
  Save,
  Download,
  Scale
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Property, Resident, Tenant } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import SignatureCanvas from 'react-signature-canvas';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

import pixIcon from '../assets/images/pix_teal_logo_v2_1783872046658.jpg';
import boletoIcon from '../assets/images/boleto_icon.png';
import cashIcon from '../assets/images/real_cash_fan_icon_1783872566134.jpg';

export default function NewTenantFlow() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const [step, setStep] = useState(1);
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [residentCount, setResidentCount] = useState(1);
  const [residents, setResidents] = useState<Resident[]>([createEmptyResident(true)]);
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState<Record<number, boolean>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit' | 'debit' | 'cash' | null>(null);
  const [pixKey, setPixKey] = useState('');
  const [dueDay, setDueDay] = useState('05');
  const [leaseTerm, setLeaseTerm] = useState('12');
  const [customLeaseTerm, setCustomLeaseTerm] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [contractAccepted, setContractAccepted] = useState(false);
  const [signatureImage, setSignatureImage] = useState<string | null>(null);
  const [ownerSignatureImage, setOwnerSignatureImage] = useState<string | null>(null);
  const [ownerData, setOwnerData] = useState<any>(null);
  const sigCanvas = useRef<SignatureCanvas>(null);
  const ownerSigCanvas = useRef<SignatureCanvas>(null);
  const [userIp, setUserIp] = useState('Detectando...');
  const contractRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('https://api.ipify.org?format=json')
      .then(res => res.json())
      .then(data => setUserIp(data.ip))
      .catch(() => setUserIp('Não detectado'));
  }, []);

  useEffect(() => {
    if (!startDate) return;

    const term = leaseTerm === 'other' ? parseInt(customLeaseTerm) : parseInt(leaseTerm);
    if (!isNaN(term)) {
      const date = new Date(startDate + 'T00:00:00');
      date.setMonth(date.getMonth() + term);
      // Usually, the contract ends the day before (e.g. 1 year later)
      // but adding exact months is standard for simple calculation unless specified.
      // Let's adjust to be the day before for precision (e.g. 01/01/2024 -> 01/01/2025 is technically 1 year and 1 day if inclusive)
      // However, usually it's e.g. 12 months = 01/01 to 01/01 of next year or 31/12.
      // I will subtract one day to make it "until the day before" which is more common in Brazilian rental contracts.
      date.setDate(date.getDate() - 1);
      setEndDate(date.toISOString().split('T')[0]);
    }
  }, [startDate, leaseTerm, customLeaseTerm]);

  
  const generateRandomPassword = (index: number) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*';
    let password = '';
    for (let i = 0; i < 7; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    handleResidentChange(index, 'password', password);
  };

  const togglePasswordVisibility = (index: number) => {
    setShowPasswords(prev => ({ ...prev, [index]: !prev[index] }));
  };

  function createEmptyResident(isTitular = false): Resident {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*';
    let defaultPassword = '';
    for (let i = 0; i < 7; i++) {
      defaultPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }
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
      password: defaultPassword,
      documents: {}
    };
  }

  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const groupedProperties = properties.reduce((acc, property) => {
    const group = property.groupName?.trim() || 'Imóveis Individuais';
    if (!acc[group]) acc[group] = [];
    acc[group].push(property);
    return acc;
  }, {} as Record<string, Property[]>);

  const sortedGroups = Object.keys(groupedProperties).sort((a, b) => {
    if (a === 'Imóveis Individuais') return -1;
    if (b === 'Imóveis Individuais') return 1;
    return a.localeCompare(b);
  });

  const compressImage = (base64Str: string, maxWidth = 800, maxHeight = 800): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Erro ao carregar imagem para compressão'));
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

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      try {
        // Fetch available properties
        const { data: propsSnap } = await supabase
          .from('properties')
          .select('*')
          .eq('owner_id', user.uid)
          .eq('status', 'available');
          
        const props = (propsSnap || []).map(p => ({
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
        }));
        setProperties(props);

        // Fetch owner data
        const { data: ownerDoc } = await supabase.from('profiles').select('*').eq('id', user.uid).single();
        if (ownerDoc) {
          setOwnerData(ownerDoc);
        }

        // If editing, fetch tenant data
        if (id) {
          setIsEditing(true);
          const { data: tenantData } = await supabase.from('tenants').select('*').eq('id', id).single();
          if (tenantData) {
            // Ensure every resident has the documents object
            const sanitizedResidents = tenantData.residents.map(r => {
              let pass = r.password;
              if (!pass) {
                const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*';
                pass = '';
                for (let i = 0; i < 7; i++) {
                  pass += chars.charAt(Math.floor(Math.random() * chars.length));
                }
              }
              return {
                ...r,
                password: pass,
                documents: r.documents || {
                  rgFront: '',
                  rgBack: '',
                  cpf: '',
                  residenceProof: '',
                  incomeProof: ''
                }
              };
            });
            setResidents(sanitizedResidents);
            setResidentCount(sanitizedResidents.length);
            
            if (tenantData.payment_method) {
              setPaymentMethod(tenantData.payment_method as any);
            }
            if (tenantData.pix_key) {
              setPixKey(tenantData.pix_key);
            }
            if (tenantData.due_day) {
              setDueDay(tenantData.due_day);
            }
            if (tenantData.signature) {
              setSignatureImage(tenantData.signature);
            }
            if (tenantData.owner_signature) {
              setOwnerSignatureImage(tenantData.owner_signature);
            }
            if (tenantData.contract_accepted) {
              setContractAccepted(tenantData.contract_accepted);
            }
            if (tenantData.lease_term) {
              if (['12', '24', '30'].includes(tenantData.lease_term)) {
                setLeaseTerm(tenantData.lease_term);
              } else {
                setLeaseTerm('other');
                setCustomLeaseTerm(tenantData.lease_term);
              }
            }
            if (tenantData.start_date) {
              setStartDate(tenantData.start_date);
            }
            if (tenantData.end_date) {
              setEndDate(tenantData.end_date);
            }
            
            // For the selected property, we might need to fetch the specific property if it's already rented
            const { data: propDoc } = await supabase.from('properties').select('*').eq('id', tenantData.property_id).single();
            if (propDoc) {
              const propData = { 
                id: propDoc.id, 
                ownerId: propDoc.owner_id,
                name: propDoc.name,
                address: propDoc.address,
                type: propDoc.type,
                rentValue: propDoc.rent_value,
                status: propDoc.status,
                groupName: propDoc.group_name,
                photos: propDoc.photos || [],
                createdAt: propDoc.created_at,
                updatedAt: propDoc.updated_at
              };
              setSelectedProperty(propData);
              // Add to properties list if not there
              if (!props.find(p => p.id === propData.id)) {
                setProperties(prev => [propData, ...prev]);
              }
            }
            setStep(3); // Start at step 3 for editing
          }
        }
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
      }
    };
    fetchData();
  }, [user, id]);

  const handleResidentChange = (index: number, field: keyof Resident, value: any) => {
    const updated = [...residents];
    updated[index] = { ...updated[index], [field]: value };
    
    // Ensure only one titular
    if (field === 'isTitular' && value === true) {
      updated.forEach((r, i) => {
        if (i !== index) r.isTitular = false;
      });
    }
    
    setResidents(updated);
  };

  const handleDocumentChange = (index: number, field: keyof Resident['documents'], value: string) => {
    const updated = [...residents];
    const currentResident = updated[index];
    updated[index] = { 
      ...currentResident, 
      documents: { 
        ...(currentResident.documents || {
          rgFront: '',
          rgBack: '',
          cpf: '',
          residenceProof: '',
          incomeProof: ''
        }), 
        [field]: value 
      } 
    };
    setResidents(updated);
  };

  const handlePhotoUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const compressed = await compressImage(reader.result as string);
      handleResidentChange(index, 'photo', compressed);
    };
    reader.readAsDataURL(file);
  };

  const handleDocUpload = (index: number, field: keyof Resident['documents'], e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const compressed = await compressImage(reader.result as string);
      handleDocumentChange(index, field, compressed);
    };
    reader.readAsDataURL(file);
  };

  const handleResidentCountChange = (count: number) => {
    setResidentCount(count);
    const current = [...residents];
    if (count > current.length) {
      for (let i = current.length; i < count; i++) {
        current.push(createEmptyResident(false));
      }
    } else {
      current.splice(count);
    }
    setResidents(current);
  };

const handleSubmit = async () => {
    if (!user) {
      alert('Usuário não autenticado.');
      return;
    }
    if (!selectedProperty) {
      alert('Selecione um imóvel antes de finalizar.');
      return;
    }
    if (!contractAccepted) {
      alert('Você precisa aceitar os termos do contrato para finalizar.');
      return;
    }
    setIsLoading(true);
    try {
      let contractStatus = 'pending';
      if (signatureImage && ownerSignatureImage) {
        contractStatus = 'active';
      } else if (signatureImage) {
        contractStatus = 'signed_tenant';
      }

      const contractData = {
        owner_id: user.uid,
        property_id: selectedProperty.id,
        start_date: startDate ? new Date(startDate).toISOString() : new Date().toISOString(),
        end_date: endDate ? new Date(endDate).toISOString() : new Date().toISOString(),
        monthly_value: Number(selectedProperty.rentValue) || 0,
        due_day: Number(dueDay) || 5,
        guarantee_value: 0,
        payment_method: paymentMethod === 'pix' ? 'PIX' : 'Transferência',
        pix_key: paymentMethod === 'pix' ? pixKey : '',
        status: contractStatus,
        tenant_signature: signatureImage || null,
        landlord_signature: ownerSignatureImage || null,
        signature_date: new Date().toISOString()
      };

      if (isEditing && id) {
        await supabase.from('tenants').update({
          residents,
          property_id: selectedProperty.id,
          payment_method: paymentMethod,
          pix_key: paymentMethod === 'pix' ? pixKey : '',
          due_day: dueDay,
          lease_term: leaseTerm === 'other' ? customLeaseTerm : leaseTerm,
          start_date: startDate,
          end_date: endDate,
          signature: signatureImage,
          owner_signature: ownerSignatureImage,
          contract_accepted: contractAccepted,
          updated_at: new Date().toISOString()
        }).eq('id', id);

        const { data: qSnap } = await supabase
          .from('contracts')
          .select('id')
          .eq('tenant_id', id)
          .eq('owner_id', user.uid);
          
        if (qSnap && qSnap.length > 0) {
          await supabase.from('contracts').update({
            ...contractData,
            updated_at: new Date().toISOString()
          }).eq('id', qSnap[0].id);
        } else {
          const contractNumber = `CNT-${Math.floor(100000 + Math.random() * 900000)}`;
          await supabase.from('contracts').insert({
            ...contractData,
            tenant_id: id,
            contract_number: contractNumber,
            created_at: new Date().toISOString()
          });
        }
      } else {
        // Create Tenant
        const { data: tenantRef, error: tenantErr } = await supabase.from('tenants').insert({
          owner_id: user.uid,
          property_id: selectedProperty.id,
          residents,
          payment_method: paymentMethod,
          pix_key: paymentMethod === 'pix' ? pixKey : '',
          due_day: dueDay,
          lease_term: leaseTerm === 'other' ? customLeaseTerm : leaseTerm,
          start_date: startDate,
          end_date: endDate,
          signature: signatureImage,
          owner_signature: ownerSignatureImage,
          contract_accepted: contractAccepted,
          created_at: new Date().toISOString()
        }).select('id').single();

        if (tenantErr) throw tenantErr;

        const contractNumber = `CNT-${Math.floor(100000 + Math.random() * 900000)}`;
        await supabase.from('contracts').insert({
          ...contractData,
          tenant_id: tenantRef.id,
          contract_number: contractNumber,
          created_at: new Date().toISOString()
        });

        // Update Property Status
        await supabase.from('properties').update({
          status: 'rented'
        }).eq('id', selectedProperty.id);

        // If it's a Vila house, create an advance payment
        if (selectedProperty.groupName && selectedProperty.groupName.trim() !== '') {
          await supabase.from('payments').insert({
            owner_id: user.uid,
            property_id: selectedProperty.id,
            tenant_id: tenantRef.id,
            amount: Number(selectedProperty.rentValue),
            due_date: new Date().toISOString(),
            paid_at: new Date().toISOString(),
            status: 'paid',
            created_at: new Date().toISOString()
          });
        }
      }

      alert('Cadastro finalizado com sucesso!');
      navigate('/contracts');
    } catch (err: any) {
      console.error('Erro ao salvar inquilino:', err);
      if (err.code === 'out-of-range' || err.message?.includes('too large')) {
        alert('Erro: O tamanho das fotos é muito grande. Tente fotos menores ou em menor quantidade.');
      } else {
        alert('Erro ao salvar: ' + (err.message || 'Erro desconhecido. Verifique se as fotos não são muito grandes.'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const clearSignature = () => {
    sigCanvas.current?.clear();
    setSignatureImage(null);
  };

  const saveSignature = () => {
    try {
      if (sigCanvas.current?.isEmpty()) return;
      const trimmed = sigCanvas.current?.getTrimmedCanvas();
      if (trimmed) {
        setSignatureImage(trimmed.toDataURL('image/png'));
      }
    } catch (error) {
      console.error("Error trimming signature:", error);
      if (sigCanvas.current) {
        setSignatureImage(sigCanvas.current.getCanvas().toDataURL('image/png'));
      }
    }
  };

  const clearOwnerSignature = () => {
    ownerSigCanvas.current?.clear();
    setOwnerSignatureImage(null);
  };

  const saveOwnerSignature = () => {
    try {
      if (ownerSigCanvas.current?.isEmpty()) return;
      const trimmed = ownerSigCanvas.current?.getTrimmedCanvas();
      if (trimmed) {
        setOwnerSignatureImage(trimmed.toDataURL('image/png'));
      }
    } catch (error) {
      console.error("Error trimming owner signature:", error);
      if (ownerSigCanvas.current) {
        setOwnerSignatureImage(ownerSigCanvas.current.getCanvas().toDataURL('image/png'));
      }
    }
  };

  const generatePDF = async () => {
    if (!contractRef.current) return;
    setIsLoading(true);
    try {
      const canvas = await html2canvas(contractRef.current, {
        scale: 2,
        useCORS: true,
        logging: false
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`contrato_${selectedProperty?.name.replace(/\s+/g, '_').toLowerCase()}.pdf`);
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      alert('Erro ao gerar PDF do contrato.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-12">
          <div className="flex justify-between items-center mb-4">
            {[1, 2, 3, 4, 5, 6].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                   step >= s ? 'bg-primary text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                 }`}>
                   {step > s ? <CheckCircle2 size={20} /> : s}
                 </div>
                 <span className={`hidden sm:block font-bold ${step >= s ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                   {s === 1 ? 'Imóvel' : s === 2 ? 'Moradores' : s === 3 ? 'Dados' : s === 4 ? 'Prazo' : s === 5 ? 'Pagamento' : 'Contrato'}
                 </span>
                 {s < 6 && <div className={`w-12 h-1 ${step > s ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-800'} rounded-full mx-2`}></div>}
               </div>
             ))}
           </div>
         </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
                {isEditing ? 'Alterar Imóvel' : 'Selecione o Imóvel Disponível'}
              </h2>
              <div className="space-y-6">
                {properties.length === 0 ? (
                  <div className="py-12 text-center bg-slate-50 dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                    <p className="text-slate-500 font-medium">Nenhum imóvel disponível para aluguel.</p>
                  </div>
                ) : (
                  sortedGroups.map((group) => (
                    <div key={group} className="space-y-4">
                      {group !== 'Imóveis Individuais' && (
                        <button 
                          onClick={() => setExpandedGroup(expandedGroup === group ? null : group)}
                          className="w-full flex items-center justify-between p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <Building2 size={24} className="text-primary" />
                            <span className="font-bold text-slate-900 dark:text-white text-lg">Vila: {group}</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-500 text-sm font-bold">
                            {groupedProperties[group].length} Casa(s)
                            <ChevronRight size={20} className={`transition-transform ${expandedGroup === group ? 'rotate-90' : ''}`} />
                          </div>
                        </button>
                      )}

                      <AnimatePresence>
                        {(group === 'Imóveis Individuais' || expandedGroup === group) && (
                          <motion.div 
                            initial={group !== 'Imóveis Individuais' ? { height: 0, opacity: 0 } : false}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                              {groupedProperties[group].map((p) => (
                                <div 
                                  key={p.id}
                                  onClick={() => {
                                    setSelectedProperty(p);
                                    setStep(2);
                                  }}
                                  className={`p-4 rounded-3xl border-2 transition-all cursor-pointer flex gap-4 items-center ${
                                    selectedProperty?.id === p.id 
                                      ? 'border-primary bg-primary/5 ring-4 ring-primary/10' 
                                      : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-200 dark:hover:border-slate-700'
                                  }`}
                                >
                                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center shrink-0">
                                    <Home size={28} className="text-slate-400" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-slate-900 dark:text-white truncate">{p.name}</h4>
                                    <p className="text-xs text-slate-500 truncate flex items-center gap-1"><MapPin size={12}/> {p.address}</p>
                                    <p className="text-sm font-bold text-primary mt-1">R$ {p.rentValue.toLocaleString()}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Quantas pessoas irão residir no imóvel?</h2>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                {[1, 2, 3, 4, 5].map((num) => (
                  <button
                    key={num}
                    onClick={() => {
                      handleResidentCountChange(num);
                      setStep(3);
                    }}
                    className={`p-6 rounded-3xl border-2 font-bold transition-all ${
                      residentCount === num 
                        ? 'border-primary bg-primary text-white shadow-xl shadow-primary/20' 
                        : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-slate-200'
                    }`}
                  >
                    {num === 5 ? '5 ou mais' : num}
                  </button>
                ))}
              </div>
              <div className="mt-12 flex justify-start">
                <button onClick={() => setStep(1)} className="px-8 py-3 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl font-bold flex items-center gap-2">
                  <ChevronLeft size={20} /> Voltar
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div 
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
                {isEditing ? 'Editar Dados dos Moradores' : 'Dados dos Moradores'}
              </h2>
              <div className="space-y-8">
                {residents.map((resident, index) => (
                  <div key={index} className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center font-bold text-primary">
                          {index + 1}
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Morador {index + 1}</h3>
                      </div>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={resident.isTitular}
                            onChange={(e) => handleResidentChange(index, 'isTitular', e.target.checked)}
                            className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary" 
                          />
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Titular do Contrato</span>
                        </label>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="md:col-span-2 flex items-center gap-6 mb-4">
                        <label className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-400 cursor-pointer hover:bg-slate-50 transition-colors overflow-hidden">
                          {resident.photo ? (
                            <img src={resident.photo} className="w-full h-full object-cover" />
                          ) : (
                            <>
                              <Camera size={24} />
                              <span className="text-[10px] font-bold mt-1 uppercase">Foto</span>
                            </>
                          )}
                          <input type="file" className="hidden" accept="image/*" onChange={(e) => handlePhotoUpload(index, e)} />
                        </label>
                        <div className="flex-1">
                          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Nome Completo</label>
                          <input 
                            type="text" 
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all dark:text-white"
                            value={resident.name}
                            onChange={(e) => handleResidentChange(index, 'name', e.target.value)}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">CPF</label>
                        <input 
                          type="text" 
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all dark:text-white"
                          value={resident.cpf}
                          onChange={(e) => handleResidentChange(index, 'cpf', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">RG</label>
                        <input 
                          type="text" 
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all dark:text-white"
                          value={resident.rg}
                          onChange={(e) => handleResidentChange(index, 'rg', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Telefone</label>
                        <input 
                          type="text" 
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all dark:text-white"
                          value={resident.phone}
                          onChange={(e) => handleResidentChange(index, 'phone', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">E-mail</label>
                        <input 
                          type="email" 
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all dark:text-white"
                          value={resident.email}
                          onChange={(e) => handleResidentChange(index, 'email', e.target.value)}
                        />
                      </div>
                    </div>


                    {resident.isTitular && (
                      <div className="mt-6 p-6 bg-primary/5 rounded-2xl border border-primary/20">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                          <div>
                            <h4 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                              <Key size={20} className="text-primary" />
                              Senha de Acesso do Inquilino
                            </h4>
                            <p className="text-sm text-slate-500">Senha para o inquilino acessar o painel com CPF e senha.</p>
                          </div>
                          <button
                            onClick={() => generateRandomPassword(index)}
                            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-bold text-sm hover:bg-opacity-90 transition-all"
                          >
                            <RefreshCw size={16} />
                            Gerar Senha
                          </button>
                        </div>
                        <div className="relative">
                          <input 
                            type={showPasswords[index] ? "text" : "password"}
                            className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all dark:text-white font-mono text-lg tracking-wider"
                            value={resident.password || ''}
                            // onChange not needed since it's readOnly
                            placeholder="Ex: A7!k2P9"
                            maxLength={7}
                            readOnly
                          />
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(index)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                          >
                            {showPasswords[index] ? <EyeOff size={20} /> : <Eye size={20} />}
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                      {[
                        { name: 'RG Frente', field: 'rgFront' },
                        { name: 'RG Verso', field: 'rgBack' },
                        { name: 'CPF', field: 'cpf' },
                        { name: 'Residência', field: 'residenceProof' },
                        { name: 'Renda', field: 'incomeProof' }
                      ].map((docItem) => {
                        const field = docItem.field as keyof Resident['documents'];
                        const isUploaded = !!resident.documents?.[field];
                        return (
                          <label key={docItem.name} className={`p-4 rounded-2xl flex flex-col items-center justify-center text-center gap-2 border-2 border-dashed transition-all cursor-pointer overflow-hidden relative group ${
                            isUploaded 
                              ? 'border-primary bg-primary/5' 
                              : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                          }`}>
                            {isUploaded ? (
                              <>
                                <img src={resident.documents[field]} className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-20 transition-opacity" />
                                <Upload size={20} className="text-primary relative z-10" />
                                <span className="text-[10px] font-bold text-primary uppercase relative z-10">{docItem.name}</span>
                              </>
                            ) : (
                              <>
                                <FileText size={20} className="text-slate-400" />
                                <span className="text-[10px] font-bold text-slate-500 uppercase">{docItem.name}</span>
                              </>
                            )}
                            <input 
                              type="file" 
                              className="hidden" 
                              accept="image/*" 
                              onChange={(e) => handleDocUpload(index, field, e)} 
                            />
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-12 flex justify-between">
                <button onClick={() => setStep(2)} className="px-8 py-3 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl font-bold flex items-center gap-2">
                  <ChevronLeft size={20} /> Voltar
                </button>
                <button 
                  onClick={() => setStep(4)} 
                  disabled={isLoading || !residents.some(r => r.isTitular)}
                  className="px-10 py-3 bg-primary text-white rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50"
                >
                  Próximo Passo <ChevronRight size={20} />
                </button>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div 
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Prazo da Locação</h2>
              <p className="text-slate-500 mb-8 font-medium">Defina o tempo de contrato e as datas de vigência.</p>
              
              <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-8">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-4">
                    A presente locação terá prazo de:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {['12', '24', '30'].map((term) => (
                      <button
                        key={term}
                        onClick={() => setLeaseTerm(term)}
                        className={`p-4 rounded-2xl border-2 font-bold transition-all ${
                          leaseTerm === term 
                            ? 'border-primary bg-primary/5 ring-4 ring-primary/10' 
                            : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-200'
                        }`}
                      >
                        {term} meses
                      </button>
                    ))}
                    <div className="relative">
                      <button
                        onClick={() => setLeaseTerm('other')}
                        className={`w-full p-4 rounded-2xl border-2 font-bold transition-all ${
                          leaseTerm === 'other' 
                            ? 'border-primary bg-primary/5 ring-4 ring-primary/10' 
                            : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-200'
                        }`}
                      >
                        Outro
                      </button>
                    </div>
                  </div>

                  {leaseTerm === 'other' && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4"
                    >
                      <input 
                        type="number" 
                        value={customLeaseTerm}
                        onChange={(e) => setCustomLeaseTerm(e.target.value)}
                        placeholder="Digite o número de meses"
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all dark:text-white"
                      />
                    </motion.div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Início:</label>
                    <input 
                      type="date" 
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Término:</label>
                    <input 
                      type="date" 
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all dark:text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-12 flex justify-between">
                <button onClick={() => setStep(3)} className="px-8 py-3 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl font-bold flex items-center gap-2">
                  <ChevronLeft size={20} /> Voltar
                </button>
                <button 
                  onClick={() => setStep(5)} 
                  disabled={isLoading || !startDate || !endDate || (leaseTerm === 'other' && !customLeaseTerm)}
                  className="px-10 py-3 bg-primary text-white rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50"
                >
                  Próximo Passo <ChevronRight size={20} />
                </button>
              </div>
            </motion.div>
          )}

          {step === 5 && (
            <motion.div 
              key="step5"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Forma de Pagamento</h2>
              <p className="text-slate-500 mb-8 font-medium">Selecione o método de pagamento preferencial do inquilino.</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { id: 'pix', label: 'PIX', icon: pixIcon },
                  { id: 'boleto', label: 'Boleto', icon: boletoIcon },
                  { id: 'cash', label: 'Dinheiro', icon: cashIcon }
                ].map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id as any)}
                    className={`p-6 rounded-[2rem] border-2 flex flex-col items-center gap-6 transition-all ${
                      paymentMethod === method.id 
                        ? 'border-primary bg-primary/5 ring-4 ring-primary/10' 
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      <img 
                        src={method.icon} 
                        alt={method.label}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <span className="font-bold text-lg text-slate-900 dark:text-white text-center leading-tight">{method.label}</span>
                  </button>
                ))}
              </div>

              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Vencimento:
                  </label>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-500 font-medium">Todo dia</span>
                    <input 
                      type="number" 
                      min="1"
                      max="31"
                      value={dueDay}
                      onChange={(e) => setDueDay(e.target.value)}
                      className="w-20 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all dark:text-white font-bold text-center"
                    />
                    <span className="text-slate-500 font-medium">de cada mês.</span>
                  </div>
                </div>

                {paymentMethod === 'pix' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800"
                  >
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                      Chave PIX (Opcional)
                    </label>
                    <input 
                      type="text" 
                      value={pixKey}
                      onChange={(e) => setPixKey(e.target.value)}
                      placeholder="E-mail, CPF, Celular ou Chave Aleatória"
                      className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all dark:text-white"
                    />
                  </motion.div>
                )}
              </div>

              <div className="mt-12 flex justify-between">
                <button onClick={() => setStep(4)} className="px-8 py-3 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl font-bold flex items-center gap-2">
                  <ChevronLeft size={20} /> Voltar
                </button>
                <button 
                  onClick={() => setStep(6)} 
                  disabled={isLoading || !paymentMethod}
                  className="px-10 py-3 bg-primary text-white rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50"
                >
                  Próximo Passo <ChevronRight size={20} />
                </button>
              </div>
            </motion.div>
          )}

          {step === 6 && (
            <motion.div 
              key="step6"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div ref={contractRef} className="bg-white dark:bg-slate-900 p-8 sm:p-12 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-8 border-b border-slate-100 dark:border-slate-800 pb-4">Contrato de Locação</h2>
                
                {/* Imóvel */}
                <div className="mb-8">
                  <h3 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
                    <Home size={20} /> 🏠 DADOS DO IMÓVEL
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500">Nome do Imóvel</p>
                      <p className="font-bold text-slate-900 dark:text-white">{selectedProperty?.name}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Endereço Completo</p>
                      <p className="font-bold text-slate-900 dark:text-white">{selectedProperty?.address}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Agrupamento</p>
                      <p className="font-bold text-slate-900 dark:text-white">{selectedProperty?.groupName || 'Individual'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Tipo do Imóvel</p>
                      <p className="font-bold text-slate-900 dark:text-white uppercase">{selectedProperty?.type || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Valor do Aluguel</p>
                      <p className="font-bold text-primary text-lg">R$ {selectedProperty?.rentValue.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* Proprietário */}
                <div className="mb-8">
                  <h3 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
                    <User size={20} /> 👤 DADOS DO PROPRIETÁRIO
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500">Nome Completo</p>
                      <p className="font-bold text-slate-900 dark:text-white">{ownerData?.name || 'Não informado'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">CPF</p>
                      <p className="font-bold text-slate-900 dark:text-white">{ownerData?.cpf || 'Não informado'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">RG</p>
                      <p className="font-bold text-slate-900 dark:text-white">{ownerData?.rg || 'Não informado'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Telefone</p>
                      <p className="font-bold text-slate-900 dark:text-white">{ownerData?.phone || 'Não informado'}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-slate-500">E-mail</p>
                      <p className="font-bold text-slate-900 dark:text-white">{ownerData?.email || user?.email}</p>
                    </div>
                  </div>
                </div>

                {/* Moradores */}
                <div className="mb-8">
                  <h3 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
                    <Users size={20} /> DADOS DOS MORADORES
                  </h3>
                  <p className="text-sm text-slate-500 mb-4 font-bold">Quantidade de moradores: {residents.length}</p>
                  <div className="space-y-4">
                    {residents.map((r, i) => (
                      <div key={i} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-sm grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <p className="text-slate-400 text-xs">Nome Completo</p>
                          <p className="font-bold text-slate-900 dark:text-white">{r.name}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 text-xs">CPF</p>
                          <p className="font-bold text-slate-900 dark:text-white">{r.cpf}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 text-xs">Data de Nascimento</p>
                          <p className="font-bold text-slate-900 dark:text-white">{r.birthDate}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Prazo da Locação */}
                <div className="mb-8">
                  <h3 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
                    <Scale size={20} /> ⏳ PRAZO DA LOCAÇÃO
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500">Prazo de Locação</p>
                      <p className="font-bold text-slate-900 dark:text-white">{leaseTerm === 'other' ? customLeaseTerm : leaseTerm} meses</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Início</p>
                      <p className="font-bold text-slate-900 dark:text-white">{startDate ? new Date(startDate).toLocaleDateString('pt-BR') : 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Término</p>
                      <p className="font-bold text-slate-900 dark:text-white">{endDate ? new Date(endDate).toLocaleDateString('pt-BR') : 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Pagamento */}
                <div className="mb-8">
                  <h3 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
                    <Smartphone size={20} /> 💳 FORMA DE PAGAMENTO
                  </h3>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                      <img 
                        src={paymentMethod === 'pix' ? pixIcon : paymentMethod === 'credit' ? creditIcon : paymentMethod === 'debit' ? debitIcon : cashIcon} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white text-lg">
                         {paymentMethod === 'pix' ? 'PIX' : paymentMethod === 'boleto' ? 'Boleto' : 'Dinheiro'}
                       </p>
                       {paymentMethod === 'pix' && pixKey && <p className="text-slate-500 text-sm">Chave: {pixKey}</p>}
                       <p className="text-slate-500 text-sm font-bold mt-1">Vencimento: Todo dia {dueDay} de cada mês.</p>
                     </div>
                   </div>
                   
                   <div className="mt-6 p-6 bg-red-50 dark:bg-red-900/10 rounded-3xl border border-red-100 dark:border-red-900/30">
                     <h4 className="text-red-600 dark:text-red-400 font-bold text-sm mb-3 uppercase tracking-wider">ATRASO NO PAGAMENTO</h4>
                     <p className="text-red-700 dark:text-red-300 text-sm mb-3 font-medium">Em caso de atraso no pagamento do aluguel serão aplicados:</p>
                     <ul className="space-y-2 text-sm text-red-600 dark:text-red-400 list-disc pl-5 font-medium">
                       <li>Multa de 2% sobre o valor devido;</li>
                       <li>Juros de mora de 1% ao mês;</li>
                       <li>Correção monetária conforme legislação vigente;</li>
                       <li>Possibilidade de cobrança judicial e despejo conforme Lei nº 8.245/1991.</li>
                     </ul>
                   </div>
                 </div>

                 {/* Termos e Cláusulas */}
                <div className="space-y-8 mb-8">
                  <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 uppercase tracking-wider">7. OBRIGAÇÕES DO LOCATÁRIO</h3>
                    <p className="text-sm text-slate-500 mb-3">O locatário compromete-se a:</p>
                    <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400 list-disc pl-5">
                      <li>Pagar pontualmente aluguel e encargos;</li>
                      <li>Manter o imóvel em boas condições;</li>
                      <li>Não realizar obras sem autorização;</li>
                      <li>Respeitar vizinhos e regras do condomínio;</li>
                      <li>Não utilizar o imóvel para atividades ilícitas;</li>
                      <li>Comunicar danos estruturais imediatamente;</li>
                      <li>Restituir o imóvel nas mesmas condições recebidas.</li>
                    </ul>
                  </div>

                  <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 uppercase tracking-wider">8. OBRIGAÇÕES DO LOCADOR</h3>
                    <p className="text-sm text-slate-500 mb-3">O locador compromete-se a:</p>
                    <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400 list-disc pl-5">
                      <li>Entregar o imóvel em condições adequadas de uso;</li>
                      <li>Garantir posse pacífica ao locatário;</li>
                      <li>Realizar reparos estruturais necessários;</li>
                      <li>Respeitar a privacidade do locatário.</li>
                    </ul>
                  </div>

                  <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 uppercase tracking-wider">9. PROIBIÇÕES</h3>
                    <p className="text-sm text-slate-500 mb-3 font-bold text-red-500">É expressamente proibido:</p>
                    <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400 list-disc pl-5">
                      <li>Sublocar o imóvel sem autorização;</li>
                      <li>Utilizar o imóvel para fins ilegais;</li>
                      <li>Perturbar a vizinhança;</li>
                      <li>Modificar a estrutura do imóvel sem autorização;</li>
                      <li>Criar animais quando proibido pelo condomínio ou regulamento local.</li>
                    </ul>
                  </div>

                  <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 uppercase tracking-wider">10. VISTORIA</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      O imóvel será entregue mediante vistoria inicial e deverá ser devolvido nas mesmas condições, salvo desgaste natural decorrente do uso normal.
                    </p>
                  </div>

                  <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 uppercase tracking-wider">11. RESCISÃO CONTRATUAL</h3>
                    <p className="text-sm text-slate-500 mb-3">O contrato poderá ser rescindido:</p>
                    <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400 list-disc pl-5">
                      <li>Por acordo entre as partes;</li>
                      <li>Por inadimplência;</li>
                      <li>Por infração contratual;</li>
                      <li>Nos casos previstos pela Lei do Inquilinato.</li>
                    </ul>
                    <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 font-bold">
                      A rescisão antecipada pelo locatário poderá gerar multa proporcional ao período restante do contrato.
                    </p>
                  </div>

                  <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 uppercase tracking-wider">12. PROTEÇÃO DE DADOS</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      As partes autorizam o tratamento dos dados pessoais exclusivamente para fins de administração da locação, conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).
                    </p>
                  </div>

                  <div className="p-6 bg-primary/5 rounded-3xl border border-primary/20">
                    <h3 className="text-lg font-bold text-primary mb-2 uppercase tracking-wider">13. ACEITE DIGITAL</h3>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                      Ao marcar a opção abaixo e realizar a assinatura eletrônica, as partes declaram que leram, compreenderam e concordam integralmente com os termos deste contrato.
                    </p>
                  </div>
                </div>

                <div className="mb-8 p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 uppercase tracking-wider">14. FORO</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                    Fica eleito o foro da comarca onde está localizado o imóvel para dirimir quaisquer dúvidas ou controvérsias decorrentes deste contrato.
                  </p>
                  <p className="text-[10px] text-slate-400 italic">
                    Contrato gerado eletronicamente em conformidade com a Medida Provisória nº 2.200-2/2001, possuindo validade jurídica mediante aceite e assinatura digital das partes.
                  </p>
                </div>

                {/* Assinatura */}
                <div className="mb-8">
                  <h3 className="text-lg font-bold text-primary mb-4 flex items-center gap-2 uppercase tracking-wider">
                    15. ASSINATURA DIGITAL
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Locatário */}
                    <div className="space-y-4">
                      <p className="text-sm font-bold text-slate-500">Assinatura do Locatário:</p>
                      <div className="bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-4">
                        {signatureImage ? (
                          <div className="relative">
                            <img src={signatureImage} alt="Assinatura Locatário" className="mx-auto max-h-32 bg-white rounded-xl shadow-sm" />
                            <button 
                              type="button"
                              onClick={() => setSignatureImage(null)}
                              className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700 h-32 overflow-hidden">
                              <SignatureCanvas 
                                ref={sigCanvas}
                                penColor="black"
                                canvasProps={{ className: 'w-full h-full' }}
                              />
                            </div>
                            <div className="flex gap-2 mt-3">
                              <button 
                                type="button"
                                onClick={clearSignature}
                                className="flex-1 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold flex items-center justify-center gap-1"
                              >
                                <Eraser size={14} /> Limpar
                              </button>
                              <button 
                                type="button"
                                onClick={saveSignature}
                                className="flex-1 py-2 bg-primary text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1"
                              >
                                <Save size={14} /> Confirmar
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 space-y-1 font-mono uppercase">
                        <p>Data: {new Date().toLocaleDateString('pt-BR')} {new Date().toLocaleTimeString('pt-BR')}</p>
                        <p>IP do Dispositivo: {userIp}</p>
                      </div>
                    </div>

                    {/* Locador */}
                    <div className="space-y-4">
                      <p className="text-sm font-bold text-slate-500">Assinatura do Locador:</p>
                      <div className="bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-4">
                        {!signatureImage ? (
                          <div className="h-[11.5rem] flex flex-col items-center justify-center border-dashed">
                            <div className="text-center">
                              <p className="text-xs font-bold text-slate-400 mb-2">AGUARDANDO ASSINATURA DO LOCATÁRIO</p>
                              <div className="w-24 h-px bg-slate-200 dark:bg-slate-700 mx-auto mb-2"></div>
                            </div>
                          </div>
                        ) : ownerSignatureImage ? (
                          <div className="relative">
                            <img src={ownerSignatureImage} alt="Assinatura Locador" className="mx-auto max-h-32 bg-white rounded-xl shadow-sm" />
                            <button 
                              type="button"
                              onClick={() => setOwnerSignatureImage(null)}
                              className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700 h-32 overflow-hidden">
                              <SignatureCanvas 
                                ref={ownerSigCanvas}
                                penColor="black"
                                canvasProps={{ className: 'w-full h-full' }}
                              />
                            </div>
                            <div className="flex gap-2 mt-3">
                              <button 
                                type="button"
                                onClick={clearOwnerSignature}
                                className="flex-1 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold flex items-center justify-center gap-1"
                              >
                                <Eraser size={14} /> Limpar
                              </button>
                              <button 
                                type="button"
                                onClick={saveOwnerSignature}
                                className="flex-1 py-2 bg-primary text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1"
                              >
                                <Save size={14} /> Confirmar
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 space-y-1 font-mono uppercase">
                        {ownerSignatureImage ? (
                          <>
                            <p>Data: {new Date().toLocaleDateString('pt-BR')} {new Date().toLocaleTimeString('pt-BR')}</p>
                            <p>IP do Dispositivo: {userIp}</p>
                          </>
                        ) : (
                          <>
                            <p>Data: //______</p>
                            <p>IP do Dispositivo: ______________________</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="flex items-center gap-3 p-4 bg-primary/5 dark:bg-primary/10 rounded-2xl cursor-pointer hover:bg-primary/10 transition-colors border border-primary/20">
                    <input 
                      type="checkbox" 
                      checked={contractAccepted}
                      onChange={(e) => setContractAccepted(e.target.checked)}
                      className="w-6 h-6 rounded border-slate-300 text-primary focus:ring-primary" 
                    />
                    <span className="font-bold text-slate-900 dark:text-white">Declaro que li e concordo com todos os termos deste contrato.</span>
                  </label>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button 
                  onClick={generatePDF}
                  className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-slate-200 shadow-sm"
                >
                  <FileText size={20} /> 📄 Gerar Contrato PDF
                </button>
                <button 
                  onClick={handleSubmit} 
                  disabled={isLoading}
                  className="w-full py-4 bg-primary text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg shadow-primary/20 disabled:opacity-50"
                >
                  {isLoading ? 'Salvando...' : '📤 Finalizar Cadastro'}
                </button>
              </div>

              <div className="mt-8 flex justify-start">
                <button onClick={() => setStep(5)} className="px-8 py-3 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl font-bold flex items-center gap-2">
                  <ChevronLeft size={20} /> Voltar
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}
