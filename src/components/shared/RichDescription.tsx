import clsx from 'clsx';
import { prepareRichDescription } from '@/utils/sanitizeRichHtml';

export interface RichDescriptionProps {
  html: string;
  className?: string;
  /** Strip <a> tags from the content (use when rendering inside a <Link> to avoid nested anchors) */
  disableLinks?: boolean;
}

/**
 * Safely renders rich HTML descriptions on the web.
 * Sanitization runs on the server to keep sanitize-html out of the client bundle.
 */
export function RichDescription({ html, className, disableLinks = false }: RichDescriptionProps) {
  const prepared = prepareRichDescription(html, disableLinks);
  if (!prepared) return null;

  const { content, isPlain } = prepared;
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
