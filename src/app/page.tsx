import About from "@/app/components/About";
import Events from "@/app/components/Events";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import Modal from '@/app/components/Modal';

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
