import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

import type { Database } from '../src/database.types';
import { upsertCatalogEntry } from '../src/lib/gear/catalogDb';

config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing env');
  process.exit(1);
}

const supabase = createClient<Database>(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const cam = await upsertCatalogEntry(supabase, {
  source: 'lensfun',
  sourceKey: 'test:camera:probe',
  category: 'camera_body',
  brand: 'Nikon',
  name: 'Nikon Z9 Test',
  aliasStrings: ['Nikon Z9 Test'],
});

const { data: rows, error } = await supabase.from('gear_catalog').select('category, source');

if (error) {
  console.error(error);
  process.exit(1);
}

const byCategory: Record<string, number> = {};
const bySource: Record<string, number> = {};
for (const row of rows ?? []) {
  byCategory[row.category] = (byCategory[row.category] ?? 0) + 1;
  bySource[row.source] = (bySource[row.source] ?? 0) + 1;
}

console.log('camera_body probe insert id:', cam);
console.log('total rows:', rows?.length ?? 0);
console.log('by category:', byCategory);
console.log('by source:', bySource);

if (cam) {
  await supabase.from('gear_catalog').delete().eq('id', cam);
}
