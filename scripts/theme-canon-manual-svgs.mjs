/**
 * Copies Canon manual SVGs into src with theme CSS variables (run after updating upstream art).
 * Source: public/learn/canon-manual/*.svg
 *
 * Callout `data-manual-ref` values are authoritative on the themed SVG (or on upstream
 * circles in public art). Re-runs preserve refs from the existing themed file when
 * dot coordinates are unchanged.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = path.join(root, 'public/learn/canon-manual');
const outDir = path.join(root, 'src/content/learn/interactives/canon-manual');

/** Upstream Canon filenames → learn tab SVG names (`CAMERA_VIEWS`). */
const DIAGRAMS = [
  {
    upstream: 'UG-00_i0170.svg',
    themed: 'top-front-three-quarter.svg',
    preserveMappedRefs: true,
  },
  {
    upstream: 'UG-00_i0180.svg',
    themed: 'side-back.svg',
    preserveMappedRefs: false,
  },
  {
    upstream: 'UG-00_i0190.svg',
    themed: 'side-bottom.svg',
    preserveMappedRefs: false,
  },
];

const REPLACEMENTS = [
  [/fill:\s*#fff\b/gi, 'fill: var(--learn-diagram-surface)'],
  [/stroke:\s*#fff\b/gi, 'stroke: var(--learn-diagram-knockout)'],
  [/stroke:\s*#000\b/gi, 'stroke: var(--learn-diagram-ink)'],
  [/stroke:\s*#040000\b/gi, 'stroke: var(--learn-diagram-ink)'],
  [/fill:\s*#040000\b/gi, 'fill: var(--learn-diagram-ink)'],
  [/fill:\s*#231815\b/gi, 'fill: var(--learn-diagram-ink)'],
  [/fill:\s*#0082ba\b/gi, 'fill: var(--primary)'],
  [/stroke:\s*#0082ba\b/gi, 'stroke: var(--primary)'],
];

const STYLE_PREFIX = `      svg {
        background: transparent;
      }

      .learn-canon-callout-dot {
        fill: var(--primary);
        stroke: transparent;
        stroke-width: 2px;
        cursor: pointer;
      }

      .learn-canon-callout-dot[data-active='true'],
      .learn-canon-callout-dot:focus-visible {
        fill: transparent;
        stroke: var(--primary);
        stroke-width: 2px;
      }

      /* Unclassed paths (e.g. logo glyphs) — UA default fill is black. */
      #Body path:not([class]) {
        fill: var(--learn-diagram-ink);
      }

`;

function calloutCircleEl(cx, cy, r, manualRef) {
  const refAttr =
    manualRef != null ? ` data-manual-ref="${manualRef}"` : '';
  return `<circle class="learn-canon-callout-dot"${refAttr} cx="${cx}" cy="${cy}" r="${r}" />`;
}

function calloutEllipseEl(cx, cy, rx, ry, transform, manualRef) {
  const refAttr =
    manualRef != null ? ` data-manual-ref="${manualRef}"` : '';
  const xform = transform ? ` transform="${transform}"` : '';
  return `<ellipse class="learn-canon-callout-dot"${refAttr} cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"${xform}/>`;
}

/** @param {string} svg */
function refsByCoordFromCalloutLayer(svg) {
  const map = Object.create(null);
  for (const m of svg.matchAll(
    /<(?:circle|ellipse)[^>]*class="learn-canon-callout-dot"[^/]*\/>/g,
  )) {
    const el = m[0];
    const refM = el.match(/data-manual-ref="(\d+)"/);
    const cxM = el.match(/\bcx="([\d.]+)"/);
    const cyM = el.match(/\bcy="([\d.]+)"/);
    if (refM && cxM && cyM) {
      map[`${cxM[1]},${cyM[1]}`] = Number(refM[1]);
    }
  }
  return map;
}

/** Label columns in Canon part-name figures — leader lines terminate near these x values. */
const LABEL_COLUMNS = [1, 23, 149, 164, 176, 186, 199, 351, 368, 429, 513, 354, 365];

function parsePartNumberLabels(textBlock) {
  const labels = [];
  const seen = new Set();
  for (const m of textBlock.matchAll(
    /transform="translate\(([\d.]+)\s+([\d.]+)\)"[^>]*>([^<]+)<\/text>/g,
  )) {
    const inner = m[3].replace(/\s+/g, '');
    const refM = inner.match(/\((\d+)\)/);
    if (!refM) {
      continue;
    }
    const ref = Number(refM[1]);
    const key = `${ref}@${m[1]},${m[2]}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    labels.push({ x: Number(m[1]), y: Number(m[2]), ref });
  }
  return labels;
}

function collectLeaderPoints(fragment) {
  const points = [];
  for (const m of fragment.matchAll(/\bx1="([\d.]+)"\s+y1="([\d.]+)"/g)) {
    points.push({ x: Number(m[1]), y: Number(m[2]) });
  }
  for (const m of fragment.matchAll(/\bx2="([\d.]+)"\s+y2="([\d.]+)"/g)) {
    points.push({ x: Number(m[1]), y: Number(m[2]) });
  }
  for (const m of fragment.matchAll(/\bpoints="([^"]+)"/g)) {
    const nums = m[1].trim().split(/[\s,]+/).map(Number);
    for (let i = 0; i + 1 < nums.length; i += 2) {
      points.push({ x: nums[i], y: nums[i + 1] });
    }
  }
  return points;
}

function leaderLabelAnchor(fragment, cx, cy) {
  const points = collectLeaderPoints(fragment);
  let anchor = null;
  let bestDist = 0;
  for (const p of points) {
    const dist = Math.hypot(p.x - cx, p.y - cy);
    if (dist < 20) {
      continue;
    }
    const nearColumn = LABEL_COLUMNS.some((col) => Math.abs(p.x - col) < 45);
    if (!nearColumn && points.length > 2) {
      continue;
    }
    if (dist > bestDist) {
      bestDist = dist;
      anchor = p;
    }
  }
  if (anchor) {
    return anchor;
  }
  let fallback = null;
  let fallbackDist = Infinity;
  for (const p of points) {
    const dist = Math.hypot(p.x - cx, p.y - cy);
    if (dist > 15 && dist < fallbackDist) {
      fallbackDist = dist;
      fallback = p;
    }
  }
  return fallback ?? { x: cx, y: cy };
}

function nearestManualRef(labels, anchor) {
  let bestRef = null;
  let bestScore = Infinity;
  for (const label of labels) {
    const dy = Math.abs(label.y - anchor.y);
    const dx = Math.abs(label.x - anchor.x);
    if (dy > 30 || dx > 120) {
      continue;
    }
    const score = dy + dx * 0.15;
    if (score < bestScore) {
      bestScore = score;
      bestRef = label.ref;
    }
  }
  return bestRef;
}

/** Infer `data-manual-ref` from upstream Text / leader-line groups (same art as the printable manual). */
function refsFromUpstreamManual(svg) {
  const textStart = svg.indexOf('<g id="Text">');
  if (textStart === -1) {
    return Object.create(null);
  }
  const textEnd = svg.indexOf('<g id="Frame">', textStart);
  const textBlock =
    textEnd === -1 ? svg.slice(textStart) : svg.slice(textStart, textEnd);
  const labels = parsePartNumberLabels(textBlock);
  const map = Object.create(null);

  function assignCallout(el, context) {
    const cxM = el.match(/\bcx="([\d.]+)"/);
    const cyM = el.match(/\bcy="([\d.]+)"/);
    if (!cxM || !cyM) {
      return;
    }
    const cx = Number(cxM[1]);
    const cy = Number(cyM[1]);
    const key = `${cxM[1]},${cyM[1]}`;
    if (map[key] != null) {
      return;
    }
    const anchor = leaderLabelAnchor(context, cx, cy);
    const ref = nearestManualRef(labels, anchor);
    if (ref != null) {
      map[key] = ref;
    }
  }

  for (const m of textBlock.matchAll(/<g>([\s\S]*?)<\/g>/g)) {
    const group = m[1];
    if (!/class="cls-(?:15|30)"/.test(group)) {
      continue;
    }
    for (const cm of group.matchAll(/<circle class="cls-(?:15|30)"[^/]*\/>/g)) {
      assignCallout(cm[0], group);
    }
  }

  for (const m of textBlock.matchAll(/<circle class="cls-(?:15|30)"[^/]*\/>/g)) {
    const el = m[0];
    const idx = textBlock.indexOf(el);
  const sliceStart = Math.max(0, idx - 600);
    const local = textBlock.slice(sliceStart, idx + el.length + 320);
    const groupStart = local.lastIndexOf('<g>');
    const context = groupStart >= 0 ? local.slice(groupStart) : local;
    assignCallout(el, context);
  }

  for (const m of svg.matchAll(/<ellipse class="cls-21"[^/]+\/>/g)) {
    const el = m[0];
    const idx = svg.indexOf(el);
    const local = svg.slice(Math.max(0, idx - 400), idx + el.length + 400);
    assignCallout(el, local + textBlock);
  }

  return map;
}

function manualRefFromElement(el, key, preservedRefs, upstreamRefs) {
  const fromTag = el.match(/data-manual-ref="(\d+)"/);
  if (fromTag) {
    return Number(fromTag[1]);
  }
  if (preservedRefs[key] != null) {
    return preservedRefs[key];
  }
  return upstreamRefs[key] ?? null;
}

/** Remove leader lines, (n) labels, frame — keep callout dot positions + manual refs */
function stripManualAnnotations(svg, preservedRefs, upstreamRefs) {
  const calloutDots = [];
  const seen = new Set();

  function pushCircle(el) {
    const cxM = el.match(/\bcx="([\d.]+)"/);
    const cyM = el.match(/\bcy="([\d.]+)"/);
    const rM = el.match(/\br="([\d.]+)"/);
    if (!cxM || !cyM || !rM) {
      return;
    }
    const key = `${cxM[1]},${cyM[1]}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    const manualRef = manualRefFromElement(el, key, preservedRefs, upstreamRefs);
    calloutDots.push(calloutCircleEl(cxM[1], cyM[1], rM[1], manualRef));
  }

  function pushEllipse(el) {
    const cxM = el.match(/\bcx="([\d.]+)"/);
    const cyM = el.match(/\bcy="([\d.]+)"/);
    const rxM = el.match(/\brx="([\d.]+)"/);
    const ryM = el.match(/\bry="([\d.]+)"/);
    if (!cxM || !cyM || !rxM || !ryM) {
      return;
    }
    const key = `${cxM[1]},${cyM[1]}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    const transformM = el.match(/\btransform="([^"]+)"/);
    const manualRef = manualRefFromElement(el, key, preservedRefs, upstreamRefs);
    calloutDots.push(
      calloutEllipseEl(
        cxM[1],
        cyM[1],
        rxM[1],
        ryM[1],
        transformM?.[1] ?? null,
        manualRef,
      ),
    );
  }

  // Canon part-name dots: cls-15/21 in body, cls-30 in leader-line groups (fig. 3).
  for (const m of svg.matchAll(/<circle class="cls-(?:21|15|30)"[^/]*\/>/g)) {
    pushCircle(m[0]);
  }
  for (const m of svg.matchAll(/<ellipse class="cls-21"[^/]+\/>/g)) {
    pushEllipse(m[0]);
  }

  const textIdx = svg.indexOf('<g id="Text">');
  const frameIdx = svg.indexOf('<g id="Frame">');
  let stripped = svg;
  if (textIdx !== -1 && frameIdx !== -1 && frameIdx > textIdx) {
    const frameClose = stripped.indexOf('</g>', frameIdx);
    if (frameClose !== -1) {
      stripped = stripped.slice(0, textIdx) + stripped.slice(frameClose + '</g>'.length);
    } else {
      stripped = stripped.slice(0, textIdx);
    }
  } else if (textIdx !== -1) {
    const textClose = stripped.lastIndexOf('</g>', stripped.indexOf('</svg>'));
    stripped =
      stripped.slice(0, textIdx) +
      (textClose > textIdx ? stripped.slice(textClose + '</g>'.length) : '');
  } else if (frameIdx !== -1) {
    const frameClose = stripped.indexOf('</g>', frameIdx);
    stripped =
      stripped.slice(0, frameIdx) +
      (frameClose === -1 ? '' : stripped.slice(frameClose + '</g>'.length));
  }

  if (calloutDots.length > 0) {
    const layer = `\n  <g id="LearnCallouts">\n    ${calloutDots.join('\n    ')}\n  </g>\n`;
    stripped = stripped.replace('</svg>', `${layer}</svg>`);
  }

  return stripped;
}

fs.mkdirSync(outDir, { recursive: true });

for (const { upstream, themed, preserveMappedRefs } of DIAGRAMS) {
  const input = path.join(srcDir, upstream);
  const outPath = path.join(outDir, themed);
  const preservedRefs =
    preserveMappedRefs && fs.existsSync(outPath)
      ? refsByCoordFromCalloutLayer(fs.readFileSync(outPath, 'utf8'))
      : {};
  let svg = fs.readFileSync(input, 'utf8');
  const upstreamRefs = refsFromUpstreamManual(svg);
  for (const [pattern, replacement] of REPLACEMENTS) {
    svg = svg.replace(pattern, replacement);
  }
  svg = stripManualAnnotations(svg, preservedRefs, upstreamRefs);
  svg = svg.replace(/<svg\b([^>]*)>/, (_match, attrs) => {
    const cleaned = attrs
      .replace(/\s+width="[^"]*"/g, '')
      .replace(/\s+height="[^"]*"/g, '');
    return `<svg${cleaned}>`;
  });
  svg = svg.replace(/<style>\s*/, `<style>\n${STYLE_PREFIX}`);
  fs.writeFileSync(outPath, svg);
  console.log('wrote', themed);
}