export default function Loading() {
  return (
    <div
      className="flex min-h-0 flex-1 flex-col items-center justify-center p-8"
    >
      <div
        className="text-center"
      >
        <div
          className="mx-auto mb-4 h-8 w-48 animate-pulse rounded bg-background-light"
        />
        <div
          className="mx-auto h-4 w-32 animate-pulse rounded bg-background-light"
        />
      </div>
    </div>
  );
}
