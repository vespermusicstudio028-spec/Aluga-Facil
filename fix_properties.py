import re
import os

filepath = 'src/pages/Properties.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace imports
content = re.sub(
    r"import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';\nimport { db } from '../firebase/config';",
    "import { supabase } from '../lib/supabase';\nimport { uploadBase64Image } from '../lib/storage';",
    content
)

# Replace fetchProperties
fetch_old = """  const fetchProperties = async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, 'properties'), where('ownerId', '==', user?.uid));
      const snap = await getDocs(q);
      setProperties(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Property)));
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };"""

fetch_new = """  const fetchProperties = async () => {
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
        createdAt: p.created_at,
        updatedAt: p.updated_at
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
      if (formData.type === 'Vila') {
        const promises = vilaHouses.map(house => {
          const propertyData = {
            ownerId: user.uid,
            name: `${formData.name} - ${house.number}`,
            address: `${formData.address}, ${house.number}`,
            groupName: formData.name,
            type: 'Casa',
            rentValue: Number(house.rentValue),
            status: house.status,
            photos: house.photos,
            updatedAt: serverTimestamp(),
            createdAt: serverTimestamp()
          };
          return addDoc(collection(db, 'properties'), propertyData);
        });
        await Promise.all(promises);
      } else {
        const propertyData = {
          ownerId: user.uid,
          ...formData,
          rentValue: Number(formData.rentValue),
          updatedAt: serverTimestamp()
        };

        if (editingProperty) {
          await updateDoc(doc(db, 'properties', editingProperty.id), propertyData);
        } else {
          await addDoc(collection(db, 'properties'), {
            ...propertyData,
            createdAt: serverTimestamp()
          });
        }
      }

      setIsModalOpen(false);
      fetchProperties();
    } catch (err: any) {
      console.error(err);
      alert('Erro ao salvar imóvel: ' + (err.message || 'Verifique se as fotos não são muito grandes.'));
    }
  };"""

handle_new = """  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      if (formData.type === 'Vila') {
        const promises = vilaHouses.map(async (house) => {
          const photoUrls = await Promise.all(
            house.photos.map(async (photo, idx) => {
              if (photo.startsWith('data:')) {
                const path = `${user.uid}/${Date.now()}_vila_${idx}.jpg`;
                return await uploadBase64Image('property-photos', path, photo);
              }
              return photo;
            })
          );
          
          return supabase.from('properties').insert({
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
          });
        });
        await Promise.all(promises);
      } else {
        const photoUrls = await Promise.all(
          formData.photos.map(async (photo, idx) => {
            if (photo.startsWith('data:')) {
              const path = `${user.uid}/${Date.now()}_prop_${idx}.jpg`;
              return await uploadBase64Image('property-photos', path, photo);
            }
            return photo;
          })
        );
        
        const propertyData = {
          owner_id: user.uid,
          name: formData.name,
          address: formData.address,
          type: formData.type,
          rent_value: Number(formData.rentValue),
          status: formData.status,
          group_name: formData.groupName,
          photos: photoUrls,
          updated_at: new Date().toISOString()
        };

        if (editingProperty) {
          await supabase.from('properties').update(propertyData).eq('id', editingProperty.id);
        } else {
          await supabase.from('properties').insert({
            ...propertyData,
            created_at: new Date().toISOString()
          });
        }
      }

      setIsModalOpen(false);
      fetchProperties();
    } catch (err: any) {
      console.error(err);
      alert('Erro ao salvar imóvel: ' + (err.message || 'Verifique se as fotos não são muito grandes.'));
    }
  };"""
content = content.replace(handle_old, handle_new)

# Replace handleDelete
delete_old = """  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este imóvel?')) return;
    try {
      await deleteDoc(doc(db, 'properties', id));
      fetchProperties();
    } catch (err) {
      console.error(err);
    }
  };"""

delete_new = """  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este imóvel?')) return;
    try {
      await supabase.from('properties').delete().eq('id', id);
      fetchProperties();
    } catch (err) {
      console.error(err);
    }
  };"""
content = content.replace(delete_old, delete_new)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated Properties.tsx")
