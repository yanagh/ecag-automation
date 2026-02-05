import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { data: article } = await supabase
    .from("articles")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!article) {
    return new Response("Not found", { status: 404 });
  }

  const content = `# ${article.title_en || article.title_ge || "Untitled"}\n\n` +
    `Source: ${article.url}\n\n` +
    `## English Brief\n\n${article.brief_en || ""}\n\n` +
    `## English Article\n\n${article.article_en || ""}\n\n` +
    `---\n\n` +
    `## Georgian Brief\n\n${article.brief_ge || ""}\n\n` +
    `## Georgian Article\n\n${article.article_ge || ""}\n`;

  return new Response(content, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="article-${params.id}.md"`
    }
  });
}
