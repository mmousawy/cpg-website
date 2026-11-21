'use client';

import clsx from 'clsx';
import { useId, useMemo, useState, type ReactNode } from 'react';

import Button from '@/components/shared/Button';

import CanonInteractiveDiagram from './CanonInteractiveDiagram';
import { CanonDiagram, type CanonDiagramId } from './canonDiagrams';
import {
  CAMERA_PARTS,
  CAMERA_VIEW_ART,
  CAMERA_VIEW_DIAGRAM_ID,
  CAMERA_VIEWS,
  type CameraPart,
  type CameraView,
  type CameraViewArtFrame,
} from './cameraAnatomyData';

function partsForView(view: CameraView): CameraPart[] {
  return CAMERA_PARTS.filter((part) => part.view === view);
}

const DIAGRAM_CLASS = 'learn-canon-diagram';

function DiagramStage({
  aspect,
  children,
}: {
  aspect: number;
  children: ReactNode;
}) {
  return (
    <div
      className="learn-camera-diagram-stage relative min-h-0 w-full min-w-0 flex-1"
      style={{ aspectRatio: aspect }}
    >
      <div
        className="absolute inset-0"
      >
        {children}
      </div>
    </div>
  );
}

function IllustrationFrame({
  frame,
  interactive,
}: {
  frame: CameraViewArtFrame;
  interactive?: {
    diagramId: CanonDiagramId;
    parts: CameraPart[];
    selectedId: string | null;
    onSelectPart: (id: string) => void;
  };
}) {
  const slice = frame.visibleHeightFrac != null && frame.visibleHeightFrac < 1;

  if (!slice && interactive && frame.diagram === interactive.diagramId) {
    return (
      <CanonInteractiveDiagram
        diagramId={interactive.diagramId}
        parts={interactive.parts}
        selectedId={interactive.selectedId}
        onSelectPart={interactive.onSelectPart}
      />
    );
  }

  if (!slice) {
    return (
      <CanonDiagram
        id={frame.diagram}
        className={clsx(DIAGRAM_CLASS, 'h-full w-full')}
      />
    );
  }

  const y = frame.visibleYFrac ?? 0;
  const h = frame.visibleHeightFrac ?? 1;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
    >
      <div
        className="absolute inset-0 overflow-hidden"
      >
        <div
          className="absolute left-0 w-full"
          style={{
            height: `${(100 / h).toFixed(4)}%`,
            top: `${((-y / h) * 100).toFixed(4)}%`,
          }}
        >
          <CanonDiagram
            id={frame.diagram}
            className={clsx(DIAGRAM_CLASS, 'h-full w-full max-w-none')}
          />
        </div>
      </div>
    </div>
  );
}

function CameraIllustration({
  view,
  labelledBy,
  selectedId,
  onSelectPart,
  parts,
}: {
  view: CameraView;
  labelledBy: string;
  parts: CameraPart[];
  selectedId: string | null;
  onSelectPart: (id: string) => void;
}) {
  const art = CAMERA_VIEW_ART[view];
  const viewLabel = CAMERA_VIEWS.find((tab) => tab.id === view)?.label ?? view;

  return (
    <figure
      className="flex h-full min-h-0 w-full min-w-0 flex-col"
    >
      <span
        id={labelledBy}
        className="sr-only"
      >
        Camera part diagrams, {viewLabel}
      </span>
      <DiagramStage
        aspect={art.frames[0]?.aspect ?? 1}
      >
        {art.frames.map((frame) => (
          <IllustrationFrame
            key={frame.diagram}
            frame={frame}
            interactive={{
              diagramId: CAMERA_VIEW_DIAGRAM_ID[view],
              parts,
              selectedId,
              onSelectPart,
            }}
          />
        ))}
      </DiagramStage>
    </figure>
  );
}

function PartList({
  parts,
  selectedId,
  onSelect,
}: {
  parts: CameraPart[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <ul
      className="flex flex-col gap-0.5"
    >
      {parts.map((part) => {
        const active = part.id === selectedId;
        return (
          <li
            key={part.id}
          >
            <button
              type="button"
              onClick={() => onSelect(part.id)}
              className={clsx(
                'grid w-full grid-cols-[3rem_minmax(0,1fr)] items-start gap-x-2.5 rounded-lg py-1.5 pr-2 pl-1 text-left text-sm leading-snug transition-colors',
                active
                  ? 'bg-primary/15 text-primary'
                  : 'text-foreground hover:bg-background-medium',
              )}
              aria-pressed={active}
            >
              <span
                className={clsx(
                  'pt-px text-right font-(family-name:--font-geist-mono) text-xs tabular-nums mt-0.25',
                  active ? 'text-primary/70' : 'text-foreground/55',
                )}
              >
                ({part.manualRef})
              </span>
              <span
                className="min-w-0"
              >
                {part.label}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export default function CameraAnatomyInteractive() {
  const diagramTitleId = useId();
  const [view, setView] = useState<CameraView>('threeQuarter');
  const parts = useMemo(() => partsForView(view), [view]);
  const [selectedId, setSelectedId] = useState<string | null>(parts[0]?.id ?? null);

  const selectView = (next: CameraView) => {
    setView(next);
    const first = partsForView(next)[0];
    setSelectedId(first?.id ?? null);
  };

  const selected = parts.find((p) => p.id === selectedId) ?? parts[0] ?? null;

  return (
    <div
      className="flex w-full min-w-0 flex-1 flex-col gap-6 lg:flex-row lg:items-stretch lg:gap-8"
    >
      <div
        className="flex min-h-0 min-w-0 flex-1 flex-col gap-4"
      >
        <div
          className="flex flex-wrap gap-2"
          role="tablist"
          aria-label="Camera view"
        >
          {CAMERA_VIEWS.map((tab) => (
            <Button
              key={tab.id}
              type="button"
              variant={view === tab.id ? 'primary' : 'secondary'}
              size="sm"
              role="tab"
              aria-selected={view === tab.id}
              onClick={() => selectView(tab.id)}
            >
              {tab.label}
            </Button>
          ))}
        </div>
        <div
          className="learn-camera-diagram-panel flex min-h-0 min-w-0 flex-1 flex-col rounded-xl border border-border-color p-1.5 sm:p-2"
          role="tabpanel"
          data-prevent-pull-refresh
        >
          <div
            className="flex min-h-0 flex-1 flex-col"
          >
            <CameraIllustration
              view={view}
              labelledBy={diagramTitleId}
              parts={parts}
              selectedId={selectedId}
              onSelectPart={setSelectedId}
            />
          </div>
        </div>
        {selected ? (
          <div
            className="rounded-lg border border-border-color bg-background-light px-4 py-3"
            aria-live="polite"
          >
            <p
              className="grid grid-cols-[2rem_minmax(0,1fr)] items-start gap-x-2 font-medium leading-snug text-foreground"
            >
              <span
                className="pt-px font-(family-name:--font-geist-mono) text-sm tabular-nums text-foreground/55"
              >
                ({selected.manualRef})
              </span>
              <span
                className="min-w-0"
              >{selected.label}</span>
            </p>
            <p
              className="mt-1 text-sm leading-relaxed text-foreground/85"
            >
              {selected.description}
            </p>
          </div>
        ) : null}
      </div>

      <div
        className="min-w-0 lg:w-80 lg:max-w-[min(100%,22rem)] lg:shrink-0"
      >
        <p
          className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground"
        >
          Parts in this view
        </p>
        <div
          className="flex max-h-64 flex-col overflow-y-auto lg:max-h-[28rem]"
        >
          <PartList
            parts={parts}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>
      </div>
    </div>
  );
}
