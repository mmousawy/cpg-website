import EventsSection from "@/components/EventsSection";

export default async function Home() {
  return (
    <EventsSection filter='past' />
  );
}
