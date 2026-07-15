import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { callAIChatCompletion } from "../_shared/ai-gateway.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { commentId, content, themeHeadline, themeSummary, language } = await req.json();
    if (!commentId || !content || typeof content !== "string" || content.trim().length < 3) {
      return new Response(JSON.stringify({ error: "Invalid input" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (content.length > 4000) {
      return new Response(JSON.stringify({ error: "Comment too long" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lang = language === "de" ? "de" : "en";
    const systemPrompt = lang === "de"
      ? "Du bist NewsFriends KI-Analyst. Lies den Nachrichtenartikel-Kontext und den Nutzerkommentar. Gib eine kurze, respektvolle Analyse (2-4 Sätze): Anerkennung des Punktes, eventuelle sachliche Nuancen oder fehlende Perspektiven, und eine kurze Antwort. Keine politische Parteinahme. Antworte auf Deutsch."
      : "You are NewsFriend's AI analyst. Read the article context and the user's comment. Give a short, respectful analysis (2-4 sentences): acknowledge the point, note any factual nuance or missing perspective, and offer a brief response. No partisan advocacy. Reply in English.";

    const userPrompt = `ARTICLE THEME: ${themeHeadline || ""}\nSUMMARY: ${themeSummary || ""}\n\nUSER COMMENT:\n${content.trim()}`;

    const { response: aiResponse } = await callAIChatCompletion({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      const msg = status === 429 ? "Rate limited" : status === 402 ? "AI credits exhausted" : `AI error ${status}`;
      return new Response(JSON.stringify({ error: msg }), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const analysis = aiData.choices?.[0]?.message?.content?.trim() || "";

    const adminClient = createClient(supabaseUrl, serviceKey);
    const { error: updateError } = await adminClient
      .from("theme_comments")
      .update({ ai_analysis: analysis })
      .eq("id", commentId)
      .eq("user_id", user.id);

    if (updateError) throw updateError;

    // Notify admins about the new theme comment
    try {
      const { data: adminRoles } = await adminClient
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (adminRoles && adminRoles.length > 0) {
        const adminUserIds = adminRoles.map((r: any) => r.user_id);
        const { data: adminProfiles } = await adminClient
          .from("profiles")
          .select("email")
          .in("user_id", adminUserIds);

        const { data: submitterProfile } = await adminClient
          .from("profiles")
          .select("email, display_name")
          .eq("user_id", user.id)
          .single();

        const submitterName =
          submitterProfile?.display_name || submitterProfile?.email || "A user";
        const trimmed = content.trim();
        const preview = trimmed.substring(0, 200) + (trimmed.length > 200 ? "..." : "");

        if (adminProfiles) {
          for (const admin of adminProfiles) {
            if (admin.email) {
              await adminClient.functions.invoke("send-transactional-email", {
                body: {
                  templateName: "new-comment-admin",
                  recipientEmail: admin.email,
                  idempotencyKey: `new-theme-comment-${commentId}-${admin.email}`,
                  templateData: { submitterName, questionPreview: preview },
                },
              });
            }
          }
        }
      }
    } catch (notifErr) {
      console.error("Failed to notify admins:", notifErr);
    }

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-theme-comment error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
