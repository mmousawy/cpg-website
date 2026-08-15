import { useSupabase } from '@/hooks/useSupabase';
import { validateImage } from '@/utils/imageValidation';
import { uploadUserStorageFile } from '@/utils/supabaseStorage';
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

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert('Upload failed: not signed in');
      return null;
    }

    const ext = file.name.split('.').pop();
    const filePath = `${user.id}/${crypto.randomUUID()}.${ext}`;

    try {
      return await uploadUserStorageFile(BUCKET, filePath, file);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      alert(`Upload failed: ${message}`);
      return null;
    }
  }, [supabase]);

  return uploadImage;
}
