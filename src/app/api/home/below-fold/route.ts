import { getIncludeTestContent } from '@/lib/auth/includeTestContent';
import { getHomePageData } from '@/lib/data/home';
import { NextResponse } from 'next/server';

export async function GET() {
  const includeTestContent = await getIncludeTestContent();
  const data = await getHomePageData(includeTestContent);

  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=300',
    },
  });
}
