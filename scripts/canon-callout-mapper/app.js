const DIAGRAM_SEL = '#LearnCallouts .learn-canon-callout-dot';
const EDIT_RADIUS = 7;
const SAVED_RADIUS = 1.8;

/** @type {SVGElement | null} */
let svgRoot = null;
/** @type {SVGElement | null} */
let selectedDot = null;
/** @type {string} */
let activeDiagramId = 'top-front-three-quarter';
let dirty = false;

/** Dots changed this session (key = cx,cy). Yellow until save. */
const editedDotKeys = new Set();

const statusEl = document.getElementById('status');
const diagramEl = document.getElementById('diagram');
const partsEl = document.getElementById('parts');
const btnClear = document.getElementById('btn-clear');
const btnSave = document.getElementById('btn-save');
const toastEl = document.getElementById('toast');

/** @type {{ manualRef: number; label: string; note?: string }[]} */
let partsCatalog = [];

/**
 * @param {SVGElement} dot
 */
function dotKey(dot) {
  return `${dot.getAttribute('cx')},${dot.getAttribute('cy')}`;
}

/**
 * @param {SVGElement} node
 */
function setMapperDotRadius(node, displayR) {
  if (node.tagName === 'circle') {
    node.setAttribute('r', String(displayR));
    return;
  }
  if (node.tagName === 'ellipse') {
    if (!node.dataset.baseRx) {
      node.dataset.baseRx = node.getAttribute('rx') ?? '1.8';
      node.dataset.baseRy = node.getAttribute('ry') ?? '1.8';
    }
    const baseRx = Number(node.dataset.baseRx);
    const baseRy = Number(node.dataset.baseRy);
    const baseR = Math.max(baseRx, baseRy, 0.01);
    const scale = displayR / baseR;
    node.setAttribute('rx', String(baseRx * scale));
    node.setAttribute('ry', String(baseRy * scale));
  }
}

function labelForRef(ref) {
  if (ref == null || ref === '') {
    return null;
  }
  const n = Number(ref);
  if (!Number.isFinite(n)) {
    return null;
  }
  return partsCatalog.find((p) => p.manualRef === n)?.label ?? null;
}

function markDotEdited(dot) {
  editedDotKeys.add(dotKey(dot));
}

function toast(message, isError = false) {
  toastEl.textContent = message;
  toastEl.classList.toggle('error', isError);
  toastEl.classList.add('show');
  window.clearTimeout(toast._t);
  toast._t = window.setTimeout(() => toastEl.classList.remove('show'), 2400);
}

function setDirty(value) {
  dirty = value;
  btnSave.disabled = !dirty;
}

function countByRef() {
  /** @type {Map<number, SVGCircleElement[]>} */
  const map = new Map();
  if (!svgRoot) {
    return map;
  }
  for (const node of svgRoot.querySelectorAll(DIAGRAM_SEL)) {
    const raw = node.getAttribute('data-manual-ref');
    if (raw == null || raw === '') {
      continue;
    }
    const ref = Number(raw);
    if (!Number.isFinite(ref)) {
      continue;
    }
    const list = map.get(ref) ?? [];
    list.push(node);
    map.set(ref, list);
  }
  return map;
}

function refreshDotClasses() {
  if (!svgRoot) {
    return;
  }
  const byRef = countByRef();
  const dupRefs = new Set(
    [...byRef.entries()].filter(([, dots]) => dots.length > 1).map(([r]) => r),
  );

  for (const node of svgRoot.querySelectorAll(DIAGRAM_SEL)) {
    node.classList.toggle('mapper-selected', node === selectedDot);
    const raw = node.getAttribute('data-manual-ref');
    const hasRef = raw != null && raw !== '';
    const ref = hasRef ? Number(raw) : NaN;
    const isEdited = editedDotKeys.has(dotKey(node));
    node.classList.toggle('mapper-edited', isEdited);
    node.classList.toggle('mapper-has-ref', hasRef && !isEdited);
    node.classList.toggle('mapper-dup-ref', hasRef && dupRefs.has(ref));
    setMapperDotRadius(node, EDIT_RADIUS);
  }
  renderPartList(byRef);
  updateStatus();
}

