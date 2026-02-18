import sanitizeHtml from 'sanitize-html';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';

const ALLOWED_TAGS = ['p', 'h2', 'h3', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'blockquote', 'br', 'span', 'hr', 'img'];

const INLINE_STYLES: Record<string, string> = {
  p: 'margin: 0 0 8px 0; font-size: 14px; line-height: 1.65em; color: #171717;',
  h2: 'font-size: 15px; font-weight: bold; margin: 24px 0 4px 0; color: #38785f; line-height: 1.5em; padding-bottom: 6px;',
  h3: 'font-size: 14px; font-weight: 600; margin: 16px 0 4px 0; color: #171717; line-height: 1.5em;',
  ul: 'margin: 8px 0; padding-left: 6px; font-size: 14px; line-height: 1.65em; color: #171717;',
  ol: 'margin: 8px 0; padding-left: 6px; font-size: 14px; line-height: 1.65em; color: #171717;',
  li: 'margin: 4px 0;',
  blockquote: 'margin: 8px 0; padding-left: 16px; border-left: 4px solid #e5e7ea; color: #6e7277; font-size: 14px; line-height: 24px;',
  a: 'color: #38785f; text-decoration: underline;',
  hr: 'border: none; border-top: 1px solid #e5e7ea; margin: 20px 0;',
  img: 'max-width: 100%; height: auto; border-radius: 8px; margin: 12px 0; display: block;',
};

function addInlineStyle(tagName: string, attribs: Record<string, string>): { tagName: string; attribs: Record<string, string> } {
  const style = INLINE_STYLES[tagName];
  if (style) {
    return { tagName, attribs: { ...attribs, style } };
  }
  return { tagName, attribs };
}

function sanitizeRichContent(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ['href', 'style'],
      p: ['style'],
      h2: ['style'],
      h3: ['style'],
      ul: ['style'],
      ol: ['style'],
      li: ['style'],
      blockquote: ['style'],
      hr: ['style'],
      img: ['src', 'alt', 'width', 'class', 'style'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: {
      p: (tagName: string, attribs: Record<string, string>) => addInlineStyle(tagName, attribs),
      h2: (tagName: string, attribs: Record<string, string>) => addInlineStyle(tagName, attribs),
      h3: (tagName: string, attribs: Record<string, string>) => addInlineStyle(tagName, attribs),
      ul: (tagName: string, attribs: Record<string, string>) => addInlineStyle(tagName, attribs),
      ol: (tagName: string, attribs: Record<string, string>) => addInlineStyle(tagName, attribs),
      li: (tagName: string, attribs: Record<string, string>) => addInlineStyle(tagName, attribs),
      blockquote: (tagName: string, attribs: Record<string, string>) => addInlineStyle(tagName, attribs),
      hr: (tagName: string, attribs: Record<string, string>) => addInlineStyle(tagName, attribs),
      img: (tagName: string, attribs: Record<string, string>) => {
        let style = INLINE_STYLES.img;
        const width = attribs.width;
        if (width) style += ` width: ${width}px;`;

        const cls = attribs.class || '';
        if (cls.includes('img-align-right')) {
          style += ' margin-left: auto; margin-right: 0;';
        } else if (cls.includes('img-align-left')) {
          style += ' margin-left: 0; margin-right: auto;';
        } else {
          style += ' margin-left: auto; margin-right: auto;';
        }

        const { class: _cls, ...rest } = attribs;
        return { tagName, attribs: { ...rest, style } };
      },
      a: (tagName: string, attribs: Record<string, string>) => {
        const href = attribs.href;
        const styled = addInlineStyle(tagName, attribs);
        if (href && href.startsWith('/')) {
          styled.attribs.href = `${baseUrl}${href}`;
        }
        return styled;
      },
    },
  });
}

function isPlainText(content: string): boolean {
  return !/<[a-z][\s\S]*>/i.test(content);
}

interface RichContentProps {
  html: string;
}

export default function RichContent({ html }: RichContentProps) {
  const content = isPlainText(html)
    ? html.split('\n').map((line) => `<p style="${INLINE_STYLES.p}">${line ? sanitizeHtml(line, { allowedTags: [] }) : '&nbsp;'}</p>`).join('')
    : sanitizeRichContent(html);

  return (
    <div
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}
