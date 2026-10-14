import { NextRequest, NextResponse } from 'next/server';

import { GEAR_CATEGORIES } from '@/lib/gear/types';
import { searchGearCatalog } from '@/lib/gear/searchCatalog';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q') ?? '';
  const categoryParam = request.nextUrl.searchParams.get('category');
  const category = categoryParam && GEAR_CATEGORIES.includes(categoryParam as typeof GEAR_CATEGORIES[number])
    ? (categoryParam as typeof GEAR_CATEGORIES[number])
    : null;

  const supabase = await createClient();
  const results = await searchGearCatalog(supabase, q, category, 8);

  return NextResponse.json({ results });
}
