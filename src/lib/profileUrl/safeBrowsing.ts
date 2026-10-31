const SAFE_BROWSING_URL =
  'https://safebrowsing.googleapis.com/v4/threatMatches:find';

export type SafeBrowsingResult =
  | { status: 'skipped'; reason: 'no_api_key' }
  | { status: 'clean' }
  | { status: 'threat'; threatTypes: string[] }
  | { status: 'error'; message: string };

export async function checkSafeBrowsing(url: string): Promise<SafeBrowsingResult> {
  const apiKey = process.env.SAFE_BROWSING_API_KEY?.trim();
  if (!apiKey) {
    return { status: 'skipped', reason: 'no_api_key' };
  }

  try {
    const response = await fetch(`${SAFE_BROWSING_URL}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client: { clientId: 'cpg-website', clientVersion: '1.0.0' },
        threatInfo: {
          threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE'],
          platformTypes: ['ANY_PLATFORM'],
          threatEntryTypes: ['URL'],
          threatEntries: [{ url }],
        },
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      return { status: 'error', message: `Safe Browsing HTTP ${response.status}` };
    }

    const data = (await response.json()) as { matches?: { threatType: string }[] };
    const matches = data.matches ?? [];
    if (matches.length === 0) {
      return { status: 'clean' };
    }
    return {
      status: 'threat',
      threatTypes: [...new Set(matches.map((m) => m.threatType))],
    };
  } catch (err) {
    return {
      status: 'error',
      message: err instanceof Error ? err.message : 'Safe Browsing request failed',
    };
  }
}
