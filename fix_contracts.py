import re

filepath = 'src/pages/Contracts.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace imports
content = re.sub(
    r"import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';\nimport { db } from '../firebase/config';",
    "import { supabase } from '../lib/supabase';",
    content
)

# Replace fetchData
fetch_old = """  const fetchData = async () => {
    setIsLoading(true);
    try {
      const qContracts = query(collection(db, 'contracts'), where('ownerId', '==', user?.uid));
      const qProps = query(collection(db, 'properties'), where('ownerId', '==', user?.uid));
      const qTenants = query(collection(db, 'tenants'), where('ownerId', '==', user?.uid));

      const [conSnap, propSnap, tenSnap] = await Promise.all([
        getDocs(qContracts),
        getDocs(qProps),
        getDocs(qTenants)
      ]);

      setContracts(conSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Contract)));
      setProperties(propSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Property)));
      setTenants(tenSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tenant)));
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };"""

fetch_new = """  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [conRes, propRes, tenRes] = await Promise.all([
        supabase.from('contracts').select('*').eq('owner_id', user?.uid),
        supabase.from('properties').select('*').eq('owner_id', user?.uid),
        supabase.from('tenants').select('*').eq('owner_id', user?.uid)
      ]);

      if (conRes.error) throw conRes.error;
      if (propRes.error) throw propRes.error;
      if (tenRes.error) throw tenRes.error;

      setContracts((conRes.data || []).map(c => ({
        id: c.id,
        ownerId: c.owner_id,
        propertyId: c.property_id,
        tenantId: c.tenant_id,
        contractNumber: c.contract_number,
        startDate: c.start_date,
        endDate: c.end_date,
        monthlyValue: c.monthly_value,
        dueDay: c.due_day,
        guaranteeValue: c.guarantee_value,
        paymentMethod: c.payment_method,
        pixKey: c.pix_key,
        status: c.status,
        tenantSignature: c.tenant_signature,
        landlordSignature: c.landlord_signature,
        signatureDate: c.signature_date,
        signatureTime: c.signature_time,
        signatureIP: c.signature_ip,
        validationHash: c.validation_hash,
        witnesses: c.witnesses,
        clauses: c.clauses,
        inspectionUrl: c.inspection_url,
        inspectionAgreed: c.inspection_agreed,
        createdAt: c.created_at,
        updatedAt: c.updated_at
      })));

      setProperties((propRes.data || []).map(p => ({
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
      })));

      setTenants((tenRes.data || []).map(t => ({
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
  };"""
content = content.replace(fetch_old, fetch_new)

# Replace handleSubmit
handle_old = """  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const contractData = {
        ownerId: user.uid,
        propertyId: newContract.propertyId,
        tenantId: newContract.tenantId,
        monthlyValue: Number(newContract.monthlyValue),
        dueDay: Number(newContract.dueDay),
        guaranteeValue: Number(newContract.guaranteeValue),
        paymentMethod: newContract.paymentMethod,
        pixKey: newContract.pixKey,
        status: newContract.status,
        startDate: new Date(newContract.startDate),
        endDate: new Date(newContract.endDate),
        updatedAt: serverTimestamp()
      };

      if (editingContract) {
        await updateDoc(doc(db, 'contracts', editingContract.id), contractData);
      } else {
        const contractNumber = `CNT-${Math.floor(100000 + Math.random() * 900000)}`;
        await addDoc(collection(db, 'contracts'), {
          ...contractData,
          contractNumber,
          createdAt: serverTimestamp()
        });
      }
      
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };"""

handle_new = """  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const contractData = {
        owner_id: user.uid,
        property_id: newContract.propertyId,
        tenant_id: newContract.tenantId,
        monthly_value: Number(newContract.monthlyValue),
        due_day: Number(newContract.dueDay),
        guarantee_value: Number(newContract.guaranteeValue),
        payment_method: newContract.paymentMethod,
        pix_key: newContract.pixKey,
        status: newContract.status,
        start_date: new Date(newContract.startDate).toISOString(),
        end_date: new Date(newContract.endDate).toISOString(),
        updated_at: new Date().toISOString()
      };

      if (editingContract) {
        await supabase.from('contracts').update(contractData).eq('id', editingContract.id);
      } else {
        const contractNumber = `CNT-${Math.floor(100000 + Math.random() * 900000)}`;
        await supabase.from('contracts').insert({
          ...contractData,
          contract_number: contractNumber,
          created_at: new Date().toISOString()
        });
      }
      
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };"""
content = content.replace(handle_old, handle_new)

