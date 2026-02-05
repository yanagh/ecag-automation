import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { extractArticleText } from "@/lib/extract";
import { generateArticleFromText } from "@/lib/llm";

const MAX_JOBS_PER_RUN = 3;
const MAX_ATTEMPTS = 3; // 1 initial + 2 retries

async function fetchHtml(url: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "ECAGNewsProcessor/1.0"
    }
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status}`);
  }
  return await response.text();
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const secret = request.headers.get("x-worker-secret") || url.searchParams.get("secret");
  if (!secret || secret !== process.env.WORKER_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: jobs } = await supabase
    .from("jobs")
    .select("*")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(MAX_JOBS_PER_RUN);

  if (!jobs || jobs.length === 0) {
    return NextResponse.json({ processed: 0 });
  }

  let processed = 0;
  for (const job of jobs) {
    const attempts = (job.attempts ?? 0) + 1;
    await supabase
      .from("jobs")
      .update({ status: "processing", attempts, updated_at: new Date().toISOString() })
      .eq("id", job.id);

    try {
      if (job.type !== "process_url") {
        throw new Error(`Unsupported job type: ${job.type}`);
      }

      const { article_id: articleId, url } = job.payload as {
        article_id: string;
        url: string;
      };

      await supabase
        .from("articles")
        .update({ status: "processing", updated_at: new Date().toISOString() })
        .eq("id", articleId);

      const rawHtml = await fetchHtml(url);
      const { text } = extractArticleText(rawHtml, url);
      if (!text || text.length < 200) {
        throw new Error("Extracted text is too short");
      }

      await supabase
        .from("articles")
        .update({
          raw_html: rawHtml,
          extracted_text: text,
          updated_at: new Date().toISOString()
        })
        .eq("id", articleId);

      const llmOutput = await generateArticleFromText(text, url);

      await supabase
        .from("articles")
        .update({
          status: "done",
          title_en: llmOutput.title_en,
          title_ge: llmOutput.title_ge,
          brief_en: llmOutput.brief_en,
          brief_ge: llmOutput.brief_ge,
          article_en: llmOutput.article_en,
          article_ge: llmOutput.article_ge,
          llm_json: llmOutput,
          error: null,
          updated_at: new Date().toISOString()
        })
        .eq("id", articleId);

      await supabase
        .from("jobs")
        .update({ status: "done", last_error: null, updated_at: new Date().toISOString() })
        .eq("id", job.id);

      processed += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      const shouldRetry = attempts < MAX_ATTEMPTS;
      await supabase
        .from("jobs")
        .update({
          status: shouldRetry ? "queued" : "failed",
          last_error: message,
          updated_at: new Date().toISOString()
        })
        .eq("id", job.id);

      const articleId = (job.payload as { article_id?: string }).article_id;
      if (articleId) {
        await supabase
          .from("articles")
          .update({
            status: shouldRetry ? "queued" : "failed",
            error: message,
            updated_at: new Date().toISOString()
          })
          .eq("id", articleId);
      }
    }
  }

  return NextResponse.json({ processed });
}
