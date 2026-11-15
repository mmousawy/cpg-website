import type { ReactNode } from 'react';

type FrameProps = {
  storyTitle: string;
  children: ReactNode;
  /** @deprecated passed for caller compatibility; shown on canvas header instead */
  componentName?: string;
  sourcePath?: string;
};

export default function Frame({
  storyTitle,
  children,
}: FrameProps) {
  return (
    <section
      className="overflow-hidden rounded-lg border border-border-color bg-background-light"
    >
      <header
        className="border-b border-border-color px-4 py-2"
      >
        <h3
          className="text-sm font-medium text-foreground"
        >
          {storyTitle}
        </h3>
      </header>
      <div
        className="bg-background p-6"
      >
        {children}
      </div>
    </section>
  );
}
