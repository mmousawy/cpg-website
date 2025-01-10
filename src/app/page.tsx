import About from "@/components/About";
import Events from "@/components/Events";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Modal from '@/components/Modal';

export default async function Home() {
  return (
    <>
      <div className="flex min-h-full flex-col">
        <Header />
        <main className="flex grow flex-col">
          <Events />
          <About />
        </main>
        <Footer />
      </div>
      <Modal />
    </>
  );
}
