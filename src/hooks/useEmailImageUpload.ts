import { useSupabase } from '@/hooks/useSupabase';
import { useCallback } from 'react';

const BUCKET = 'email-assets';
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024;

export function useEmailImageUpload() {
  const supabase = useSupabase();

  const uploadImage = useCallback(async (file: File): Promise<string | null> => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      alert('Invalid file type. Allowed: JPEG, PNG, GIF, WebP');
      return null;
    }

    if (file.size > MAX_SIZE) {
      alert('File too large (max 5 MB)');
      return null;
    }

    const ext = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(fileName, file, { cacheControl: '31536000', upsert: false });

    if (error) {
      alert(`Upload failed: ${error.message}`);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(fileName);

    return publicUrl;
  }, [supabase]);

  return uploadImage;
}
