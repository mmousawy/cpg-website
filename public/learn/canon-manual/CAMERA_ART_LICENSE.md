# Canon EOS R7 part-name illustrations

These SVG files were taken from Canon’s online camera manual:

- [Part names (UG-00 Before 0090)](https://cam.start.canon/en/C005/manual/html/UG-00_Before_0090.html)

| Upstream file | Manual figure | Themed learn file |
| --- | --- | --- |
| `UG-00_i0170.svg` | Top & front, ¾ view (items 1–26) | `top-front-three-quarter.svg` |
| `UG-00_i0180.svg` | Side & back (items 1–20) | `side-back.svg` |
| `UG-00_i0190.svg` | Other side, bottom & back (items 1–12) | `side-bottom.svg` |
| `UG-00_i0200.png` | Mode dial detail (not used in the interactive) |

**Copyright:** Illustrations are © Canon Inc. They are stored in this repository for educational use in the learn module only. If Canon requests removal, delete these files and hotlink or replace them.

Do not use Canon trademarks or artwork in marketing without permission.

Themed copies for the learn UI (tab filenames, CSS variables for light/dark) are generated into `src/content/learn/interactives/canon-manual/` via `pnpm canon:theme` (body art plus callout dot positions; leader lines and numeric labels removed). Interactive part numbers are **`data-manual-ref` on each callout dot** in the themed SVG; re-running the theme script keeps existing refs when coordinates are unchanged. Map dots to part numbers with `pnpm canon:callouts` (see `scripts/canon-callout-mapper/README.md`).