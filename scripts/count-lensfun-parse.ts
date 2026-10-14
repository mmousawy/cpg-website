import { parseLensfunXml } from '../src/lib/gear/parseLensfunXml';

const base = 'https://raw.githubusercontent.com/lensfun/lensfun/master/data/db/';
const list = (await fetch(
  'https://api.github.com/repos/lensfun/lensfun/contents/data/db?ref=master',
  { headers: { Accept: 'application/vnd.github+json' } },
).then((r) => r.json())) as Array<{ name: string }>;

let bodies = 0;
let lenses = 0;
const keys = new Set<string>();
let collisions = 0;

for (const f of list.filter((x) => x.name.endsWith('.xml'))) {
  const xml = await fetch(`${base}${f.name}`).then((r) => r.text());
  const entries = parseLensfunXml(xml, f.name);
  for (const e of entries) {
    const k = `${e.source}:${e.sourceKey}`;
    if (keys.has(k)) collisions += 1;
    keys.add(k);
    if (e.category === 'camera_body') bodies += 1;
    else if (e.category === 'lens') lenses += 1;
  }
}

const camKeys = new Set<string>();
const lensKeys = new Set<string>();
let camDup = 0;
let lensDup = 0;
for (const f of list.filter((x) => x.name.endsWith('.xml'))) {
  const xml = await fetch(`${base}${f.name}`).then((r) => r.text());
  for (const e of parseLensfunXml(xml, f.name)) {
    if (e.category === 'camera_body') {
      if (camKeys.has(e.sourceKey)) camDup += 1;
      camKeys.add(e.sourceKey);
    } else {
      if (lensKeys.has(e.sourceKey)) lensDup += 1;
      lensKeys.add(e.sourceKey);
    }
  }
}

console.log({
  bodies,
  lenses,
  total: bodies + lenses,
  uniqueKeys: keys.size,
  collisions,
  uniqueCameras: camKeys.size,
  uniqueLenses: lensKeys.size,
  camDup,
  lensDup,
  expectedRows: camKeys.size + lensKeys.size,
});
