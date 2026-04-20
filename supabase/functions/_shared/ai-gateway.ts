/**
 * Shared AI gateway helper.
 *
 * Tries Google Gemini API directly first (free tier from aistudio.google.com),
 * then falls back to the paid Lovable AI Gateway on error or quota exhaustion.
 *
 * Google exposes an OpenAI-compatible endpoint at:
 *   https://generativelanguage.googleapis.com/v1beta/openai/chat/completions
 * which supports tool-calling and the same request/response shape used elsewhere
 * in this codebase, so the same request body works for both providers.
 *
 * Model mapping: when calling Google directly, we map Lovable model names to
 * the closest free-tier Gemini equivalents.
 */

const LOVABLE_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const GOOGLE_OPENAI_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

// Map Lovable model identifiers to Google API model names.
// Free tier models: https://ai.google.dev/gemini-api/docs/models
function mapToGoogleModel(model: string): string | null {
  // Strip "google/" prefix if present, otherwise we cannot route to Google free tier.
  if (model.startsWith("google/")) {
    return model.slice("google/".length);
  }
  // OpenAI / other models cannot run on Google free tier — must use Lovable gateway.
  return null;
}

export interface AICallOptions {
  /** Whether to attempt the free Google API first. Default true when GEMINI_API_KEY is set. */
  preferFree?: boolean;
  /** Override the model used when calling Google directly (useful to force a cheaper free model). */
  googleModelOverride?: string;
}

export interface AICallResult {
  response: Response;
  /** Which provider actually returned the response. */
  provider: "google-free" | "lovable";
}

/**
 * Make a chat completion request, preferring the free Google Gemini API.
 *
 * @param body  OpenAI-compatible request body (model, messages, tools, tool_choice, etc.)
 * @param opts  Behaviour overrides
 */
export async function callAIChatCompletion(
  body: Record<string, unknown>,
  opts: AICallOptions = {},
): Promise<AICallResult> {
  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

  const requestedModel = typeof body.model === "string" ? body.model : "google/gemini-3-flash-preview";
  const preferFree = opts.preferFree !== false && Boolean(GEMINI_API_KEY);

  // Attempt 1: free Google API
  if (preferFree) {
    const googleModel =
      opts.googleModelOverride ?? mapToGoogleModel(requestedModel);
    if (googleModel) {
      const googleBody = { ...body, model: googleModel };
      try {
        const resp = await fetch(GOOGLE_OPENAI_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${GEMINI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(googleBody),
        });

        // Success → return immediately.
        if (resp.ok) {
          return { response: resp, provider: "google-free" };
        }

        // Quota exhausted (429) or auth failure → fall through to Lovable.
        // For other errors (500, model not found, etc.) also fall through so the
        // request still has a chance to succeed.
        const errText = await resp.text().catch(() => "");
        console.warn(
          `[ai-gateway] Google free API failed (${resp.status}): ${errText.slice(0, 200)}. Falling back to Lovable AI.`,
        );
      } catch (err) {
        console.warn(
          `[ai-gateway] Google free API threw: ${err instanceof Error ? err.message : String(err)}. Falling back to Lovable AI.`,
        );
      }
    }
  }

  // Attempt 2: Lovable AI Gateway (paid)
  if (!LOVABLE_API_KEY) {
    throw new Error(
      "Both GEMINI_API_KEY (Google free) attempt and LOVABLE_API_KEY are unavailable",
    );
  }

  const resp = await fetch(LOVABLE_GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  return { response: resp, provider: "lovable" };
}
