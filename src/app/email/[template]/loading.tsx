export default function Loading() {
  return (
    <div
      className="flex items-center justify-center h-screen"
    >
      <div
        className="text-center"
      >
        <div
          className="h-8 w-48 animate-pulse rounded bg-background-light mx-auto mb-4"
        />
        <div
          className="h-4 w-32 animate-pulse rounded bg-background-light mx-auto"
        />
      </div>
    </div>
  );
}
