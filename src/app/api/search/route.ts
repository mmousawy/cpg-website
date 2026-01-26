import { NextRequest, NextResponse } from 'next/server';
import { searchEntities } from '@/lib/data/search';
import type { SearchEntityType } from '@/types/search';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  const typesParam = searchParams.get('types');
  const limitParam = searchParams.get('limit');

  // Parse types filter
  let types: SearchEntityType[] = ['albums', 'photos', 'members', 'events', 'tags'];
  if (typesParam) {
    const requestedTypes = typesParam.split(',').map((t) => t.trim().toLowerCase()) as SearchEntityType[];
    const validTypes: SearchEntityType[] = ['albums', 'photos', 'members', 'events', 'tags'];
    types = requestedTypes.filter((t) => validTypes.includes(t));
    if (types.length === 0) {
      types = validTypes; // Default to all if invalid types provided
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
    const results = await searchEntities(query.trim(), types, limit);

    return NextResponse.json({
      results,
      query: query.trim(),
      total: results.length,
    });
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
