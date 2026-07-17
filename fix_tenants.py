import re

filepath = 'src/pages/Tenants.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace imports
content = re.sub(
    r"import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';\nimport { db } from '../firebase/config';",
    "import { supabase } from '../lib/supabase';",
    content
)

# Replace fetchData
fetch_old = """  const fetchData = async () => {
    setIsLoading(true);
    try {
      const qTenants = query(collection(db, 'tenants'), where('ownerId', '==', user?.uid));
      const qProps = query(collection(db, 'properties'), where('ownerId', '==', user?.uid));
      
      const [tenantSnap, propSnap] = await Promise.all([
        getDocs(qTenants),
        getDocs(qProps)
      ]);

      const propMap: Record<string, Property> = {};
      propSnap.docs.forEach(doc => {
        propMap[doc.id] = { id: doc.id, ...doc.data() } as Property;
      });

      setProperties(propMap);
      setTenants(tenantSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tenant)));
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };"""

fetch_new = """  const fetchData = async () => {
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
  };"""
content = content.replace(fetch_old, fetch_new)

# Replace handleDelete
delete_old = """  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este inquilino?')) return;
    try {
      await deleteDoc(doc(db, 'tenants', id));
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };"""

delete_new = """  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este inquilino?')) return;
    try {
      await supabase.from('tenants').delete().eq('id', id);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };"""
content = content.replace(delete_old, delete_new)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated Tenants.tsx")
