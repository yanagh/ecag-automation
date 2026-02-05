import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AppShell({
  children
}: {
  children: React.ReactNode;
}) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/sources" className="text-lg font-semibold">
              ECAG News Processor
            </Link>
            <nav className="flex items-center gap-3 text-sm text-slate-600">
              <Link href="/sources" className="hover:text-slate-900">
                Sources
              </Link>
              <Link href="/articles" className="hover:text-slate-900">
                Articles
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <span>{user?.email}</span>
            <form action="/api/logout" method="post">
              <button className="rounded border px-3 py-1 hover:bg-slate-50">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
