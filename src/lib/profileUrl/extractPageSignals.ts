export type PageSignals = {
  title: string | null;
  description: string | null;
  schemaTypes: string[];
};

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function pickMeta(html: string, name: 'description' | 'og:description' | 'og:type'): string | null {
  const patterns =
    name === 'description'
      ? [
        /<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i,
        /<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i,
      ]
      : name === 'og:description'
        ? [
          /<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i,
          /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:description["']/i,
        ]
        : [
          /<meta[^>]*property=["']og:type["'][^>]*content=["']([^"']+)["']/i,
          /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:type["']/i,
        ];

  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]?.trim()) {
      return decodeHtmlEntities(m[1].trim());
    }
  }
  return null;
}

function extractTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([^<]{1,500})/i);
  return m?.[1] ? decodeHtmlEntities(m[1].trim()) : null;
}

/** Collect JSON-LD @type values (string or array entries). */
export function extractJsonLdTypes(html: string): string[] {
  const types = new Set<string>();
  const blockRe = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = blockRe.exec(html)) !== null) {
    const raw = match[1]?.trim();
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw) as unknown;
      collectTypes(parsed, types);
    } catch {
      // Some sites embed invalid JSON-LD; ignore.
    }
  }
  return [...types];
}

function collectTypes(node: unknown, types: Set<string>): void {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    node.forEach((item) => collectTypes(item, types));
    return;
  }
  const obj = node as Record<string, unknown>;
  if (typeof obj['@type'] === 'string') {
    types.add(obj['@type']);
  } else if (Array.isArray(obj['@type'])) {
    obj['@type'].forEach((t) => {
      if (typeof t === 'string') types.add(t);
    });
  }
  if (obj['@graph']) {
    collectTypes(obj['@graph'], types);
  }
  for (const value of Object.values(obj)) {
    if (value && typeof value === 'object') {
      collectTypes(value, types);
    }
  }
}

export function extractPageSignalsFromHtml(html: string): PageSignals {
  const title = extractTitle(html);
  const description =
    pickMeta(html, 'description')
    ?? pickMeta(html, 'og:description');
  const schemaTypes = extractJsonLdTypes(html);
  return { title, description, schemaTypes };
}