# Replace handleDelete
delete_old = """  const handleDelete = async (id: string) => {
    const contract = contracts.find(c => c.id === id);
    if (!contract) return;

    if (!confirm('Tem certeza que deseja excluir este contrato? Esta ação não pode ser desfeita e o imóvel voltará a ficar disponível.')) return;
    
    try {
      // 1. Delete the contract
      await deleteDoc(doc(db, 'contracts', id));
      
      // 2. Update property status back to available
      if (contract.propertyId) {
        try {
          await updateDoc(doc(db, 'properties', contract.propertyId), {
            status: 'available'
          });
        } catch (propErr) {
          console.warn('Imóvel não encontrado ou sem permissão para atualizar status', propErr);
        }
      }

      fetchData();
    } catch (err) {
      console.error('Erro ao excluir contrato:', err);
      alert('Erro ao excluir contrato. Verifique as permissões.');
    }
  };"""

delete_new = """  const handleDelete = async (id: string) => {
    const contract = contracts.find(c => c.id === id);
    if (!contract) return;

    if (!confirm('Tem certeza que deseja excluir este contrato? Esta ação não pode ser desfeita e o imóvel voltará a ficar disponível.')) return;
    
    try {
      // 1. Delete the contract
      await supabase.from('contracts').delete().eq('id', id);
      
      // 2. Update property status back to available
      if (contract.propertyId) {
        try {
          await supabase.from('properties').update({ status: 'available' }).eq('id', contract.propertyId);
        } catch (propErr) {
          console.warn('Imóvel não encontrado ou sem permissão para atualizar status', propErr);
        }
      }

      fetchData();
    } catch (err) {
      console.error('Erro ao excluir contrato:', err);
      alert('Erro ao excluir contrato. Verifique as permissões.');
    }
  };"""
content = content.replace(delete_old, delete_new)

# Replace handleOpenModal Date logic
open_old = """      setNewContract({
        propertyId: contract.propertyId,
        tenantId: contract.tenantId,
        startDate: contract.startDate?.seconds ? new Date(contract.startDate.seconds * 1000).toISOString().split('T')[0] : '',
        endDate: contract.endDate?.seconds ? new Date(contract.endDate.seconds * 1000).toISOString().split('T')[0] : '',
        monthlyValue: contract.monthlyValue.toString(),
        dueDay: contract.dueDay.toString(),
        guaranteeValue: contract.guaranteeValue.toString(),
        paymentMethod: contract.paymentMethod,
        pixKey: contract.pixKey || '',
        status: contract.status
      });"""

open_new = """      setNewContract({
        propertyId: contract.propertyId,
        tenantId: contract.tenantId,
        startDate: contract.startDate ? new Date(contract.startDate).toISOString().split('T')[0] : '',
        endDate: contract.endDate ? new Date(contract.endDate).toISOString().split('T')[0] : '',
        monthlyValue: contract.monthlyValue.toString(),
        dueDay: contract.dueDay.toString(),
        guaranteeValue: contract.guaranteeValue.toString(),
        paymentMethod: contract.paymentMethod,
        pixKey: contract.pixKey || '',
        status: contract.status
      });"""
content = content.replace(open_old, open_new)

# Replace JSX Date rendering
jsx_date_old = """{c.startDate?.seconds ? new Date(c.startDate.seconds * 1000).toLocaleDateString() : '-'} - {c.endDate?.seconds ? new Date(c.endDate.seconds * 1000).toLocaleDateString() : '-'}"""
jsx_date_new = """{c.startDate ? new Date(c.startDate).toLocaleDateString() : '-'} - {c.endDate ? new Date(c.endDate).toLocaleDateString() : '-'}"""
content = content.replace(jsx_date_old, jsx_date_new)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated Contracts.tsx")
