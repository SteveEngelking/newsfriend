// Post-processing pass that ensures all user-visible strings in a report's
// `themes[].sourceAnalysis[]` (stance + keyQuotes) are written in the target
// language. The generation model sometimes leaks the source-article language
// (e.g. German quotes from Zeit in an English report); this scrubs that.

import { callAIChatCompletion } from "./ai-gateway.ts";

const LANG_NAMES: Record<string, string> = {
  en: "English",
  de: "German",
  fr: "French",
  es: "Spanish",
  it: "Italian",
  pt: "Portuguese",
  nl: "Dutch",
};

export async function enforceReportLanguage(
  themes: any[],
  outputLangCode: string,
): Promise<any[]> {
  if (!Array.isArray(themes) || themes.length === 0) return themes;
  const langName = LANG_NAMES[outputLangCode] ?? outputLangCode;

  type Item = { path: string; text: string };
  const items: Item[] = [];
  themes.forEach((t, ti) => {
    const sas = Array.isArray(t?.sourceAnalysis) ? t.sourceAnalysis : [];
    sas.forEach((sa: any, si: number) => {
      if (typeof sa?.stance === "string" && sa.stance.trim()) {
        items.push({ path: `${ti}.${si}.stance`, text: sa.stance });
      }
      const qs = Array.isArray(sa?.keyQuotes) ? sa.keyQuotes : [];
      qs.forEach((q: any, qi: number) => {
        if (typeof q === "string" && q.trim()) {
          items.push({ path: `${ti}.${si}.kq.${qi}`, text: q });
        }
      });
    });
  });
  if (items.length === 0) return themes;

  const system =
    `You are a senior ${langName} editor. You receive a JSON object {"items":[{"path":string,"text":string}]}. ` +
    `For each item, if "text" is already entirely in natural ${langName}, return it UNCHANGED. ` +
    `If "text" contains any words, phrases, sentences, or quoted passages in another language (German, French, Spanish, Italian, Korean, Chinese, Japanese, Russian, Arabic, etc.), translate the ENTIRE text into natural, idiomatic ${langName}. ` +
    `Preserve surrounding punctuation, quotation marks, and tone. Never output bilingual text. ` +
    `Return ONLY a JSON object {"items":[{"path":string,"text":string}]} with the SAME length, SAME order, and SAME path values as the input.`;

  try {
    const { response } = await callAIChatCompletion({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: system },
        { role: "user", content: JSON.stringify({ items }) },
      ],
      response_format: { type: "json_object" },
    }, { timeoutMs: 45_000 });
    if (!response.ok) {
      console.error("[enforceReportLanguage] AI call failed:", response.status);
      return themes;
    }
    const json = await response.json();
    const content = json?.choices?.[0]?.message?.content;
    if (!content) return themes;
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      const m = content.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : null;
    }
    if (!parsed || !Array.isArray(parsed.items)) return themes;

    const map = new Map<string, string>();
    for (const it of parsed.items) {
      if (it && typeof it.path === "string" && typeof it.text === "string") {
        map.set(it.path, it.text);
      }
    }
    if (map.size === 0) return themes;

    return themes.map((t: any, ti: number) => {
      const sas = Array.isArray(t?.sourceAnalysis) ? t.sourceAnalysis : [];
      return {
        ...t,
        sourceAnalysis: sas.map((sa: any, si: number) => {
          const qs = Array.isArray(sa?.keyQuotes) ? sa.keyQuotes : [];
          return {
            ...sa,
            stance: map.get(`${ti}.${si}.stance`) ?? sa?.stance,
            keyQuotes: qs.map((q: any, qi: number) =>
              map.get(`${ti}.${si}.kq.${qi}`) ?? q
            ),
          };
        }),
      };
    });
  } catch (e) {
    console.error("[enforceReportLanguage] failed:", e);
    return themes;
  }
}
