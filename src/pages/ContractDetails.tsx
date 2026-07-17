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
  const [editedClauses, setEditedClauses] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const sigPad = useRef<SignatureCanvas>(null);
  const contractRef = useRef<HTMLDivElement>(null);

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
        createdAt: contractDoc.created_at,
        updatedAt: contractDoc.updated_at
      };
      setContract(contractData);
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

  const calculateDuration = () => {
    if (!contract?.startDate || !contract?.endDate) return 0;
    const start = new Date(contract.startDate);
    const end = new Date(contract.endDate);
    const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    return months;
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
      logging: false
    });
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`Contrato_${contract?.contractNumber}.pdf`);
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
        {/* Contract Display Area */}
        <div className="flex-1 space-y-6">
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
                <button className="p-3 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-xl transition-all" title="Compartilhar">
                  <Share2 size={20} />
                </button>
              </div>
            </div>

            {/* The Professional Contract Template */}
            <div className="p-12 max-h-[800px] overflow-y-auto scrollbar-hide bg-slate-50/30">
              <div 
                ref={contractRef}
                className="bg-white dark:bg-slate-950 p-12 shadow-sm min-h-[297mm] text-slate-800 dark:text-slate-200 font-serif leading-relaxed"
              >
                <div className="text-center mb-12">
                  <h2 className="text-2xl font-bold uppercase tracking-widest mb-2">Contrato de Locação Residencial</h2>
                  <p className="text-sm font-bold text-slate-500 uppercase">Contrato Nº: {contract?.contractNumber}</p>
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

                <section className="mb-12">
                  <h3 className="font-bold border-b border-slate-200 dark:border-slate-800 pb-2 mb-4 uppercase text-sm tracking-wider">8. Vistoria do Imóvel</h3>
                  <div className="text-[10px] opacity-80 space-y-2">
                    <p>O imóvel foi entregue ao INQUILINO em plenas condições de uso, conforme laudo de vistoria anexo e fotos digitais armazenadas no sistema AlugaFácil.</p>
                    <div className="flex items-center gap-2 text-primary font-bold">
                      <ShieldCheck size={14} /> Vistoria Digital Realizada e Vinculada a este contrato.
                    </div>
                  </div>
                </section>

                <div className="mt-20 grid grid-cols-2 gap-12">
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
                  <div className="w-16 h-16 opacity-50">
                    <QrCode size={64} className="text-slate-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>
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
                      canvasProps={{width: 270, height: 150, className: 'sigCanvas'}}
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
        </div>
      </div>
    </Layout>
  );
}
