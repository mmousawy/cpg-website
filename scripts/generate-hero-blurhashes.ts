import { generateBlurhashFromBuffer } from '../src/utils/generateBlurhashServer';

async function main() {
  for (const n of [1, 2, 3, 4, 5, 6, 7]) {
    const fileName = `home-hero${n}.jpg`;
    const url = `https://db.creativephotography.group/storage/v1/render/image/public/cpg-public/hero/${fileName}?width=64&quality=30`;
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`Failed to fetch ${fileName}: ${res.status}`);
      continue;
    }
    const hash = await generateBlurhashFromBuffer(await res.arrayBuffer());
    console.log(`${fileName}: ${hash}`);
  }
}

main().catch(console.error);
