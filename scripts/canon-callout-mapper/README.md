# Canon callout mapper

Local UI to wire **`data-manual-ref`** on each callout dot in the three camera anatomy SVGs.

```bash
pnpm canon:callouts                    # default: Top & front (¾)
pnpm canon:callouts:side-back          # Side & back
pnpm canon:callouts -- --diagram side-bottom
```

Open **http://127.0.0.1:3927** (uses the diagram from the script you started with). Switch views via the tabs or `?diagram=side-back`.

1. Click a **dot** on the diagram.
2. Click the matching **part number** on the right.
3. **Save SVG** writes `LearnCallouts` in `src/content/learn/interactives/canon-manual/`.

After changing upstream art in `public/learn/canon-manual/`, run `pnpm canon:theme` first to refresh dot positions (existing refs are preserved when coordinates match).

Part labels come from `cameraAnatomyData.ts` (single source for the learn UI and this tool).