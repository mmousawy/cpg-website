import { classifyPageContent } from '@/lib/profileUrl/classifyPageContent';
import { extractPageSignalsFromHtml } from '@/lib/profileUrl/extractPageSignals';
import { fetchPageHtml } from '@/lib/profileUrl/fetchPageHtml';
import { isKnownSocialHost } from '@/lib/profileUrl/socialHosts';
import { checkSafeBrowsing } from '@/lib/profileUrl/safeBrowsing';
import type { PageSignals } from '@/lib/profileUrl/extractPageSignals';
import type { ProfileUrlVerdict } from '@/lib/profileUrl/classifyPageContent';

export type ProfileUrlCheckResult = {
  url: string;
  verdict: ProfileUrlVerdict;
  reason: string;
  title: string | null;
  schemaTypes: string[];
  safeBrowsing: string;
};

export type CheckProfileUrlOptions = {
  memberFullName?: string;
  /** When set, skip network fetch and classify this HTML (tests / fixtures). */
  htmlOverride?: string;
  /** Skip Safe Browsing (tests). */
  skipSafeBrowsing?: boolean;
};

function formatSafeBrowsing(
  result: Awaited<ReturnType<typeof checkSafeBrowsing>>,
): string {
  if (result.status === 'skipped') return 'safe_browsing_skipped';
  if (result.status === 'clean') return 'safe_browsing_clean';
  if (result.status === 'threat') return `safe_browsing_${result.threatTypes.join(',')}`;
  return `safe_browsing_error:${result.message}`;
}

function resultFromSignals(
  url: string,
  signals: PageSignals,
  memberFullName: string | undefined,
  safeBrowsingLabel: string,
): ProfileUrlCheckResult {
  const classified = classifyPageContent(signals, memberFullName);
  return {
    url,
    verdict: classified.verdict,
    reason: classified.reason,
    title: signals.title,
    schemaTypes: signals.schemaTypes,
    safeBrowsing: safeBrowsingLabel,
  };
}

export async function checkProfileUrl(
  rawUrl: string,
  options: CheckProfileUrlOptions = {},
): Promise<ProfileUrlCheckResult> {
  let url: string;
  try {
    url = new URL(rawUrl.trim()).toString();
  } catch {
    return {
      url: rawUrl,
      verdict: 'pending',
      reason: 'invalid_url',
      title: null,
      schemaTypes: [],
      safeBrowsing: 'n/a',
    };
  }

  let safeBrowsingLabel = 'safe_browsing_skipped';
  if (!options.skipSafeBrowsing) {
    const sb = await checkSafeBrowsing(url);
    safeBrowsingLabel = formatSafeBrowsing(sb);
    if (sb.status === 'threat') {
      return {
        url,
        verdict: 'block',
        reason: 'safe_browsing',
        title: null,
        schemaTypes: [],
        safeBrowsing: safeBrowsingLabel,
      };
    }
    if (sb.status === 'error') {
      return {
        url,
        verdict: 'pending',
        reason: 'safe_browsing_error',
        title: null,
        schemaTypes: [],
        safeBrowsing: safeBrowsingLabel,
      };
    }
  }

  if (isKnownSocialHost(url)) {
    return {
      url,
      verdict: 'allow',
      reason: 'social_host',
      title: null,
      schemaTypes: [],
      safeBrowsing: safeBrowsingLabel,
    };
  }

  if (options.htmlOverride !== undefined) {
    const signals = extractPageSignalsFromHtml(options.htmlOverride);
    return resultFromSignals(url, signals, options.memberFullName, safeBrowsingLabel);
  }

  const fetched = await fetchPageHtml(url);
  if (!fetched.ok) {
    return {
      url,
      verdict: 'pending',
      reason: fetched.reason === 'unsafe_url' ? 'unsafe_url' : 'fetch_failed',
      title: null,
      schemaTypes: [],
      safeBrowsing: safeBrowsingLabel,
    };
  }

  const signals = extractPageSignalsFromHtml(fetched.html);
  return resultFromSignals(url, signals, options.memberFullName, safeBrowsingLabel);
}

const URL_IN_TEXT = /https?:\/\/[^\s<>"']+/gi;

export function extractUrlsFromText(text: string): string[] {
  const matches = text.match(URL_IN_TEXT) ?? [];
  return [...new Set(matches.map((u) => u.replace(/[.,;:!?)]+$/, '')))];
}
