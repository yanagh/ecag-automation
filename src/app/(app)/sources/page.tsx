import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isValidUrl } from "@/lib/validators";
import { fetchRssItems } from "@/lib/rss";
import { enqueueJob } from "@/lib/jobs";

async function getSources() {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("sources")
    .select("*")
    .order("created_at", { ascending: false });
  return data ?? [];
}

async function getExistingArticleUrls(userId: string, urls: string[]) {
  if (urls.length === 0) return new Set<string>();
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("articles")
    .select("url")
    .eq("user_id", userId)
    .in("url", urls);
  return new Set((data ?? []).map((row) => row.url));
}

async function createQueuedArticle({
  userId,
  sourceId,
  url
}: {
  userId: string;
  sourceId: string | null;
  url: string;
}) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("articles")
    .insert({
      user_id: userId,
      source_id: sourceId,
      url,
      status: "queued"
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return data.id as string;
}

async function runSource(sourceId: string) {
  "use server";
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: source } = await supabase
    .from("sources")
    .select("*")
    .eq("id", sourceId)
    .single();
  if (!source) return;

  if (source.type === "rss") {
    const items = await fetchRssItems(source.url, 5);
    const urls = items.map((item) => item.link).filter(Boolean);
    const existing = await getExistingArticleUrls(user.id, urls);

    for (const url of urls) {
      if (existing.has(url)) continue;
      const articleId = await createQueuedArticle({
        userId: user.id,
        sourceId: source.id,
        url
      });
      await enqueueJob(user.id, "process_url", { article_id: articleId, url });
    }
  } else {
    const url = source.url;
    const existing = await getExistingArticleUrls(user.id, [url]);
    if (!existing.has(url)) {
      const articleId = await createQueuedArticle({
        userId: user.id,
        sourceId: source.id,
        url
      });
      await enqueueJob(user.id, "process_url", { article_id: articleId, url });
    }
  }

  revalidatePath("/sources");
  revalidatePath("/articles");
}

async function runAllActive() {
  "use server";
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: sources } = await supabase
    .from("sources")
    .select("*")
    .eq("is_active", true);

  for (const source of sources ?? []) {
    await runSource(source.id);
  }

  revalidatePath("/sources");
  revalidatePath("/articles");
}

async function addSource(formData: FormData) {
  "use server";
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    console.error("addSource: No user found");
    return;
  }

  const url = String(formData.get("url") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();
  const type = String(formData.get("type") ?? "rss");

  if (!isValidUrl(url)) {
    console.error("addSource: Invalid URL", url);
    return;
  }

  const { error } = await supabase.from("sources")
    .insert({
      user_id: user.id,
      url,
      label: label || null,
      type,
      is_active: true
    });

  if (error) {
    console.error("addSource: Insert error", error.message);
    return;
  }

  revalidatePath("/sources");
}

async function toggleActive(sourceId: string, isActive: boolean) {
  "use server";
  const supabase = createSupabaseServerClient();
  await supabase
    .from("sources")
    .update({ is_active: isActive })
    .eq("id", sourceId);
  revalidatePath("/sources");
}

export default async function SourcesPage() {
  const sources = await getSources();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Sources</h1>
          <p className="text-sm text-slate-600">
            Add RSS feeds or single URLs, then run processing on demand.
          </p>
        </div>
        <form action={runAllActive}>
          <button className="rounded bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800">
            Run all active
          </button>
        </form>
      </div>

      <div className="rounded border bg-white p-4">
        <h2 className="text-lg font-medium">Add source</h2>
        <form action={addSource} className="mt-3 grid gap-3 md:grid-cols-4">
          <input
            name="url"
            placeholder="https://example.com/feed.xml"
            required
            className="rounded border px-3 py-2 md:col-span-2"
          />
          <input
            name="label"
            placeholder="Optional label"
            className="rounded border px-3 py-2"
          />
          <select name="type" className="rounded border px-3 py-2">
            <option value="rss">RSS feed</option>
            <option value="url">Single URL</option>
          </select>
          <div className="md:col-span-4">
            <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800">
              Add source
            </button>
          </div>
        </form>
      </div>

      <div className="space-y-3">
        {sources.map((source) => (
          <div
            key={source.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded border bg-white p-4"
          >
            <div>
              <div className="text-sm text-slate-500">{source.type.toUpperCase()}</div>
              <div className="font-medium">{source.label || source.url}</div>
              <div className="text-xs text-slate-500">{source.url}</div>
            </div>
            <div className="flex items-center gap-3">
              <form action={runSource.bind(null, source.id)}>
                <button className="rounded border px-3 py-1 text-sm hover:bg-slate-50">
                  Run
                </button>
              </form>
              <form action={toggleActive.bind(null, source.id, !source.is_active)}>
                <button
                  className={`rounded px-3 py-1 text-sm ${
                    source.is_active
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {source.is_active ? "Active" : "Inactive"}
                </button>
              </form>
            </div>
          </div>
        ))}
        {sources.length === 0 ? (
          <div className="rounded border border-dashed p-6 text-sm text-slate-500">
            No sources yet. Add your first feed or URL above.
          </div>
        ) : null}
      </div>
    </div>
  );
}
