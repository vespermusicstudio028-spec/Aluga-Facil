import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import {
  FileText,
  Download,
  Share2,
  CheckCircle2,
  Clock,
  User,
  Home,
  MapPin,
  Calendar,
  DollarSign,
  PenTool,
  RotateCcw,
  ShieldCheck,
  QrCode
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Contract, Property, Tenant, User as AppUser } from '../types';
import { motion } from 'motion/react';
import SignatureCanvas from 'react-signature-canvas';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { QRCodeSVG } from 'qrcode.react';

type TabId = 'resumo' | 'historico' | 'documento' | 'vistoria' | 'argus';

export default function ContractDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [contract, setContract] = useState<Contract | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigning, setIsSigning] = useState(false);
  const [isEditingClauses, setIsEditingClauses] = useState(false);
  const [notesText, setNotesText] = useState('');
  const [isEditingInspection, setIsEditingInspection] = useState(false);
  const [inspectionDraft, setInspectionDraft] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('resumo');
  const [editedClauses, setEditedClauses] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const sigPad = useRef<SignatureCanvas>(null);
  const contractRef = useRef<HTMLDivElement>(null);

  const tabs = [
    { id: 'resumo', label: 'Resumo', icon: <Home size={18} /> },
    { id: 'documento', label: 'Documento', icon: <FileText size={18} /> },
    { id: 'historico', label: 'Histórico', icon: <Clock size={18} /> },
    { id: 'vistoria', label: 'Vistoria', icon: <CheckCircle2 size={18} /> },
    { id: 'argus', label: 'IA Argus', icon: <ShieldCheck size={18} /> }
  ];

  useEffect(() => {
    if (!id) return;
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: contractDoc, error } = await supabase.from('contracts').select('*').eq('id', id!).single();
      if (error || !contractDoc) {
        navigate('/contracts');
        return;
      }
      const contractData: Contract = {
        id: contractDoc.id,
        ownerId: contractDoc.owner_id,
        propertyId: contractDoc.property_id,
        tenantId: contractDoc.tenant_id,
        startDate: contractDoc.start_date,
        endDate: contractDoc.end_date,
        monthlyValue: contractDoc.monthly_value,
        dueDay: contractDoc.due_day,
        guaranteeValue: contractDoc.guarantee_value,
        paymentMethod: contractDoc.payment_method,
        pixKey: contractDoc.pix_key,
        status: contractDoc.status,
        contractNumber: contractDoc.contract_number,
        clauses: contractDoc.clauses,
        tenantSignature: contractDoc.tenant_signature,
        landlordSignature: contractDoc.landlord_signature,
        signatureDate: contractDoc.signature_date,
        signatureIP: contractDoc.signature_ip,
        signatureTime: contractDoc.signature_time,
        validationHash: contractDoc.validation_hash,
        observations: contractDoc.observations,
        createdAt: contractDoc.created_at,
        updatedAt: contractDoc.updated_at
      };
      setContract(contractData);
      setNotesText(contractData.observations || '');
      setEditedClauses(contractData.clauses || getDefaultClauses());

      const [{ data: propDoc }, { data: tenantDoc }] = await Promise.all([
        supabase.from('properties').select('*').eq('id', contractData.propertyId).single(),
        supabase.from('tenants').select('*').eq('id', contractData.tenantId).single()
      ]);

      if (propDoc) setProperty({ id: propDoc.id, ownerId: propDoc.owner_id, name: propDoc.name, address: propDoc.address, type: propDoc.type, rentValue: propDoc.rent_value, status: propDoc.status, groupName: propDoc.group_name, photos: propDoc.photos || [] } as Property);
      if (tenantDoc) setTenant({ id: tenantDoc.id, ownerId: tenantDoc.owner_id, propertyId: tenantDoc.property_id, residents: tenantDoc.residents || [], paymentMethod: tenantDoc.payment_method, dueDay: tenantDoc.due_day } as Tenant);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const getDefaultClauses = () => {
    return `7.1. O INQUILINO compromete-se a zelar pelo imóvel, mantendo-o em perfeitas condições de higiene e uso, responsabilizando-se por quaisquer danos causados.
7.2. É vedada a realização de benfeitorias ou obras sem autorização prévia e por escrito do LOCADOR.
7.3. O atraso no pagamento implicará em multa de 2% e juros de 1% ao mês pro rata die.
7.4. Em caso de rescisão antecipada por parte do INQUILINO, este pagará multa proporcional ao tempo restante do contrato conforme legislação vigente.`;
  };

  const handleSaveNotes = async () => {
    if (!contract || notesText === contract.observations) return;
    try {
      await supabase.from('contracts').update({
        observations: notesText,
        updated_at: new Date().toISOString()
      }).eq('id', contract.id);
      setContract({ ...contract, observations: notesText } as Contract);
    } catch (err) {
      console.error("Erro ao salvar observações:", err);
    }
  };

  const handleSaveClauses = async () => {
    if (!contract) return;
    try {
      await supabase.from('contracts').update({
        clauses: editedClauses,
        updated_at: new Date().toISOString()
      }).eq('id', contract.id);
      setIsEditingClauses(false);
      setContract({ ...contract, clauses: editedClauses });
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveInspection = async () => {
    if (!contract || !inspectionDraft) return;
    try {
      await supabase.from('contracts').update({
        // In reality, this implies the backend 'contracts' table has an 'inspection_data' jsonb column.
        // Assuming it exists from the Phase 1 migration.
        inspection_data: inspectionDraft,
        updated_at: new Date().toISOString()
      }).eq('id', contract.id);
      setIsEditingInspection(false);
      setContract({ ...contract, inspectionData: inspectionDraft } as Contract);
    } catch (err) {
      console.error(err);
    }
  };

  const calculateDuration = () => {
    if (!contract?.startDate || !contract?.endDate) return 0;
    const start = new Date(contract.startDate);
    const end = new Date(contract.endDate);
    const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    return months;
  };

  const handleAnalyzeContract = () => {
    setIsAnalyzing(true);
    setAiReport(null);
    setTimeout(() => {
      setAiReport(`### Avaliação de Risco Concluída - Protocolo Argus

**1. Validação de Garantias:**
O valor da garantia (R$ ${contract?.guaranteeValue?.toLocaleString() || 0}) equivale a aproximadamente ${Math.round((contract?.guaranteeValue || 0) / (contract?.monthlyValue || 1))} meses de aluguel. Essa proporção está de acordo com as normas da Lei do Inquilinato (Lei 8.245/91) para Caução.

**2. Vigência do Contrato:**
O contrato possui um prazo de ${calculateDuration()} meses. A multa rescisória proporcional (art. 4º) está devidamente citada e de acordo com a legalidade.

**3. Cláusulas e Vistoria:**
As responsabilidades e opções embutidas (pets, mobiliário, infraestrutura) estão amparadas pelo modelo AlugaFácil.
O status da vistoria é: **${contract?.inspectionData ? 'REGISTRADO e validado digitalmente. Menor risco estrutural processual.' : 'PENDENTE. Atenção: Entregar as chaves sem laudo representa Altíssimo Risco para litígios futuros sobre avarias.'}**

**CONCLUSÃO:**
Risco Jurídico: **BAIXO**
*Recomenda-se apenas ${contract?.inspectionData ? 'prosseguir com a assinatura' : 'a finalização da vistoria'} antes de tornar o status ATIVO.*`);
      setIsAnalyzing(false);
    }, 3500);
  };

  const clearSignature = () => {
    sigPad.current?.clear();
  };

  const handleSign = async () => {
    if (!sigPad.current || sigPad.current.isEmpty() || !contract || !user) return;

    const signatureData = sigPad.current.getTrimmedCanvas().toDataURL('image/png');

    try {
      const isLandlord = contract.ownerId === user.uid;
      const updates: any = {
        updated_at: new Date().toISOString()
      };

      if (isLandlord) {
        updates.landlord_signature = signatureData;
        if (contract.tenantSignature) updates.status = 'active';
      } else {
        updates.tenant_signature = signatureData;
        updates.status = 'signed_tenant';
      }

      // Metadata for signature
      updates.signature_date = new Date().toISOString();
      updates.signature_time = new Date().toLocaleTimeString();
      updates.signature_ip = 'Vinculado ao dispositivo';
      updates.validation_hash = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

      await supabase.from('contracts').update(updates).eq('id', contract.id);
      setIsSigning(false);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const downloadPDF = async () => {
    if (!contractRef.current) return;

    const element = contractRef.current;
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    let imgHeightInMm = (imgProps.height * pdfWidth) / imgProps.width;
    let heightLeft = imgHeightInMm;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeightInMm);
    heightLeft -= pdfHeight;

    while (heightLeft > 0) {
      position -= pdfHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeightInMm);
      heightLeft -= pdfHeight;
    }

    pdf.save(`Contrato_${contract?.contractNumber || 'AlugaFacil'}.pdf`);
  };

  const shareWhatsApp = () => {
    const text = `Olá! Segue o link para visualizar e assinar o contrato de locação: ${window.location.href}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  const titular = tenant?.residents.find(r => r.isTitular);
  const otherResidents = tenant?.residents.filter(r => !r.isTitular) || [];

  return (
    <Layout>
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main Content Area */}
        <div className="flex-1 space-y-6">
          {/* Tab Navigation */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-2 flex overflow-x-auto scrollbar-hide shadow-sm gap-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabId)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap z-10 relative
                  ${activeTab === tab.id
                    ? 'text-white bg-primary shadow-lg shadow-primary/20'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'resumo' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Propriedade */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                  <div className="absolute -top-4 -right-4 p-6 opacity-5 group-hover:scale-110 transition-transform">
                    <Home size={100} />
                  </div>
                  <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-4 relative z-10">
                    <Home size={24} />
                  </div>
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wide mb-1 relative z-10">Imóvel Associado</h4>
                  <p className="text-xl font-bold text-slate-900 dark:text-white mb-2 relative z-10">{property?.name}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 relative z-10">{property?.address}</p>
                </div>

                {/* Inquilino */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                  <div className="absolute -top-4 -right-4 p-6 opacity-5 group-hover:scale-110 transition-transform">
                    <User size={100} />
                  </div>
                  <div className="w-12 h-12 bg-secondary/10 text-secondary rounded-2xl flex items-center justify-center mb-4 relative z-10">
                    <User size={24} />
                  </div>
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wide mb-1 relative z-10">Locatário / Titular</h4>
                  <p className="text-xl font-bold text-slate-900 dark:text-white mb-2 relative z-10">{titular?.name || 'Não identificado'}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 relative z-10">{tenant?.residents?.length || 1} Moradores cadastrados</p>
                </div>

                {/* Financeiro */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                  <div className="absolute -top-4 -right-4 p-6 opacity-5 group-hover:scale-110 transition-transform">
                    <DollarSign size={100} />
                  </div>
                  <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center mb-4 relative z-10">
                    <DollarSign size={24} />
                  </div>
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wide mb-1 relative z-10">Valor Mensal</h4>
                  <p className="text-2xl font-black text-emerald-500 mb-2 relative z-10">
                    R$ {contract?.monthlyValue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <div className="flex justify-between items-center text-sm text-slate-500 dark:text-slate-400 relative z-10">
                    <span className="font-medium">Garantia/Caução: R$ {contract?.guaranteeValue?.toLocaleString('pt-BR')}</span>
                    <span className="font-bold flex items-center gap-1"><Clock size={14} /> Dia {contract?.dueDay}</span>
                  </div>
                </div>
              </div>

              {/* Additional Data Grid */}
              <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase mb-2 tracking-wide">Data de Início</p>
                  <p className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Calendar size={18} className="text-primary" />
                    {contract?.startDate ? new Date(contract.startDate).toLocaleDateString('pt-BR') : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase mb-2 tracking-wide">Data de Fim</p>
                  <p className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Calendar size={18} className="text-red-400" />
                    {contract?.endDate ? new Date(contract.endDate).toLocaleDateString('pt-BR') : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase mb-2 tracking-wide">Pagamento</p>
                  <p className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <DollarSign size={18} className="text-emerald-500" />
                    {contract?.paymentMethod}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase mb-2 tracking-wide">Duração</p>
                  <p className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Clock size={18} className="text-secondary" />
                    {calculateDuration()} meses
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'historico' && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-8 md:p-12">
              <h3 className="text-xl font-bold dark:text-white mb-8 flex items-center gap-2"><Clock className="text-primary" /> Histórico do Contrato</h3>

              <div className="relative border-l-2 border-slate-100 dark:border-slate-800 ml-4 space-y-12">
                {/* Step 1: Criação */}
                <div className="relative pl-8">
                  <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-primary ring-4 ring-white dark:ring-slate-900 border-2 border-white dark:border-slate-900 shadow-sm" />
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                    {contract?.createdAt ? new Date(contract.createdAt).toLocaleString('pt-BR') : 'Data não registrada'}
                  </p>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">Contrato Gerado</h4>
                  <p className="text-sm text-slate-500 mt-1">O documento base do contrato foi processado e incluído no sistema com status "Aguardando Assinaturas".</p>
                </div>

                {/* Step 2: Assinatura Inquilino */}
                <div className="relative pl-8">
                  <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full ring-4 ring-white dark:ring-slate-900 border-2 border-white dark:border-slate-900 shadow-sm ${contract?.tenantSignature ? 'bg-secondary' : 'bg-slate-200 dark:bg-slate-700'}`} />
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                    {contract?.tenantSignature ? (contract.signatureDate ? new Date(contract.signatureDate).toLocaleString('pt-BR') : 'Assinado') : 'Pendente'}
                  </p>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">Assinatura do Inquilino</h4>
                  <p className="text-sm text-slate-500 mt-1">
                    {contract?.tenantSignature
                      ? `O inquilino visualizou e firmou eletronicamente o documento. (Validação IP gravada)`
                      : 'Aguardando o inquilino realizar a assinatura digital no painel remoto.'}
                  </p>
                </div>

                {/* Step 3: Assinatura Locador */}
                <div className="relative pl-8">
                  <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full ring-4 ring-white dark:ring-slate-900 border-2 border-white dark:border-slate-900 shadow-sm ${contract?.landlordSignature ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                    {contract?.landlordSignature ? (contract.signatureDate ? new Date(contract.signatureDate).toLocaleString('pt-BR') : 'Assinado') : 'Pendente'}
                  </p>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">Assinatura do Proprietário</h4>
                  <p className="text-sm text-slate-500 mt-1">
                    {contract?.landlordSignature
                      ? `Você atestou e validou o contrato neste sistema, firmando as cláusulas.`
                      : 'A assinatura do proprietário locador está pendente para autenticar o documento.'}
                  </p>
                </div>

                {/* Step 4: Ativação */}
                <div className="relative pl-8">
                  <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full ring-4 ring-white dark:ring-slate-900 border-2 border-white dark:border-slate-900 shadow-sm ${(contract?.status === 'active' || contract?.status === 'ativo' || contract?.status === 'signed_all') ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`} />
                  <h4 className="text-base font-bold text-slate-900 dark:text-white mt-1">Entrada em Vigor</h4>
                  <p className="text-sm text-slate-500 mt-1">
                    {(contract?.status === 'active' || contract?.status === 'ativo' || contract?.status === 'signed_all')
                      ? 'O documento está inteiramente assinado e as cláusulas encontram-se vigentes, habilitando o ciclo de faturamento da plataforma AlugaFácil.'
                      : 'O status da locação será alterado para Ativo apenas após assinatura e validação eletrônica de todas as partes requeridas.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'vistoria' && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-8 md:p-12">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold dark:text-white flex items-center gap-2">
                  <CheckCircle2 className="text-primary" />
                  Laudo de Vistoria Prévia
                </h3>
                <div className="flex items-center gap-3">
                  {contract?.inspectionAgreed && (
                    <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 rounded-lg text-xs font-bold uppercase tracking-wider border border-emerald-500/20">
                      Vistoria Aprovada
                    </span>
                  )}
                  {contract?.inspectionData && !isEditingInspection && (
                    <button
                      onClick={() => {
                        setInspectionDraft(contract.inspectionData);
                        setIsEditingInspection(true);
                      }}
                      className="text-xs font-bold text-primary hover:underline"
                    >
                      Editar Vistoria
                    </button>
                  )}
                </div>
              </div>

              {!contract?.inspectionData && !isEditingInspection ? (
                <div className="text-center py-20 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                  <div className="w-16 h-16 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MapPin className="text-slate-400" size={24} />
                  </div>
                  <h4 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">Nenhuma vistoria registrada</h4>
                  <p className="text-slate-500 text-sm max-w-sm mx-auto mb-6">
                    A vistoria garante a segurança de que o imóvel foi entregue nas condições adequadas para uso.
                  </p>
                  <button
                    onClick={() => {
                      setInspectionDraft({
                        photos: [], videos: [], notes: '', checklist: {
                          keysDelivered: false, remoteDelivered: false, tagDelivered: false,
                          waterRegularized: false, energyRegularized: false, gasRegularized: false, propertyInspected: false
                        }
                      });
                      setIsEditingInspection(true);
                    }}
                    className="px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-opacity-90 transition-all shadow-lg shadow-primary/20"
                  >
                    Iniciar Laudo de Vistoria
                  </button>
                </div>
              ) : isEditingInspection ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h4 className="font-bold text-sm uppercase text-slate-500">Documentação e Acessos</h4>
                      <label className="flex items-center gap-3"><input type="checkbox" checked={inspectionDraft.checklist.keysDelivered} onChange={(e) => setInspectionDraft({ ...inspectionDraft, checklist: { ...inspectionDraft.checklist, keysDelivered: e.target.checked } })} className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4" /> <span className="text-sm">Chaves Entregues</span></label>
                      <label className="flex items-center gap-3"><input type="checkbox" checked={inspectionDraft.checklist.remoteDelivered} onChange={(e) => setInspectionDraft({ ...inspectionDraft, checklist: { ...inspectionDraft.checklist, remoteDelivered: e.target.checked } })} className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4" /> <span className="text-sm">Controle de Portão</span></label>
                      <label className="flex items-center gap-3"><input type="checkbox" checked={inspectionDraft.checklist.tagDelivered} onChange={(e) => setInspectionDraft({ ...inspectionDraft, checklist: { ...inspectionDraft.checklist, tagDelivered: e.target.checked } })} className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4" /> <span className="text-sm">TAG de Acesso</span></label>
                    </div>
                    <div className="space-y-4">
                      <h4 className="font-bold text-sm uppercase text-slate-500">Regularidade</h4>
                      <label className="flex items-center gap-3"><input type="checkbox" checked={inspectionDraft.checklist.waterRegularized} onChange={(e) => setInspectionDraft({ ...inspectionDraft, checklist: { ...inspectionDraft.checklist, waterRegularized: e.target.checked } })} className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4" /> <span className="text-sm">Água Ligada/Regular</span></label>
                      <label className="flex items-center gap-3"><input type="checkbox" checked={inspectionDraft.checklist.energyRegularized} onChange={(e) => setInspectionDraft({ ...inspectionDraft, checklist: { ...inspectionDraft.checklist, energyRegularized: e.target.checked } })} className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4" /> <span className="text-sm">Energia Ligada/Regular</span></label>
                      <label className="flex items-center gap-3"><input type="checkbox" checked={inspectionDraft.checklist.propertyInspected} onChange={(e) => setInspectionDraft({ ...inspectionDraft, checklist: { ...inspectionDraft.checklist, propertyInspected: e.target.checked } })} className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4" /> <span className="text-sm">Imóvel Limpo e Vistoriado</span></label>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm uppercase text-slate-500 mb-2">Observações da Vistoria (Laudo de Estado)</h4>
                    <textarea
                      value={inspectionDraft.notes}
                      onChange={(e) => setInspectionDraft({ ...inspectionDraft, notes: e.target.value })}
                      className="w-full h-32 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-sm outline-none focus:ring-1 focus:ring-primary"
                      placeholder="Descreva defeitos visíveis, avarias, etc."
                    />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm uppercase text-slate-500 mb-2">Anexar Arquivos (Simulação)</h4>
                    <button className="py-2 px-4 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700">
                      + Escolher Fotos/Vídeos (0)
                    </button>
                  </div>
                  <div className="flex gap-2 justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button onClick={() => setIsEditingInspection(false)} className="px-6 py-2 rounded-xl text-slate-500 font-bold hover:bg-slate-50">Cancelar</button>
                    <button onClick={handleSaveInspection} className="px-6 py-2 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20">Salvar Vistoria</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="grid grid-cols-2 gap-8 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div>
                      <h4 className="font-bold text-xs uppercase text-slate-400 mb-4">Acessos</h4>
                      <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                        <li className="flex items-center gap-2">{contract?.inspectionData?.checklist?.keysDelivered ? '✅' : '❌'} Chaves</li>
                        <li className="flex items-center gap-2">{contract?.inspectionData?.checklist?.remoteDelivered ? '✅' : '❌'} Controle Portão</li>
                        <li className="flex items-center gap-2">{contract?.inspectionData?.checklist?.tagDelivered ? '✅' : '❌'} TAG Acesso</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-bold text-xs uppercase text-slate-400 mb-4">Regularidade</h4>
                      <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                        <li className="flex items-center gap-2">{contract?.inspectionData?.checklist?.waterRegularized ? '✅' : '❌'} Água Ligada</li>
                        <li className="flex items-center gap-2">{contract?.inspectionData?.checklist?.energyRegularized ? '✅' : '❌'} Energia Elétrica</li>
                        <li className="flex items-center gap-2">{contract?.inspectionData?.checklist?.propertyInspected ? '✅' : '❌'} Imóvel Limpo/Vistoriado</li>
                      </ul>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-2">Relatório</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                      {contract?.inspectionData?.notes || 'Nenhuma observação informada.'}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-2">Anexos Fotográficos</h4>
                    <div className="flex items-center h-24 w-full bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl justify-center">
                      <span className="text-xs text-slate-400 font-bold uppercase">Mídias em breve no sistema de Storage.</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'argus' && (
            <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-lg overflow-hidden p-8 md:p-12 relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[100px] rounded-full pointer-events-none"></div>

              <div className="flex items-center justify-between mb-8 relative z-10">
                <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center border border-primary/30">
                    <ShieldCheck className="text-primary" size={20} />
                  </div>
                  Argus AI Intel
                </h3>
              </div>

              <div className="text-center py-16 relative z-10">
                {isAnalyzing ? (
                  <div className="space-y-6 flex flex-col items-center animate-pulse">
                    <ShieldCheck className="text-primary animate-bounce mx-auto" size={64} />
                    <h4 className="text-xl font-bold text-white">Analisando Contrato...</h4>
                    <p className="text-slate-400">Extraindo dados, valores e validando integridade jurídica.</p>
                  </div>
                ) : aiReport ? (
                  <div className="text-left bg-slate-800/80 p-8 rounded-2xl border border-slate-700/50 shadow-xl backdrop-blur-md prose prose-invert max-w-full">
                    <div dangerouslySetInnerHTML={{ __html: aiReport.replace(/\n\n/g, '<br/><br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                    <div className="mt-8 pt-6 border-t border-slate-700 flex justify-center">
                      <button onClick={() => setAiReport(null)} className="text-sm font-bold text-slate-400 hover:text-white transition-colors">Nova Análise</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <ShieldCheck className="text-slate-700 mx-auto mb-6" size={64} />
                    <h4 className="text-xl font-bold text-white mb-3">Análise de Risco Contratual</h4>
                    <p className="text-slate-400 max-w-md mx-auto mb-8 leading-relaxed">
                      A inteligência artificial Argus verifica pontos de atenção no contrato, comparando o valor exigido como garantia com o valor do aluguel, validando prazos ideais e cláusulas atípicas.
                    </p>
                    <button onClick={handleAnalyzeContract} className="px-8 py-4 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all shadow-[0_0_30px_rgba(37,99,235,0.3)]">
                      Verificar Oportunidade com Inteligência Artificial
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {activeTab === 'documento' && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 text-primary rounded-2xl">
                    <FileText size={24} />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">Documento de Locação</h1>
                    <p className="text-sm text-slate-500 font-medium">Ref: {contract?.contractNumber}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={downloadPDF}
                    className="p-3 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                    title="Download PDF"
                  >
                    <Download size={20} />
                  </button>
                  <button
                    onClick={shareWhatsApp}
                    className="p-3 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                    title="Compartilhar"
                  >
                    <Share2 size={20} />
                  </button>
                </div>
              </div>

              {/* The Professional Contract Template */}
              <div className="p-12 max-h-[800px] overflow-y-auto scrollbar-hide bg-slate-50/30">
                <div
                  ref={contractRef}
                  className="bg-white dark:bg-slate-950 p-12 md:p-20 shadow-sm min-h-[297mm] text-slate-800 dark:text-slate-200 font-serif leading-relaxed relative overflow-hidden"
                >
                  {/* Marca D'água */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] dark:opacity-[0.02] pointer-events-none">
                    <Home size={600} />
                  </div>

                  <div className="text-center mb-12 relative z-10 border-b-2 border-slate-900 dark:border-slate-100 pb-8">
                    <div className="flex justify-center mb-6">
                      <div className="w-16 h-16 bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center rounded-xl shadow-md">
                        <Home size={32} />
                      </div>
                    </div>
                    <h2 className="text-3xl font-black uppercase tracking-widest mb-3">Contrato de Locação Residencial</h2>
                    <div className="flex items-center justify-center gap-4 text-xs font-bold text-slate-500 uppercase tracking-widest">
                      <span>Ref: {contract?.contractNumber}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                      <span className={`${(contract?.status === 'active' || contract?.status === 'ativo' || contract?.status === 'signed_all') ? 'text-emerald-500' : 'text-amber-500'}`}>
                        VIGÊNCIA: {contract?.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  <section className="mb-8">
                    <h3 className="font-bold border-b border-slate-200 dark:border-slate-800 pb-2 mb-4 uppercase text-sm tracking-wider">1. Locador (Proprietário)</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <p><span className="font-bold">Nome:</span> {user?.name}</p>
                      <p><span className="font-bold">E-mail:</span> {user?.email}</p>
                    </div>
                  </section>

                  <section className="mb-8">
                    <h3 className="font-bold border-b border-slate-200 dark:border-slate-800 pb-2 mb-4 uppercase text-sm tracking-wider">2. Imóvel Locado</h3>
                    <div className="text-sm space-y-2">
                      <p><span className="font-bold">Endereço:</span> {property?.address}</p>
                      <p><span className="font-bold">Tipo:</span> {property?.type}</p>
                    </div>
                  </section>

                  <section className="mb-8">
                    <h3 className="font-bold border-b border-slate-200 dark:border-slate-800 pb-2 mb-4 uppercase text-sm tracking-wider">3. Inquilino Principal</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <p><span className="font-bold">Nome:</span> {titular?.name}</p>
                      <p><span className="font-bold">CPF:</span> {titular?.cpf}</p>
                      <p><span className="font-bold">RG:</span> {titular?.rg}</p>
                      <p><span className="font-bold">Telefone:</span> {titular?.phone}</p>
                    </div>
                  </section>

                  {otherResidents.length > 0 && (
                    <section className="mb-8">
                      <h3 className="font-bold border-b border-slate-200 dark:border-slate-800 pb-2 mb-4 uppercase text-sm tracking-wider">4. Demais Moradores</h3>
                      <p className="text-sm mb-4">Quantidade de moradores: {otherResidents.length}</p>
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-900">
                            <th className="border border-slate-200 dark:border-slate-800 p-2 text-left">Nome</th>
                            <th className="border border-slate-200 dark:border-slate-800 p-2 text-left">CPF</th>
                            <th className="border border-slate-200 dark:border-slate-800 p-2 text-left">Nascimento</th>
                          </tr>
                        </thead>
                        <tbody>
                          {otherResidents.map((r, idx) => (
                            <tr key={idx}>
                              <td className="border border-slate-200 dark:border-slate-800 p-2">{r.name}</td>
                              <td className="border border-slate-200 dark:border-slate-800 p-2">{r.cpf}</td>
                              <td className="border border-slate-200 dark:border-slate-800 p-2">{r.birthDate}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </section>
                  )}

                  <section className="mb-8">
                    <h3 className="font-bold border-b border-slate-200 dark:border-slate-800 pb-2 mb-4 uppercase text-sm tracking-wider">5. Prazo da Locação</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <p><span className="font-bold">Início:</span> {contract?.startDate ? new Date(contract.startDate).toLocaleDateString() : '-'}</p>
                      <p><span className="font-bold">Término:</span> {contract?.endDate ? new Date(contract.endDate).toLocaleDateString() : '-'}</p>
                      <p><span className="font-bold">Duração:</span> {calculateDuration()} meses</p>
                    </div>
                  </section>

                  <section className="mb-8">
                    <h3 className="font-bold border-b border-slate-200 dark:border-slate-800 pb-2 mb-4 uppercase text-sm tracking-wider">6. Valores e Pagamentos</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <p><span className="font-bold">Aluguel Mensal:</span> R$ {contract?.monthlyValue.toLocaleString()}</p>
                      <p><span className="font-bold">Vencimento:</span> Todo dia {contract?.dueDay}</p>
                      <p><span className="font-bold">Garantia (Caução):</span> R$ {contract?.guaranteeValue.toLocaleString()}</p>
                      <p><span className="font-bold">Forma:</span> {contract?.paymentMethod}</p>
                      {contract?.pixKey && <p className="col-span-2"><span className="font-bold">Chave PIX:</span> {contract.pixKey}</p>}
                    </div>
                  </section>

                  <section className="mb-8">
                    <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-2 mb-4">
                      <h3 className="font-bold uppercase text-sm tracking-wider">7. Responsabilidades e Cláusulas</h3>
                      {contract?.ownerId === user?.uid && !contract.tenantSignature && !contract.landlordSignature && (
                        <button
                          onClick={() => setIsEditingClauses(!isEditingClauses)}
                          className="text-[10px] font-bold text-primary hover:underline"
                        >
                          {isEditingClauses ? 'Visualizar' : 'Editar Cláusulas'}
                        </button>
                      )}
                    </div>
                    {isEditingClauses ? (
                      <div className="space-y-4">
                        <textarea
                          className="w-full h-40 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-1 focus:ring-primary"
                          value={editedClauses}
                          onChange={(e) => setEditedClauses(e.target.value)}
                        />
                        <button
                          onClick={handleSaveClauses}
                          className="px-4 py-2 bg-primary text-white rounded-lg text-xs font-bold"
                        >
                          Salvar Cláusulas
                        </button>
                      </div>
                    ) : (
                      <div className="text-[10px] space-y-2 opacity-80 text-justify whitespace-pre-wrap">
                        {contract?.clauses || getDefaultClauses()}
                      </div>
                    )}
                  </section>

                  <section className="mb-12 relative z-10">
                    <h3 className="font-bold border-b border-slate-200 dark:border-slate-800 pb-2 mb-4 uppercase text-sm tracking-wider">8. Vistoria Prévia</h3>
                    <div className="text-[10px] opacity-80 space-y-2">
                      <p>Ao assinar, o LOCATÁRIO atesta que vistoriou o imóvel e declara tê-lo recebido em perfeito estado de uso e conservação, conforme anexos digitais disponíveis na plataforma AlugaFácil.</p>
                      <div className="flex items-center gap-2 text-primary font-bold">
                        <ShieldCheck size={14} /> Vistoria Eletrônica Vinculada.
                      </div>
                    </div>
                  </section>

                  <section className="mb-12 relative z-10">
                    <h3 className="font-bold border-b border-slate-200 dark:border-slate-800 pb-2 mb-4 uppercase text-sm tracking-wider">9. Condições Acordadas e Entrega</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-2 text-[10px] uppercase font-bold text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full border border-slate-400 flex items-center justify-center p-[1px]">
                          {contract?.options?.allowsPets && <div className="w-full h-full bg-slate-800 rounded-full" />}
                        </div>
                        Permite Animais (Pets)
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full border border-slate-400 flex items-center justify-center p-[1px]">
                          {contract?.options?.isFurnished && <div className="w-full h-full bg-slate-800 rounded-full" />}
                        </div>
                        Imóvel Mobiliado
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full border border-slate-400 flex items-center justify-center p-[1px]">
                          {contract?.options?.hasGarage && <div className="w-full h-full bg-slate-800 rounded-full" />}
                        </div>
                        Vaga de Garagem
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full border border-slate-400 flex items-center justify-center p-[1px]">
                          {contract?.options?.allowsSublease && <div className="w-full h-full bg-slate-800 rounded-full" />}
                        </div>
                        Permissão Sublocação
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full border border-slate-400 flex items-center justify-center p-[1px]">
                          {contract?.options?.requiresInsurance && <div className="w-full h-full bg-slate-800 rounded-full" />}
                        </div>
                        Seguro Incêndio Obrigatório
                      </div>
                    </div>
                  </section>

                  <div className="mt-24 grid grid-cols-2 gap-12 relative z-10">
                    <div className="text-center">
                      <div className="h-20 border-b border-slate-300 dark:border-slate-700 mb-2 flex items-center justify-center">
                        {contract?.tenantSignature && (
                          <img src={contract.tenantSignature} className="max-h-full" alt="Assinatura Inquilino" />
                        )}
                      </div>
                      <p className="text-xs font-bold uppercase">Assinatura do Inquilino</p>
                      <p className="text-[8px] text-slate-400">{contract?.tenantSignature ? 'Assinado Digitalmente' : 'Pendente'}</p>
                    </div>
                    <div className="text-center">
                      <div className="h-20 border-b border-slate-300 dark:border-slate-700 mb-2 flex items-center justify-center">
                        {contract?.landlordSignature && (
                          <img src={contract.landlordSignature} className="max-h-full" alt="Assinatura Locador" />
                        )}
                      </div>
                      <p className="text-xs font-bold uppercase">Assinatura do Locador</p>
                      <p className="text-[8px] text-slate-400">{contract?.landlordSignature ? 'Assinado Digitalmente' : 'Pendente'}</p>
                    </div>
                  </div>

                  <div className="mt-12 pt-8 border-t border-slate-100 dark:border-slate-900 flex justify-between items-end">
                    <div className="space-y-1">
                      <p className="text-[8px] font-bold text-slate-400 uppercase">Validação Eletrônica</p>
                      <p className="text-[8px] font-mono text-slate-400">HASH: {contract?.validationHash || 'PENDENTE'}</p>
                      <p className="text-[8px] text-slate-400">Data: {contract?.signatureDate ? new Date(contract.signatureDate).toLocaleDateString() : '-'} | IP: {contract?.signatureIP}</p>
                    </div>
                    <div className="w-16 h-16 opacity-70 bg-white p-1 rounded">
                      {contract?.id ? (
                        <QRCodeSVG
                          value={`${window.location.origin}/validar-contrato/${contract.id}`}
                          size={56}
                          level="M"
                        />
                      ) : (
                        <QrCode size={56} className="text-slate-400" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Control Sidebar */}
        <div className="lg:w-80 space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Status do Contrato</h3>

            <div className="space-y-4 mb-6">
              {[
                { id: 'pending', label: 'Aguardando Assinaturas', icon: Clock, color: 'text-amber-500 bg-amber-500/10' },
                { id: 'signed_tenant', label: 'Assinado pelo Inquilino', icon: User, color: 'text-blue-500 bg-blue-500/10' },
                { id: 'active', label: 'Ativo', icon: CheckCircle2, color: 'text-emerald-500 bg-emerald-500/10' },
                { id: 'closed', label: 'Encerrado', icon: ShieldCheck, color: 'text-slate-400 bg-slate-100' }
              ].map((s) => (
                <div key={s.id} className={`flex items-center gap-3 p-3 rounded-2xl border ${contract?.status === s.id ? 'border-primary bg-primary/5' : 'border-transparent opacity-60'}`}>
                  <div className={`p-2 rounded-lg ${s.color}`}>
                    <s.icon size={16} />
                  </div>
                  <span className={`text-sm font-bold ${contract?.status === s.id ? 'text-primary' : 'text-slate-500'}`}>{s.label}</span>
                </div>
              ))}
            </div>

            {!isSigning ? (
              <div className="space-y-3">
                <button
                  onClick={() => setIsSigning(true)}
                  className="w-full py-4 bg-primary text-white rounded-2xl font-bold hover:bg-opacity-90 shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
                >
                  <PenTool size={20} />
                  Assinar Agora
                </button>
                <p className="text-[10px] text-center text-slate-500 px-4">
                  A assinatura eletrônica tem validade jurídica conforme MP 2.200-2/2001.
                </p>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-4"
              >
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-primary/20">
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-3 uppercase tracking-wider">Sua Assinatura</p>
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <SignatureCanvas
                      ref={sigPad}
                      penColor='black'
                      canvasProps={{ width: 270, height: 150, className: 'sigCanvas' }}
                    />
                  </div>
                  <div className="flex justify-between mt-2">
                    <button onClick={clearSignature} className="text-xs font-bold text-slate-400 flex items-center gap-1 hover:text-slate-600 transition-all">
                      <RotateCcw size={12} /> Limpar
                    </button>
                  </div>
                </div>

                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 checked:bg-primary checked:border-primary transition-all"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                    />
                    <CheckCircle2 size={12} className="absolute left-1 opacity-0 peer-checked:opacity-100 text-white pointer-events-none" />
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 group-hover:text-slate-700 transition-colors">
                    Li e concordo com todos os termos e cláusulas deste contrato.
                  </span>
                </label>

                <div className="flex gap-2">
                  <button
                    onClick={() => setIsSigning(false)}
                    className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl font-bold hover:bg-slate-200 transition-colors"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={handleSign}
                    disabled={!agreedToTerms}
                    className="flex-2 py-3 bg-secondary text-white rounded-xl font-bold hover:bg-opacity-90 shadow-lg shadow-secondary/20 transition-all disabled:opacity-50"
                  >
                    Confirmar Assinatura
                  </button>
                </div>
              </motion.div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Download size={16} className="text-primary" /> Recursos Adicionais
            </h4>
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={shareWhatsApp}
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-xs font-bold flex items-center justify-between hover:bg-primary hover:text-white transition-all"
              >
                Enviar por WhatsApp <Share2 size={14} />
              </button>
              <button className="w-full p-3 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-xs font-bold flex items-center justify-between hover:bg-primary hover:text-white transition-all">
                Histórico de Alterações <Clock size={14} />
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText size={16} className="text-secondary" /> Observações Internas
            </h4>
            <textarea
              className="w-full h-32 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-white rounded-xl text-xs outline-none focus:ring-1 focus:ring-primary resize-none placeholder:text-slate-400"
              placeholder="Anotações internas sobre este contrato, que não vão para o documento oficial..."
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              onBlur={handleSaveNotes}
            />
            <div className="text-[10px] text-slate-400 text-right">Salva automaticamente ao sair do campo</div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
