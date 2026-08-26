import clsx from 'clsx';

function isPlainText(content: string): boolean {
  return !/<[a-z][\s\S]*>/i.test(content);
}

function stripAnchorTags(html: string): string {
  return html.replace(/<a\b[^>]*>/gi, '').replace(/<\/a>/gi, '');
}

export type RichDescriptionViewProps = {
  html: string;
  className?: string;
  /** Strip <a> tags (use when rendering inside a <Link> to avoid nested anchors) */
  disableLinks?: boolean;
};

/**
 * Renders already-sanitized rich HTML. Do not pass raw user HTML here.
 */
export function RichDescriptionView({
  html,
  className,
  disableLinks = false,
}: RichDescriptionViewProps) {
  if (!html || !html.trim()) return null;

  const content = disableLinks ? stripAnchorTags(html) : html;
  const classes = clsx('rich-description', className);

  if (isPlainText(content)) {
    return (
      <div
        className={classes}
      >
        {content}
      </div>
    );
  }

  return (
    <div
      className={classes}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}
