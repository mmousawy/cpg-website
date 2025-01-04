import { notFound } from "next/navigation";

import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";

import { createClient } from '@/utils/supabase/server';
import { decrypt } from "@/utils/encrypt";

import ConfirmBlock from "./ConfirmBlock";

import ErrorSVG from 'public/icons/error.svg';

export default async function Confirm({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const supabase = await createClient();
  const params = await searchParams;
  let errorMessage;

  const event_id = params.event_id as string;
  const email = params.email as string;

  let decryptedEmail;

  try {
    decryptedEmail = decrypt(email);
  } catch (error: unknown) {
    errorMessage = (error as object).toString();
    console.dir(error);
  }

  const { data: event } = await supabase.from("events").select().eq("id", event_id).single();
  const { data: rsvp } = await supabase.from("events_rsvps").select().eq("event_id", event_id).eq("email", decryptedEmail!).single();

  if (!event || !rsvp) {
    notFound();
  }

  return (
    <>
      <div className="flex min-h-full flex-col">
        <Header />
        <main className="flex grow flex-col">
          <section
            className="flex justify-center bg-background px-6 pb-10 pt-8 text-foreground sm:p-12 sm:pb-14"
          >
            <div className="w-full max-w-screen-md">
              <h2 className="mb-4 text-lg font-bold leading-tight opacity-70">Confirm your sign up</h2>
              <div className="rounded-lg border-[0.0625rem] border-border-color bg-background-light p-6 shadow-lg shadow-[#00000007] max-sm:p-4">
                {!email && (
                  <div className='flex gap-2 rounded-md bg-[#c5012c20] p-2 text-[15px] font-semibold leading-6 text-error-red'>
                    <ErrorSVG className="shrink-0 fill-error-red" />
                    <p>
                      Something went wrong with retrieving your email address.
                      <br/><br />
                      {errorMessage}
                    </p>
                  </div>
                )}
                { email && (
                  <ConfirmBlock event={event} email={email} rsvp={rsvp} />
                )}
              </div>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </>
  );
}
