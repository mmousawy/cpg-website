/**
 * Converts rich HTML to plain text by stripping all tags.
 * Used for metadata, JSON-LD, calendar links, and card previews.
 */
export function stripHtml(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}
