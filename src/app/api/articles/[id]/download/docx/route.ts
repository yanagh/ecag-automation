import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";

function splitToParagraphs(text: string) {
  const blocks = text
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  const paragraphs: Paragraph[] = [];

  for (const block of blocks) {
    const lines = block.split(/\n/).map((line) => line.trim());
    for (const line of lines) {
      if (!line) continue;
      if (line.startsWith("- ")) {
        paragraphs.push(
          new Paragraph({
            text: line.replace(/^- /, ""),
            bullet: { level: 0 }
          })
        );
      } else {
        paragraphs.push(new Paragraph({ text: line }));
      }
    }
  }

  return paragraphs.length ? paragraphs : [new Paragraph({ text: "" })];
}

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

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            children: [new TextRun({ text: article.title_en || article.title_ge || "Untitled", bold: true })]
          }),
          new Paragraph({ text: `Source: ${article.url}` }),
          new Paragraph({ text: "" }),
          new Paragraph({ text: "English Brief", heading: HeadingLevel.HEADING_2 }),
          ...splitToParagraphs(article.brief_en || ""),
          new Paragraph({ text: "" }),
          new Paragraph({ text: "English Article", heading: HeadingLevel.HEADING_2 }),
          ...splitToParagraphs(article.article_en || ""),
          new Paragraph({ text: "" }),
          new Paragraph({ text: "Georgian Brief", heading: HeadingLevel.HEADING_2 }),
          ...splitToParagraphs(article.brief_ge || ""),
          new Paragraph({ text: "" }),
          new Paragraph({ text: "Georgian Article", heading: HeadingLevel.HEADING_2 }),
          ...splitToParagraphs(article.article_ge || "")
        ]
      }
    ]
  });

  const buffer = await Packer.toBuffer(doc);
  const body = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

  return new Response(body, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="article-${params.id}.docx"`
    }
  });
}
