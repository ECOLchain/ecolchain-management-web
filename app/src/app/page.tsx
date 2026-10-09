import { redirect } from "next/navigation";
import { DEFAULT_LOCALE } from "@/i18n";

/** `/` → locale default (pt-br). */
export default function Home() {
  redirect(`/${DEFAULT_LOCALE}`);
}
