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

/** Weaker than a service pitch: enough to hold a profile, not enough to suspend. */
const COMMERCIAL_PROFILE_PATTERNS: RegExp[] = [
  /\btours?\b/i,
  /\btravel\b/i,
  /\bcertification\b/i,
  /\brecertification\b/i,
  /\blifeguard\b/i,
  /\bdissertation\b/i,
  /\bassignment help\b/i,
  /\bcoursework\b/i,
  /\bvisa\b/i,
  /\bagency\b/i,
  /\bcompany\b/i,
  /\bofficial\b/i,
  /\bwholesale\b/i,
  /\bseo\b/i,
  /\bmarketing\b/i,
  /\binsurance\b/i,
  /\bcasino\b/i,
  /\bcrypto\b/i,
  /\bsolicitor/i,
  /\b(llc|ltd|gmbh|plc)\b/i,
];

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
  return isServiceOfferText(text);
}

/** True when free text (display name, bio) looks like a service pitch. */
export function isServiceOfferText(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (SERVICE_OFFER_PATTERNS.some((re) => re.test(trimmed))) return true;
  const lower = trimmed.toLowerCase();
  const hasCert = /\b(certification|recertification)\b/i.test(lower);
  const hasTraining = /\b(training|course)\b/i.test(lower);
  return hasCert && hasTraining;
}

/**
 * Display name or bio that looks like a business rather than a person.
 * Photographers who mention photography in the same text are left alone.
 */
export function looksLikeCommercialProfileText(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (PORTFOLIO_WORDS.test(trimmed)) return false;
  return COMMERCIAL_PROFILE_PATTERNS.some((re) => re.test(trimmed));
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
