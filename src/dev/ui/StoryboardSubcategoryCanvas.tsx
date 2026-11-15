'use client';

import { useRef } from 'react';

import type { UiCatalogEntry } from './componentCatalog';
import Frame from './Frame';
import { getStoryFrames } from './storyFrames';
import type { StoryboardSubcategory } from './subcategories';
import { useStoryboardCanvasHashScroll } from './useStoryboardCanvasHashScroll';
import { useStoryboardHash } from './useStoryboardHash';

type StoryboardSubcategoryCanvasProps = {
  groupId: string;
  groupLabel: string;
  subcategory: StoryboardSubcategory;
  entries: UiCatalogEntry[];
};

export default function StoryboardSubcategoryCanvas({
  groupId,
  groupLabel,
  subcategory,
  entries,
}: StoryboardSubcategoryCanvasProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const hash = useStoryboardHash();

  useStoryboardCanvasHashScroll(scrollRef, hash, subcategory.id);

  return (
    <div
      className="flex h-full min-h-0 flex-col overflow-hidden"
    >
      <header
        className="shrink-0 border-b border-border-color bg-background-light/80 px-6 py-4 backdrop-blur-sm"
      >
        <p
          className="text-xs font-medium uppercase tracking-wide text-foreground/50"
        >
          {groupLabel}
          {' '}
          /
          {' '}
          {subcategory.label}
        </p>
        <h1
          className="font-heading text-2xl font-bold"
        >
          {subcategory.label}
        </h1>
        <p
          className="mt-1 text-sm text-foreground/60"
        >
          {entries.length}
          {' '}
          related components
        </p>
      </header>
      <div
        ref={scrollRef}
        data-storyboard-canvas
        className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain [overflow-anchor:none]"
      >
        <div
          className="space-y-12 p-6"
        >
          {entries.map((entry) => {
            const frames = getStoryFrames(groupId, entry.name);
            if (frames.length === 0) return null;
            return (
              <section
                key={entry.path}
                id={entry.name}
                className="scroll-mt-3"
              >
                <div
                  className="mb-4 border-b border-border-color pb-2"
                >
                  <h2
                    className="font-mono text-lg font-semibold"
                  >
                    {entry.name}
                  </h2>
                  <code
                    className="text-xs text-foreground/50"
                  >
                    {entry.path}
                  </code>
                </div>
                <div
                  className="space-y-6"
                >
                  {frames.map((frame) => (
                    <Frame
                      key={frame.title}
                      storyTitle={frame.title}
                    >
                      {frame.render()}
                    </Frame>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
