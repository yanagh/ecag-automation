import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/supabase/server";

export default async function Home() {
  const session = await getServerSession();
  if (session) {
    redirect("/sources");
  }
  redirect("/login");
}
