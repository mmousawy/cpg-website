import type { PageSignals } from '@/lib/profileUrl/extractPageSignals';

export type ProfileUrlVerdict = 'allow' | 'block' | 'pending';

export type ClassifyResult = {
  verdict: ProfileUrlVerdict;
  reason: string;
};

const BUSINESS_TYPES = new Set(['Organization', 'LocalBusiness', 'Place', 'Store', 'ProfessionalService']);
const ADDRESS_TYPES = new Set(['PostalAddress', 'ContactPoint']);
const PERSON_TYPES = new Set(['Person', 'ProfilePage']);

const PORTFOLIO_WORDS = /\b(portfolio|photograph(y|er|ers|ic)?|photo\s+by|art\s+photography)\b/i;

const SERVICE_OFFER_PATTERNS: RegExp[] = [
  /\b\d+\s*%\s*(off|discount|خصم)?/i,
  /\btour(s)?\s+(package|packages|agency)\b/i,
  /\btravel agency\b/i,
  /\bdissertation help\b/i,
  /\bwriting service\b/i,
  /\b(law|essay)\b.*\b(help|service|writing)\b/i,
  /\bشركة\b/,
  /\b(cleaning company|house cleaning|تنظيف)\b/i,
  /\bfactory price\b/i,
  /\bharga pabrik\b/i,
  /\bpengiriman ke seluruh\b/i,
  /\bqualified\b.*\b(dissertation|essay)\b/i,
  /\bacademic solicitors\b/i,
];

function combinedText(signals: PageSignals): string {
  return [signals.title, signals.description].filter(Boolean).join(' ');
}

function hasType(types: string[], set: Set<string>): boolean {
  return types.some((t) => set.has(t));
}

function nameTokens(fullName: string | undefined): string[] {
  if (!fullName?.trim()) return [];
  return fullName
    .toLowerCase()
    .split(/[^a-z0-9\u0080-\uFFFF]+/)
    .filter((t) => t.length >= 3);
}

function matchesPortfolioByName(signals: PageSignals, memberFullName: string | undefined): boolean {
  const tokens = nameTokens(memberFullName);
  if (tokens.length === 0) return false;
  const text = combinedText(signals).toLowerCase();
  const nameHit = tokens.some((t) => text.includes(t));
  if (!nameHit) return false;
  if (PORTFOLIO_WORDS.test(text)) return true;
  if (/^portfolio of\b/i.test(signals.description ?? '')) return true;
  return false;
}

function isBusinessListing(signals: PageSignals): boolean {
  const types = signals.schemaTypes;
  if (hasType(types, PERSON_TYPES)) return false;
  const business = hasType(types, BUSINESS_TYPES);
  const address = hasType(types, ADDRESS_TYPES);
  return business && address;
}

function isServiceOffer(signals: PageSignals): boolean {
  const text = combinedText(signals);
  return SERVICE_OFFER_PATTERNS.some((re) => re.test(text));
}

/** Classify fetched page content (not for known social hosts). */
export function classifyPageContent(
  signals: PageSignals,
  memberFullName?: string,
): ClassifyResult {
  if (hasType(signals.schemaTypes, PERSON_TYPES)) {
    return { verdict: 'allow', reason: 'person_schema' };
  }

  if (matchesPortfolioByName(signals, memberFullName)) {
    const types = signals.schemaTypes;
    if (!hasType(types, BUSINESS_TYPES) || hasType(types, PERSON_TYPES)) {
      return { verdict: 'allow', reason: 'portfolio_title' };
    }
  }

  if (isBusinessListing(signals)) {
    return { verdict: 'block', reason: 'business_address_schema' };
  }

  if (isServiceOffer(signals)) {
    return { verdict: 'block', reason: 'service_title' };
  }

  return { verdict: 'pending', reason: 'inconclusive' };
}
