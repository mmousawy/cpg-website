/**
 * Merge missing gear items into a member's inventory (service role).
 *
 * Usage:
 *   npx tsx scripts/restore-gear-inventory.ts --nickname yournick
 *   npx tsx scripts/restore-gear-inventory.ts --email you@example.com
 *   npx tsx scripts/restore-gear-inventory.ts --nickname yournick --apply
 *
 * Default is dry-run (prints diff only). Pass --apply to write to the database.
 *
 * Requires .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { randomUUID } from 'node:crypto';

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

import type { Database } from '../src/database.types';
import { fetchUserGearProfileForUser } from '../src/lib/data/gear';
import type { GearCategory, UserGearItem } from '../src/lib/gear/types';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

type TargetRow = { name: string; category: GearCategory; note?: string };

/** Authoritative inventory (28 items) — order preserved as sort_index. */
const TARGET_INVENTORY: TargetRow[] = [
  { name: 'Canon EOS 500D', category: 'camera_body' },
  { name: 'Canon EOS 7D', category: 'camera_body' },
  { name: 'Canon EOS R7', category: 'camera_body' },
  { name: 'Kodak EasyShare Z1012 IS', category: 'camera_body' },
  { name: '7Artisans 35mm f/1.4 APS-C (manual)', category: 'lens' },
  { name: 'Canon EF 50mm f/1.8 II', category: 'lens' },
  { name: 'Canon EF-S 10-22mm f/3.5-4.5 USM', category: 'lens', note: 'Broken focus' },
  { name: 'Canon EF-S 18-55mm f/3.5-5.6 IS', category: 'lens', note: 'Broken focus' },
  { name: 'Canon EF-S 18-55mm f/3.5-5.6 IS II', category: 'lens' },
  { name: 'Canon RF 100-400mm F5.6-8 IS USM', category: 'lens' },
  { name: 'Canon RF 50mm F1.8 STM', category: 'lens' },
  { name: 'PolarPro LightLeak Lens 28mm RF', category: 'lens' },
  { name: 'Sigma 17-40mm F1.8 DC | Art 025', category: 'lens' },
  { name: 'Sigma 70-300mm f/4-5.6 DG OS', category: 'lens' },
  { name: 'TTArtisan APS-C 23mm F1.4', category: 'lens' },
  { name: 'Google Pixel 8 Pro', category: 'phone' },
  { name: 'GODOX 32" / 80cm 5-in-1 Collapsible Portable Disc Light Reflector', category: 'lighting' },
  { name: 'NEEWER TL21C RGB Light Wall', category: 'lighting' },
  { name: 'Amazon Basics Camera Lighting Tripod, Aluminum 2m (2x)', category: 'support' },
  { name: 'K&F CONCEPT 190cm 8kg Camera Tripod', category: 'support' },
  { name: 'SMALLRIG Hot Shoe Mount Adapter Ball Head', category: 'support' },
  { name: 'UTEBIT Photo Studio Folding Reflector Holder (2x)', category: 'support' },
  { name: 'Canon Mount Adapter EF-EOS R', category: 'accessories' },
  { name: 'Hersmay LCD Timer Remote Shutter', category: 'accessories' },
  { name: 'Meike MK-RF-AF1 13mm + 18mm Macro Extension Tube Adapter Ring Kit', category: 'accessories' },
  { name: 'PGYTECH Beetle V2 Camera Clip', category: 'accessories' },
  { name: 'Calibrite Display 123', category: 'other' },
  { name: 'DJI Mic Mini (1 TX + 1 RX)', category: 'other' },
];

function itemKey(name: string, category: GearCategory): string {
  return `${category}:${name.trim().toLowerCase()}`;
}

