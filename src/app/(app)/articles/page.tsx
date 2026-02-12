import Link from "next/link";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { enqueueJob } from "@/lib/jobs";
import { SubmitButton } from "@/components/SubmitButton";

async function getArticles(): Promise<{ articles: Article[]; error: string | null }> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("articles")
    .select("id, url, title_en, title_ge, status, is_used, created_at, sources(label, url)")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("getArticles error:", error.message);
    return { articles: [], error: error.message };
  }
  return { articles: data ?? [], error: null };
}

type Article = {
  id: string;
  url: string;
  title_en: string | null;
  title_ge: string | null;
  status: string;
  is_used: boolean;
  created_at: string;
  sources: { label: string | null; url: string } | { label: string | null; url: string }[] | null;
};

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

async function deleteArticle(id: string) {
  "use server";
  const supabase = createSupabaseServerClient();
  await supabase.from("articles").delete().eq("id", id);
  revalidatePath("/articles");
}

async function toggleUsed(id: string, isUsed: boolean) {
  "use server";
  const supabase = createSupabaseServerClient();
  await supabase.from("articles").update({ is_used: isUsed }).eq("id", id);
  revalidatePath("/articles");
}

export default async function ArticlesPage() {
  const { articles, error: queryError } = await getArticles();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Articles</h1>
        <p className="text-sm text-slate-600">Processed items and status.</p>
      </div>

      {queryError && (
        <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Database query error: {queryError}
        </div>
      )}

      <div className="space-y-3">
        {articles.map((article) => (
          <div
            key={article.id}
            className={`rounded border bg-white p-4 hover:border-slate-400 ${
              article.is_used ? "opacity-60" : ""
            }`}
          >
            {(() => {
              const source = Array.isArray(article.sources)
                ? article.sources[0]
                : article.sources;
              const sourceLabel = source?.label || source?.url || article.url;
              return (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Link href={`/articles/${article.id}`} className="font-medium hover:underline">
                    {article.title_en || article.title_ge || "Untitled"}
                  </Link>
                  {article.is_used && (
                    <span className="rounded bg-slate-200 px-2 py-0.5 text-xs text-slate-600">
                      Used
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500">
                  {sourceLabel}
                </div>
              </div>
              <div className="text-xs text-slate-500">
                {new Date(article.created_at).toLocaleString()}
              </div>
            </div>
              );
            })()}
            <div className="mt-2 flex items-center justify-between gap-3 text-sm text-slate-600">
              <span>Status: {article.status}</span>
              <div className="flex items-center gap-2">
                <form action={toggleUsed.bind(null, article.id, !article.is_used)}>
                  <SubmitButton
                    className={`rounded border px-3 py-1 text-sm disabled:opacity-50 ${
                      article.is_used
                        ? "bg-slate-200 text-slate-700 hover:bg-slate-300"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    {article.is_used ? "Unmark used" : "Mark used"}
                  </SubmitButton>
                </form>
                <form action={rerunArticle.bind(null, article.id, article.url)}>
                  <SubmitButton
                    pendingText="Running..."
                    className="rounded border px-3 py-1 text-sm hover:bg-slate-50 disabled:opacity-50"
                  >
                    Re-run
                  </SubmitButton>
                </form>
                <form action={deleteArticle.bind(null, article.id)}>
                  <SubmitButton
                    pendingText="Deleting..."
                    className="rounded border border-red-200 px-3 py-1 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    Delete
                  </SubmitButton>
                </form>
              </div>
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
