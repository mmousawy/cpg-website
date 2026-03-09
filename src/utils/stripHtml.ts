/**
 * Decodes common HTML entities (&#39;, &amp;, etc.) to plain characters.
 */
function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(Number(num)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");
}

/**
 * Converts rich HTML to plain text by stripping all tags and decoding entities.
 * Used for metadata, JSON-LD, calendar links, and card previews.
 */
export function stripHtml(html: string): string {
  if (!html) return '';
  const withoutTags = html.replace(/<[^>]*>/g, '');
  return decodeHtmlEntities(withoutTags).trim();
}
