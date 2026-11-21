/**
 * Local UI: click a callout dot, then a part number — writes LearnCallouts to the themed SVG.
 *
 *   pnpm canon:callouts
 *   pnpm canon:callouts -- --diagram side-back
 *   open http://127.0.0.1:3927/?diagram=side-back
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CAMERA_PARTS,
  CAMERA_VIEW_DIAGRAM_ID,
  CAMERA_VIEWS,
  THREE_QUARTER_MANUAL_REFS_WITHOUT_DOT,
  type CameraView,
} from '../src/content/learn/interactives/cameraAnatomyData';
import type { CanonDiagramId } from '../src/content/learn/interactives/canonDiagrams';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const toolDir = path.join(root, 'scripts/canon-callout-mapper');

const port = Number(process.env.PORT) || 3927;

const DIAGRAM_TO_VIEW = Object.fromEntries(
  Object.entries(CAMERA_VIEW_DIAGRAM_ID).map(([view, id]) => [id, view]),
) as Record<CanonDiagramId, CameraView>;

const NO_DOT_NOTE = 'No dot on Canon figure';

function diagramFromArgv(): CanonDiagramId {
  const idx = process.argv.indexOf('--diagram');
  if (idx !== -1 && process.argv[idx + 1]) {
    const id = process.argv[idx + 1] as CanonDiagramId;
    if (DIAGRAM_TO_VIEW[id]) {
      return id;
    }
  }
  if (process.argv.includes('--file')) {
    const file = path.resolve(process.argv[process.argv.indexOf('--file') + 1]);
    const base = path.basename(file, '.svg');
    if (DIAGRAM_TO_VIEW[base as CanonDiagramId]) {
      return base as CanonDiagramId;
    }
  }
  return 'top-front-three-quarter';
}

let defaultDiagramId = diagramFromArgv();

function svgPathForDiagram(id: CanonDiagramId) {
  return path.join(root, `src/content/learn/interactives/canon-manual/${id}.svg`);
}

function resolveDiagramId(
  raw: string | null,
): CanonDiagramId {
  if (raw && DIAGRAM_TO_VIEW[raw as CanonDiagramId]) {
    return raw as CanonDiagramId;
  }
  return defaultDiagramId;
}

function mapperPartsForDiagram(diagramId: CanonDiagramId) {
  const view = DIAGRAM_TO_VIEW[diagramId];
  const noDot =
    view === 'threeQuarter'
      ? new Set<number>(THREE_QUARTER_MANUAL_REFS_WITHOUT_DOT)
      : new Set<number>();
  return CAMERA_PARTS.filter((p) => p.view === view)
    .sort((a, b) => a.manualRef - b.manualRef)
    .map((p) => ({
      manualRef: p.manualRef,
      label: p.label,
      ...(noDot.has(p.manualRef) ? { note: NO_DOT_NOTE } : {}),
    }));
}

function viewLabel(diagramId: CanonDiagramId) {
  const view = DIAGRAM_TO_VIEW[diagramId];
  return CAMERA_VIEWS.find((t) => t.id === view)?.label ?? view;
}

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

function replaceLearnCallouts(svgText: string, layerBlock: string) {
  const open = '<g id="LearnCallouts">';
  const start = svgText.indexOf(open);
  if (start === -1) {
    const closeSvg = svgText.lastIndexOf('</svg>');
    if (closeSvg === -1) {
      throw new Error('Invalid SVG: missing </svg>');
    }
    return `${svgText.slice(0, closeSvg)}${layerBlock}${svgText.slice(closeSvg)}`;
  }
  const end = svgText.indexOf('</g>', start);
  if (end === -1) {
    throw new Error('Invalid SVG: unclosed LearnCallouts group');
  }
  return `${svgText.slice(0, start)}${layerBlock.trimStart()}${svgText.slice(end + '</g>'.length)}`;
}

function send(
  res: http.ServerResponse,
  status: number,
  body: string | Buffer,
  type = 'text/plain; charset=utf-8',
) {
  res.writeHead(status, { 'Content-Type': type });
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://127.0.0.1:${port}`);
  const diagramId = resolveDiagramId(url.searchParams.get('diagram'));
  const svgPath = svgPathForDiagram(diagramId);

  if (req.method === 'GET' && url.pathname === '/api/meta') {
    send(
      res,
      200,
      JSON.stringify({
        diagramId,
        viewLabel: viewLabel(diagramId),
        diagrams: Object.values(CAMERA_VIEW_DIAGRAM_ID).map((id) => ({
          id,
          label: viewLabel(id),
        })),
      }),
      MIME['.json'],
    );
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/svg') {
    try {
      const svg = fs.readFileSync(svgPath, 'utf8');
      send(res, 200, svg, 'image/svg+xml; charset=utf-8');
    } catch (e) {
      send(res, 500, String((e as Error).message ?? e));
    }
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/parts') {
    try {
      send(res, 200, JSON.stringify(mapperPartsForDiagram(diagramId)), MIME['.json']);
    } catch (e) {
      send(res, 500, String((e as Error).message ?? e));
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/svg') {
    let body = '';
    for await (const chunk of req) {
      body += chunk;
    }
    try {
      const { learnCallouts } = JSON.parse(body) as { learnCallouts?: string };
      if (typeof learnCallouts !== 'string' || !learnCallouts.includes('LearnCallouts')) {
        send(res, 400, 'Expected { learnCallouts: "<g id=LearnCallouts>…" }');
        return;
      }
      const prev = fs.readFileSync(svgPath, 'utf8');
      const next = replaceLearnCallouts(prev, learnCallouts);
      fs.writeFileSync(svgPath, next, 'utf8');
      send(res, 200, 'ok');
    } catch (e) {
      send(res, 500, String((e as Error).message ?? e));
    }
    return;
  }

  let filePath = url.pathname === '/' ? '/index.html' : url.pathname;
  const safe = path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, '');
  const abs = path.join(toolDir, safe);
  if (!abs.startsWith(toolDir)) {
    send(res, 403, 'Forbidden');
    return;
  }
  if (!fs.existsSync(abs) || fs.statSync(abs).isDirectory()) {
    send(res, 404, 'Not found');
    return;
  }
  const ext = path.extname(abs);
  send(res, 200, fs.readFileSync(abs), MIME[ext] ?? 'application/octet-stream');
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Canon callout mapper`);
  console.log(`  Default: ${defaultDiagramId} — ${viewLabel(defaultDiagramId)}`);
  console.log(`  Open: http://127.0.0.1:${port}/?diagram=${defaultDiagramId}`);
});