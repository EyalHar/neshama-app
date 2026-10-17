import { redirect } from "next/navigation";

// The letter search moved into a tab of /advanced; keep old links working
export default function LettersPage() {
  redirect("/advanced?tab=letters");
}