function updateStatus() {
  if (!selectedDot) {
    const editedHint =
      editedDotKeys.size > 0
        ? ` <span style="color:#f4c430">(${editedDotKeys.size} yellow dot(s) = edited this session)</span>`
        : '';
    statusEl.innerHTML = `Click a <strong>dot</strong> on the diagram, then a <strong>part number</strong> on the right.${editedHint}`;
    btnClear.disabled = true;
    return;
  }
  const cx = selectedDot.getAttribute('cx');
  const cy = selectedDot.getAttribute('cy');
  const ref = selectedDot.getAttribute('data-manual-ref');
  let refText = '(unassigned)';
  if (ref != null && ref !== '') {
    const name = labelForRef(ref);
    refText = name
      ? `(currently <strong>${ref}</strong> — ${name})`
      : `(currently ref <strong>${ref}</strong>)`;
  }
  const editedHint =
    editedDotKeys.size > 0
      ? ` · <span style="color:#f4c430">${editedDotKeys.size} unsaved edit(s)</span>`
      : '';
  statusEl.innerHTML = `Selected dot at <strong>${cx}, ${cy}</strong> ${refText} — pick a part on the right.${editedHint}`;
  btnClear.disabled = false;
}

function renderPartList(byRef) {
  partsEl.replaceChildren();
  for (const part of partsCatalog) {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    const dots = byRef.get(part.manualRef) ?? [];
    const count = dots.length;
    const expected = part.note ? 0 : 1;
    const ok = part.note ? count === 0 : count === 1;
    const missing = !part.note && count === 0;
    btn.classList.toggle('mapper-ok', ok && !part.note);
    btn.classList.toggle('mapper-missing', missing);
    btn.addEventListener('click', () => onPartClick(part.manualRef));

    const refSpan = document.createElement('span');
    refSpan.className = 'ref';
    refSpan.textContent = String(part.manualRef);

    const labelSpan = document.createElement('span');
    labelSpan.className = 'label';
    labelSpan.textContent = part.label;

    const badge = document.createElement('span');
    badge.className = 'badge';
    if (part.note) {
      badge.textContent = part.note;
    } else if (count === 0) {
      badge.textContent = 'no dot';
    } else if (count === 1) {
      badge.textContent = '1 dot';
    } else {
      badge.textContent = `${count} dots`;
    }

    btn.append(refSpan, labelSpan, badge);
    if (part.note) {
      const note = document.createElement('span');
      note.className = 'note';
      note.textContent = part.note;
      btn.appendChild(note);
    }
    li.appendChild(btn);
    partsEl.appendChild(li);
  }
}

/**
 * @param {SVGElement} dot
 */
function selectDot(dot) {
  selectedDot = dot;
  refreshDotClasses();
}

function onPartClick(manualRef) {
  if (!selectedDot) {
    toast('Select a dot on the diagram first.', true);
    return;
  }
  markDotEdited(selectedDot);
  selectedDot.setAttribute('data-manual-ref', String(manualRef));
  setDirty(true);
  const name = labelForRef(manualRef);
  toast(name ? `Dot → ${manualRef} ${name}` : `Dot → ref ${manualRef}`);
  selectedDot = null;
  refreshDotClasses();
}

function onDiagramClick(event) {
  const target = event.target;
  if (!(target instanceof Element)) {
    return;
  }
  const dot = target.closest(DIAGRAM_SEL);
  if (!dot || !(dot instanceof SVGElement)) {
    return;
  }
  event.stopPropagation();
  selectDot(dot);
}

function clearSelectedRef() {
  if (!selectedDot) {
    return;
  }
  markDotEdited(selectedDot);
  selectedDot.removeAttribute('data-manual-ref');
  setDirty(true);
  toast('Removed ref from dot');
  refreshDotClasses();
}

