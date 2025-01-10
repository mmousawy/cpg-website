import { Suspense } from "react";

import About from "@/components/About";
import Events, { EventsLoading } from "@/components/Events";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Modal from '@/components/Modal';

export default async function Home() {
  return (
    <>
      <div className="flex min-h-full flex-col">
        <Header />
        <main className="flex grow flex-col">
          <Suspense fallback={<EventsLoading />}>
            <Events />
          </Suspense>
          <About />
          </main>
        <Footer />
      </div>
      <Modal />
    </>
  );
}
