import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { LogOut, Home, Users, FileText, DollarSign, Calendar, MapPin, Phone, Mail, FileSignature, RefreshCcw, X, ShieldCheck, QrCode, Eye, EyeOff, Key } from 'lucide-react';
import { format } from 'date-fns';
import PaymentAlerts from '../components/PaymentAlerts';

export default function TenantDashboard() {
  const navigate = useNavigate();
  const [tenant, setTenant] = useState<any>(null);
  const [property, setProperty] = useState<any>(null);
  const [contract, setContract] = useState<any>(null);
  const [ownerProfile, setOwnerProfile] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingPayment, setIsGeneratingPayment] = useState(false);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);

  // Password change states
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');

  const handleUpdatePassword = async () => {
    if (!newPassword || newPassword.length < 4) {
      setPasswordMessage('A senha deve ter pelo menos 4 caracteres.');
      return;
    }
    
    setIsSavingPassword(true);
    setPasswordMessage('');
    
    try {
      const { error } = await supabase.rpc('update_tenant_password', { 
        p_tenant_id: tenant.id, 
        p_new_password: newPassword 
      });
      
      if (error) throw error;
      
      setPasswordMessage('Senha alterada com sucesso!');
      
      // Update local storage so the session keeps the new password
      const updatedTenant = { ...tenant, password: newPassword };
      localStorage.setItem('tenantSession', JSON.stringify(updatedTenant));
      setTenant(updatedTenant);
      
      setTimeout(() => {
        setIsChangingPassword(false);
        setPasswordMessage('');
        setNewPassword('');
      }, 3000);
    } catch (err: any) {
      console.error(err);
      setPasswordMessage('Erro ao alterar senha.');
    } finally {
      setIsSavingPassword(false);
    }
  };

  useEffect(() => {
    const session = localStorage.getItem('tenantSession');
    if (!session) {
      navigate('/login');
      return;
    }
    const t = JSON.parse(session);
    setTenant(t);
    fetchData(t);
  }, [navigate]);

  const fetchData = async (t: any) => {
    try {
      // get property and owner info via secure RPC
      const { data: info } = await supabase.rpc('get_tenant_dashboard_info', { 
        p_property_id: t.propertyId, 
        p_owner_id: t.ownerId 
      });

      if (info?.property) {
        setProperty({
          id: info.property.id,
          ownerId: info.property.owner_id,
          name: info.property.name,
          address: info.property.address,
          type: info.property.type,
          rentValue: info.property.rent_value,
          status: info.property.status,
          groupName: info.property.group_name
        });
      }

      if (info?.owner) {
        setOwnerProfile({
          name: info.owner.name,
          email: info.owner.email
        });
      }

      // get contract
      const { data: conSnap } = await supabase.from('contracts').select('*').eq('tenant_id', t.id).eq('status', 'active');
      let currentContract = null;
      if (conSnap && conSnap.length > 0) {
        const first = conSnap[0];
        currentContract = {
          id: first.id,
          propertyId: first.property_id,
          tenantId: first.tenant_id,
          ownerId: first.owner_id,
          startDate: first.start_date,
          endDate: first.end_date,
          monthlyValue: first.monthly_value,
          guaranteeValue: first.guarantee_value || 0,
          dueDay: first.due_day,
          status: first.status,
          contractNumber: first.contract_number,
          paymentMethod: first.payment_method,
          pixKey: first.pix_key,
          clauses: first.clauses,
          tenantSignature: first.tenant_signature,
          landlordSignature: first.landlord_signature,
          signatureDate: first.signature_date,
          signatureIP: first.signature_ip,
          validationHash: first.validation_hash,
          createdAt: first.created_at,
          updatedAt: first.updated_at
        };
        setContract(currentContract);
      }

      // get payments
      const { data: paySnap } = await supabase.from('payments').select('*').eq('tenant_id', t.id);
      const payList = (paySnap || []).map(p => ({
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
      }));
      payList.sort((a: any, b: any) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
      setPayments(payList);

    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('tenantSession');
    navigate('/login');
  };

  const handleGeneratePayment = async () => {
    if (!contract || !tenant || isGeneratingPayment) return;
    setIsGeneratingPayment(true);
    try {
      const today = new Date();
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      const dueDate = new Date(currentYear, currentMonth, contract.dueDay);

      // check if payment exists
      const existing = payments.find(p => {
        const dDate = new Date(p.dueDate);
        return dDate.getMonth() === currentMonth && dDate.getFullYear() === currentYear;
      });

      if (existing) {
        alert('A cobrança deste mês já foi gerada!');
      } else {
        const newPayment = {
          owner_id: tenant.ownerId,
          contract_id: contract.id,
          property_id: tenant.propertyId,
          tenant_id: tenant.id,
          amount: contract.monthlyValue,
          due_date: dueDate.toISOString(),
          status: 'pending',
          created_at: new Date().toISOString()
        };
        await supabase.from('payments').insert(newPayment);
        alert('Cobrança gerada com sucesso!');
        fetchData(tenant);
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao gerar cobrança.');
    } finally {
      setIsGeneratingPayment(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const titular = tenant?.residents?.find((r: any) => r.isTitular) || tenant?.residents?.[0];
  const otherResidents = tenant?.residents?.filter((r: any) => !r.isTitular) || [];

  const calculateDuration = () => {
    if (!contract?.startDate || !contract?.endDate) return 0;
    const start = new Date(contract.startDate);
    const end = new Date(contract.endDate);
    return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  };

  const getDefaultClauses = () => {
    return `7.1. O INQUILINO compromete-se a zelar pelo imóvel, mantendo-o em perfeitas condições de higiene e uso, responsabilizando-se por quaisquer danos causados.
7.2. É vedada a realização de benfeitorias ou obras sem autorização prévia e por escrito do LOCADOR.
7.3. O atraso no pagamento implicará em multa de 2% e juros de 1% ao mês pro rata die.
7.4. Em caso de rescisão antecipada por parte do INQUILINO, este pagará multa proporcional ao tempo restante do contrato conforme legislação vigente.`;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white pb-20">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <Home size={20} />
            </div>
            <div>
              <h1 className="font-bold">Painel do Inquilino</h1>
              <p className="text-xs text-slate-500">AlugaFácil</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
        
        <PaymentAlerts payments={payments} getPropertyName={() => property?.name || 'Imóvel'} />

        {/* Profile Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-6 items-start">
          {titular?.photo ? (
            <img src={titular.photo} alt={titular.name} className="w-24 h-24 rounded-full object-cover border-4 border-primary/10" />
          ) : (
            <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-3xl font-bold text-slate-400">
              {titular?.name?.charAt(0)}
            </div>
          )}
          <div className="flex-1">
            <h2 className="text-2xl font-bold">{titular?.name}</h2>
            <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-500">
              <span className="flex items-center gap-1"><Phone size={14} /> {titular?.phone}</span>
              <span className="flex items-center gap-1"><Mail size={14} /> {titular?.email}</span>
            </div>
            {property && (
              <div className="mt-4 inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-lg text-sm font-semibold">
                <MapPin size={16} />
                {property.name}
              </div>
            )}
            <div className="mt-6 border-t border-slate-100 dark:border-slate-800 pt-6">
              {!isChangingPassword ? (
                <button 
                  onClick={() => setIsChangingPassword(true)}
                  className="text-sm font-bold text-slate-500 hover:text-primary flex items-center gap-2 transition-colors"
                >
                  <Key size={16} /> Mudar Senha de Acesso
                </button>
              ) : (
                <div className="max-w-sm space-y-3">
                  <label className="text-xs font-bold text-slate-500 uppercase">Nova Senha</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Digite a nova senha..."
                      className="w-full pl-4 pr-10 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  
                  {passwordMessage && (
                    <p className={`text-xs font-bold ${passwordMessage.includes('Erro') || passwordMessage.includes('caracteres') ? 'text-red-500' : 'text-green-500'}`}>
                      {passwordMessage}
                    </p>
                  )}
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={handleUpdatePassword}
                      disabled={isSavingPassword}
                      className="flex-1 bg-primary text-white py-2 rounded-xl text-sm font-bold hover:bg-opacity-90 transition-all flex justify-center items-center gap-2"
                    >
                      {isSavingPassword ? <RefreshCcw size={16} className="animate-spin" /> : 'Salvar'}
                    </button>
                    <button 
                      onClick={() => {
                        setIsChangingPassword(false);
                        setPasswordMessage('');
                        setNewPassword('');
                      }}
                      className="px-4 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 py-2 rounded-xl text-sm font-bold transition-all"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Residents */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Users size={20} className="text-primary" />
            Moradores ({tenant?.residents?.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tenant?.residents?.map((r: any, idx: number) => (
              <div key={idx} className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                {r.photo ? (
                  <img src={r.photo} alt={r.name} className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-500">
                    {r.name?.charAt(0)}
                  </div>
                )}
                <div>
                  <p className="font-bold">{r.name}</p>
                  <p className="text-xs text-slate-500">{r.isTitular ? 'Titular' : 'Dependente'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Contract & Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <FileSignature size={20} className="text-primary" />
              Contrato Ativo
            </h3>
            {contract ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <span className="text-slate-500 text-sm">Valor Mensal</span>
                  <span className="font-bold text-lg">R$ {contract.monthlyValue?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <span className="text-slate-500 text-sm">Dia de Vencimento</span>
                  <span className="font-bold">Todo dia {contract.dueDay}</span>
                </div>
                {tenant?.contractPdf && (
                  <a href={tenant.contractPdf} target="_blank" rel="noreferrer" className="w-full mt-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 py-3 rounded-xl font-bold hover:bg-slate-200 transition-all flex items-center justify-center gap-2">
                    <FileText size={18} />
                    Ver Contrato Assinado (PDF)
                  </a>
                )}
                
                <button 
                  onClick={() => setIsContractModalOpen(true)}
                  className="w-full mt-2 bg-primary/10 text-primary py-3 rounded-xl font-bold hover:bg-primary/20 transition-all flex items-center justify-center gap-2"
                >
                  <FileSignature size={18} />
                  Ler Contrato na Íntegra
                </button>
              </div>
            ) : (
              <p className="text-slate-500 text-sm">Nenhum contrato ativo encontrado.</p>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <DollarSign size={20} className="text-secondary" />
              Pagamentos
            </h3>
            
            <button 
              onClick={handleGeneratePayment}
              disabled={isGeneratingPayment}
              className="w-full mb-6 bg-secondary text-white py-3 rounded-xl font-bold hover:bg-opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-secondary/20"
            >
              <RefreshCcw size={18} className={isGeneratingPayment ? 'animate-spin' : ''} />
              Gerar Cobrança do Mês
            </button>

            <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
              {payments.map(p => (
                <div key={p.id} className="flex justify-between items-center p-3 border border-slate-100 dark:border-slate-800 rounded-lg">
                  <div>
                    <p className="font-bold text-sm">{format(new Date(p.dueDate), 'MMMM / yyyy')}</p>
                    <p className="text-xs text-slate-500">Venc: {format(new Date(p.dueDate), 'dd/MM/yyyy')}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase ${
                    p.status === 'paid' ? 'bg-secondary/10 text-secondary' : 
                    p.status === 'pending' ? 'bg-orange-500/10 text-orange-500' : 'bg-red-500/10 text-red-500'
                  }`}>
                    {p.status === 'paid' ? 'Pago' : p.status === 'pending' ? 'Pendente' : 'Atrasado'}
                  </span>
                </div>
              ))}
              {payments.length === 0 && (
                <p className="text-slate-500 text-sm text-center py-4">Nenhum pagamento registrado.</p>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Contract Modal */}
      {isContractModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            onClick={() => setIsContractModalOpen(false)}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-4xl h-[90vh] bg-slate-100 dark:bg-slate-950 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 md:p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 z-10">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileSignature size={24} className="text-primary" />
                  Documento de Locação
                </h3>
                <p className="text-sm text-slate-500 font-medium">Ref: {contract?.contractNumber}</p>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsContractModalOpen(false)} 
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-white rounded-xl font-bold transition-all hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  Fechar Visualização
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 md:p-12 scrollbar-hide">
              <div className="bg-white dark:bg-slate-950 p-8 md:p-12 shadow-sm border border-slate-200 dark:border-slate-800 rounded-sm min-h-[297mm] text-slate-800 dark:text-slate-200 font-serif leading-relaxed max-w-3xl mx-auto">
                <div className="text-center mb-12">
                  <h2 className="text-2xl font-bold uppercase tracking-widest mb-2">Contrato de Locação Residencial</h2>
                  <p className="text-sm font-bold text-slate-500 uppercase">Contrato Nº: {contract?.contractNumber}</p>
                </div>

                <section className="mb-8">
                  <h3 className="font-bold border-b border-slate-200 dark:border-slate-800 pb-2 mb-4 uppercase text-sm tracking-wider">1. Locador (Proprietário)</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <p><span className="font-bold">Nome:</span> {ownerProfile?.name || 'Não informado'}</p>
                    <p><span className="font-bold">E-mail:</span> {ownerProfile?.email || 'Não informado'}</p>
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
                        {otherResidents.map((r: any, idx: number) => (
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
                    <p><span className="font-bold">Aluguel Mensal:</span> R$ {contract?.monthlyValue?.toLocaleString()}</p>
                    <p><span className="font-bold">Vencimento:</span> Todo dia {contract?.dueDay}</p>
                    <p><span className="font-bold">Garantia (Caução):</span> R$ {contract?.guaranteeValue?.toLocaleString()}</p>
                    <p><span className="font-bold">Forma:</span> {contract?.paymentMethod}</p>
                    {contract?.pixKey && <p className="col-span-2"><span className="font-bold">Chave PIX:</span> {contract.pixKey}</p>}
                  </div>
                </section>

                <section className="mb-8">
                  <h3 className="font-bold border-b border-slate-200 dark:border-slate-800 pb-2 mb-4 uppercase text-sm tracking-wider">7. Responsabilidades e Cláusulas</h3>
                  <div className="text-[10px] space-y-2 opacity-80 text-justify whitespace-pre-wrap">
                    {contract?.clauses || getDefaultClauses()}
                  </div>
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
                    <p className="text-[8px] text-slate-400">Data: {contract?.signatureDate ? new Date(contract.signatureDate).toLocaleDateString() : '-'} | IP: {contract?.signatureIP || '-'}</p>
                  </div>
                  <div className="w-16 h-16 opacity-50">
                    <QrCode size={64} className="text-slate-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
