import OpenAI from "openai";
import { getEnv } from "@/lib/env";

export type LlmArticle = {
  title_en: string;
  brief_en: string;
  article_en: string;
  title_ge: string;
  brief_ge: string;
  article_ge: string;
  source_url: string;
};

const schema = {
  name: "ecag_article",
  strict: true,
  schema: {
    type: "object",
    properties: {
      title_en: { type: "string" },
      brief_en: { type: "string" },
      article_en: { type: "string" },
      title_ge: { type: "string" },
      brief_ge: { type: "string" },
      article_ge: { type: "string" },
      source_url: { type: "string" }
    },
    required: [
      "title_en",
      "brief_en",
      "article_en",
      "title_ge",
      "brief_ge",
      "article_ge",
      "source_url"
    ],
    additionalProperties: false
  }
};

const systemPrompt = `You are a careful news editor.
Follow ALL rules:
- Use ONLY facts from the provided extracted text. If unsure, omit.
- Keep ALL numbers exactly unchanged (digits, %, currencies, ranges).
- No emojis. No hashtags.
- Output ONLY valid JSON matching the schema.

Output requirements:
- title_en: short headline in English.
- brief_en: 5–6 sentences.
- article_en: Rewrite the article in English based ONLY on provided text. If the extracted article is too long, shorten it while preserving key facts. Keep total length roughly 350–600 words. Use section titles as plain text lines (no Markdown symbols). Separate paragraphs by a blank line. Include a "Key takeaways" section with lines starting "- ".
- title_ge, brief_ge, article_ge: Georgian translations of the English fields.
- source_url: must match the provided URL exactly.
`;

export async function generateArticleFromText(extractedText: string, sourceUrl: string) {
  const env = getEnv();
  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });

  const response = await client.chat.completions.create({
    model: env.OPENAI_MODEL,
    temperature: 0.2,
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `SOURCE_URL: ${sourceUrl}\n\nEXTRACTED_TEXT:\n${extractedText}`
      }
    ],
    response_format: {
      type: "json_schema",
      json_schema: schema
    }
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI returned empty response");
  }

  const parsed = JSON.parse(content) as LlmArticle;
  if (parsed.source_url !== sourceUrl) {
    throw new Error("OpenAI output source_url mismatch");
  }
  return parsed;
}
