import { NextRequest, NextResponse } from 'next/server';
import { getIncludeTestContentFromRequest } from '@/lib/auth/includeTestContent';
import { ALL_SEARCH_ENTITY_TYPES, searchEntities } from '@/lib/data/search';
import type { SearchEntityType } from '@/types/search';

export async function GET(request: NextRequest) {
  const includeTestContent = getIncludeTestContentFromRequest(request);
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  const typesParam = searchParams.get('types');
  const limitParam = searchParams.get('limit');

  // Parse types filter
  let types: SearchEntityType[] = ALL_SEARCH_ENTITY_TYPES;
  if (typesParam) {
    const requestedTypes = typesParam.split(',').map((t) => t.trim().toLowerCase()) as SearchEntityType[];
    types = requestedTypes.filter((t) => ALL_SEARCH_ENTITY_TYPES.includes(t));
    if (types.length === 0) {
      types = ALL_SEARCH_ENTITY_TYPES;
    }
  }

  // Parse limit
  const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10), 1), 50) : 20;

  // Validate query
  if (!query || query.trim().length < 2) {
    return NextResponse.json({
      results: [],
      query: query.trim(),
      total: 0,
    });
  }

  try {
    const results = await searchEntities(query.trim(), types, limit, includeTestContent);

    // Add cache headers for client-side caching (5 minutes)
    return NextResponse.json(
      {
        results,
        query: query.trim(),
        total: results.length,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      },
    );
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to perform search',
        results: [],
        query: query.trim(),
        total: 0,
      },
      { status: 500 },
    );
  }
}
