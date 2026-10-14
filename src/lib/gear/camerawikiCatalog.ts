import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/database.types';
import { findCatalogIdByAlias, upsertCatalogEntry } from '@/lib/gear/catalogDb';
import { formatCatalogDisplayName } from '@/lib/gear/formatCatalogDisplayName';
import type { GearCategory } from '@/lib/gear/types';

const CAMERA_WIKI_API = 'https://camera-wiki.org/api.php';
const USER_AGENT = 'CreativePhotographyGroup/1.0 (gear catalog; contact@creativephotography.group)';

type AdminClient = SupabaseClient<Database>;

type CategoryMember = {
  pageid: number;
  ns: number;
  title: string;
};

type CategoryMembersResponse = {
  batchcomplete?: string;
  continue?: { cmcontinue?: string };
  query?: { categorymembers?: CategoryMember[] };
};

/** Multi-word maker names as they appear at the start of Camera-wiki page titles. */
const MULTI_WORD_BRANDS = [
  'Bell & Howell',
  'Zeiss Ikon',
  'Leica Camera',
  'Rollei Flex',
  'Konica Minolta',
  'Hasselblad',
  'Mamiya/Sekor',
  'Argus/Cosina',
] as const;

const SKIP_CATEGORY_PATTERNS = [
  /\bmakers\b/i,
  /\bparts\b/i,
  /\baccessories\b/i,
  /\bmounts\b/i,
  /\bformats\b/i,
  /\barchitecture\b/i,
  /\bkit\b/i,
  /\bcopies\b/i,
  /\bby first letter\b/i,
  /\bweb sites\b/i,
  /\bdesigners\b/i,
  /\bmodules\b/i,
  /\bprocessor makers\b/i,
  /\bobscura\b/i,
  /\bprocessors\b/i,
  /\blens mount\b/i,
];

const SKIP_PAGE_TITLE_PATTERNS = [
  /^list of\b/i,
  /\bseries$/i,
  /\bdisambiguation\b/i,
  /\btimeline\b/i,
  /^category:/i,
];

const ROOT_CATEGORIES: { title: string; category: GearCategory }[] = [
  { title: 'Category:Cameras', category: 'camera_body' },
  { title: 'Category:Lenses', category: 'lens' },
];

export function isSkippableCameraWikiCategory(categoryTitle: string): boolean {
  const normalized = categoryTitle.replace(/^Category:/i, '');
  return SKIP_CATEGORY_PATTERNS.some((re) => re.test(normalized));
}

export function isAcceptableCameraWikiPageTitle(title: string): boolean {
  const trimmed = title.trim();
  if (trimmed.length < 2 || trimmed.length > 120) {
    return false;
  }
  return !SKIP_PAGE_TITLE_PATTERNS.some((re) => re.test(trimmed));
}

export function splitCameraWikiBrand(pageTitle: string): { brand: string; name: string } {
  const trimmed = pageTitle.trim();
  for (const maker of MULTI_WORD_BRANDS) {
    if (trimmed.toLowerCase().startsWith(maker.toLowerCase())) {
      const rest = trimmed.slice(maker.length).trim();
      const name = formatCatalogDisplayName(maker, rest || trimmed);
      return { brand: maker, name };
    }
  }
  const space = trimmed.indexOf(' ');
  if (space <= 0) {
    return { brand: '', name: trimmed };
  }
  const brand = trimmed.slice(0, space);
  const model = trimmed.slice(space + 1).trim();
  return { brand, name: formatCatalogDisplayName(brand, model) };
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchCategoryMembers(
  categoryTitle: string,
  cmcontinue?: string,
): Promise<{ members: CategoryMember[]; nextContinue?: string }> {
  const params = new URLSearchParams({
    action: 'query',
    list: 'categorymembers',
    cmtitle: categoryTitle,
    cmtype: 'page|subcat',
    cmlimit: '500',
    format: 'json',
  });
  if (cmcontinue) {
    params.set('cmcontinue', cmcontinue);
  }

  const res = await fetch(`${CAMERA_WIKI_API}?${params.toString()}`, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new Error(`Camera-wiki API failed: ${res.status} for ${categoryTitle}`);
  }

  const json = (await res.json()) as CategoryMembersResponse;
  return {
    members: json.query?.categorymembers ?? [],
    nextContinue: json.continue?.cmcontinue,
  };
}

async function listAllCategoryMembers(categoryTitle: string): Promise<CategoryMember[]> {
  const all: CategoryMember[] = [];
  let cmcontinue: string | undefined;

  do {
    const { members, nextContinue } = await fetchCategoryMembers(categoryTitle, cmcontinue);
    all.push(...members);
    cmcontinue = nextContinue;
    if (cmcontinue) {
      await sleep(200);
    }
  } while (cmcontinue);

  return all;
}

async function catalogIdForAliasInCategory(
  supabase: AdminClient,
  label: string,
  category: GearCategory,
): Promise<string | null> {
  const catalogId = await findCatalogIdByAlias(supabase, label);
  if (!catalogId) return null;

  const { data } = await supabase
    .from('gear_catalog')
    .select('category')
    .eq('id', catalogId)
    .maybeSingle();

  if (data?.category === category) {
    return catalogId;
  }
  return null;
}

async function ingestPage(
  supabase: AdminClient,
  pageTitle: string,
  category: GearCategory,
): Promise<boolean> {
  if (!isAcceptableCameraWikiPageTitle(pageTitle)) {
    return false;
  }

  const duplicateId = await catalogIdForAliasInCategory(supabase, pageTitle, category);
  if (duplicateId) {
    return false;
  }

  const { brand, name } = splitCameraWikiBrand(pageTitle);
  const displayName = name || pageTitle;
  const sourceKey = `page:${pageTitle}`;

  const id = await upsertCatalogEntry(supabase, {
    source: 'camerawiki',
    sourceKey,
    category,
    brand,
    name: displayName,
    aliasStrings: [pageTitle, displayName, brand ? `${brand} ${pageTitle}` : pageTitle],
  });

  return Boolean(id);
}

async function walkCategory(
  supabase: AdminClient,
  categoryTitle: string,
  gearCategory: GearCategory,
  visitedCategories: Set<string>,
): Promise<number> {
  if (visitedCategories.has(categoryTitle)) {
    return 0;
  }
  visitedCategories.add(categoryTitle);

  let count = 0;
  const members = await listAllCategoryMembers(categoryTitle);
  await sleep(150);

  const subcats: string[] = [];
  for (const member of members) {
    if (member.ns === 14) {
      if (!isSkippableCameraWikiCategory(member.title)) {
        subcats.push(member.title);
      }
      continue;
    }
    if (member.ns !== 0) {
      continue;
    }
    const ingested = await ingestPage(supabase, member.title, gearCategory);
    if (ingested) count += 1;
  }

  for (const subcat of subcats) {
    count += await walkCategory(supabase, subcat, gearCategory, visitedCategories);
  }

  return count;
}

export async function refreshCameraWikiCatalog(supabase: AdminClient): Promise<number> {
  let count = 0;
  const visited = new Set<string>();

  for (const root of ROOT_CATEGORIES) {
    console.info(`Camera-wiki: walking ${root.title}`);
    count += await walkCategory(supabase, root.title, root.category, visited);
  }

  return count;
}
