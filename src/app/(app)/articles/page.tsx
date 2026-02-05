import Link from "next/link";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { enqueueJob } from "@/lib/jobs";

async function getArticles() {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("articles")
    .select("id, url, title_en, title_ge, status, created_at, sources(label, url)")
    .order("created_at", { ascending: false });
  return data ?? [];
}

async function rerunArticle(id: string, url: string) {
  "use server";
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("articles")
    .update({ status: "queued", error: null })
    .eq("id", id);

  await enqueueJob(user.id, "process_url", { article_id: id, url, force: true });

  revalidatePath("/articles");
}

export default async function ArticlesPage() {
  const articles = await getArticles();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Articles</h1>
        <p className="text-sm text-slate-600">Processed items and status.</p>
      </div>

      <div className="space-y-3">
        {articles.map((article) => (
          <div
            key={article.id}
            className="rounded border bg-white p-4 hover:border-slate-400"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Link href={`/articles/${article.id}`} className="font-medium hover:underline">
                  {article.title_en || article.title_ge || "Untitled"}
                </Link>
                <div className="text-xs text-slate-500">
                  {article.sources?.label || article.sources?.url || article.url}
                </div>
              </div>
              <div className="text-xs text-slate-500">
                {new Date(article.created_at).toLocaleString()}
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3 text-sm text-slate-600">
              <span>Status: {article.status}</span>
              <form action={rerunArticle.bind(null, article.id, article.url)}>
                <button className="rounded border px-3 py-1 text-sm hover:bg-slate-50">
                  Re-run
                </button>
              </form>
            </div>
          </div>
        ))}
        {articles.length === 0 ? (
          <div className="rounded border border-dashed p-6 text-sm text-slate-500">
            No articles yet. Run a source to process items.
          </div>
        ) : null}
      </div>
    </div>
  );
}
