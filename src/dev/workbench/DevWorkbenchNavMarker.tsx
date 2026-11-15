'use client';

/** Fixed-width slot for active-route dot in workbench sidebars. */
export default function DevWorkbenchNavMarker({ active }: { active: boolean }) {
  return (
    <span
      className="flex w-2 shrink-0 justify-center"
      aria-hidden
    >
      {active ? (
        <span
          className="size-1.5 rounded-full bg-primary transition-transform duration-200 ease-out"
        />
      ) : null}
    </span>
  );
}
