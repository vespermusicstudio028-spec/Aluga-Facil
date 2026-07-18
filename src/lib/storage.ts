import { supabase } from './supabase';

export const uploadBase64Image = async (bucket: string, path: string, base64Str: string): Promise<string> => {
  try {
    const base64Data = base64Str.split(',')[1];
    if (!base64Data) {
      throw new Error('Invalid base64 string');
    }
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/jpeg' });

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, blob, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (error) {
      console.error('Upload error:', error);
      throw error;
    }

    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
    return publicUrl;
  } catch (error) {
    console.error('Error in uploadBase64Image:', error);
    throw error;
  }
};
