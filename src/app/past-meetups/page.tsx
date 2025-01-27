import About from "@/components/About";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Modal from '@/components/Modal';
import EventsSection from "@/components/EventsSection";

export default async function Home() {
  return (
    <>
      <div className="flex min-h-full flex-col">
        <Header />
        <main className="flex grow flex-col">
          <EventsSection filter='past' />
          <About />
          </main>
        <Footer />
      </div>
      <Modal />
    </>
  );
}
