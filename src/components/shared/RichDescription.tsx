import { prepareRichDescription } from '@/utils/sanitizeRichHtml';

import { RichDescriptionView } from './RichDescriptionView';

export interface RichDescriptionProps {
  html: string;
  className?: string;
  /** Strip <a> tags from the content (use when rendering inside a <Link> to avoid nested anchors) */
  disableLinks?: boolean;
}

/**
 * Sanitizes rich HTML on the server, then renders it.
 * Client components should use {@link RichDescriptionView} with pre-sanitized HTML.
 */
export function RichDescription({ html, className, disableLinks = false }: RichDescriptionProps) {
  const prepared = prepareRichDescription(html, disableLinks);
  if (!prepared) return null;

  return (
    <RichDescriptionView
      html={prepared.content}
      className={className}
    />
  );
}
