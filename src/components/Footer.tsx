import ThemeSwitch from "./ThemeSwitch";

export default function Footer() {
  return (
    <footer className="flex justify-center border-t-[0.0625rem] border-border-color bg-background-light p-4 py-6 text-[15px] text-foreground">
      <div className="flex w-full max-w-screen-md justify-between gap-4 max-sm:flex-col">
        <p className="text-center opacity-70">&copy; {new Date().getFullYear()} Creative Photography Group</p>
        <ThemeSwitch />
      </div>
    </footer>
  );
};
