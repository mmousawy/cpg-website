'use client';

import dynamic from 'next/dynamic';
import type SelectableGridComponent from './SelectableGrid';

/**
 * Lazy-loaded wrapper for SelectableGrid
 * This ensures @dnd-kit dependencies (~40 KiB) are only loaded when SelectableGrid is actually rendered
 *
 * Usage: Replace `import SelectableGrid from './SelectableGrid'` with `import LazySelectableGrid from './LazySelectableGrid'`
 * and use `<LazySelectableGrid ... />` instead of `<SelectableGrid ... />`
 */
const LazySelectableGrid = dynamic(
  () => import('./SelectableGrid'),
  {
    ssr: false, // DnD-kit requires browser APIs
  },
) as typeof SelectableGridComponent;

export default LazySelectableGrid;
