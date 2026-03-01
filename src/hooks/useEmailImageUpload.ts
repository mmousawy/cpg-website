import { useSupabase } from '@/hooks/useSupabase';
import { validateImage } from '@/utils/imageValidation';
import { useCallback } from 'react';

const BUCKET = 'email-assets';

export function useEmailImageUpload() {
  const supabase = useSupabase();

  const uploadImage = useCallback(async (file: File): Promise<string | null> => {
    const validationError = await validateImage(file, { maxSizeBytes: 5 * 1024 * 1024 });
    if (validationError) {
      alert(validationError.message);
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
