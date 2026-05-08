// Translate an English generated report into another language on demand.
// Caches result in `report_translations`.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { callAIChatCompletion } from "../_shared/ai-gateway.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const LANGUAGE_NAMES: Record<string, string> = {
  de: "German",
  fr: "French",
  es: "Spanish",
  it: "Italian",
  pt: "Portuguese",
  nl: "Dutch",
};

interface GlossaryRow {
  source_term: string;
  translations: Record<string, string>;
  do_not_translate: boolean;
}

function buildGlossaryBlock(rows: GlossaryRow[], lang: string): string {
  if (!rows.length) return "";
  const dnt = rows.filter((r) => r.do_not_translate).map((r) => r.source_term);
  const map = rows
    .filter((r) => !r.do_not_translate && r.translations?.[lang])
    .map((r) => `- "${r.source_term}" → "${r.translations[lang]}"`);
  let block = "GLOSSARY (must be respected):\n";
  if (map.length) block += "Always use these translations:\n" + map.join("\n") + "\n";
  if (dnt.length) block += "Never translate these terms; keep them verbatim:\n- " + dnt.join("\n- ") + "\n";
  return block;
}

async function translateChunk(
  obj: unknown,
  targetLanguage: string,
  glossaryBlock: string,
  description: string,
): Promise<unknown> {
  const langName = LANGUAGE_NAMES[targetLanguage] ?? targetLanguage;
  const system =
    `You are a professional news translator. Translate the JSON value below from English into ${langName}.\n` +
    `STRICT RULES:\n` +
    `1. Return a single JSON object with the EXACT SAME SHAPE and SAME KEYS as the input. Only translate string VALUES.\n` +
    `2. Translate every user-visible string into ${langName}: titles, summaries, quotes, commentary, names of perspectives, source labels, conclusion, etc. Translate quoted speech too.\n` +
    `3. Do NOT translate: URLs, IDs, ISO dates, image URLs, enum values like "high"/"medium"/"low", proper names of organisations or people unless they have an established ${langName} form.\n` +
    `4. Do NOT add, remove, reorder, or merge fields. Preserve arrays length and order.\n` +
    `5. Output ONLY the translated JSON, no prose, no markdown.\n` +
    glossaryBlock;

  const body = {
    model: "google/gemini-2.5-flash",
    messages: [
      { role: "system", content: system },
      {
        role: "user",
        content:
          `Translate this JSON (${description}) into ${langName}. Return JSON only:\n\n` +
          JSON.stringify(obj),
      },
    ],
    response_format: { type: "json_object" },
  };

  const { response, provider } = await callAIChatCompletion(body);
  if (!response.ok) {
    const txt = await response.text().catch(() => "");
    throw new Error(`AI translate failed (${response.status}, ${provider}): ${txt.slice(0, 300)}`);
  }
  const json = await response.json();
  const content = json?.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI returned no content");
  try {
    return JSON.parse(content);
  } catch {
    // Try to extract JSON object from the content
    const m = content.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
    throw new Error("AI returned invalid JSON");
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { reportId, language, force } = body;
    if (!reportId || typeof reportId !== "string" || !language || typeof language !== "string") {
      return new Response(JSON.stringify({ error: "reportId and language required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Already cached? Skip unless force=true
    if (!force) {
      const { data: cached } = await admin
        .from("report_translations")
        .select("title, report_data, language")
        .eq("report_id", reportId)
        .eq("language", language)
        .maybeSingle();

      if (cached) {
        return new Response(
          JSON.stringify({ title: cached.title, report_data: cached.report_data, cached: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // Load source report
    const { data: src, error: srcErr } = await admin
      .from("generated_reports")
      .select("title, report_data, language")
      .eq("id", reportId)
      .maybeSingle();
    if (srcErr || !src) {
      return new Response(JSON.stringify({ error: "Source report not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If already in the target language, just return source as-is
    if ((src.language || "en") === language) {
      return new Response(
        JSON.stringify({ title: src.title, report_data: src.report_data, cached: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Glossary
    const { data: glossary } = await admin
      .from("translation_glossary")
      .select("source_term, translations, do_not_translate");
    const glossaryBlock = buildGlossaryBlock(
      (glossary as GlossaryRow[] | null) ?? [],
      language,
    );

    const report = (src.report_data ?? {}) as Record<string, unknown>;
    const themes = Array.isArray(report.themes) ? (report.themes as unknown[]) : [];
    const ethical = Array.isArray(report.ethicalConsiderations)
      ? (report.ethicalConsiderations as unknown[])
      : [];

    // Translate metadata (title + intro/conclusion + ethical) in one shot
    const meta = {
      title: src.title,
      reportTitle: report.title,
      introduction: report.introduction ?? "",
      conclusion: report.conclusion ?? "",
      ethicalConsiderations: ethical,
    };

    // Translate themes in parallel batches of 5
    const BATCH = 5;
    const themeBatches: unknown[][] = [];
    for (let i = 0; i < themes.length; i += BATCH) {
      themeBatches.push(themes.slice(i, i + BATCH));
    }

    const [translatedMeta, ...translatedThemeBatches] = await Promise.all([
      translateChunk(meta, language, glossaryBlock, "report metadata"),
      ...themeBatches.map((batch, idx) =>
        translateChunk(batch, language, glossaryBlock, `themes batch ${idx + 1} of ${themeBatches.length}`),
      ),
    ]);

    const metaT = translatedMeta as any;
    const translatedThemes: unknown[] = [];
    for (const b of translatedThemeBatches) {
      if (Array.isArray(b)) translatedThemes.push(...b);
    }

    // Reassemble: keep all original fields, override translated ones
    const newReport: Record<string, unknown> = {
      ...report,
      title: metaT?.reportTitle ?? metaT?.title ?? report.title,
      introduction: metaT?.introduction ?? report.introduction,
      conclusion: metaT?.conclusion ?? report.conclusion,
      ethicalConsiderations: Array.isArray(metaT?.ethicalConsiderations)
        ? metaT.ethicalConsiderations
        : ethical,
      themes: translatedThemes.length === themes.length ? translatedThemes : themes,
      language,
    };

    const newTitle = String(metaT?.title ?? metaT?.reportTitle ?? src.title);

    // Cache
    await admin.from("report_translations").insert({
      report_id: reportId,
      language,
      title: newTitle,
      report_data: newReport,
    });

    return new Response(
      JSON.stringify({ title: newTitle, report_data: newReport, cached: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[translate-report]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
