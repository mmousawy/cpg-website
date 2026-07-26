import sanitizeHtml from 'sanitize-html';
import { normalizeQuillLists } from '@/utils/normalizeQuillLists';

const ALLOWED_TAGS = ['p', 'h2', 'h3', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'blockquote', 'br', 'span', 'hr', 'img'];

function isPlainText(content: string): boolean {
  return !/<[a-z][\s\S]*>/i.test(content);
}

function sanitizeForWeb(html: string, disableLinks = false): string {
  const tags = disableLinks ? ALLOWED_TAGS.filter((t) => t !== 'a') : ALLOWED_TAGS;
  return sanitizeHtml(html, {
    allowedTags: tags,
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      img: ['src', 'alt', 'width', 'class'],
      span: ['class'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
  });
}

export type PreparedRichDescription = {
  content: string;
  isPlain: boolean;
};

/**
 * Sanitize and normalize rich HTML for safe server-side rendering.
 * Keeps sanitize-html out of the client bundle.
 */
export function prepareRichDescription(html: string, disableLinks = false): PreparedRichDescription | null {
  if (!html || !html.trim()) return null;

  const normalized = html.replace(/&nbsp;/g, ' ');
  const isPlain = isPlainText(normalized);
  const content = isPlain
    ? normalized
    : sanitizeForWeb(normalizeQuillLists(normalized), disableLinks);

  return { content, isPlain };
}
