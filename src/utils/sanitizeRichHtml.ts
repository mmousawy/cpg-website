import 'server-only';

import {
  prepareRichDescriptionContent,
  type PreparedRichDescription,
} from '@/utils/richHtmlShared';

export type { PreparedRichDescription };

/**
 * Sanitize and normalize rich HTML for safe server-side rendering.
 * Server-only — importing this file from a Client Component will fail the build.
 */
export function prepareRichDescription(html: string, disableLinks = false): PreparedRichDescription | null {
  return prepareRichDescriptionContent(html, disableLinks);
}

export function sanitizeEventDescription(description: string | null | undefined): string | null {
  const prepared = prepareRichDescription(description ?? '');
  return prepared?.content ?? null;
}

export function withSanitizedDescriptions<T extends { description?: string | null }>(items: T[]): T[] {
  return items.map((item) => ({
    ...item,
    description: sanitizeEventDescription(item.description),
  }));
}
