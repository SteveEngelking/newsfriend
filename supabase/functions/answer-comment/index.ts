import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { callAIChatCompletion } from "../_shared/ai-gateway.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader)
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify user
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user)
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    const { question, commentId } = await req.json();
    if (!question || typeof question !== "string" || question.trim().length < 3) {
      return new Response(
        JSON.stringify({ error: "Question must be at least 3 characters" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Generate AI response — prefers free Google Gemini API, falls back to Lovable AI
    const { response: aiResponse, provider } = await callAIChatCompletion({
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content:
            "You are NewsFriend's helpful AI assistant. Answer user questions clearly and concisely about news, current events, fact-checking, and the NewsFriend platform. Keep responses informative but brief (2-4 paragraphs max). If you don't know something, say so honestly. Respond in the same language the user writes in.",
        },
        { role: "user", content: question.trim() },
      ],
    });
    console.log(`[answer-comment] AI provider used: ${provider}`);

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited, please try again later." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Service temporarily unavailable." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const answer =
      aiData.choices?.[0]?.message?.content || "Sorry, I could not generate a response.";

    // Update the comment with the AI response using service role
    const adminClient = createClient(supabaseUrl, serviceKey);
    const { error: updateError } = await adminClient
      .from("user_comments")
      .update({ ai_response: answer })
      .eq("id", commentId)
      .eq("user_id", user.id);

    if (updateError) throw updateError;

    // Notify admins about the new comment
    try {
      // Get admin user IDs
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

        // Get submitter info
        const { data: submitterProfile } = await adminClient
          .from("profiles")
          .select("email, display_name")
          .eq("user_id", user.id)
          .single();

        const submitterName =
          submitterProfile?.display_name || submitterProfile?.email || "A user";

        // Send notification email to each admin
        if (adminProfiles) {
          for (const admin of adminProfiles) {
            if (admin.email) {
              await adminClient.functions.invoke("send-transactional-email", {
                body: {
                  templateName: "new-comment-admin",
                  recipientEmail: admin.email,
                  idempotencyKey: `new-comment-${commentId}-${admin.email}`,
                  templateData: {
                    submitterName,
                    questionPreview:
                      question.trim().substring(0, 200) +
                      (question.trim().length > 200 ? "..." : ""),
                  },
                },
              });
            }
          }
        }
      }
    } catch (notifErr) {
      console.error("Failed to notify admins:", notifErr);
      // Don't fail the whole request if notification fails
    }

    return new Response(JSON.stringify({ answer }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("answer-comment error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
