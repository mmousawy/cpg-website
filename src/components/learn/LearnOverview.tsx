import LearnOutlineSections from './LearnOutlineSections';

export default function LearnOverview() {
  return (
    <div
      className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto px-4 py-8 sm:px-8 sm:py-10 lg:px-12"
    >
      <header
        className="mb-8 max-w-3xl"
      >
        <h1
          className="font-heading text-3xl font-semibold text-foreground sm:text-4xl"
        >
          Learn
        </h1>
        <p
          className="mt-3 text-base leading-relaxed text-foreground/80 sm:text-lg"
        >
          Photography topics you can step through on a screen during a meetup, or browse on your own.
          Pick a topic from the list — live lessons open in the presenter beside this overview.
        </p>
      </header>
      <div
        className="max-w-3xl"
      >
        <LearnOutlineSections
          variant="overview"
        />
      </div>
    </div>
  );
}
