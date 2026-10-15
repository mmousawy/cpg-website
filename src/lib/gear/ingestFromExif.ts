import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/database.types';
import { ensureExifCatalogEntry, findCatalogIdByAlias } from '@/lib/gear/catalogDb';
import { ensureScrappyCameraMatch } from '@/lib/gear/scrappyCameraMatch';
import { normalizeExifBrand } from '@/lib/gear/normalizeExifBrand';
import type { GearCategory } from '@/lib/gear/types';
import { formatExifData, parseExifData } from '@/utils/exif';

type AdminClient = SupabaseClient<Database>;

function lensIncludesCameraName(lensModel: string, camera: string, model?: string): boolean {
  const lensLower = lensModel.toLowerCase();
  if (model && lensLower.includes(model.toLowerCase())) return true;
  return lensLower.includes(camera.toLowerCase());
}

function isPhoneBody(make: string, model: string): boolean {
  const m = `${make} ${model}`.toLowerCase();
  return m.includes('iphone') || m.includes('ipad') || m.includes('pixel') || m.includes('galaxy');
}

export async function ingestGearFromExifData(
  supabase: AdminClient,
  exif: Record<string, unknown> | null | undefined,
): Promise<{ ingested: number }> {
  const parsed = parseExifData(exif);
  const formatted = formatExifData(parsed);
  if (!parsed && !formatted) {
    return { ingested: 0 };
  }

  let ingested = 0;

  if (formatted?.camera && parsed?.make) {
    const brand = normalizeExifBrand(parsed.make);
    const category: GearCategory = isPhoneBody(parsed.make, parsed.model || '') ? 'phone' : 'camera_body';
    const name = formatted.camera;
    const existing = await findCatalogIdByAlias(supabase, name);
    if (!existing) {
      const id = await ensureExifCatalogEntry(supabase, {
        category,
        brand,
        name,
        aliasStrings: [name, parsed.model || '', `${brand} ${parsed.model || ''}`],
      });
      if (id) ingested += 1;
    }
    await ensureScrappyCameraMatch(supabase, name);
  }

  if (formatted?.lens && parsed?.lensModel) {
    const cameraName = formatted.camera || '';
    const skipLens = cameraName
      && lensIncludesCameraName(parsed.lensModel, cameraName, parsed.model);
    if (!skipLens) {
      const brand = parsed.make ? normalizeExifBrand(parsed.make) : '';
      const name = formatted.lens;
      const existing = await findCatalogIdByAlias(supabase, name);
      if (!existing) {
        const id = await ensureExifCatalogEntry(supabase, {
          category: 'lens',
          brand,
          name,
          aliasStrings: [name, parsed.lensModel],
        });
        if (id) ingested += 1;
      }
    }
  }

  return { ingested };
}

export async function ingestGearFromPhotoId(
  supabase: AdminClient,
  photoId: string,
): Promise<{ ingested: number }> {
  const { data: photo } = await supabase
    .from('photos')
    .select('exif_data')
    .eq('id', photoId)
    .is('deleted_at', null)
    .maybeSingle();

  if (!photo) {
    return { ingested: 0 };
  }

  return ingestGearFromExifData(supabase, photo.exif_data as Record<string, unknown> | null);
}
