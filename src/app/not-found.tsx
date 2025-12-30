export default function Custom404() {
  return (
    <section
      className="flex grow justify-center bg-background px-6 pb-10 pt-8 text-foreground sm:p-12 sm:pb-14"
    >
      <div className="flex w-full max-w-screen-md grow items-center justify-center">
        <h2 className="flex gap-3 text-2xl leading-tight opacity-70 max-sm:text-xl"><span className="border-r border-r-foreground pr-3">404</span> This page could not be found.</h2>
      </div>
    </section>
  );
}
