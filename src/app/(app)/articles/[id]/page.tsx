import Link from "next/link";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { enqueueJob } from "@/lib/jobs";

async function getArticle(id: string) {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("articles")
    .select("*, sources(label, url)")
    .eq("id", id)
    .single();
  return data;
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

  revalidatePath(`/articles/${id}`);
  revalidatePath("/articles");
}

export default async function ArticleDetail({
  params
}: {
  params: { id: string };
}) {
  const article = await getArticle(params.id);
  if (!article) {
    return (
      <div className="rounded border bg-white p-6">
        <p>Article not found.</p>
        <Link href="/articles" className="text-sm text-slate-600">
          Back to Articles
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            {article.title_en || article.title_ge || "Untitled"}
          </h1>
          <div className="text-sm text-slate-600">
            {article.sources?.label || article.sources?.url || article.url}
          </div>
          <div className="text-xs text-slate-500">Status: {article.status}</div>
          {article.error ? (
            <div className="mt-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {article.error}
            </div>
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          <form action={rerunArticle.bind(null, article.id, article.url)}>
            <button className="rounded border px-3 py-1 text-sm hover:bg-slate-50">
              Re-run
            </button>
          </form>
          <Link
            href={`/api/articles/${article.id}/download/docx`}
            className="rounded border px-3 py-1 text-sm hover:bg-slate-50"
          >
            Download .docx
          </Link>
          <Link
            href={`/api/articles/${article.id}/download/md`}
            className="rounded border px-3 py-1 text-sm hover:bg-slate-50"
          >
            Download .md
          </Link>
        </div>
      </div>

      <div className="rounded border bg-white p-5">
        <div className="text-sm text-slate-500">Source link</div>
        <a
          href={article.url}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-slate-900 underline"
        >
          {article.url}
        </a>
      </div>

      <div className="rounded border bg-white p-5 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">English</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
            {article.brief_en || "No English brief yet."}
          </p>
          <div className="mt-4 whitespace-pre-wrap text-sm text-slate-900">
            {article.article_en || "No English article yet."}
          </div>
        </div>
        <hr />
        <div>
          <h2 className="text-lg font-semibold">Georgian</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
            {article.brief_ge || "No Georgian brief yet."}
          </p>
          <div className="mt-4 whitespace-pre-wrap text-sm text-slate-900">
            {article.article_ge || "No Georgian article yet."}
          </div>
        </div>
      </div>
    </div>
  );
}
