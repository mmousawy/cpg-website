'use client';

import clsx from 'clsx';
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

export interface RichDescriptionProps {
  html: string;
  className?: string;
  /** Strip <a> tags from the content (use when rendering inside a <Link> to avoid nested anchors) */
  disableLinks?: boolean;
}

/**
 * Drop-in component that safely renders rich HTML descriptions on the web.
 * Handles both plain text (backward compatibility) and HTML.
 */
export function RichDescription({ html, className, disableLinks = false }: RichDescriptionProps) {
  if (!html || !html.trim()) return null;

  const normalized = html.replace(/&nbsp;/g, ' ');
  const isPlain = isPlainText(normalized);
  const content = isPlain ? normalized : sanitizeForWeb(normalizeQuillLists(normalized), disableLinks);
  const classes = clsx('rich-description', className);

  if (isPlain) {
    return (
      <div
        className={classes}
      >
        {content}
      </div>
    );
  }

  return <div
    className={classes}
    suppressHydrationWarning
    dangerouslySetInnerHTML={{ __html: content }}
  />;
}