function parseArgs(argv: string[]) {
  let nickname: string | undefined;
  let email: string | undefined;
  let apply = false;

  for (const arg of argv) {
    if (arg === '--apply') {
      apply = true;
    } else if (arg.startsWith('--nickname=')) {
      nickname = arg.slice('--nickname='.length).trim().toLowerCase();
    } else if (arg.startsWith('--email=')) {
      email = arg.slice('--email='.length).trim().toLowerCase();
    } else if (!arg.startsWith('--') && !nickname) {
      nickname = arg.trim().toLowerCase();
    }
  }

  return { nickname, email, apply };
}

async function resolveUserId(nickname?: string, email?: string): Promise<{ userId: string; nickname: string }> {
  if (nickname) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, nickname')
      .eq('nickname', nickname)
      .maybeSingle();
    if (error) throw error;
    if (!data?.nickname) {
      throw new Error(`No profile for nickname @${nickname}`);
    }
    return { userId: data.id, nickname: data.nickname };
  }

  if (email) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, nickname')
      .ilike('email', email)
      .maybeSingle();
    if (error) throw error;
    if (!data?.nickname) {
      throw new Error(`No profile for email ${email}`);
    }
    return { userId: data.id, nickname: data.nickname };
  }

  throw new Error('Pass --nickname=… or --email=…');
}

function buildMergedItems(existing: UserGearItem[]): UserGearItem[] {
  const byKey = new Map<string, UserGearItem>();
  for (const item of existing) {
    byKey.set(itemKey(item.name, item.category), item);
  }

  const baseTime = Date.now();
  return TARGET_INVENTORY.map((target, index) => {
    const key = itemKey(target.name, target.category);
    const match = byKey.get(key);
    const note = target.note ?? match?.note ?? '';
    if (match) {
      return {
        ...match,
        name: target.name,
        note,
        addedAt: match.addedAt,
      };
    }
    return {
      id: randomUUID(),
      catalogId: null,
      name: target.name,
      category: target.category,
      note,
      addedAt: baseTime - index * 1000,
    };
  });
}

async function main() {
  const { nickname, email, apply } = parseArgs(process.argv.slice(2));
  const { userId, nickname: resolvedNick } = await resolveUserId(nickname, email);

  const current = await fetchUserGearProfileForUser(supabase, userId);
  const merged = buildMergedItems(current.items);

  const currentKeys = new Set(current.items.map((i) => itemKey(i.name, i.category)));
  const mergedKeys = new Set(merged.map((i) => itemKey(i.name, i.category)));
  const added = merged.filter((i) => !currentKeys.has(itemKey(i.name, i.category)));
  const removed = current.items.filter((i) => !mergedKeys.has(itemKey(i.name, i.category)));

  console.log(`Profile: @${resolvedNick} (${userId})`);
  console.log(`Current items: ${current.items.length}`);
  console.log(`Target items: ${merged.length}`);
  console.log(`To add (${added.length}):`);
  for (const item of added) {
    console.log(`  + [${item.category}] ${item.name}${item.note ? ` — ${item.note}` : ''}`);
  }
  if (removed.length > 0) {
    console.log(`To remove (${removed.length}) — not in target list:`);
    for (const item of removed) {
      console.log(`  - [${item.category}] ${item.name}`);
    }
  }

  if (!apply) {
    console.log('\nDry run only. Pass --apply to update the database.');
    return;
  }

  const { error: deleteError } = await supabase
    .from('user_gear_items')
    .delete()
    .eq('user_id', userId);

  if (deleteError) {
    throw deleteError;
  }

  const rows = merged.map((item, sortIndex) => ({
    id: item.id,
    user_id: userId,
    catalog_id: item.catalogId,
    name: item.name,
    category: item.category,
    note: item.note,
    sort_index: sortIndex,
    added_at: new Date(item.addedAt).toISOString(),
  }));

  const { error: insertError } = await supabase.from('user_gear_items').insert(rows);

  if (insertError) {
    throw insertError;
  }

  console.log(`\nWrote ${rows.length} items to user_gear_items.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
