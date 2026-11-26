import { redirect } from "next/navigation";

// The event search moved into the last tab of /advanced; keep old links working
export default function EventsPage() {
  redirect("/advanced?tab=events");
}
