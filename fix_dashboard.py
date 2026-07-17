import re

filepath = 'src/pages/Dashboard.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace imports
content = re.sub(
    r"import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';\nimport { db } from '../firebase/config';",
    "import { supabase } from '../lib/supabase';",
    content
)

# Replace fetchStats
fetch_old = """    const fetchStats = async () => {
      const qProperties = query(collection(db, 'properties'), where('ownerId', '==', user.uid));
      const qTenants = query(collection(db, 'tenants'), where('ownerId', '==', user.uid));
      const qContracts = query(collection(db, 'contracts'), where('ownerId', '==', user.uid), where('status', '==', 'active'));
      const qPayments = query(collection(db, 'payments'), where('ownerId', '==', user.uid), orderBy('dueDate', 'desc'), limit(5));

      const [propSnap, tenantSnap, contractSnap, paymentSnap] = await Promise.all([
        getDocs(qProperties),
        getDocs(qTenants),
        getDocs(qContracts),
        getDocs(qPayments)
      ]);

      const properties = propSnap.docs.map(doc => {
        const data = doc.data();
        return { id: doc.id, ...data } as Property;
      });
      const payments = paymentSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));

      // Calculate base contract revenue
      const contractRevenue = contractSnap.docs.reduce((acc, doc) => acc + (doc.data().monthlyValue || 0), 0);
      const contractedPropertyIds = new Set(contractSnap.docs.map(doc => doc.data().propertyId));
      
      // Add revenue from rented properties (like Vila houses) that don't have contracts yet
      const nonContractedRevenue = properties
        .filter(p => p.status === 'rented' && !contractedPropertyIds.has(p.id))
        .reduce((acc, p) => acc + (Number(p.rentValue) || 0), 0);

      setStats({
        totalProperties: properties.length,
        rentedProperties: properties.filter(p => p.status === 'rented').length,
        availableProperties: properties.filter(p => p.status === 'available').length,
        activeTenants: tenantSnap.size,
        monthlyRevenue: contractRevenue + nonContractedRevenue,
        pendingPayments: 0, // Logic to be added
        latePayments: 0,
      });
      setRecentPayments(payments);
    };"""

fetch_new = """    const fetchStats = async () => {
      const [propRes, tenantRes, contractRes, paymentRes] = await Promise.all([
        supabase.from('properties').select('*').eq('owner_id', user.uid),
        supabase.from('tenants').select('id').eq('owner_id', user.uid),
        supabase.from('contracts').select('*').eq('owner_id', user.uid).eq('status', 'active'),
        supabase.from('payments').select('*').eq('owner_id', user.uid).order('due_date', { ascending: false }).limit(5)
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

      // Calculate base contract revenue
      const contractRevenue = (contractRes.data || []).reduce((acc, c) => acc + (Number(c.monthly_value) || 0), 0);
      const contractedPropertyIds = new Set((contractRes.data || []).map(c => c.property_id));
      
      // Add revenue from rented properties (like Vila houses) that don't have contracts yet
      const nonContractedRevenue = properties
        .filter(p => p.status === 'rented' && !contractedPropertyIds.has(p.id))
        .reduce((acc, p) => acc + (Number(p.rentValue) || 0), 0);

      setStats({
        totalProperties: properties.length,
        rentedProperties: properties.filter(p => p.status === 'rented').length,
        availableProperties: properties.filter(p => p.status === 'available').length,
        activeTenants: tenantRes.data?.length || 0,
        monthlyRevenue: contractRevenue + nonContractedRevenue,
        pendingPayments: 0, // Logic to be added
        latePayments: 0,
      });
      setRecentPayments(payments);
    };"""
content = content.replace(fetch_old, fetch_new)

# Replace Date rendering
jsx_date_old = """new Date(p.dueDate?.seconds * 1000).toLocaleDateString()"""
jsx_date_new = """new Date(p.dueDate).toLocaleDateString()"""
content = content.replace(jsx_date_old, jsx_date_new)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated Dashboard.tsx")
