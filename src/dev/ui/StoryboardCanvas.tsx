'use client';

import type { UiCatalogEntry } from './componentCatalog';
import Frame from './Frame';
import { getStoryFrames } from './storyFrames';
import type { UiStoryFrame } from './types';

type StoryboardCanvasProps = {
  groupId: string;
  groupLabel: string;
  entry: UiCatalogEntry;
};

function EmptyCanvas({ entry }: { entry: UiCatalogEntry }) {
  return (
    <div
      className="mx-auto max-w-lg rounded-lg border border-dashed border-border-color bg-background-light px-6 py-10 text-center"
    >
      <p
        className="font-medium"
      >
        No stories for this component yet
      </p>
      <p
        className="mt-2 text-sm text-foreground/70"
      >
        Stories are small React examples with mock props — like Storybook stories. Add one in
        {' '}
        <code
          className="rounded bg-background px-1 py-0.5 text-xs"
        >
          src/dev/ui/sharedStories.tsx
        </code>
        {' '}
        (or
        {' '}
        <code
          className="rounded bg-background px-1 py-0.5 text-xs"
        >
          iconStories.tsx
        </code>
        ) to render variants here.
      </p>
      <p
        className="mt-4 font-mono text-xs text-foreground/50"
      >
        {entry.path}
      </p>
    </div>
  );
}

export default function StoryboardCanvas({
  groupId,
  groupLabel,
  entry,
}: StoryboardCanvasProps) {
  const frames: UiStoryFrame[] = getStoryFrames(groupId, entry.name);

  return (
    <div
      className="flex h-full min-h-0 flex-col overflow-y-auto overscroll-y-contain"
    >
      <header
        className="border-b border-border-color bg-background-light/80 px-6 py-4 backdrop-blur-sm"
      >
        <p
          className="text-xs font-medium uppercase tracking-wide text-foreground/50"
        >
          {groupLabel}
        </p>
        <h1
          className="font-heading text-2xl font-bold"
        >
          {entry.name}
        </h1>
        <code
          className="mt-1 block text-xs text-foreground/50"
        >
          {entry.path}
        </code>
      </header>
      <div
        className="space-y-8 p-6"
      >
        {frames.length === 0 ? (
          <EmptyCanvas
            entry={entry}
          />
        ) : (
          frames.map((frame) => (
            <Frame
              key={frame.title}
              storyTitle={frame.title}
            >
              {frame.render()}
            </Frame>
          ))
        )}
      </div>
    </div>
  );
}