function serializeLearnCallouts() {
  if (!svgRoot) {
    return '';
  }
  const nodes = [...svgRoot.querySelectorAll(DIAGRAM_SEL)];
  const lines = nodes.map((node) => {
    const ref = node.getAttribute('data-manual-ref');
    const refAttr = ref ? ` data-manual-ref="${ref}"` : '';
    const cx = node.getAttribute('cx');
    const cy = node.getAttribute('cy');
    if (node.tagName === 'ellipse') {
      const rx = node.dataset.baseRx ?? node.getAttribute('rx') ?? '1.8';
      const ry = node.dataset.baseRy ?? node.getAttribute('ry') ?? '1.8';
      const transform = node.getAttribute('transform');
      const xform = transform ? ` transform="${transform}"` : '';
      return `    <ellipse class="learn-canon-callout-dot"${refAttr} cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"${xform}/>`;
    }
    return `    <circle class="learn-canon-callout-dot"${refAttr} cx="${cx}" cy="${cy}" r="${SAVED_RADIUS}" />`;
  });
  return `\n  <g id="LearnCallouts">\n${lines.join('\n')}\n  </g>\n`;
}

async function saveSvg() {
  const layer = serializeLearnCallouts();
  const res = await fetch(`/api/svg?diagram=${encodeURIComponent(activeDiagramId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ learnCallouts: layer }),
  });
  if (!res.ok) {
    const err = await res.text();
    toast(err || 'Save failed', true);
    return;
  }
  editedDotKeys.clear();
  setDirty(false);
  refreshDotClasses();
  toast('Saved to SVG file');
}

function fitSvgToPanel(svg) {
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
}

function wireSvg(svg) {
  svgRoot = svg;
  fitSvgToPanel(svg);
  diagramEl.replaceChildren(svg);
  svg.addEventListener('click', onDiagramClick);
  refreshDotClasses();
}

function diagramFromPageUrl() {
  return new URLSearchParams(location.search).get('diagram');
}

async function load() {
  const fromUrl = diagramFromPageUrl();
  const metaRes = await fetch(
    fromUrl ? `/api/meta?diagram=${encodeURIComponent(fromUrl)}` : '/api/meta',
  );
  if (!metaRes.ok) {
    diagramEl.textContent = 'Could not load diagram metadata.';
    return;
  }
  const meta = await metaRes.json();
  activeDiagramId = fromUrl ?? meta.diagramId;
  const q = `?diagram=${encodeURIComponent(activeDiagramId)}`;
  const [svgRes, partsRes] = await Promise.all([
    fetch(`/api/svg${q}`),
    fetch(`/api/parts${q}`),
  ]);
  {
    const tabs = document.getElementById('diagram-tabs');
    if (tabs && meta.diagrams) {
      tabs.replaceChildren(
        ...meta.diagrams.map((d) => {
          const a = document.createElement('a');
          a.href = `/?diagram=${encodeURIComponent(d.id)}`;
          a.textContent = d.label;
          if (d.id === activeDiagramId) {
            a.classList.add('active');
          }
          return a;
        }),
      );
    }
    const title = document.querySelector('header h1');
    if (title) {
      title.textContent = `Callout mapper — ${meta.viewLabel}`;
    }
  }
  if (!svgRes.ok) {
    diagramEl.textContent = 'Could not load SVG.';
    return;
  }
  partsCatalog = await partsRes.json();
  const svgText = await svgRes.text();
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  const svg = doc.documentElement;
  if (svg.querySelector('parsererror')) {
    diagramEl.textContent = 'SVG parse error.';
    return;
  }
  wireSvg(/** @type {SVGElement} */ (svg));
}

btnClear.addEventListener('click', clearSelectedRef);
btnSave.addEventListener('click', () => void saveSvg());
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    selectedDot = null;
    refreshDotClasses();
  }
});

void load();