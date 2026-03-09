/**
 * Converts Quill's flat list HTML into proper nested HTML lists.
 *
 * Quill outputs all <li> elements flat inside a single <ol>/<ul>, using
 * `class="ql-indent-N"` for nesting and `data-list="bullet|ordered"` for
 * mixed list types. Standard browsers can't render this without Quill's CSS,
 * so this function rewrites it into semantically correct nested lists.
 *
 * Pure string transform — no DOM required, safe for SSR.
 */

interface ListItem {
  indent: number;
  type: 'ol' | 'ul';
  content: string;
}

function parseListItems(innerHtml: string, parentTag: 'ol' | 'ul'): ListItem[] {
  const items: ListItem[] = [];
  const liRegex = /<li([^>]*)>([\s\S]*?)<\/li>/gi;
  let match;

  while ((match = liRegex.exec(innerHtml)) !== null) {
    const attrs = match[1];
    const content = match[2];

    const indentMatch = attrs.match(/ql-indent-(\d+)/);
    const indent = indentMatch ? parseInt(indentMatch[1], 10) : 0;

    const dataListMatch = attrs.match(/data-list="(bullet|ordered)"/);
    let type: 'ol' | 'ul' = parentTag;
    if (dataListMatch) {
      type = dataListMatch[1] === 'bullet' ? 'ul' : 'ol';
    }

    items.push({ indent, type, content });
  }

  return items;
}

/**
 * Recursively builds nested list HTML from a flat list of items.
 * Items at `baseIndent` become direct `<li>` children; items with
 * higher indent become nested sub-lists attached to the preceding `<li>`.
 */
function buildNested(items: ListItem[], fromIndex: number, baseIndent: number): { html: string; consumed: number } {
  let html = '';
  let i = fromIndex;

  while (i < items.length) {
    const item = items[i];
    if (item.indent < baseIndent) break;

    if (item.indent > baseIndent) {
      const childTag = item.type;
      const nested = buildNested(items, i, item.indent);
      if (html.endsWith('</li>')) {
        html = html.slice(0, -5) + `<${childTag}>${nested.html}</${childTag}></li>`;
      } else {
        html += `<li><${childTag}>${nested.html}</${childTag}></li>`;
      }
      i += nested.consumed;
      continue;
    }

    html += `<li>${item.content}</li>`;
    i++;
  }

  return { html, consumed: i - fromIndex };
}

function processListBlock(innerHtml: string, parentTag: 'ol' | 'ul'): string {
  const items = parseListItems(innerHtml, parentTag);
  if (items.length === 0) return `<${parentTag}>${innerHtml}</${parentTag}>`;

  const hasQuillFormat = items.some(
    (it) => it.indent > 0 || it.type !== parentTag,
  );
  if (!hasQuillFormat) return `<${parentTag}>${innerHtml}</${parentTag}>`;

  const nested = buildNested(items, 0, 0);
  return `<${parentTag}>${nested.html}</${parentTag}>`;
}

export function normalizeQuillLists(html: string): string {
  if (!html) return html;

  let result = html;
  result = result.replace(
    /<ol\b[^>]*>([\s\S]*?)<\/ol>/gi,
    (_match, inner: string) => processListBlock(inner, 'ol'),
  );
  result = result.replace(
    /<ul\b[^>]*>([\s\S]*?)<\/ul>/gi,
    (_match, inner: string) => processListBlock(inner, 'ul'),
  );

  return result;
}
