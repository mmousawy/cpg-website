import About from "./components/about";
import Events from "./components/events";
import Header from "./components/header";

export default function Home() {
  return (
    <div className="font-[family-name:var(--font-geist-sans)]">
      <main>
        <Header />
        <Events />
        <About />
      </main>
    </div>
  );
}
