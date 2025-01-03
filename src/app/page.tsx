import About from "./components/about";
import Events from "./components/events";
import Header from "./components/header";

export default function Home() {
  return (
    <div className="bg-background font-[family-name:var(--font-inter)]">
      <main>
        <Header />
        <Events />
        <About />
      </main>
    </div>
  );
}
